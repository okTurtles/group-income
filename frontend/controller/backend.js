'use strict'

import type { JSONObject } from '~/shared/types.js'

import sbp from '~/shared/sbp.js'
import { sign, bufToB64, b64ToStr } from '~/shared/functions.js'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.js'
import { CONTRACTS_MODIFIED, GI_UPDATE_AVAILABLE } from '~/frontend/utils/events.js'
import { intersection, difference, delay, randomIntFromRange } from '~/frontend/utils/giLodash.js'
import { createClient, NOTIFICATION_TYPE } from '~/shared/pubsub.js'
import { handleFetchResult } from './utils/misc.js'
import { PUBSUB_INSTANCE } from './instance-keys.js'
import { CHATROOM_ACTIONS_PER_PAGE } from '~/frontend/model/contracts/constants.js'

// temporary identity for signing
// const nacl = require('tweetnacl')
import nacl from 'tweetnacl'

// Used in the 'backend/translations/get' SBP function.
// Do not include 'english.json' here unless the browser might need to download it.
const languageFileMap = new Map([
  ['fr', 'french.json']
])

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
      },
      [NOTIFICATION_TYPE.APP_VERSION] (msg) {
        const ourVersion = process.env.APP_VERSION
        const theirVersion = msg.data

        if (ourVersion !== theirVersion) {
          sbp('okTurtles.events/emit', GI_UPDATE_AVAILABLE, theirVersion)
        }
      }
    }
  })
}

// Keep pubsub in sync (logged into the right "rooms") with 'store.state.contracts'.
sbp('okTurtles.events/on', CONTRACTS_MODIFIED, (contracts) => {
  const client = sbp('okTurtles.data/get', PUBSUB_INSTANCE)
  const subscribedIDs = [...client.subscriptionSet]
  const currentIDs = Object.keys(contracts)
  const leaveSubscribed = intersection(subscribedIDs, currentIDs)
  const toUnsubscribe = difference(subscribedIDs, leaveSubscribed)
  const toSubscribe = difference(currentIDs, leaveSubscribed)
  // There is currently no need to tell other clients about our sub/unsubscriptions.
  const dontBroadcast = true
  try {
    for (const contractID of toUnsubscribe) {
      client.unsub(contractID, dontBroadcast)
    }
    for (const contractID of toSubscribe) {
      client.sub(contractID, dontBroadcast)
    }
  } catch (e) {
    // TODO: handle any exceptions!
    console.error('CONTRACTS_MODIFIED: error in pubsub!', e, { toUnsubscribe, toSubscribe })
  }
})

sbp('okTurtles.events/on', GI_UPDATE_AVAILABLE, (version) => {
  console.info('New Group Income version available:', version)
  const client = sbp('okTurtles.data/get', PUBSUB_INSTANCE)
  client.destroy()
  // TODO: allow the user to manually reload the page later.
  window.location.reload()
})

sbp('sbp/selectors/register', {
  'backend/publishLogEntry': async (entry: GIMessage, { maxAttempts = 2 } = {}) => {
    const contractID = entry.contractID()
    let attempt = 1
    // auto resend after short random delay
    // https://github.com/okTurtles/group-income/issues/608
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
  'backend/eventsBefore': async (contractID: string, before: string = '', howMany: number = CHATROOM_ACTIONS_PER_PAGE) => {
    const events = await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/eventsBefore/${contractID}?before=${before}&howMany=${howMany}`)
      .then(handleFetchResult('json'))
    if (Array.isArray(events)) {
      return events.reverse().map(e => b64ToStr(e))
    }
  },
  'backend/latestHash': (contractID: string) => {
    return fetch(`${sbp('okTurtles.data/get', 'API_URL')}/latestHash/${contractID}`)
      .then(handleFetchResult('text'))
  },
  /**
   * Fetches a JSON object containing translation strings for a given language.
   *
   * @param language - A BPC-47 language tag like the value
   * of `navigator.language`.
   *
   * @see The 'translations/init' SBP selector in `~view-utils/translations.js`.
   */
  async 'backend/translations/get' (language: string): Promise<?JSONObject> {
    // The language code is usually the first part of the language tag.
    const [languageCode] = language.toLowerCase().split('-')
    const languageFileName = languageFileMap.get(languageCode) || ''

    if (languageFileName !== '') {
      return await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/assets/strings/${languageFileName}`)
        .then(handleFetchResult('json'))
    }
  }
})
