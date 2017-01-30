'use strict'

import request from 'superagent'
import {Backend} from './interface'
import * as pubsub from '../pubsub'
import {toHash, sign} from '../../../../shared/functions'
import type {Entry} from '../../../../shared/types'

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
  async publishLogEntry (groupId: string, entry: Entry, hash?: string) {
    if (!hash) hash = toHash(entry)
    console.log('about to publishLogEntry:', entry)
    let res = await request.post(`${process.env.API_URL}/event/${groupId}`)
      .set('Authorization', `gi ${signature}`)
      .send({hash, entry})
    return res.body
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
  }
  async unsubscribe (groupId: string) {
    let index = this._subscriptions.indexOf(groupId)
    if (index === -1) {
      return console.error('HapiBackend.unsubscribe: not subscribed!', groupId)
    }
    await pubsub.leaveRoom(groupId)
    this._subscriptions.splice(index, 1)
  }
}
