'use strict'
import sbp from '~/shared/sbp.js'
import '~/shared/domains/okTurtles/data.js'
import { blake32Hash } from './functions.js'
import type { JSONType, JSONObject } from './types.js'

export type GIKeyType = { type: string; key: string }
// Allows server to check if the user is allowed to register this type of contract
export type GIOpContract = { type: string; authkey: GIKeyType, parentContract: string }
export type GIOpAction = string // encrypted version of GIOpPubAction
// TODO: rename 'type' to 'selector' below:
export type GIOpPubAction = { type: string; data: JSONType; meta: JSONObject }
export type GIOpKeyAuth = { key: GIKeyType, context: string }
export type GIOpPropSet = { key: string, value: JSONType }

export type GIOpType = 'c' | 'ae' | 'au' | 'ka' | 'kd' | 'ku' | 'pu' | 'ps' | 'pd'
export type GIOpValue = GIOpContract | GIOpAction | GIOpPubAction | GIOpKeyAuth | GIOpPropSet
export type GIOp = [GIOpType, GIOpValue]

sbp('okTurtles.data/set', 'CHELONIA_CONFIG', {
  // override these!
  decryptFn: JSON.parse,
  whitelisted: (sel) => false
})

export class GIMessage {
  // flow type annoations to make flow happy
  _message: Object

  _mapping: Object

  static OP_CONTRACT = 'c'
  static OP_ACTION_ENCRYPTED = 'ae' // e2e-encrypted action
  static OP_ACTION_UNENCRYPTED = 'au' // publicly readable action
  static OP_KEY_AUTH = 'ka' // add this key to the list of keys allowed to write to this contract
  static OP_KEY_UPDATE = 'ku' // update a key's context
  static OP_KEY_DEAUTH = 'kd' // remove this key from authorized keys
  static OP_PROTOCOL_UPGRADE = 'pu'
  static OP_PROP_SET = 'ps' // set a public key/value pair
  static OP_PROP_DEL = 'pd' // delete a public key/value pair

  // eslint-disable-next-line camelcase
  static createV1_0 (
    contractID: ?string = null,
    previousHEAD: ?string = null,
    op: GIOp,
    signatureFn: ?Function = defaultSignatureFn
  ) {
    const instance = new this()
    instance._message = {
      version: 1.00,
      previousHEAD,
      contractID,
      op,
      // the nonce makes it difficult to predict message contents
      // and makes it easier to prevent conflicts during development
      nonce: Math.random()
    }
    // NOTE: the JSON strings generated here must be preserved forever.
    //       do not ever regenerate this message using the contructor.
    //       instead store it using serialize() and restore it using
    //       deserialize().
    const messageJSON = JSON.stringify(instance._message)
    const value = JSON.stringify({
      message: messageJSON,
      sig: signatureFn(messageJSON)
    })
    instance._mapping = {
      key: blake32Hash(value),
      value
    }
    sanityCheck(instance)
    return instance
  }

  static deserialize (value: string) {
    if (!value) throw new Error(`deserialize bad value: ${value}`)
    const instance = new this()
    instance._mapping = { key: blake32Hash(value), value }
    instance._message = JSON.parse(JSON.parse(value).message)
    return instance
  }

  decryptedValue (fn: ?Function): any {
    if (!this._decrypted) {
      this._decrypted = this.opType() === GIMessage.OP_ACTION_ENCRYPTED ? fn(this.opValue()) : this.opValue()
    }
    return this._decrypted
  }

  message (): Object { return this._message }

  op (): GIOp { return this.message().op }

  opType (): GIOpType { return this.op()[0] }

  opValue (): GIOpValue { return this.op()[1] }

  description (): string {
    const type = this.opType()
    let desc = `<op_${type}`
    if (type === GIMessage.OP_ACTION_ENCRYPTED && this._decrypted) {
      desc += `|${this._decrypted.type}`
    } else if (type === GIMessage.OP_ACTION_UNENCRYPTED) {
      desc += `|${this.opValue().type}`
    }
    return `${desc}|${this.hash()} of ${this.contractID()}>`
  }

  isFirstMessage (): boolean { return !this.message().previousHEAD }

  contractID (): string { return this.message().contractID || this.hash() }

  serialize (): string { return this._mapping.value }

  hash (): string { return this._mapping.key }
}

sbp('sbp/selectors/register', {
  // https://www.wordnik.com/words/chelonia
  'chelonia/message/process': function (message: GIMessage, state: Object) {
    sanityCheck(message)
    const [opT, opV] = message.op()
    const hash = message.hash()
    const contractID = message.contractID()
    const config = sbp('okTurtles.data/get', 'CHELONIA_CONFIG')
    if (!state._vm) state._vm = {}
    const opFns = {
      [GIMessage.OP_CONTRACT] (v) {
        if (!state._vm.authorizedKeys) state._vm.authorizedKeys = []
        state._vm.authorizedKeys.push({ key: v.authkey, context: 'owner' })
      },
      [GIMessage.OP_ACTION_ENCRYPTED] (v) {
        if (!config.skipActionProcessing) {
          const decrypted = message.decryptedValue(config.decryptFn)
          opFns[GIMessage.OP_ACTION_UNENCRYPTED](decrypted)
        }
      },
      [GIMessage.OP_ACTION_UNENCRYPTED] (v) {
        if (!config.skipActionProcessing) {
          const { data, meta, type } = v
          if (!config.whitelisted(type)) {
            throw new Error(`chelonia: action not whitelisted: '${type}'`)
          }
          sbp(type, { data, meta, hash, contractID }, state)
        }
      },
      [GIMessage.OP_PROP_SET] (v) {
        if (!state._vm.props) state._vm.props = {}
        state._vm.props[v.key] = v.value
      },
      [GIMessage.OP_KEY_AUTH] (v) {
        if (!state._vm.authorizedKeys) state._vm.authorizedKeys = []
        state._vm.authorizedKeys.push(v)
      }
    }
    let processOp = true
    if (config.preOp) {
      processOp = config.preOp(message, state) !== false && processOp
    }
    if (config[`preOp_${opT}`]) {
      processOp = config[`preOp_${opT}`](message, state) !== false && processOp
    }
    if (processOp && !config.skipProcessing) {
      opFns[opT](opV)
      config.postOp && config.postOp(message, state)
      config[`postOp_${opT}`] && config[`postOp_${opT}`](message, state)
    }
  }
})

function defaultSignatureFn (data: string) {
  return {
    type: 'default',
    sig: blake32Hash(data)
  }
}

function sanityCheck (msg: GIMessage) {
  const [type] = msg.message().op
  switch (type) {
    case GIMessage.OP_CONTRACT:
      if (!msg.isFirstMessage()) throw new Error('OP_CONTRACT: must be first message')
      break
    case GIMessage.OP_ACTION_ENCRYPTED:
      // nothing for now
      break
    default:
      throw new Error(`unsupported op: ${type}`)
  }
}
