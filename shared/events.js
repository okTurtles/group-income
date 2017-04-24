'use strict'
import multihash from 'multihashes'
import protobuf from 'protobufjs/light'
import {makeResponse} from './functions'
import {RESPONSE_TYPE} from './constants'
import type {JSONObject} from './types'
import _ from 'lodash'

const nacl = require('tweetnacl')
const blake = require('blakejs')
const {Type, Field, Root} = protobuf
const root = new Root({bytes: String}).define('groupincome')
// import Vue for: https://vuejs.org/v2/guide/reactivity.html#Change-Detection-Caveats
const Vue = typeof window !== 'undefined' ? require('vue') : {
  // TODO: remove this when we switch to electron?
  set: (o, k, v) => { o[k] = v },
  delete: (o, k) => { delete o[k] }
}

// To ensure objects consistently hash across all platforms, we use protobufs
// instead of hashing the JSON, since order of object keys is unspecified in JSON
export class Hashable {
  // Type annotations to make Flow happy
  _hash: string
  _obj: Object
  _sig: Buffer // TODO: implement
  // `fields` represents the *initial* fields/data that the contract is created with
  // set `fields` in subclasses using: static fields = Class.Fields([...])
  static fields: any // https://developers.google.com/protocol-buffers/docs/proto3
  static Fields (fields) {
    var t = new Type(this.name)
    var idx = 0
    var addFields = ([name, type, rule]) => {
      t.add(new Field(name, ++idx, type, rule))
    }
    // we make sure subclasses inherit the fields defined in the superclass
    // note that this doesn't work: super.fields && super.fields.forEach(addFields)
    var pf = root.lookup(Object.getPrototypeOf(this).name)
    pf && pf.fieldsArray && pf.fieldsArray.forEach(f => addFields([f.name, f.type, f.rule]))
    // now add our fields
    fields.forEach(addFields)
    root.add(t)
    return t
  }
  // https://flowtype.org/docs/classes.html#this-type
  static fromObject (obj, hash): this {
    var instance = new this()
    instance._obj = obj
    if (instance.toHash() !== hash) throw Error(`hash obj: ${instance.toHash()} != hash: ${hash}`)
    return instance
  }
  static fromProtobuf (buffer, hash) {
    var instance = new this()
    instance._obj = this.fields.decode(buffer).toObject({bytes: String})
    if (instance.toHash() !== hash) throw Error('fromProtobuf: corrupt hash!')
    return instance
  }
  constructor (obj?: Object) {
    // Unless we do this we'll get different hashes on the server and the frontend 'bytes'
    this._obj = !obj ? {} : this.constructor.fields.fromObject(obj).toObject({
      bytes: String // http://dcode.io/protobuf.js/global.html#ConversionOptions
    })
  }
  toHash (): string {
    // no need to hash twice
    if (this._hash) return this._hash
    // TODO: for node/electron, switch to: https://github.com/ludios/node-blake2
    let uint8array = blake.blake2b(this.toProtobuf(), null, 32)
    // TODO: if we switch to webpack we may need: https://github.com/feross/buffer
    // https://github.com/feross/typedarray-to-buffer
    var buf = new Buffer(uint8array.buffer)
    this._hash = multihash.toB58String(multihash.encode(buf, 'blake2b-32', 32))
    return this._hash
  }
  toProtobuf (): Buffer { return this.constructor.fields.encode(this._obj).finish() }
  toJSON () { return JSON.stringify(this._obj) }
  toObject () { return this._obj } // NOTE: NEVER MODIFY THE RETURNED OBJECT!
  // signature related
  signWithKey (key: Uint8Array) { this._sig = nacl.sign.detached(this.toProtobuf(), key) }
  get signature (): Buffer { return this._sig }
  set signature (sig: Buffer) { this._sig = sig }
}

