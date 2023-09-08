'use strict'

// TODO: rename GIMessage to ChelMessage

import { v4 as uuidv4 } from 'uuid'
import { has } from '~/frontend/model/contracts/shared/giLodash.js'
import { blake32Hash } from '~/shared/functions.js'
import type { JSONObject, JSONType } from '~/shared/types.js'
import { CURVE25519XSALSA20POLY1305, EDWARDS25519SHA512BATCH, XSALSA20POLY1305, keyId } from './crypto.js'
import type { EncryptedData } from './encryptedData.js'
import { encryptedIncomingData, encryptedIncomingForeignData } from './encryptedData.js'
import type { SignedData } from './signedData.js'
import { isRawSignedData, rawSignedIncomingData, signedIncomingData } from './signedData.js'

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
export type ProtoGIOpActionUnencrypted = { action: string; data: JSONType; meta: JSONObject }
export type GIOpActionUnencrypted = ProtoGIOpActionUnencrypted | SignedData<ProtoGIOpActionUnencrypted>
export type GIOpActionEncrypted = { content: EncryptedData<GIOpActionUnencrypted> } // encrypted version of GIOpActionUnencrypted
export type GIOpKeyAdd = GIKey[]
export type GIOpKeyDel = string[]
export type GIOpPropSet = { key: string; value: JSONType }
export type GIOpKeyShare = { contractID: string; keys: GIKey[]; foreignContractID?: string; keyRequestId?: string }
export type GIOpKeyRequest = SignedData<{
  encryptionKeyId: string;
}>
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
export type GIOpRaw = [GIOpType, SignedData<GIOpValue>]
export type GIOp = [GIOpType, GIOpValue]

type GIMsgParams = { mapping: Object; head: Object; message: GIOpValue, signingKeyId: string } | { mapping: Object; head: Object; signedMessageData: SignedData<GIOpValue> }

const decryptedAndVerifiedDeserializedMessage = (head: Object, headJSON: string, contractID: string, parsedMessage: SignedData<GIOpValue>, additionalKeys?: Object, state: Object): GIOpValue => {
  const op = head.op
  const height = head.height

  const message: GIOpValue = op === GIMessage.OP_ACTION_ENCRYPTED
    // $FlowFixMe
    ? encryptedIncomingData<GIOpActionUnencrypted>(contractID, state, (parsedMessage: any), height, additionalKeys)
    : parsedMessage.valueOf()

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
        const decryptionContract = String(message.foreignContractID ? message.foreignContractID : contractID)
        key.meta.private.content = decryptionFn(decryptionContract, state, key.meta.private.content, height, additionalKeys, (value) => {
          const computedKeyId = keyId(value)
          if (computedKeyId !== key.id) {
            throw new Error(`Key ID mismatch. Expected to decrypt key ID ${key.id} but got ${computedKeyId}`)
          }
        })
      }
    })
  }

  if (op === GIMessage.OP_KEY_REQUEST) {
    if (head.originatingContractID && head.originatingContractID !== contractID) {
      return signedIncomingData(head.originatingContractID, undefined, message, head.originatingContractHeight, headJSON)
    } else {
      return signedIncomingData(contractID, state, message, height, headJSON)
    }
  }

  if (op === GIMessage.OP_ACTION_UNENCRYPTED && isRawSignedData(message)) {
    if (head.originatingContractID && head.originatingContractID !== contractID) {
      return signedIncomingData(head.originatingContractID, undefined, message, head.originatingContractHeight, headJSON)
    } else {
      return signedIncomingData(contractID, state, message, height, headJSON)
    }
  }

  if (op === GIMessage.OP_ATOMIC) {
    return ((((message: any): GIOpAtomic)
      .map(([opT, opV]) =>
        [opT, decryptedAndVerifiedDeserializedMessage(head, headJSON, contractID, (opV: any), additionalKeys, state)]
      ): any): GIOpAtomic)
  }

  return message
}

