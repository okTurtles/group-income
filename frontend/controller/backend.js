'use strict'

import sbp from '~/shared/sbp.js'
import { sign, bufToB64, b64ToStr } from '~/shared/functions.js'
import { GIMessage } from '~/shared/GIMessage.js'
import { RESPONSE_TYPE } from '~/shared/constants.js'
import { CONTRACTS_MODIFIED } from '@utils/events.js'
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

var contractSubscriptions = []
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
          console.log('websocket message:', msg)
          if (!msg.data) throw new Error('malformed message: ' + JSON.stringify(msg))
          switch (msg.type) {
            case RESPONSE_TYPE.ENTRY:
              // calling dispatch via SBP makes it simple to implement 'test/backend.js'
              sbp('state/vuex/dispatch', 'handleEvent', GIMessage.deserialize(msg.data))
              break
            default:
              console.log('SOCKET UNHANDLED EVENT!', msg) // TODO: this
          }
        }
      }
      // TODO: handle going offline event
    })
    serverSocket.on('reconnected', () => {
      console.log('websocket connection re-established. re-joining:', contractSubscriptions)
      contractSubscriptions.forEach(contractID => serverSocket.sub(contractID))
    })
  })
}

// Keep pubsub in sync (logged into the right "rooms") with store.state.contracts
sbp('okTurtles.events/on', CONTRACTS_MODIFIED, async (data) => {
  var contractID = data.add || data.remove
  var idx = contractSubscriptions.indexOf(contractID)
  var method = data.add ? 'sub' : 'unsub'
  if ((data.add && idx > -1) || (data.remove && idx === -1)) {
    return // if already subscribed or already unsubscribed
  }
  // TODO: handle any exceptions!
  var res = await serverSocket[method](contractID)
  if (data.add) {
    contractSubscriptions.push(contractID)
  } else {
    contractSubscriptions.splice(idx, 1)
  }
  console.log(`[Backend] ${method}scribed ${contractID}:`, res)
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
