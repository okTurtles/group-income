'use strict'

import sbp from '~/shared/sbp.js'
import { sign, bufToB64, b64ToStr } from '~/shared/functions.js'
import { GIMessage } from '~/shared/GIMessage.js'
import { RESPONSE_TYPE } from '~/shared/constants.js'
import { CONTRACTS_MODIFIED } from '~/frontend/utils/events.js'
import { intersection, difference } from '~/frontend/utils/giLodash.js'
import pubsub from './utils/pubsub.js'
import { handleFetchResult } from './utils/misc.js'

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
              // calling dispatch via SBP makes it simple to implement 'test/backend.js'
              sbp('state/vuex/dispatch', 'handleEvent', GIMessage.deserialize(msg.data))
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
    console.error(`CONTRACTS_MODIFIED: error in pubsub!`, e, { toUnsubscribe, toSubscribe })
  }
})

sbp('sbp/selectors/register', {
  'backend/publishLogEntry': (entry: GIMessage) => {
    return fetch(`${process.env.API_URL}/event`, {
      method: 'POST',
      body: entry.serialize(),
      headers: {
        'Content-Type': 'text/plain',
        'Authorization': `gi ${signature}`
      }
    // TODO: auto resend after short random delay
    //       https://github.com/okTurtles/group-income-simple/issues/608
    }).then(handleFetchResult('text'))
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
