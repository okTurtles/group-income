'use strict'

import sbp from '~/shared/sbp.js'
import { sign, bufToB64, b64ToStr } from '~/shared/functions.js'
import { GIMessage } from '~/shared/GIMessage.js'
import { RESPONSE_TYPE } from '~/shared/constants.js'
import { CONTRACTS_MODIFIED } from '~/frontend/utils/events.js'
import { intersection, difference, delay, randomIntFromRange } from '~/frontend/utils/giLodash.js'
import pubsub from './utils/pubsub.js'
import { handleFetchResult } from './utils/misc.js'
import { ACTION_REGEX } from '~/frontend/model/contracts/Contract.js'

// temporary identity for signing
// const nacl = require('tweetnacl')
import nacl from 'tweetnacl'

var persona = nacl.sign.keyPair()
var signature = signJSON('', persona)

function signJSON (json, keypair) {
  return sign({
    publicKey: bufToB64(keypair.publicKey),
    secretKey: bufToB64(keypair.secretKey)
  }, json)
}

var contractSubscriptions = {}
var serverSocket

export function createWebSocket (url: string, options: Object): Promise<Object> {
  return new Promise((resolve, reject) => {
    serverSocket = pubsub({
      url,
      options,
      handlers: {
        open: () => {
          console.log('websocket connection opened!')
          resolve(serverSocket)
        },
        error: err => {
          console.log('websocket error:', err.message, err)
          reject(err)
        },
        data: msg => {
          // TODO: place us in unrecoverable state (see state.js error handling TODOs)
          if (!msg.data) throw new Error('malformed message: ' + JSON.stringify(msg))
          switch (msg.type) {
            case RESPONSE_TYPE.ENTRY:
              // We MUST use 'state/enqueueHandleEvent' here to ensure handleEvent()
              // is called AFTER any currently-running calls to syncContractWithServer().
              // Calling via SBP also makes it simple to implement 'test/backend.js'
              sbp('state/enqueueHandleEvent', GIMessage.deserialize(msg.data))
              break
            case RESPONSE_TYPE.SUB:
            case RESPONSE_TYPE.UNSUB:
            case RESPONSE_TYPE.PUB: // .PUB can be used to send ephemeral messages outside of any contract logs
              console.debug(`NOTE: ignoring websocket event ${msg.type} in room:`, msg.data)
              break
            default:
              console.error('SOCKET UNHANDLED EVENT!', msg) // TODO: this
          }
        }
      }
      // TODO: handle going offline event
    })
    serverSocket.on('reconnected', () => {
      const contractIDs = Object.keys(contractSubscriptions)
      console.log('websocket connection re-established. re-joining:', contractIDs)
      contractIDs.forEach(id => serverSocket.sub(id))
    })
  })
}

// Keep pubsub in sync (logged into the right "rooms") with store.state.contracts
sbp('okTurtles.events/on', CONTRACTS_MODIFIED, async (contracts) => {
  const subscribedIDs = Object.keys(contractSubscriptions)
  const currentIDs = Object.keys(contracts)
  const leaveSubscribed = intersection(subscribedIDs, currentIDs)
  const toUnsubscribe = difference(subscribedIDs, leaveSubscribed)
  const toSubscribe = difference(currentIDs, leaveSubscribed)
  try {
    for (const contractID of toUnsubscribe) {
      const res = await serverSocket.unsub(contractID)
      delete contractSubscriptions[contractID]
      console.debug(`[Backend] unsubscribed ${contractID}`, res)
    }
    for (const contractID of toSubscribe) {
      const res = await serverSocket.sub(contractID)
      contractSubscriptions[contractID] = true
      console.debug(`[Backend] subscribed ${contractID}`, res)
    }
  } catch (e) {
    // TODO: handle any exceptions!
    console.error('CONTRACTS_MODIFIED: error in pubsub!', e, { toUnsubscribe, toSubscribe })
  }
})

sbp('sbp/selectors/register', {
  'backend/publishLogEntry': async (entry: GIMessage, { maxAttempts = 2 } = {}) => {
    const action = ACTION_REGEX.exec(entry.type())[1]
    var attempt = 1
    // auto resend after short random delay
    // https://github.com/okTurtles/group-income-simple/issues/608
    while (true) {
      const r = await fetch(`${process.env.API_URL}/event`, {
        method: 'POST',
        body: entry.serialize(),
        headers: {
          'Content-Type': 'text/plain',
          'Authorization': `gi ${signature}`
        }
      })
      if (r.ok) {
        return r['text']()
      }
      if (r.status === 409) {
        if (attempt + 1 > maxAttempts) {
          console.error(`publishLogEntry: failed to publish ${action} after ${attempt} of ${maxAttempts} attempts`, entry)
          throw new Error(`publishLogEntry: ${r.status} - ${r.statusText}. attempt ${attempt}`)
        }
        // create new entry
        const randDelay = randomIntFromRange(0, 1500)
        console.warn(`publishLogEntry: attempt ${attempt} of ${maxAttempts} failed. Waiting ${randDelay} msec before resending ${action}`)
        attempt += 1
        await delay(randDelay) // wait half a second before sending it again
        // re-create it to get correct latestHash
        entry = await sbp(`${action}create`, entry.data(), entry.contractID())
      } else {
        console.error(`publishLogEntry: ${r.status} - ${r.statusText}, failed to publish ${action}:`, entry)
        throw new Error(`publishLogEntry: ${r.status} - ${r.statusText}`)
      }
    }
  },
  // TODO: r.body is a stream.Transform, should we use a callback to process
  //       the events one-by-one instead of converting to giant json object?
  //       however, note if we do that they would be processed in reverse...
  'backend/eventsSince': async (contractID: string, since: string) => {
    var events = await fetch(`${process.env.API_URL}/events/${contractID}/${since}`)
      .then(handleFetchResult('json'))
    if (Array.isArray(events)) {
      return events.reverse().map(e => b64ToStr(e))
    }
  },
  'backend/latestHash': (contractID: string) => {
    return fetch(`${process.env.API_URL}/latestHash/${contractID}`)
      .then(handleFetchResult('text'))
  }
})