export class GIMessage {
  // flow type annotations to make flow happy
  _mapping: Object
  _head: Object
  _message: Object
  _signedMessageData: SignedData<GIOpValue>
  _signingKeyId: string

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
      originatingContractHeight,
      previousHEAD = null,
      height = 0,
      op,
      manifest
    }: {
      contractID: string | null,
      originatingContractID?: string,
      originatingContractHeight?: number,
      previousHEAD?: string | null,
      height: number,
      op: GIOpRaw,
      manifest: string,
    }
  ): this {
    const head = {
      version: '1.0.0',
      previousHEAD,
      height,
      contractID,
      originatingContractID,
      originatingContractHeight,
      op: op[0],
      manifest,
      // the nonce makes it easier to prevent conflicts during development
      // when using the same data, and also makes it possible to identify
      // same-content/different-previousHEAD messages that are
      // cloned using the cloneWith method
      nonce: uuidv4()
    }
    console.log('createV1_0', { op, head })
    return new this(messageToParams(head, op[1]))
  }

  // GIMessage.cloneWith could be used when make a GIMessage object having the same id()
  // https://github.com/okTurtles/group-income/issues/1503
  static cloneWith (
    targetHead: Object,
    targetOp: GIOpRaw,
    sources: Object
  ): this {
    const head = Object.assign({}, targetHead, sources)
    return new this(messageToParams(head, targetOp[1]))
  }

  static deserialize (value: string, additionalKeys?: Object, state?: Object): this {
    if (!value) throw new Error(`deserialize bad value: ${value}`)
    const parsedValue = JSON.parse(value)
    const headJSON = parsedValue.head
    const head = JSON.parse(headJSON)
    const contractID = head.op === GIMessage.OP_CONTRACT ? blake32Hash(value) : head.contractID

    // Special case for OP_CONTRACT, since the keys are not yet present in the
    // state
    if (!state?._vm?.authorizedKeys && head.op === GIMessage.OP_CONTRACT) {
      const value = rawSignedIncomingData(parsedValue)
      const authorizedKeys = Object.fromEntries(value.valueOf()?.keys.map(k => [k.id, k]))
      state = {
        _vm: {
          authorizedKeys
        }
      }
    }

    const signedMessageData = signedIncomingData(contractID, state, parsedValue, head.height, parsedValue.head)
    let message: GIOpValue | typeof undefined

    return new this({
      mapping: { key: blake32Hash(value), value },
      head,
      get message () {
        if (message !== undefined) return message
        message = decryptedAndVerifiedDeserializedMessage(head, parsedValue.head, contractID, signedMessageData, additionalKeys, state)
        return message
      },
      get signingKeyId () {
        return signedMessageData.signingKeyId
      }
    })
  }

  constructor (params: GIMsgParams) {
    this._mapping = params.mapping
    this._head = params.head
    let messageGetter: () => Object
    if (has(params, 'signingKeyId') && has(params, 'message')) {
      Object.defineProperty(this, '_signingKeyId', Object.getOwnPropertyDescriptor(params, 'signingKeyId') || {})
      // Avoid verifying the signature unless the value is used
      messageGetter = () => params.message || {}
    } else if (params.signedMessageData) {
      this._signedMessageData = ((params.signedMessageData: any): SignedData<GIOpValue>)
      Object.defineProperty(this, '_signingKeyId', Object.getOwnPropertyDescriptor(this._signedMessageData, 'signingKeyId') || {})
      // Avoid verifying the signature unless the value is used
      messageGetter = () => this._signedMessageData.valueOf() || {}
    } else {
      throw new Error('Illegal GIMessage constructor invocation')
    }
    // perform basic sanity check
    const type = this.opType()
    let message
    let atomicTopLevel = true
    const validate = (type, message) => {
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
          message.forEach(([t, m]) => validate(t, m))
          break
        case GIMessage.OP_KEY_ADD:
        case GIMessage.OP_KEY_DEL:
        case GIMessage.OP_KEY_UPDATE:
          if (!Array.isArray(message)) throw new TypeError('OP_KEY_{ADD|DEL|UPDATE} must be of an array type')
          break
        case GIMessage.OP_KEY_SHARE:
        case GIMessage.OP_KEY_REQUEST:
        case GIMessage.OP_KEY_REQUEST_SEEN:
        case GIMessage.OP_ACTION_ENCRYPTED:
        // nothing for now
          break
        default:
          throw new Error(`unsupported op: ${type}`)
      }
    }
    Object.defineProperty(this, '_message', {
      get: () => {
        if (message) return message
        message = messageGetter()
        validate(type, message)
        return message
      }
    })
  }

  decryptedValue (): any {
    return Object(this.opValue()).valueOf()
  }

  head (): Object { return this._head }

  message (): GIOpValue { return this._message }

  op (): GIOp { return [this.head().op, this.message()] }

  rawOp (): GIOpRaw { return [this.head().op, this._signedMessageData] }

  opType (): GIOpType { return this.head().op }

  opValue (): GIOpValue { return this.message() }

  signingKeyId (): string { return this._signingKeyId }

  manifest (): string { return this.head().manifest }

  description (): string {
    const type = this.opType()
    let desc = `<op_${type}`
    if (type === GIMessage.OP_ACTION_UNENCRYPTED) {
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

function messageToParams (head: Object, message: SignedData<GIOpValue>): GIMsgParams {
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
  const messageJSON = (message.serialize(headJSON): any)
  messageJSON.head = headJSON
  const value = JSON.stringify(messageJSON)
  return {
    mapping: { key: blake32Hash(value), value },
    head,
    signedMessageData: message
  }
}
