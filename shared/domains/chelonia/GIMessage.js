'use strict'

// TODO: rename GIMessage to ChelMessage

import { v4 as uuidv4 } from 'uuid'
import { blake32Hash } from '~/shared/functions.js'
import type { JSONObject, JSONType } from '~/shared/types.js'
import { CURVE25519XSALSA20POLY1305, EDWARDS25519SHA512BATCH, XSALSA20POLY1305, keyId } from './crypto.js'
import { encryptedIncomingForeignData, encryptedIncomingData } from './encryptedData.js'

export type GIKeyType = typeof EDWARDS25519SHA512BATCH | typeof CURVE25519XSALSA20POLY1305 | typeof XSALSA20POLY1305

export type GIKeyPurpose = 'enc' | 'sig'

export type GIKey = {
  id: string;
  name: string;
  purpose: GIKeyPurpose[],
  ringLevel: number;
  permissions: '*' | string[];
  allowedActions?: '*' | string[];
  meta: Object;
  data: string;
  foreignKey?: string;
  _notBeforeHeight: number;
  _notAfterHeight?: number;
}
// Allows server to check if the user is allowed to register this type of contract
// TODO: rename 'type' to 'contractName':
export type GIOpContract = { type: string; keys: GIKey[]; parentContract?: string }
export type GIOpActionEncrypted = { content: string } // encrypted version of GIOpActionUnencrypted
export type GIOpActionUnencrypted = { action: string; data: JSONType; meta: JSONObject }
export type GIOpKeyAdd = GIKey[]
export type GIOpKeyDel = string[]
export type GIOpPropSet = { key: string; value: JSONType }
export type GIOpKeyShare = { contractID: string; keys: GIKey[]; foreignContractID?: string; keyRequestId?: string }
export type GIOpKeyRequest = {
  keyId: string;
  outerKeyId: string;
  encryptionKeyId: string;
  data: string;
}
export type GIOpKeyRequestSeen = { keyRequestHash: string; success: boolean };
export type GIOpKeyUpdate = {
  name: string;
  id?: string;
  oldKeyId: string;
  data?: string;
  purpose?: string[];
  permissions?: string[];
  allowedActions?: '*' | string[];
  meta?: Object;
}[]

export type GIOpType = 'c' | 'a' | 'ae' | 'au' | 'ka' | 'kd' | 'ku' | 'pu' | 'ps' | 'pd' | 'ks' | 'kr' | 'krs'
type ProtoGIOpValue = GIOpContract | GIOpActionEncrypted | GIOpActionUnencrypted | GIOpKeyAdd | GIOpKeyDel | GIOpPropSet | GIOpKeyShare | GIOpKeyRequest | GIOpKeyRequestSeen | GIOpKeyUpdate
export type GIOpAtomic = [GIOpType, ProtoGIOpValue][]
export type GIOpValue = ProtoGIOpValue | GIOpAtomic
export type GIOp = [GIOpType, GIOpValue] | [GIOpType, GIOpValue, GIOpValue]

type GIMsgParams = { mapping: Object; head: Object; message: GIOpValue; decryptedValue?: GIOpValue; signature: string; signedPayload: string }

