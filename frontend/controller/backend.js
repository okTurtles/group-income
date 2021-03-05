'use strict'

import sbp from '~/shared/sbp.js'
import { sign, bufToB64, b64ToStr } from '~/shared/functions.js'
import { GIMessage } from '~/shared/GIMessage.js'
import { CONTRACTS_MODIFIED } from '~/frontend/utils/events.js'
import { intersection, difference, delay, randomIntFromRange } from '~/frontend/utils/giLodash.js'
import { createClient, NOTIFICATION_TYPE } from '~/shared/pubsub.js'
import { handleFetchResult } from './utils/misc.js'
import { PUBSUB_INSTANCE } from './instance-keys.js'

// temporary identity for signing
// const nacl = require('tweetnacl')
import nacl from 'tweetnacl'

const persona = nacl.sign.keyPair()
const signature = signJSON('', persona)

function signJSON (json, keypair) {
  return sign({
    publicKey: bufToB64(keypair.publicKey),
    secretKey: bufToB64(keypair.secretKey)
  }, json)
}

export function createGIPubSubClient (url: string, options: Object): Object {
  return createClient(url, {
    ...options,
    messageHandlers: {
      [NOTIFICATION_TYPE.ENTRY] (msg) {
        // We MUST use 'state/enqueueHandleEvent' here to ensure handleEvent()
        // is called AFTER any currently-running calls to syncContractWithServer().
        // Calling via SBP also makes it simple to implement 'test/backend.js'
        sbp('state/enqueueHandleEvent', GIMessage.deserialize(msg.data))
      }
    }
  })
}

// Keep pubsub in sync (logged into the right "rooms") with 'store.state.contracts'.
sbp('okTurtles.events/on', CONTRACTS_MODIFIED, async (contracts) => {
  const client = sbp('okTurtles.data/get', PUBSUB_INSTANCE)
  const subscribedIDs = [...client.subscriptionSet]
  const currentIDs = Object.keys(contracts)
  const leaveSubscribed = intersection(subscribedIDs, currentIDs)
  const toUnsubscribe = difference(subscribedIDs, leaveSubscribed)
  const toSubscribe = difference(currentIDs, leaveSubscribed)
  try {
    for (const contractID of toUnsubscribe) {
      client.unsub(contractID)
    }
    for (const contractID of toSubscribe) {
      client.sub(contractID)
    }
  } catch (e) {
    // TODO: handle any exceptions!
    console.error('CONTRACTS_MODIFIED: error in pubsub!', e, { toUnsubscribe, toSubscribe })
  }
})

sbp('sbp/selectors/register', {
  'backend/publishLogEntry': async (entry: GIMessage, { maxAttempts = 2 } = {}) => {
    const contractID = entry.contractID()
    let attempt = 1
    // auto resend after short random delay
    // https://github.com/okTurtles/group-income-simple/issues/608
    while (true) {
      const r = await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/event`, {
        method: 'POST',
        body: entry.serialize(),
        headers: {
          'Content-Type': 'text/plain',
          'Authorization': `gi ${signature}`
        }
      })
      if (r.ok) {
        return r.text()
      }
      if (r.status === 409) {
        if (attempt + 1 > maxAttempts) {
          console.error(`publishLogEntry: failed to publish ${entry.description()} after ${attempt} attempts`, entry)
          throw new Error(`publishLogEntry: ${r.status} - ${r.statusText}. attempt ${attempt}`)
        }
        // create new entry
        const randDelay = randomIntFromRange(0, 1500)
        console.warn(`publishLogEntry: attempt ${attempt} of ${maxAttempts} failed. Waiting ${randDelay} msec before resending ${entry.description()}`)
        attempt += 1
        await delay(randDelay) // wait half a second before sending it again
        // if this isn't OP_CONTRACT, get latestHash, recreate and resend message
        if (!entry.isFirstMessage()) {
          const previousHEAD = await sbp('backend/latestHash', contractID)
          entry = GIMessage.createV1_0(contractID, previousHEAD, entry.op())
        }
      } else {
        console.error(`publishLogEntry: ${r.status} - ${r.statusText}, failed to publish ${entry.description()}:`, entry)
        throw new Error(`publishLogEntry: ${r.status} - ${r.statusText}`)
      }
    }
  },
  // TODO: r.body is a stream.Transform, should we use a callback to process
  //       the events one-by-one instead of converting to giant json object?
  //       however, note if we do that they would be processed in reverse...
  'backend/eventsSince': async (contractID: string, since: string) => {
    const events = await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/events/${contractID}/${since}`)
      .then(handleFetchResult('json'))
    if (Array.isArray(events)) {
      return events.reverse().map(e => b64ToStr(e))
    }
  },
  'backend/latestHash': (contractID: string) => {
    return fetch(`${sbp('okTurtles.data/get', 'API_URL')}/latestHash/${contractID}`)
      .then(handleFetchResult('text'))
  },
  'backend/translations/get': (language: string) => {
    return fetch(`${sbp('okTurtles.data/get', 'API_URL')}/translations/get/${language}`)
      .then(handleFetchResult('json'))
  }
})
