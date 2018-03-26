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
    // see: https://github.com/dcodeIO/protobuf.js/issues/828#issuecomment-307877338
    instance._obj = this.fields.toObject(this.fields.decode(buffer), {bytes: String})
    if (instance.toHash() !== hash) throw Error('fromProtobuf: corrupt hash!')
    return instance
  }
  constructor (obj?: Object) {
    // Unless we do this we'll get different hashes on the server and the frontend 'bytes'
    this._obj = !obj ? {} : this.constructor.fields.toObject(
      this.constructor.fields.fromObject(obj),
      { bytes: String } // http://dcode.io/protobuf.js/global.html#ConversionOptions
    )
  }
  toHash (): string {
    // no need to hash twice
    if (this._hash) return this._hash
    // TODO: for node/electron, switch to: https://github.com/ludios/node-blake2
    let uint8array = blake.blake2b(this.toProtobuf(), null, 32)
    // TODO: if we switch to webpack we may need: https://github.com/feross/buffer
    // https://github.com/feross/typedarray-to-buffer
    var buf = Buffer.from(uint8array.buffer)
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
    state: {_async: []},
    // mutations must be named exactly the same as corresponding Actions
    mutations: {clearAsync (state) { state._async = [] }}
  })
  static Transforms (transforms) {
    return {...(Object.getPrototypeOf(this).transforms || {}), ...transforms}
  }
  static Vuex (vuex: Object) {
    if (!vuex.mutations[this.name]) {
      // default state initializer function
      vuex.mutations[this.name] = function () {}
    }
    return _.merge(_.cloneDeep((Object.getPrototypeOf(this).vuex || {})), vuex)
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
  static authorization = 'CanModifyState' // by default we assume CanModifyState
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
// Group
// =======================

export class HashableGroup extends HashableContract {
  static fields = HashableGroup.Fields([
    // TODO: add 'groupPubkey'
    ['creationDate', 'string'],
    ['groupName', 'string'],
    ['sharedValues', 'string'],
    ['changePercentage', 'uint32'],
    ['openMembership', 'bool'],
    ['memberApprovalPercentage', 'uint32'],
    ['memberRemovalPercentage', 'uint32'],
    ['incomeProvided', 'float'],
    ['incomeCurrency', 'string'],
    ['contributionPrivacy', 'string'],
    ['founderUsername', 'string'],
    ['founderIdentityContractId', 'string']
  ])
  constructor (data: JSONObject, parentHash?: string) {
    super({...data, creationDate: new Date().toISOString()}, parentHash)
  }
}

export class HashableGroupPayment extends HashableAction {
  static fields = HashableGroupPayment.Fields([
    ['payment', 'string'] // TODO: change to 'double' and add other fields
  ])
}
export class Action extends Hashable {
  static fields = Action.Fields([
    ['contractId', 'string'],
    ['action', 'string']
  ])
}

export class HashableGroupProposal extends HashableAction {
  static fields = HashableGroupProposal.Fields([
    ['type', 'string'],
    ['percentage', 'uint32'],
    ['actions', 'Action', 'repeated'],
    ['candidate', 'string'],
    ['initiator', 'string'],
    ['initiationDate', 'string'],
    ['expirationDate', 'string']
  ])
}

export class HashableGroupVoteForProposal extends HashableAction {
  static fields = HashableGroupVoteForProposal.Fields([
    ['username', 'string'],
    ['proposalHash', 'string']
  ])
}

export class HashableGroupVoteAgainstProposal extends HashableAction {
  static fields = HashableGroupVoteAgainstProposal.Fields([
    ['username', 'string'],
    ['proposalHash', 'string']
  ])
}

export class HashableGroupRecordInvitation extends HashableAction {
  static fields = HashableGroupRecordInvitation.Fields([
    ['username', 'string'],
    ['inviteHash', 'string'],
    ['sentDate', 'string']
  ])
}

export class HashableGroupAcceptInvitation extends HashableAction {
  static fields = HashableGroupAcceptInvitation.Fields([
    ['username', 'string'],
    ['identityContractId', 'string'],
    ['inviteHash', 'string'],
    ['acceptanceDate', 'string']
  ])
}

export class HashableGroupDeclineInvitation extends HashableAction {
  static fields = HashableGroupDeclineInvitation.Fields([
    ['username', 'string'],
    ['inviteHash', 'string'],
    ['declinedDate', 'string']
  ])
}
export class HashableGroupSetGroupProfile extends HashableAction {
  static fields = HashableGroupSetGroupProfile.Fields([
    ['username', 'string'],
    ['json', 'string'] // TODO: is there a special JSON type?
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

export class HashableIdentity extends HashableContract {
  static fields = HashableIdentity.Fields([
    ['attributes', 'Attribute', 'repeated']
  ])
  static transforms = HashableIdentity.Transforms({
    attributes: ArrayToMap('name', 'value')
  })
}

export class HashableIdentitySetAttribute extends HashableAction {
  static fields = HashableIdentitySetAttribute.Fields([['attribute', 'Attribute']])
}
export class HashableIdentityDeleteAttribute extends HashableAction {
  static fields = HashableIdentityDeleteAttribute.Fields([['name', 'string']])
}

// =======================
// Mailbox Contract
// =======================

// NOTE: for now, identities will have a mailbox associated with them via
//       a 'mailbox' attribute.
// NOTE: mailboxes can be compacted when a non-trivial number of messages
//       have been deleted by creating a new mailbox initialized with all of the
//       messages that haven't been deleted, and deleting the old mailbox.

export class HashableMailbox extends HashableContract {}

export class HashableMailboxPostMessage extends HashableAction {
  static TypeInvite = 'Invite'
  static TypeMessage = 'Message'
  static TypeProposal = 'Proposal'
  static fields = HashableMailboxPostMessage.Fields([
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

export class HashableMailboxAuthorizeSender extends HashableAction {
  static authorization = CanModifyAuths
  static fields = HashableMailboxAuthorizeSender.Fields([
    ['sender', 'string']
  ])
}

// Function for converting from Frontend Contracts
// TODO: Write in a generic way without switch statement
export function ConvertToBackendEntry (entry: Object, hash: string) {
  switch (entry.type) {
    case 'IdentityContract':
      return HashableIdentity.fromObject(entry, hash)
    case 'GroupContract':
      return HashableGroup.fromObject(entry, hash)
    case 'MailboxContract':
      return HashableMailbox.fromObject(entry, hash)
  }
}
