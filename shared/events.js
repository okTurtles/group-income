'use strict'
// import sbp from '../shared/sbp.js'
import {makeResponse, blake32Hash} from './functions.js'
import {RESPONSE_TYPE} from './constants.js'
import type {JSONObject} from './types.js'

function defaultSignatureFn (data: string) {
  return blake32Hash(data)
}

export class GIMessage {
  // NOTE: the JSON string generated here must be preserved forever.
  //       do not ever regenerate this message using the contructor.
  //       instead store it using serialize() and restore it using
  //       deserialize().
  static create (
    contractID: string = null,
    previousHEAD: string = null,
    signatureFn: Function = defaultSignatureFn,
    selector: string,
    selectorData: JSONObject
  ) {
    var instance = new this()
    instance._data = JSON.stringify({
      version: 1,
      previousHEAD,
      contractID,
      selector,
      selectorData
    })
    instance._sig = signatureFn(instance._data)
    const value = JSON.stringify({
      data: instance._data,
      sig: instance._sig
    })
    instance._message = {
      HEAD: blake32Hash(value),
      value
    }
    return instance
  }

  static deserialize (value: string) {
    if (!value) throw new Error(`deserialize bad value: ${value}`)
    var instance = new this()
    instance._message = {HEAD: blake32Hash(value), value}
    value = JSON.parse(value)
    instance._sig = value.sig
    instance._data = JSON.parse(value.data)
    return instance
  }

  static fromResponse ({data}: {data: Object}) {
    return this.deserialize(data)
  }

  get data () {
    return this._data
  }

  isFirstMessage () {
    return !this.data.previousHEAD
  }

  serialize () {
    return this._message.value
  }

  hash (): string {
    return this._message.HEAD
  }

  toResponse () {
    return makeResponse(RESPONSE_TYPE.ENTRY, this.serialize())
  }
  // signWithKey (key: Uint8Array) { this._sig = nacl.sign.detached(this.toProtobuf(), key) }
  // get signature (): Buffer { return this._sig }
  // set signature (sig: Buffer) { this._sig = sig }
}

// TODO: delete everything below after creating runtime validations over the data types
//       in the files under: frontend/simple/model/contracts/*.js
/*
// =======================
// Base contract class
// =======================

// helper functions for transforming parameters in this.data
// into a different format in the vuex state.
function ArrayToMap (keyPicker, valuePicker) {
  // 'this' will be bound to the contract instance in case it's needed
  return function (state: Object, param: string) {
    state[param] = state[param].reduce((accum, v) => {
      accum[v[keyPicker]] = valuePicker ? v[valuePicker] : v
      return accum
    }, {})
  }
}

export class HashableContract extends GIMessage {
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
  static Transforms (transforms: Object) {
    return {...Object.getPrototypeOf(this).transforms, ...transforms}
  }
  static Vuex (vuex: Object) {
    if (!vuex.mutations[this.name]) {
      // default state initializer function
      vuex.mutations[this.name] = function () {}
    }
    return _.merge(_.cloneDeep(Object.getPrototypeOf(this).vuex), vuex)
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
  // In our implementation, each method invocation (txn) is a GIMessage
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

export class HashableAction extends GIMessage {
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
  static dummyAuth (data: any = '') {
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
    ['changeThreshold', 'float'],
    ['openMembership', 'bool'],
    ['memberApprovalThreshold', 'float'],
    ['memberRemovalThreshold', 'float'],
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
    ['contractID', 'string'],
    ['action', 'string']
  ])
}

export class HashableGroupProposal extends HashableAction {
  static TypeInvitation = 'invitationProposal'
  static TypeRemoval = 'removalProposal'
  static TypeChange = 'changeProposal'
  static fields = HashableGroupProposal.Fields([
    ['type', 'string'],
    ['threshold', 'float'],
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
*/
