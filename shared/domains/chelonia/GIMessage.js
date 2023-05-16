'use strict'

// TODO: rename GIMessage to ChelMessage

import { EDWARDS25519SHA512BATCH, CURVE25519XSALSA20POLY1305, XSALSA20POLY1305 } from './crypto.js'
import { v4 as uuidv4 } from 'uuid'
import { blake32Hash } from '~/shared/functions.js'
import type { JSONType, JSONObject } from '~/shared/types.js'

export type GIKeyType = typeof EDWARDS25519SHA512BATCH | typeof CURVE25519XSALSA20POLY1305 | typeof XSALSA20POLY1305

export type GIKeyPurpose = 'enc' | 'sig'

export type GIKey = {
  id: string;
  name: string;
  purpose: GIKeyPurpose[],
  ringLevel: number;
  permissions: '*' | string[];
  meta: Object;
  data: string;
}
// Allows server to check if the user is allowed to register this type of contract
// TODO: rename 'type' to 'contractName':
export type GIOpContract = { type: string; keys: GIKey[]; parentContract?: string }
export type GIOpActionEncrypted = { keyId: string; content: string } // encrypted version of GIOpActionUnencrypted
export type GIOpActionUnencrypted = { action: string; data: JSONType; meta: JSONObject }
export type GIOpKeyAdd = GIKey[]
export type GIOpKeyDel = string[]
export type GIOpPropSet = { key: string; value: JSONType }
export type GIOpKeyShare = { contractID: string; keys: GIKey[] }
export type GIOpKeyRequest = {
  keyId: string;
  outerKeyId: string;
  encryptionKeyId: string;
  data: string;
}
export type GIOpKeyRequestSeen = { keyRequestHash: string; success: boolean };

export type GIOpType = 'c' | 'ae' | 'au' | 'ka' | 'kd' | 'pu' | 'ps' | 'pd' | 'ks' | 'kr' | 'krs'
export type GIOpValue = GIOpContract | GIOpActionEncrypted | GIOpActionUnencrypted | GIOpKeyAdd | GIOpKeyDel | GIOpPropSet | GIOpKeyShare | GIOpKeyRequest | GIOpKeyRequestSeen
export type GIOp = [GIOpType, GIOpValue] | [GIOpType, GIOpValue, GIOpValue]

type GIMsgParams = { mapping: Object; head: Object; message: GIOpValue; decryptedValue?: GIOpValue; signature: string; signedPayload: string }

export class GIMessage {
  // flow type annotations to make flow happy
  _decrypted: GIOpValue
  _mapping: Object
  _head: Object
  _message: Object
  _signature: string
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
  static OP_ATOMIC: 'at' = 'at' // atomic op
  static OP_KEY_SHARE: 'ks' = 'ks' // key share
  static OP_KEY_REQUEST: 'kr' = 'kr' // key request
  static OP_KEY_REQUEST_SEEN: 'krs' = 'krs' // key request response

  // eslint-disable-next-line camelcase
  static createV1_0 (
    {
      contractID,
      // originatingContractID is used when one contract writes to another. in this case
      // originatingContractID is the one sending the message to contractID.
      originatingContractID,
      previousHEAD = null,
      op,
      manifest,
      signatureFn = defaultSignatureFn
    }: {
      contractID: string | null,
      originatingContractID?: string,
      previousHEAD?: string | null,
      op: GIOp,
      manifest: string,
      signatureFn?: Function
    }
  ): this {
    const head = {
      version: '1.0.0',
      previousHEAD,
      contractID,
      originatingContractID,
      op: op[0],
      manifest,
      // the nonce makes it easier to prevent conflicts during development
      // when using the same data, and also makes it possible to identify
      // same-content/different-previousHEAD messages that are
      // cloned using the cloneWith method
      nonce: uuidv4()
    }
    console.log('createV1_0', { op, head })
    return new this(messageToParams(head, op, signatureFn))
  }

  // GIMessage.cloneWith could be used when make a GIMessage object having the same id()
  // https://github.com/okTurtles/group-income/issues/1503
  static cloneWith (
    target: GIMessage,
    sources: Object,
    signatureFn?: Function = defaultSignatureFn
  ): this {
    const head = Object.assign({}, target.head(), sources)
    return new this(messageToParams(head, target.op(), signatureFn))
  }

