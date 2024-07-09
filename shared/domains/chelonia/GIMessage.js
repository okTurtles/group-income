'use strict'

// TODO: rename GIMessage to ChelMessage

import { has } from '~/frontend/model/contracts/shared/giLodash.js'
import { createCID } from '~/shared/functions.js'
import type { JSONObject, JSONType } from '~/shared/types.js'
import { CURVE25519XSALSA20POLY1305, EDWARDS25519SHA512BATCH, XSALSA20POLY1305, keyId } from './crypto.js'
import type { EncryptedData } from './encryptedData.js'
import { encryptedIncomingData, encryptedIncomingForeignData, maybeEncryptedIncomingData, unwrapMaybeEncryptedData } from './encryptedData.js'
import type { SignedData } from './signedData.js'
import { isRawSignedData, isSignedData, rawSignedIncomingData, signedIncomingData } from './signedData.js'
import { serdesTagSymbol, serdesSerializeSymbol, serdesDeserializeSymbol } from '~/shared/serdes/index.js'

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
  _private?: false | string;
}
// Allows server to check if the user is allowed to register this type of contract
// TODO: rename 'type' to 'contractName':
export type GIOpContract = { type: string; keys: (GIKey | EncryptedData<GIKey>)[]; parentContract?: string }
export type ProtoGIOpActionUnencrypted = { action: string; data: JSONType; meta: JSONObject }
export type GIOpActionUnencrypted = ProtoGIOpActionUnencrypted | SignedData<ProtoGIOpActionUnencrypted>
export type GIOpActionEncrypted = EncryptedData<GIOpActionUnencrypted> // encrypted version of GIOpActionUnencrypted
export type GIOpKeyAdd = (GIKey | EncryptedData<GIKey>)[]
export type GIOpKeyDel = (string | EncryptedData<string>)[]
export type GIOpPropSet = { key: string; value: JSONType }
export type ProtoGIOpKeyShare = { contractID: string; keys: GIKey[]; foreignContractID?: string; keyRequestHash?: string, keyRequestHeight?: number }
export type GIOpKeyShare = ProtoGIOpKeyShare | EncryptedData<ProtoGIOpKeyShare>
// TODO encrypted GIOpKeyRequest
export type ProtoGIOpKeyRequest = {
  contractID: string;
  height: number;
  replyWith: SignedData<{
    encryptionKeyId: string;
    responseKey: EncryptedData<string>;
  }>,
  request: string;
}
export type GIOpKeyRequest = ProtoGIOpKeyRequest | EncryptedData<ProtoGIOpKeyRequest>
export type ProtoGIOpKeyRequestSeen = { keyRequestHash: string; keyShareHash?: string; success: boolean };
export type GIOpKeyRequestSeen = ProtoGIOpKeyRequestSeen | EncryptedData<ProtoGIOpKeyRequestSeen>;
export type GIKeyUpdate = {
  name: string;
  id?: string;
  oldKeyId: string;
  data?: string;
  purpose?: string[];
  permissions?: string[];
  allowedActions?: '*' | string[];
  meta?: Object;
}
export type GIOpKeyUpdate = (GIKeyUpdate | EncryptedData<GIKeyUpdate>)[]

export type GIOpType = 'c' | 'a' | 'ae' | 'au' | 'ka' | 'kd' | 'ku' | 'pu' | 'ps' | 'pd' | 'ks' | 'kr' | 'krs'
type ProtoGIOpValue = GIOpContract | GIOpActionEncrypted | GIOpActionUnencrypted | GIOpKeyAdd | GIOpKeyDel | GIOpPropSet | GIOpKeyShare | GIOpKeyRequest | GIOpKeyRequestSeen | GIOpKeyUpdate
export type GIOpAtomic = [GIOpType, ProtoGIOpValue][]
export type GIOpValue = ProtoGIOpValue | GIOpAtomic
export type GIOpRaw = [GIOpType, SignedData<GIOpValue>]
export type GIOp = [GIOpType, GIOpValue]

