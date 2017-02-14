'use strict'

import multihash from 'multihashes'
import protobuf from 'protobufjs/light'
import {makeResponse} from './functions'
import {RESPONSE_TYPE} from './constants'
import type {JSONObject} from './types'

const blake = require('blakejs')
const {Type, Field, Root} = protobuf
const root = new Root().define('groupincome')

// To ensure objects consistently hash across all platforms, we use protobufs
// instead of hashing the JSON, since order of object keys is unspecified in JSON
export class Hashable {
  // Type annotations to make Flow happy
  _hash: string
  _obj: Object
  // set `fields` in subclasses using: static fields = Class.Declare([...])
  static fields: any // https://developers.google.com/protocol-buffers/docs/proto3
  static Declare (fields) {
    var t = new Type(this.name)
    fields.forEach(([name, type, rule], idx) => {
      t.add(new Field(name, idx + 1, type, rule))
    })
    root.add(t)
    return t
  }
  // https://flowtype.org/docs/classes.html#this-type
  static fromObject (obj, hash): this {
    var instance = new this()
    instance._obj = obj
    if (instance.toHash() !== hash) throw Error('fromObject: corrupt hash!')
    return instance
  }
  static fromProtobuf (buffer, hash) {
    var instance = new this()
    instance._obj = this.fields.decode(buffer).toObject()
    if (instance.toHash() !== hash) throw Error('fromProtobuf: corrupt hash!')
    return instance
  }
  constructor (obj?: Object) { this._obj = obj || {} }
  toHash (): string {
    // no need to hash twice
    if (this._hash) return this._hash
    // TODO: for node/electron, switch to: https://github.com/ludios/node-blake2
    let uint8array = blake.blake2b(this.toProtobuf())
    // https://github.com/feross/typedarray-to-buffer
    var buf = new Buffer(uint8array.buffer)
    this._hash = multihash.toB58String(multihash.encode(buf, 'blake2b'))
    return this._hash
  }
  toProtobuf (): Buffer { return this.constructor.fields.encode(this._obj).finish() }
  toJSON () { return JSON.stringify(this._obj) }
  toObject () { return this._obj } // NOTE: NEVER MODIFY THE RETURNED OBJECT!
}

export class HashableEntry extends Hashable {
  static Declare (fields) {
    var msgData = super.Declare(fields)
    var msg = new Type(this.name + 'Entry')
    msg.add(new Field('version', 1, 'uint32'))
    msg.add(new Field('type', 2, 'string'))
    msg.add(new Field('parentHash', 3, 'string'))
    msg.add(new Field('data', 4, msgData.name))
    root.add(msg)
    return msg
  }
  constructor (data: JSONObject = {}, parentHash?: string) {
    super()
    this._obj = {
      version: 0,
      type: this.constructor.name,
      parentHash: parentHash || '',
      data
    }
  }
  toResponse (contractId: string) {
    return makeResponse(RESPONSE_TYPE.ENTRY, {
      contractId,
      hash: this.toHash(),
      entry: this.toObject()
    })
  }
  get data (): Object { return this.toObject().data }
}

export class HashableContract extends HashableEntry {
  static actions = {
    // places class declarations of subclasses of HashableEntry's here.
  }
  static vuex = {
    // vuex module namespaced under this contract's hash (see `registerVuexModule`)
    // see details: https://vuex.vuejs.org/en/modules.html
    namespaced: true
    // mutations must be named exactly the same as corresponding Actions
  }
  // creates an new instance and registers its state on the vuex store
  static fromState (store, hash, state) {
    var instance = new this()
    instance._hash = hash
    instance.registerVuexModule(store, state)
    return instance
  }
  registerVuexModule (store: Object, state?: Object) {
    var module = Object.assign({}, this.constructor.vuex)
    module.state = state || {...module.state, ...this.data}
    store.registerModule(this.toHash(), module)
  }
  unregisterVuexModule (store: Object) {
    store.unregisterModule(this.toHash())
  }
  // override this method to determine if the action can be posted to the
  // contract. Typically this is done by signature verification.
  // TODO: implement this in subclasses
  isActionAllowed (action: HashableAction): boolean { return true }
  // A contract has:
  // 1. code (actions)
  // 2. data (state, updated by sending actions to the contract)
  //
  // A contract can be:
  // 1. created (defined)
  // 2. acted upon (by sending a txn to it that calls an action)
  // 3. subscribed to (to get the list of txns that have been sent to it)
  // 4. read from (the reduction of txns produces the current state)
  //
  // In our implementation, each method invocation (txn) is a HashableEntry
  //
  // NOTE: Each contract represents its own log of events. If a user
  //       is in multiple groups and changes their profile's contribution
  //       amount... well, that should only be reflected in that group's
  //       log. But if they change their profile picture, that shouldn't
  //       be stored in the group's log. Where is that message stored?
  //       Clearly they must have their own log that they're generating.
  //       So they must have a profile independent of the group, and a
  //       group-specific profile. But the group-specific profile
  //       can just be built-up by sending messages like this to the
  //       group log:
  //
  //       ProfileAdjustment: {name: 'Greg', adjustment: {giveLimit: 100}}
  //
  //       That "ProfileAdjustment" in turn would represent an *action*
  //       on the GroupContract.
}

export class HashableAction extends HashableEntry {
  // Why the extra Vue parameter?
  // https://vuejs.org/v2/guide/reactivity.html#Change-Detection-Caveats
  apply (store: Object, contractId: string, Vue: Object) {
    store.commit(`${contractId}/${this.constructor.name}`, this.data)
  }
}

// =======================
// Group Contract
// =======================

export class GroupContract extends HashableContract {
  static fields = GroupContract.Declare([
    // TODO: add 'groupPubkey'
    ['creationDate', 'string'],
    ['groupName', 'string'],
    ['sharedValues', 'string'],
    ['changePercentage', 'uint32'],
    ['openMembership', 'bool'],
    ['memberApprovalPercentage', 'uint32'],
    ['memberRemovalPercentage', 'uint32'],
    ['contributionPrivacy', 'string'],
    ['founderUsername', 'string']
  ])
  static actions = { Payment, Vote, ProfileAdjustment }
  static vuex = {
    ...GroupContract.vuex, // make sure we're namespaced
    state: { votes: [], payments: [] },
    mutations: {
      Payment (state, data) { state.payments.push(data) },
      Vote (state, data) { state.votes.push(data) }
    }
  }
  constructor (data: JSONObject, parentHash?: string) {
    super({...data, creationDate: new Date().toISOString()}, parentHash)
  }
}

export class Payment extends HashableAction {
  static fields = Payment.Declare([
    ['payment', 'string'] // TODO: change to 'double' and add other fields
  ])
}

export class Vote extends HashableAction {
  static fields = Vote.Declare([
    ['vote', 'string'] // TODO: make a real vote
  ])
}

export class ProfileAdjustment extends HashableAction {
  // TODO: this
}

// =======================
// Identity Contract
// =======================

export class Attribute extends Hashable {
  static fields = Attribute.Declare([
    ['name', 'string'],
    ['value', 'string']
  ])
}

export class IdentityContract extends HashableContract {
  static fields = IdentityContract.Declare([
    ['attributes', 'Attribute', 'repeated']
  ])
  registerVuexModule (store: Object, state?: Object) {
    super.registerVuexModule(store, state)
    var myState = store[this.toHash()]
    // transform attributes from an array of pairs into an easier-to-access key-value map
    myState.attributes = myState.attributes.reduce((accum, v) => {
      accum[v.name] = v.value
      return accum
    }, {})
  }
}
