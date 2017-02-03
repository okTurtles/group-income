'use strict'

import multihash from 'multihashes'
import protobuf from 'protobufjs/light'
import {makeResponse} from './functions'
import {RESPONSE_TYPE} from './constants'
import type {JSONObject} from './types'

const blake = require('blakejs')
const {Type, Field, Root} = protobuf
const root = new Root().define('groupincome')

export class HashableEntry {
  // Type annotations to make Flow happy
  _entry: Object
  _hash: string
  static message: any
  static Initialize (dataFields) {
    var msg = new Type(this.name)
    var msgData = new Type(this.name + 'Data')
    dataFields.forEach(([field, type], idx) => {
      msgData.add(new Field(field, idx + 1, type))
    })
    msg.add(new Field('version', 1, 'string'))
    msg.add(new Field('type', 2, 'string'))
    msg.add(new Field('parentHash', 3, 'string'))
    msg.add(new Field('data', 4, msgData.name))
    root.add(msgData)
    root.add(msg)
    return msg
  }
  static fromProtobuf (buffer, hash) {
    var instance = new this()
    instance._entry = this.message.decode(buffer).toObject()
    if (instance.toHash() !== hash) throw Error('fromProtobuf: corrupt hash!')
    return instance
  }
  static fromObject (obj, hash) {
    var instance = new this()
    instance._entry = obj
    if (instance.toHash() !== hash) throw Error('fromObject: corrupt hash!')
    return instance
  }
  constructor (data: JSONObject = {}, parentHash?: string) {
    // Variables prefixed with _ MUST NOT BE MODIFIED EXTERNALLY!
    this._entry = {
      version: '0.0.1',
      type: this.constructor.name,
      parentHash: parentHash || '',
      data
    }
  }
  toHash () {
    // no need to hash twice
    if (this._hash) return this._hash
    // TODO: for node/electron, switch to: https://github.com/ludios/node-blake2
    let uint8array = blake.blake2b(this.toProtobuf())
    // https://github.com/feross/typedarray-to-buffer
    var buf = new Buffer(uint8array.buffer)
    this._hash = multihash.toB58String(multihash.encode(buf, 'blake2b'))
    return this._hash
  }
  toResponse (groupId: string) {
    return makeResponse(RESPONSE_TYPE.ENTRY, {
      groupId,
      hash: this.toHash(),
      entry: this.toObject()
    })
  }
  toProtobuf () { return this.constructor.message.encode(this._entry).finish() }
  toJSON () { return JSON.stringify(this._entry) }
  toObject () { return this._entry } // NOTE: NEVER MODIFY THE RETURNED OBJECT!
}

export class Group extends HashableEntry {
  static message = Group.Initialize([
    ['creationDate', 'string'],
    ['groupName', 'string'],
    ['sharedValues', 'string'],
    ['changePercentage', 'uint32'],
    ['openMembership', 'bool'],
    ['memberApprovalPercentage', 'uint32'],
    ['memberRemovalPercentage', 'uint32'],
    ['contributionPrivacy', 'string'],
    ['founderHashKey', 'string']
  ])
  constructor (data: JSONObject, parentHash?: string) {
    super({...data, creationDate: new Date().toISOString()}, parentHash)
  }
}

export class Payment extends HashableEntry {
  static message = Payment.Initialize([
    ['payment', 'string'] // TODO: change to 'double' and add other fields
  ])
}

export class Vote extends HashableEntry {
  static message = Vote.Initialize([
    ['vote', 'string'] // TODO: make real
  ])
}

export const Events = {
  Group, Payment, Vote
}
