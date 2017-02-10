'use strict'

import request from 'superagent'
import {Backend, TrustedNamespace} from './interface'
import * as pubsub from '../pubsub'
import {sign} from '../../../../shared/functions'
import {HashableEntry, Identity} from '../../../../shared/events'

// temporary identity for signing
const nacl = require('tweetnacl')
var buf2b64 = buf => Buffer.from(buf).toString('base64')
var persona = nacl.sign.keyPair()
var signature = sign({
  publicKey: buf2b64(persona.publicKey),
  secretKey: buf2b64(persona.secretKey)
})

export class HapiBackend extends Backend {
  constructor () {
    super()
    this._subscriptions = []
    pubsub.primus.on('reconnected', () => {
      var subs = this._subscriptions
      console.log('websocket connection re-established. re-joining:', subs)
      subs.forEach(pubsub.joinRoom)
    })
  }
  publishLogEntry (groupId: string, entry: HashableEntry) {
    console.log(`publishLogEntry to ${groupId}:`, entry)
    return request.post(`${process.env.API_URL}/event/${groupId}`)
      .set('Authorization', `gi ${signature}`)
      .send({hash: entry.toHash(), entry: entry.toObject()})
  }
  subscriptions () {
    return this._subscriptions // return a copy instead?
  }
  async subscribe (groupId: string) {
    console.log('subscribing to:', groupId)
    if (this._subscriptions.indexOf(groupId) !== -1) {
      return console.log('already subscribed:', groupId)
    }
    var res = await pubsub.joinRoom(groupId)
    this._subscriptions.push(groupId)
    console.log('subscribed to:', groupId, 'response:', res)
    return res
  }
  async unsubscribe (groupId: string) {
    let index = this._subscriptions.indexOf(groupId)
    if (index === -1) {
      return console.error('HapiBackend.unsubscribe: not subscribed!', groupId)
    }
    var res = await pubsub.leaveRoom(groupId)
    this._subscriptions.splice(index, 1)
    return res
  }
}

export class HapiNamespace extends TrustedNamespace {
  // prefix groups with `group/` and users with `user/`
  register (name: string, identity: Identity) {
    console.log(`register name:`, name)
    return request.post(`${process.env.API_URL}/name`)
      .send({hash: identity.toHash(), entry: identity.toObject()})
  }
  lookup (name: string) {
    console.log(`lookup name:`, name)
    return request.get(`${process.env.API_URL}/name/${name}`)
  }
}
