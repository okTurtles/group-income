'use strict'

// TODO: rename GIMessage to CMessage or something similar

import { blake32Hash } from '~/shared/functions.js'
import type { JSONType, JSONObject } from '~/shared/types.js'

export type GIKeyType = 'edwards25519sha512batch' | 'curve25519xsalsa20poly1305' | 'xsalsa20poly1305'

export type GIKey = {
  id: string;
  type: GIKeyType;
  data: string;
  perm: string[];
  meta: Object;
}
// Allows server to check if the user is allowed to register this type of contract
// TODO: rename 'type' to 'contractName':
export type GIOpContract = {
  type: string;
  parentContract?: string;
  keys: GIKey[];
}
export type GIOpActionEncrypted = string // encrypted version of GIOpActionUnencrypted
export type GIOpActionUnencrypted = { action: string; data: JSONType; meta: JSONObject }
export type GIOpKeyAdd = { keyHash: string, keyJSON: ?string, context: string }
export type GIOpPropSet = { key: string, value: JSONType }

export type GIOpType = 'c' | 'ae' | 'au' | 'ka' | 'kd' | 'pu' | 'ps' | 'pd'
export type GIOpValue = GIOpContract | GIOpActionEncrypted | GIOpActionUnencrypted | GIOpKeyAdd | GIOpPropSet
export type GIOp = [GIOpType, GIOpValue]

export class GIMessage {
  // flow type annotations to make flow happy
  _decrypted: GIOpValue
  _mapping: Object
  _head: Object
  _message: Object
  _signature: Object
  _signedPayload: string

  static OP_CONTRACT: 'c' = 'c'
  static OP_ACTION_ENCRYPTED: 'ae' = 'ae' // e2e-encrypted action
  static OP_ACTION_UNENCRYPTED: 'au' = 'au' // publicly readable action
  static OP_KEY_ADD: 'ka' = 'ka' // add this key to the list of keys allowed to write to this contract, or update an existing key
  static OP_KEY_DEL: 'kd' = 'kd' // remove this key from authorized keys
  static OP_PROTOCOL_UPGRADE: 'pu' = 'pu'
  static OP_PROP_SET: 'ps' = 'ps' // set a public key/value pair
  static OP_PROP_DEL: 'pd' = 'pd' // delete a public key/value pair
  static OP_CONTRACT_AUTH: 'ca' = 'ca' // authorize a contract
  static OP_CONTRACT_DEAUTH: 'cd' = 'cd' // deauthorize a contract

  // eslint-disable-next-line camelcase
  static createV1_0 (
    contractID: string | null = null,
    previousHEAD: string | null = null,
    op: GIOp,
    signatureFn?: Function = defaultSignatureFn
  ): this {
    const instance = new this()
    instance._head = {
      version: '1.0',
      previousHEAD,
      contractID,
      op: op[0]
    }
    instance._message = op[1]
    // NOTE: the JSON strings generated here must be preserved forever.
    //       do not ever regenerate this message using the contructor.
    //       instead store it using serialize() and restore it using
    //       deserialize().
    const headJSON = JSON.stringify(instance._head)
    const messageJSON = JSON.stringify(instance._message)
    const signedPayload = `${blake32Hash(headJSON)}${blake32Hash(messageJSON)}`
    const signature = signatureFn(signedPayload)
    instance._signedPayload = signedPayload
    const value = JSON.stringify({
      head: headJSON,
      message: messageJSON,
      signature: signature
    })
    instance._signature = signature
    instance._mapping = {
      key: blake32Hash(value),
      value
    }
    sanityCheck(instance)
    return instance
  }

  // TODO: we need signature verification upon decryption somewhere...
  static deserialize (value: string): this {
    if (!value) throw new Error(`deserialize bad value: ${value}`)
    const instance = new this()
    const parsedValue = JSON.parse(value)
    instance._mapping = { key: blake32Hash(value), value }
    instance._head = JSON.parse(parsedValue.head)
    instance._message = JSON.parse(parsedValue.message)
    instance._signature = parsedValue.signature
    instance._signedPayload = `${blake32Hash(parsedValue.head)}${blake32Hash(parsedValue.message)}`
    return instance
  }

  decryptedValue (fn?: Function): any {
    if (!this._decrypted) {
      this._decrypted = (
        this.opType() === GIMessage.OP_ACTION_ENCRYPTED && fn !== undefined
          ? fn(this.opValue())
          : this.opValue()
      )
    }
    return this._decrypted
  }

  head (): Object { return this._head }

  message (): Object { return this._message }

  signature (): Object { return this._signature }

  signedPayload (): string { return this._signedPayload }

  op (): GIOp { return [this.head().op, this.message()] }

  opType (): GIOpType { return this.op()[0] }

  opValue (): GIOpValue { return this.op()[1] }

  description (): string {
    const type = this.opType()
    let desc = `<op_${type}`
    if (type === GIMessage.OP_ACTION_ENCRYPTED && this._decrypted) {
      const { _decrypted } = this
      if (typeof _decrypted.type === 'string') {
        desc += `|${_decrypted.type}`
      }
    } else if (type === GIMessage.OP_ACTION_UNENCRYPTED) {
      const value = this.opValue()
      if (typeof value.type === 'string') {
        desc += `|${value.type}`
      }
    }
    return `${desc}|${this.hash()} of ${this.contractID()}>`
  }

  isFirstMessage (): boolean { return !this.head().previousHEAD }

  contractID (): string { return this.head().contractID || this.hash() }

  serialize (): string { return this._mapping.value }

  hash (): string { return this._mapping.key }
}

function defaultSignatureFn (data: string) {
  return {
    type: 'default',
    sig: blake32Hash(data)
  }
}

export function sanityCheck (msg: GIMessage) {
  const [type] = msg.op()
  if ((msg.isFirstMessage() && type !== GIMessage.OP_CONTRACT) || (!msg.isFirstMessage() && type === GIMessage.OP_CONTRACT)) {
    throw new Error('OP_CONTRACT: must be first message')
  }

  switch (type) {
    case GIMessage.OP_CONTRACT:
      // nothing for now
      break
    case GIMessage.OP_ACTION_ENCRYPTED:
      // nothing for now
      break
    default:
      throw new Error(`unsupported op: ${type}`)
  }
}
