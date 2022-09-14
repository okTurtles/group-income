// TODO: rename GIMessage to CMessage or something similar

import { blake32Hash } from '~/shared/functions.ts'
import type { JSONObject } from '~/shared/types.ts'

type JSONType = ReturnType<typeof JSON.parse>

type Mapping = {
  key: string;
  value: string;
}

type Message = {
  version: string; // Semver version string
  previousHEAD: string | null;
  contractID: string | null;
  op: GIOp
  manifest: string;
  // The nonce makes it difficult to predict message contents
  // and makes it easier to prevent conflicts during development.
  nonce: number;
}

export type GIKeyType = ''

export type GIKey = {
  type: GIKeyType;
  data: Object; // based on GIKeyType this will change
  meta: Object;
}
// Allows server to check if the user is allowed to register this type of contract
// TODO: rename 'type' to 'contractName':
export type GIOpContract = { type: string; keyJSON: string, parentContract?: string }
export type GIOpActionEncrypted = string // encrypted version of GIOpActionUnencrypted
export type GIOpActionUnencrypted = { action: string; data: JSONType; meta: JSONObject }
export type GIOpKeyAdd = { keyHash: string, keyJSON: string | null | void, context: string }
export type GIOpPropSet = { key: string, value: JSONType }

export type GIOpType = 'c' | 'ae' | 'au' | 'ka' | 'kd' | 'pu' | 'ps' | 'pd'
export type GIOpValue = GIOpContract | GIOpActionEncrypted | GIOpActionUnencrypted | GIOpKeyAdd | GIOpPropSet
export type GIOp = [GIOpType, GIOpValue]

export class GIMessage {
  _decrypted?: GIOpValue
  _mapping: Mapping
  _message: Message

  static OP_CONTRACT: 'c' = 'c'
  static OP_ACTION_ENCRYPTED: 'ae' = 'ae' // e2e-encrypted action
  static OP_ACTION_UNENCRYPTED: 'au' = 'au' // publicly readable action
  static OP_KEY_ADD: 'ka' = 'ka' // add this key to the list of keys allowed to write to this contract, or update an existing key
  static OP_KEY_DEL: 'kd' = 'kd' // remove this key from authorized keys
  static OP_PROTOCOL_UPGRADE: 'pu' = 'pu'
  static OP_PROP_SET: 'ps' = 'ps' // set a public key/value pair
  static OP_PROP_DEL: 'pd' = 'pd' // delete a public key/value pair

  // eslint-disable-next-line camelcase
  static createV1_0 (
    contractID: string | null = null,
    previousHEAD: string | null = null,
    op: GIOp,
    manifest: string,
    signatureFn: Function = defaultSignatureFn
  ): GIMessage {
    const message: Message = {
      version: '1.0.0',
      previousHEAD,
      contractID,
      op,
      manifest,
      // the nonce makes it difficult to predict message contents
      // and makes it easier to prevent conflicts during development
      nonce: Math.random()
    }
    // NOTE: the JSON strings generated here must be preserved forever.
    //       do not ever regenerate this message using the contructor.
    //       instead store it using serialize() and restore it using
    //       deserialize().
    const messageJSON = JSON.stringify(message)
    const value = JSON.stringify({
      message: messageJSON,
      sig: signatureFn(messageJSON)
    })
    return new this({
      mapping: { key: blake32Hash(value), value },
      message
    })
  }

  // TODO: we need signature verification upon decryption somewhere...
  static deserialize (value: string): GIMessage {
    if (!value) throw new Error(`deserialize bad value: ${value}`)
    return new this({
      mapping: { key: blake32Hash(value), value },
      message: JSON.parse(JSON.parse(value).message)
    })
  }

  constructor ({ mapping, message }: { mapping: Mapping, message: Message }) {
    this._mapping = mapping
    this._message = message
    // perform basic sanity check
    const [type] = this.message().op
    switch (type) {
      case GIMessage.OP_CONTRACT:
        if (!this.isFirstMessage()) throw new Error('OP_CONTRACT: must be first message')
        break
      case GIMessage.OP_ACTION_ENCRYPTED:
        // nothing for now
        break
      default:
        throw new Error(`unsupported op: ${type}`)
    }
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

  message (): Message { return this._message }

  op (): GIOp { return this.message().op }

  opType (): GIOpType { return this.op()[0] }

  opValue (): GIOpValue { return this.op()[1] }

  manifest (): string { return this.message().manifest }

  description (): string {
    const type = this.opType()
    let desc = `<op_${type}`
    if (type === GIMessage.OP_ACTION_ENCRYPTED && this._decrypted) {
      const { _decrypted } = this
      if (typeof (_decrypted as GIOpContract).type === 'string') {
        desc += `|${(_decrypted as GIOpContract).type}`
      }
    } else if (type === GIMessage.OP_ACTION_UNENCRYPTED) {
      const value = this.opValue()
      if (typeof (value as GIOpContract).type === 'string') {
        desc += `|${(value as GIOpContract).type}`
      }
    }
    return `${desc}|${this.hash()} of ${this.contractID()}>`
  }

  isFirstMessage (): boolean { return !this.message().previousHEAD }

  contractID (): string { return this.message().contractID || this.hash() }

  serialize (): string { return this._mapping.value }

  hash (): string { return this._mapping.key }
}

function defaultSignatureFn (data: string) {
  return {
    type: 'default',
    sig: blake32Hash(data)
  }
}