export class HashableEntry extends Hashable {
  static Fields (fields) {
    var msgData = super.Fields(fields)
    var msg = new Type(this.name + 'Entry')
    msg.add(new Field('version', 1, 'uint32'))
    msg.add(new Field('type', 2, 'string'))
    msg.add(new Field('parentHash', 3, 'string'))
    msg.add(new Field('data', 4, msgData.name))
    root.add(msg)
    return msg
  }
  constructor (data: JSONObject = {}, parentHash?: string) {
    super({
      version: 0,
      parentHash: parentHash || '',
      data
    })
    this._obj.type = this.constructor.name
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

// =======================
// Base contract class
// =======================

// helper functions for transforming parameters in this.data
// into a different format in the vuex state.
function ArrayToMap (keyPicker, valuePicker) {
  // 'this' will be bound to the contract instance in case it's needed
  return function (state, param) {
    state[param] = state[param].reduce((accum, v) => {
      accum[v[keyPicker]] = valuePicker ? v[valuePicker] : v
      return accum
    }, {})
  }
}

export class HashableContract extends HashableEntry {
  static fields = HashableContract.Fields([
    ['authorizations', 'Authorization', 'repeated']
  ])
  static transforms = HashableContract.Transforms({
    authorizations: ArrayToMap('name')
  })
  static vuex = HashableContract.Vuex({
    // vuex module namespaced under this contract's hash (see `registerVuexState`)
    // see details: https://vuex.vuejs.org/en/modules.html
    namespaced: true,
    // registerVuexState will copy the entry's .data is copied to this state
    state: {},
    // mutations must be named exactly the same as corresponding Actions
    mutations: {}
  })
  static Transforms (transforms) {
    return {...(Object.getPrototypeOf(this).transforms || {}), ...transforms}
  }
  static Vuex (vuex) {
    return {...(Object.getPrototypeOf(this).vuex || {}), ...vuex}
  }
  // override this method to determine if the action can be posted to the
  // contract. Typically this is done by signature verification.
  static isActionAllowed (state: Object, action: HashableAction): boolean {
    return true // TODO: delete this and uncomment the stuff below!
    // const authClass = action.constructor.authorization
    // return authClass.isAuthorized(action, state.authorizations[authClass.name])
  }
  // returns .data converted to vuex state using transforms and any default state
  toVuexState () {
    var state = _.cloneDeep({...this.constructor.vuex.state, ...this.data})
    for (let [param, fn] of Object.entries(this.constructor.transforms)) {
      fn.call(this, state, param)
    }
    return state
  }
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
  static authorization = CanModifyState // by default we assume CanModifyState
}

// =======================
// Authorization related
// =======================

export class AuthorizedKeys extends Hashable {
  static fields = AuthorizedKeys.Fields([
    ['keys', 'bytes', 'repeated'],
    ['n', 'uint32'] // the n of n-of-m
  ])
}

export class Authorization extends Hashable {
  static fields = Authorization.Fields([
    ['name', 'string'], // the subclass name
    ['data', 'string'], // arbitrary data associated with this operation
    ['auths', 'AuthorizedKeys', 'repeated']
  ])
  static isAuthorized (action: HashableAction, authData: Object) {
    return authData.auths.some(auth => {
      const buf = action.toProtobuf()
      var count = 0
      for (let key of auth.keys) {
        if (nacl.detached.verify(buf, action.signature, key)) {
          if (++count >= auth.n) return true
        }
      }
      return false
    })
  }
  // TODO: delete this
  static dummyAuth (data = '') {
    return {name: this.name, data, auths: [{keys: [Buffer.from('1')], n: 1}]}
  }
}

export class CanModifyAuths extends Authorization {
  static isAuthorized (action: HashableAction, authData: Object) {
    return true // TODO: delete this! we just haven't implemented key.verify yet
  }
}
export class CanModifyState extends Authorization {
  static isAuthorized (action: HashableAction, authData: Object) {
    // TODO: delete this and test with real signatures
    return action.data.sender === authData.data
  }
}

// =======================
// Group Contract
// =======================

export class GroupContract extends HashableContract {
  static fields = GroupContract.Fields([
    // TODO: add 'groupPubkey'
    ['creationDate', 'string'],
    ['groupName', 'string'],
    ['sharedValues', 'string'],
    ['changePercentage', 'uint32'],
    ['openMembership', 'bool'],
    ['memberApprovalPercentage', 'uint32'],
    ['memberRemovalPercentage', 'uint32'],
    ['incomeProvided', 'float'],
    ['contributionPrivacy', 'string'],
    ['founderUsername', 'string']
  ])
  static vuex = GroupContract.Vuex({
    state: { votes: [], payments: [], members: [], invitees: [], profiles: {} },
    mutations: {
      Payment (state, data) { state.payments.push(data) },
      Vote (state, data) { state.votes.push(data) },
      RecordInvitation (state, data) { state.invitees.push(data.username) },
      DeclineInvitation (state, data) {
        let index = state.invitees.findIndex(username => username === data.username)
        if (index > -1) { state.invitees.splice(index, 1) }
      },
      AcceptInvitation (state, data) {
        let index = state.invitees.findIndex(username => username === data.username)
        if (index > -1) {
          state.invitees.splice(index, 1)
          state.members.push(data.username)
        }
      },
      AcknowledgeFounder (state, data) {
        if (!state.members.find(username => username === data.username)) { state.members.push(data.username) }
      },
      // TODO: remove group profile when leave group is implemented
      ProfileAdjustment (state, data) {
        let profile = state.profiles[data.username]
        if (!profile) { profile = state.profiles[data.username] = {} }
        if (!data.value) { return delete profile[data.name] }
        profile[data.name] = data.value
      }
    }
  })
  constructor (data: JSONObject, parentHash?: string) {
    super({...data, creationDate: new Date().toISOString()}, parentHash)
  }
  toVuexState () {
    let state = super.toVuexState()
    // Place founder in group members before returning the initial state
    state.members.push(state.founderUsername)
    return state
  }
}

export class Payment extends HashableAction {
  static fields = Payment.Fields([
    ['payment', 'string'] // TODO: change to 'double' and add other fields
  ])
}

export class Vote extends HashableAction {
  static fields = Vote.Fields([
    ['vote', 'string'] // TODO: make a real vote
  ])
}

export class RecordInvitation extends HashableAction {
  static fields = RecordInvitation.Fields([
    ['username', 'string'],
    ['inviteHash', 'string'],
    ['sentDate', 'string']
  ])
}

export class AcceptInvitation extends HashableAction {
  static fields = AcceptInvitation.Fields([
    ['username', 'string'],
    ['acceptanceDate', 'string']
  ])
}

export class DeclineInvitation extends HashableAction {
  static fields = DeclineInvitation.Fields([
    ['username', 'string'],
    ['declinedDate', 'string']
  ])
}
export class ProfileAdjustment extends HashableAction {
  static fields = ProfileAdjustment.Fields([
    ['username', 'string'],
    ['name', 'string'],
    ['value', 'string']
  ])
}

// =======================
// Identity Contract
// =======================

export class Attribute extends Hashable {
  static fields = Attribute.Fields([
    ['name', 'string'],
    ['value', 'string']
  ])
}

export class IdentityContract extends HashableContract {
  static fields = IdentityContract.Fields([
    ['attributes', 'Attribute', 'repeated']
  ])
  static transforms = IdentityContract.Transforms({
    attributes: ArrayToMap('name', 'value')
  })
  static vuex = IdentityContract.Vuex({
    mutations: {
      SetAttribute (state, {attribute: {name, value}}) { Vue.set(state.attributes, name, value) },
      DeleteAttribute (state, {name}) { Vue.delete(state.attributes, name) }
    }
  })
}

export class SetAttribute extends HashableAction {
  static fields = SetAttribute.Fields([['attribute', 'Attribute']])
}
export class DeleteAttribute extends HashableAction {
  static fields = DeleteAttribute.Fields([['name', 'string']])
}

// =======================
// Mailbox Contract
// =======================

// NOTE: for now, identities will have a mailbox associated with them via
//       a 'mailbox' attribute.
// NOTE: mailboxes can be compacted when a non-trivial number of messages
//       have been deleted by creating a new mailbox initialized with all of the
//       messages that haven't been deleted, and deleting the old mailbox.

export class MailboxContract extends HashableContract {
  static vuex = MailboxContract.Vuex({
    state: { messages: [], nextId: 0 },
    mutations: {
      PostMessage (state, data) { state.messages.push({...data, id: state.nextId++}) },
      AuthorizeSender (state, data) { state.authorizations[AuthorizeSender.authorization.name].data = data.sender }
    }
  })
}

export class PostMessage extends HashableAction {
  static TypeInvite = 'Invite'
  static TypeMessage = 'Message'
  static fields = PostMessage.Fields([
    ['from', 'string'],
    ['headers', 'string', 'repeated'],
    ['messageType', 'string'],
    ['message', 'string'],
    ['sentDate', 'string'],
    ['read', 'bool']
  ])
  constructor (data: JSONObject, parentHash?: string) {
    super({...data, read: false}, parentHash)
  }
}

export class AuthorizeSender extends HashableAction {
  static authorization = CanModifyAuths
  static fields = AuthorizeSender.Fields([
    ['sender', 'string']
  ])
}