export type GIMsgDirection = 'incoming' | 'outgoing'
type GIMsgParams = { direction: GIMsgDirection, mapping: Object; head: Object; signedMessageData: SignedData<GIOpValue> }

// Takes a raw message and processes it so that EncryptedData and SignedData
// attributes are defined
const decryptedAndVerifiedDeserializedMessage = (head: Object, headJSON: string, contractID: string, parsedMessage: GIOpValue, additionalKeys?: Object, state: Object): GIOpValue => {
  const op = head.op
  const height = head.height

  const message: GIOpValue = op === GIMessage.OP_ACTION_ENCRYPTED
    // $FlowFixMe
    ? encryptedIncomingData<GIOpActionUnencrypted>(contractID, state, (parsedMessage: any), height, additionalKeys, headJSON, undefined)
    : parsedMessage

  // If the operation is GIMessage.OP_KEY_ADD or GIMessage.OP_KEY_UPDATE,
  // extract encrypted data from key.meta?.private?.content
  if ([GIMessage.OP_KEY_ADD, GIMessage.OP_KEY_UPDATE].includes(op)) {
    return ((message: any): any[]).map((key) => {
      return maybeEncryptedIncomingData(contractID, state, key, height, additionalKeys, headJSON, (key, eKeyId) => {
        if (key.meta?.private?.content) {
          key.meta.private.content = encryptedIncomingData(contractID, state, key.meta.private.content, height, additionalKeys, headJSON, (value) => {
          // Validator function to verify the key matches its expected ID
            const computedKeyId = keyId(value)
            if (computedKeyId !== key.id) {
              throw new Error(`Key ID mismatch. Expected to decrypt key ID ${key.id} but got ${computedKeyId}`)
            }
          })
        }
        // key.meta?.keyRequest?.contractID could be optionally encrypted
        if (key.meta?.keyRequest?.reference) {
          try {
            key.meta.keyRequest.reference = maybeEncryptedIncomingData(contractID, state, key.meta.keyRequest.reference, height, additionalKeys, headJSON)?.valueOf()
          } catch {
            // If we couldn't decrypt it, this value is of no use to us (we
            // can't keep track of key requests and key shares), so we delete it
            delete key.meta.keyRequest.reference
          }
        }
        // key.meta?.keyRequest?.contractID could be optionally encrypted
        if (key.meta?.keyRequest?.contractID) {
          try {
            key.meta.keyRequest.contractID = maybeEncryptedIncomingData(contractID, state, key.meta.keyRequest.contractID, height, additionalKeys, headJSON)?.valueOf()
          } catch {
            // If we couldn't decrypt it, this value is of no use to us (we
            // can't keep track of key requests and key shares), so we delete it
            delete key.meta.keyRequest.contractID
          }
        }
      })
    })
  }

  // If the operation is GIMessage.OP_CONTRACT,
  // extract encrypted data from keys?.[].meta?.private?.content
  if (op === GIMessage.OP_CONTRACT) {
    (message: any).keys = (message: any).keys?.map((key, eKeyId) => {
      return maybeEncryptedIncomingData(contractID, state, key, height, additionalKeys, headJSON, (key) => {
        if (!key.meta?.private?.content) return
        const decryptionFn = message.foreignContractID ? encryptedIncomingForeignData : encryptedIncomingData
        // $FlowFixMe
        const decryptionContract = ((message.foreignContractID ? message.foreignContractID : contractID): string)
        key.meta.private.content = decryptionFn(decryptionContract, state, key.meta.private.content, height, additionalKeys, headJSON, (value) => {
          const computedKeyId = keyId(value)
          if (computedKeyId !== key.id) {
            throw new Error(`Key ID mismatch. Expected to decrypt key ID ${key.id} but got ${computedKeyId}`)
          }
        })
      })
    })
  }

  // If the operation is GIMessage.OP_KEY_SHARE,
  // extract encrypted data from keys?.[].meta?.private?.content
  if (op === GIMessage.OP_KEY_SHARE) {
    return maybeEncryptedIncomingData(contractID, state, (message: any), height, additionalKeys, headJSON, (message) => {
      (message: any).keys?.forEach((key) => {
        if (!key.meta?.private?.content) return
        const decryptionFn = message.foreignContractID ? encryptedIncomingForeignData : encryptedIncomingData
        const decryptionContract = message.foreignContractID || contractID
        key.meta.private.content = decryptionFn(decryptionContract, state, key.meta.private.content, height, additionalKeys, headJSON, (value) => {
          const computedKeyId = keyId(value)
          if (computedKeyId !== key.id) {
            throw new Error(`Key ID mismatch. Expected to decrypt key ID ${key.id} but got ${computedKeyId}`)
          }
        })
      })
    })
  }

  // If the operation is OP_KEY_REQUEST, the payload might be EncryptedData
  // The ReplyWith attribute is SignedData
  if (op === GIMessage.OP_KEY_REQUEST) {
    return maybeEncryptedIncomingData(contractID, state, (message: any), height, additionalKeys, headJSON, (msg) => {
      msg.replyWith = signedIncomingData(msg.contractID, undefined, msg.replyWith, msg.height, headJSON)
    })
  }

  // If the operation is OP_ACTION_UNENCRYPTED, it may contain an inner
  // signature
  // Actions must be signed using a key for the current contract
  if (op === GIMessage.OP_ACTION_UNENCRYPTED && isRawSignedData(message)) {
    return signedIncomingData(contractID, state, message, height, headJSON)
  }

  // Inner signatures are handled by EncryptedData
  if (op === GIMessage.OP_ACTION_ENCRYPTED) {
    return message
  }

  if (op === GIMessage.OP_KEY_DEL) {
    return ((message: any): any[]).map((key) => {
      return maybeEncryptedIncomingData(contractID, state, (key: any), height, additionalKeys, headJSON, undefined)
    })
  }

  if (op === GIMessage.OP_KEY_REQUEST_SEEN) {
    return maybeEncryptedIncomingData(contractID, state, (parsedMessage: any), height, additionalKeys, headJSON, undefined)
  }

  // If the operation is OP_ATOMIC, call this function recursively
  if (op === GIMessage.OP_ATOMIC) {
    return ((((message: any): GIOpAtomic)
      .map(([opT, opV]) =>
        [
          opT,
          decryptedAndVerifiedDeserializedMessage({ ...head, op: opT }, headJSON, contractID, (opV: any), additionalKeys, state)
        ]
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
  _direction: GIMsgDirection
  _decryptedValue: Object

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
      previousHEAD?: ?string,
      height?: ?number,
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
      manifest
    }
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
    const { head: headJSON, ...parsedValue } = JSON.parse(value)
    const head = JSON.parse(headJSON)
    const contractID = head.op === GIMessage.OP_CONTRACT ? createCID(value) : head.contractID

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

    const signedMessageData = signedIncomingData(
      contractID, state, parsedValue, head.height, headJSON,
      (message) => decryptedAndVerifiedDeserializedMessage(head, headJSON, contractID, message, additionalKeys, state)
    )

    return new this({
      direction: 'incoming',
      mapping: { key: createCID(value), value },
      head,
      signedMessageData
    })
  }

  static deserializeHEAD (value: string): { head: Object; hash: string; contractID: string; isFirstMessage: boolean; description: () => string } {
    if (!value) throw new Error(`deserialize bad value: ${value}`)
    let head, hash
    const result = {
      get head () {
        if (head === undefined) {
          head = JSON.parse(JSON.parse(value).head)
        }
        return head
      },
      get hash () {
        if (!hash) {
          hash = createCID(value)
        }
        return hash
      },
      get contractID () {
        return result.head?.contractID ?? result.hash
      },
      description (): string {
        const type = this.head.op
        return `<op_${type}|${this.hash} of ${this.contractID}>`
      },
      get isFirstMessage (): boolean {
        return !result.head?.contractID
      }
    }
    return result
  }

  constructor (params: GIMsgParams) {
    this._direction = params.direction
    this._mapping = params.mapping
    this._head = params.head
    this._signedMessageData = ((params.signedMessageData: any): SignedData<GIOpValue>)

    // perform basic sanity check
    const type = this.opType()
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
          atomicTopLevel = false;
          (message: any[]).forEach(([t, m]) => validate(t, m))
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
        case GIMessage.OP_ACTION_UNENCRYPTED:
        // nothing for now
          break
        default:
          throw new Error(`unsupported op: ${type}`)
      }
    }

    // this._message is set as a getter to verify the signature only once the
    // message contents are read
    Object.defineProperty(this, '_message', {
      get: ((validated?: boolean) => () => {
        const message = this._signedMessageData.valueOf()
        // If we haven't validated the message, validate it now
        if (!validated) {
          validate(type, message)
          validated = true
        }
        return message
      })()
    })
  }

  decryptedValue (): any {
    if (this._decryptedValue) return this._decryptedValue
    try {
      const value = this.message()
      const data = unwrapMaybeEncryptedData(value)
      // Did decryption succeed? (unwrapMaybeEncryptedData will return undefined
      // on failure)
      if (data?.data) {
      // The data inside could be signed. In this case, we unwrap that to get
      // to the inner contents
        if (isSignedData(data.data)) {
          this._decryptedValue = data.data.valueOf()
        } else {
          this._decryptedValue = data.data
        }
      }
      return this._decryptedValue
    } catch {
      // Signature or encryption error
      // We don't log this error because it's already logged when the value is
      // retrieved
      return undefined
    }
  }

  head (): Object { return this._head }

  message (): GIOpValue { return this._message }

  op (): GIOp { return [this.head().op, this.message()] }

  rawOp (): GIOpRaw { return [this.head().op, this._signedMessageData] }

  opType (): GIOpType { return this.head().op }

  opValue (): GIOpValue { return this.message() }

  signingKeyId (): string { return this._signedMessageData.signingKeyId }

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

  isFirstMessage (): boolean { return !this.head().contractID }

  contractID (): string { return this.head().contractID || this.hash() }

  originatingContractID (): string { return this.head().originatingContractID || this.contractID() }

  serialize (): string { return this._mapping.value }

  hash (): string { return this._mapping.key }

  height (): number { return this._head.height }

  id (): string {
    // TODO: Schedule for later removal
    throw new Error('GIMessage.id() was called but it has been removed')
  }

  direction (): 'incoming' | 'outgoing' {
    return this._direction
  }

  // $FlowFixMe[unsupported-syntax]
  static get [serdesTagSymbol] () {
    return 'GIMessage'
  }

  // $FlowFixMe[unsupported-syntax]
  static [serdesSerializeSymbol] (m: GIMessage) {
    return [m.serialize(), m.direction(), m.decryptedValue()]
  }

  // $FlowFixMe[unsupported-syntax]
  static [serdesDeserializeSymbol] ([serialized, direction, decryptedValue]) {
    const m = GIMessage.deserialize(serialized)
    m._direction = direction
    m._decryptedValue = decryptedValue
    return m
  }
}

function messageToParams (head: Object, message: SignedData<GIOpValue>): GIMsgParams {
  // NOTE: the JSON strings generated here must be preserved forever.
  //       do not ever regenerate this message using the contructor.
  //       instead store it using serialize() and restore it using deserialize().
  //       The issue is that different implementations of JavaScript engines might generate different strings
  //       when serializing JS objects using JSON.stringify
  //       and that would lead to different hashes resulting from createCID.
  //       So to get around this we save the serialized string upon creation
  //       and keep a copy of it (instead of regenerating it as needed).
  //       https://github.com/okTurtles/group-income/pull/1513#discussion_r1142809095
  let mapping
  return {
    direction: has(message, 'recreate') ? 'outgoing' : 'incoming',
    // Lazy computation of mapping to prevent us from serializing outgoing
    // atomic operations
    get mapping () {
      if (!mapping) {
        const headJSON = JSON.stringify(head)
        const messageJSON = { ...message.serialize(headJSON), head: headJSON }
        const value = JSON.stringify(messageJSON)

        mapping = {
          key: createCID(value),
          value
        }
      }
      return mapping
    },
    head,
    signedMessageData: message
  }
}