const decryptedDeserializedMessage = (op: string, height: number, parsedMessage: Object, contractID: string, additionalKeys?: Object, state: Object) => {
  const message = op === GIMessage.OP_ACTION_ENCRYPTED ? encryptedIncomingData(contractID, state, parsedMessage, height, additionalKeys) : parsedMessage
  if ([GIMessage.OP_KEY_ADD, GIMessage.OP_KEY_UPDATE].includes(op)) {
    ((message: any): any[]).forEach((key) => {
      // TODO: When storing the message, ensure only the raw encrypted data get stored. This goes for all uses of encryptedIncomingData
      if (key.meta?.private?.content) {
        key.meta.private.content = encryptedIncomingData(contractID, state, key.meta.private.content, height, additionalKeys, (value) => {
          const computedKeyId = keyId(value)
          if (computedKeyId !== key.id) {
            throw new Error(`Key ID mismatch. Expected to decrypt key ID ${key.id} but got ${computedKeyId}`)
          }
        })
      }
    })
  }
  if ([GIMessage.OP_CONTRACT, GIMessage.OP_KEY_SHARE].includes(op)) {
    (message: any).keys?.forEach((key) => {
      if (key.meta?.private?.content) {
        const decryptionFn = message.foreignContractID ? encryptedIncomingForeignData : encryptedIncomingData
        const decryptionContract = message.foreignContractID ? message.foreignContractID : contractID
        key.meta.private.content = decryptionFn(decryptionContract, state, key.meta.private.content, height, additionalKeys, (value) => {
          const computedKeyId = keyId(value)
          if (computedKeyId !== key.id) {
            throw new Error(`Key ID mismatch. Expected to decrypt key ID ${key.id} but got ${computedKeyId}`)
          }
        })
      }
    })
  }

  if (op === GIMessage.OP_ATOMIC) {
    return parsedMessage.map(([opT, opV]) => [opT, decryptedDeserializedMessage(opT, height, opV, contractID, additionalKeys, state)])
  }

  return message
}

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
  static OP_KEY_UPDATE: 'ku' = 'ku' // update key in authorized keys
  static OP_PROTOCOL_UPGRADE: 'pu' = 'pu'
  static OP_PROP_SET: 'ps' = 'ps' // set a public key/value pair
  static OP_PROP_DEL: 'pd' = 'pd' // delete a public key/value pair
  static OP_CONTRACT_AUTH: 'ca' = 'ca' // authorize a contract
  static OP_CONTRACT_DEAUTH: 'cd' = 'cd' // deauthorize a contract
  static OP_ATOMIC: 'a' = 'a' // atomic op
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
      height = 0,
      op,
      manifest,
      signatureFn = defaultSignatureFn
    }: {
      contractID: string | null,
      originatingContractID?: string,
      previousHEAD?: string | null,
      height: number,
      op: GIOp,
      manifest: string,
      signatureFn?: Function
    }
  ): this {
    const head = {
      version: '1.0.0',
      previousHEAD,
      height,
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
    console.log('createV1_0', { op, head, signatureFn })
    return new this(messageToParams(head, op[1], op.length === 3 ? op[2] : op[1], signatureFn))
  }

  // GIMessage.cloneWith could be used when make a GIMessage object having the same id()
  // https://github.com/okTurtles/group-income/issues/1503
  static cloneWith (
    targetHead: Object,
    targetOp: GIOp,
    sources: Object,
    signatureFn?: Function = defaultSignatureFn
  ): this {
    const head = Object.assign({}, targetHead, sources)
    return new this(messageToParams(head, targetOp[1], targetOp.length === 3 ? targetOp[2] : targetOp[1], signatureFn))
  }

  static deserialize (value: string, additionalKeys?: Object, state?: Object): this {
    if (!value) throw new Error(`deserialize bad value: ${value}`)
    const parsedValue = JSON.parse(value)
    const head = JSON.parse(parsedValue.head)
    const parsedMessage = JSON.parse(parsedValue.message)
    const contractID = head.op === GIMessage.OP_CONTRACT ? blake32Hash(value) : head.contractID
    const message = decryptedDeserializedMessage(head.op, head.height, parsedMessage, contractID, additionalKeys, state)
    return new this({
      mapping: { key: blake32Hash(value), value },
      head,
      message: (message: any),
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
    let atomicTopLevel = true
    const validate = (type) => {
      switch (type) {
        case GIMessage.OP_CONTRACT:
          if (!this.isFirstMessage() || !atomicTopLevel) throw new Error('OP_CONTRACT: must be first message')
          break
        case GIMessage.OP_ATOMIC:
          if (!atomicTopLevel) {
            throw new Error('OP_ATOMIC not allowed inside of OP_ATOMIC')
          }
          if (!Array.isArray(message)) {
            throw new TypeError('OP_ATOMIC must be of an array type')
          }
          atomicTopLevel = false
          console.log({ message })
          message.forEach(([t]) => validate(t))
          break
        case GIMessage.OP_KEY_SHARE:
        case GIMessage.OP_KEY_REQUEST:
        case GIMessage.OP_KEY_REQUEST_SEEN:
        case GIMessage.OP_ACTION_ENCRYPTED:
        case GIMessage.OP_KEY_ADD:
        case GIMessage.OP_KEY_DEL:
        case GIMessage.OP_KEY_UPDATE:
        // nothing for now
          break
        default:
          throw new Error(`unsupported op: ${type}`)
      }
    }
    validate(type)
  }

  decryptedValue (fn?: Function): any {
    return Object(this.opValue()).valueOf()
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

  height (): number { return this._head.height }

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

function messageToParams (head: Object, message: GIOpValue, decryptedValue: GIOpValue, signatureFn: Function): GIMsgParams {
  // NOTE: the JSON strings generated here must be preserved forever.
  //       do not ever regenerate this message using the contructor.
  //       instead store it using serialize() and restore it using deserialize().
  //       The issue is that different implementations of JavaScript engines might generate different strings
  //       when serializing JS objects using JSON.stringify
  //       and that would lead to different hashes resulting from blake32Hash.
  //       So to get around this we save the serialized string upon creation
  //       and keep a copy of it (instead of regenerating it as needed).
  //       https://github.com/okTurtles/group-income/pull/1513#discussion_r1142809095
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
    decryptedValue,
    signature,
    signedPayload
  }
}