  // TODO: we need signature verification upon decryption somewhere...
  static deserialize (value: string): this {
    if (!value) throw new Error(`deserialize bad value: ${value}`)
    const parsedValue = JSON.parse(value)
    return new this({
      mapping: { key: blake32Hash(value), value },
      head: JSON.parse(parsedValue.head),
      message: JSON.parse(parsedValue.message),
      signature: parsedValue.sig,
      signedPayload: blake32Hash(`${blake32Hash(parsedValue.head)}${blake32Hash(parsedValue.message)}`)
    })
  }

  constructor ({ mapping, head, message, signature, signedPayload, decryptedValue }: GIMsgParams) {
    this._mapping = mapping
    this._head = head
    this._message = message
    this._signature = signature
    this._signedPayload = signedPayload
    if (decryptedValue) {
      this._decrypted = decryptedValue
    }
    // perform basic sanity check
    const type = this.opType()
    switch (type) {
      case GIMessage.OP_CONTRACT:
        if (!this.isFirstMessage()) throw new Error('OP_CONTRACT: must be first message')
        break
      case GIMessage.OP_KEY_SHARE:
      case GIMessage.OP_KEY_REQUEST:
      case GIMessage.OP_KEY_REQUEST_SEEN:
      case GIMessage.OP_ACTION_ENCRYPTED:
      case GIMessage.OP_KEY_ADD:
        // nothing for now
        break
      default:
        throw new Error(`unsupported op: ${type}`)
    }
  }

  decryptedValue (fn?: Function): any {
    if (!this._decrypted) {
      if (this.opType() === GIMessage.OP_ACTION_ENCRYPTED && typeof fn !== 'function') {
        throw new Error('Decryption function must be given')
      }
      this._decrypted = (
        this.opType() === GIMessage.OP_ACTION_ENCRYPTED && fn
          ? fn(this.opValue())
          : this.opValue()
      )
    }
    return this._decrypted
  }

  head (): Object { return this._head }

  message (): Object { return this._message }

  op (): GIOp { return this._decrypted ? [this.head().op, this.message(), this.decryptedValue()] : [this.head().op, this.message()] }

  opType (): GIOpType { return this.head().op }

  opValue (): GIOpValue { return this.message() }

  signature (): Object { return this._signature }

  signedPayload (): string { return this._signedPayload }

  manifest (): string { return this.head().manifest }

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

  originatingContractID (): string { return this.head().originatingContractID || this.contractID() }

  serialize (): string { return this._mapping.value }

  hash (): string { return this._mapping.key }

  id (): string {
    // NOTE: nonce can be used as GIMessage identifier
    // https://github.com/okTurtles/group-income/pull/1513#discussion_r1142809095
    return this.head().nonce
  }
}

function defaultSignatureFn (data: string) {
  if (process.env.ALLOW_INSECURE_UNENCRYPTED_MESSAGES_WHEN_EKEY_NOT_FOUND === 'true') {
    console.error('Using defaultSignatureFn', { data })
    return {
      type: 'default',
      sig: blake32Hash(data)
    }
  }
  console.error('Attempted to call defaultSignatureFn', { data })
  throw new Error('Attempted to call defaultSignatureFn. Specify a signature function')
}

function messageToParams (head: Object, op: GIOp, signatureFn: Function): GIMsgParams {
  // NOTE: the JSON strings generated here must be preserved forever.
  //       do not ever regenerate this message using the contructor.
  //       instead store it using serialize() and restore it using deserialize().
  //       The issue is that different implementations of JavaScript engines might generate different strings
  //       when serializing JS objects using JSON.stringify
  //       and that would lead to different hashes resulting from blake32Hash.
  //       So to get around this we save the serialized string upon creation
  //       and keep a copy of it (instead of regenerating it as needed).
  //       https://github.com/okTurtles/group-income/pull/1513#discussion_r1142809095
  const message = op[1]
  const headJSON = JSON.stringify(head)
  const messageJSON = JSON.stringify(message)
  const signedPayload = blake32Hash(`${blake32Hash(headJSON)}${blake32Hash(messageJSON)}`)
  const signature = signatureFn(signedPayload)
  const value = JSON.stringify({
    head: headJSON,
    message: messageJSON,
    sig: signature
  })
  return {
    mapping: { key: blake32Hash(value), value },
    head,
    message,
    // provide the decrypted value so that pre/postpublish hooks have access to it if needed
    decryptedValue: op.length === 3 ? op[2] : op[1],
    signature,
    signedPayload
  }
}
