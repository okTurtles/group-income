/* global fetch */
'use strict'

import request from 'superagent'
import store from '../state'
import {Backend, TrustedNamespace} from './interface'
import pubsub from '../pubsub'
import {sign} from '../../../../shared/functions'
import * as Events from '../../../../shared/events'
import {RESPONSE_TYPE} from '../../../../shared/constants'

const {HashableEntry} = Events
// temporary identity for signing
const nacl = require('tweetnacl')
var buf2b64 = buf => Buffer.from(buf).toString('base64')
var persona = nacl.sign.keyPair()
var signature = sign({
  publicKey: buf2b64(persona.publicKey),
  secretKey: buf2b64(persona.secretKey)
})

// initiate websocket connection with defaults.
// do this in this file, for a few reasons:
// 1. Because test/backend.js also imports pubsub.js and uses different settings,
//    and will throw an error if ./state.js is imported. So we import that here,
//    not in pubsub.js.
// 2. By adding methods to the Primus prototype, we can guarantee that the
//    backend tests run the same exact pub/sub/unsub code as the frontend.
// 3. It makes sense for the Hapi-specific backend to handle its own setup of
//    of the pubsub, which might be different in a different backend.
const primus = pubsub({
  url: process.env.API_URL,
  options: {
    // TODO: verify these are good defaults
    timeout: 3000,
    strategy: ['disconnect', 'online', 'timeout']
  },
  handlers: {
    error: err => console.log('SOCKET ERR:', err.message),
    open: () => console.log('websocket connection opened!'),
    data: msg => {
      if (msg.type === RESPONSE_TYPE.ENTRY) {
        console.log('SOCKET GOT NEW LOG ENTRY:', msg)
        if (!msg.data) throw Error('malformed message: ' + JSON.stringify(msg))
        store.dispatch('handleEvent', msg.data)
      } else {
        console.log('SOCKET UNHANDLED EVENT!', msg) // TODO: this
      }
    }
    // TODO: handle going offline event
  }
})

export class HapiBackend extends Backend {
  constructor () {
    super()
    primus.on('reconnected', () => {
      var subs = this.subscriptions()
      console.log('websocket connection re-established. re-joining:', subs)
      subs.forEach(contractId => primus.sub(contractId))
    })
  }
  publishLogEntry (contractId: string, entry: HashableEntry) {
    console.log(`publishLogEntry to ${contractId}:`, entry)
    // TODO: There used to be a permission check here buts its duplicated when a subcribed
    // contract received the events
    // in cases like send of messages the check information is not known so this check
    // is better left to the server and the subscribers to perform the check
    return request.post(`${process.env.API_URL}/event/${contractId}`)
      .set('Authorization', `gi ${signature}`)
      .send({hash: entry.toHash(), entry: entry.toObject()})
  }
  async subscribe (contractId: string) {
    console.log('subscribing to:', contractId)
    // this mutation makes sure not to add duplicates
    store.commit('pending', contractId)
    // we don't need to check if we're already subscribed, server handles that
    var res = await primus.sub(contractId)
    console.log('subscribed response:', res)
    return res
  }
  async unsubscribe (contractId: string) {
    if (this.subscriptions().indexOf(contractId) === -1) {
      return console.error('HapiBackend.unsubscribe: not subscribed!', contractId)
    }
    var res = await primus.unsub(contractId)
    store.commit('removeContract', contractId)
    store.dispatch('saveSettings')
    return res
  }
  // TODO add event strean method returning string.transform
  async latestHash (contractId: string) {
    let response = await fetch(`${process.env.API_URL}/latestHash/${contractId}`).then(r => r.json())
    return response.data.hash
  }
  async eventsSince (contractId: string, since: string) {
    let response = await fetch(`${process.env.API_URL}/events/${contractId}/${since}`).then(r => r.json())
    return response
  }
}

export class HapiNamespace extends TrustedNamespace {
  // prefix groups with `group/` and users with `user/`
  async register (name: string, value: string) {
    console.log(`registering name:`, name)
    let response = await request.post(`${process.env.API_URL}/name`).send({name, value})
    return response.body.data
  }
  async lookup (name: string) {
    console.log(`lookup name:`, name)
    // TODO: should `name` be encodeURI'd?
    let response = await request.get(`${process.env.API_URL}/name/${name}`)
    return response.body.data.value
  }
}
