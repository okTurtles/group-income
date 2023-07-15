import sbp from '@sbp/sbp'
import type { Key } from './crypto.js'
import { decrypt, deserializeKey, encrypt, keyId, serializeKey } from './crypto.js'
import { ChelErrorDecryptionError, ChelErrorDecryptionKeyNotFound } from './errors.js'

const encryptData = function (eKeyId: string, data: any) {
  // Has the key been revoked? If so, attempt to find an authorized key by the same name
  // $FlowFixMe
  if ((this._vm?.revokedKeys?.[eKeyId]?.purpose.includes(
    'enc'
  ))) {
    const name = (this._vm: any).revokedKeys[eKeyId].name
    const newKeyId = (Object.values(this._vm?.authorizedKeys).find((v: any) => v.name === name && v.purpose.includes('sig')): any)?.id

    if (!newKeyId) {
      throw new Error(`Encryption key ID ${eKeyId} has been revoked and no new key exists by the same name (${name})`)
    }

    eKeyId = newKeyId
  }

  const key = (this._vm?.authorizedKeys?.[eKeyId]?.purpose.includes(
    'enc'
  ))
    ? this._vm?.authorizedKeys?.[eKeyId].data
    : undefined

  if (!key) {
    throw new Error(`Missing encryption key ${eKeyId}`)
  }

  const deserializedKey = typeof key === 'string' ? deserializeKey(key) : key

  return JSON.stringify([
    keyId(deserializedKey),
    encrypt(deserializedKey, JSON.stringify(data))
  ])
}

const decryptData = function (data: string, additionalKeys: Object, validatorFn?: (v: any) => void) {
  if (!this) {
    throw new ChelErrorDecryptionError('Missing contract state')
  }

  const deserializedData = JSON.parse(data)

  if (!Array.isArray(deserializedData) || deserializedData.length !== 2 || deserializedData.map(v => typeof v).filter(v => v !== 'string').length !== 0) {
    throw new ChelErrorDecryptionError('Invalid message format')
  }

  const [eKeyId, message] = deserializedData
  const key = (this._vm?.authorizedKeys?.[eKeyId]?.purpose.includes(
    'enc'
  ))
    ? this._volatile?.keys?.[eKeyId] || additionalKeys[eKeyId]
    : undefined

  if (!key) {
    throw new ChelErrorDecryptionKeyNotFound(`Key ${eKeyId} not found`)
  }

  const deserializedKey = typeof key === 'string' ? deserializeKey(key) : key

  try {
    const result = JSON.parse(decrypt(deserializedKey, message))
    if (typeof validatorFn === 'function') validatorFn(result)
    return result
  } catch (e) {
    throw new ChelErrorDecryptionError(e?.message || e)
  }
}

export const encryptedOutgoingData = (state: Object, eKeyId: string, data: any): Object => {
  const boundStringValueFn = encryptData.bind(state, eKeyId, data)

  const returnProps = {
    toJSON: boundStringValueFn,
    toString: boundStringValueFn,
    valueOf: () => data
  }

  return typeof data === 'object'
    ? Object.assign(Object.create(null), data, returnProps)
    : Object.assign(Object(data), returnProps)
}

// Used for OP_CONTRACT as a state does not yet exist
export const encryptedOutgoingDataWithRawKey = (key: Key, data: any): Object => {
  const eKeyId = keyId(key)
  const state = {
    _vm: {
      authorizedKeys: {
        [eKeyId]: {
          purpose: ['enc'],
          data: serializeKey(key, false)
        }
      }
    }
  }
  const boundStringValueFn = encryptData.bind(state, eKeyId, data)

  const returnProps = {
    toJSON: boundStringValueFn,
    toString: boundStringValueFn,
    valueOf: () => data
  }

  return typeof data === 'object'
    ? Object.assign(Object.create(null), data, returnProps)
    : Object.assign(Object(data), returnProps)
}

export const encryptedIncomingData = (contractID: string, state: Object, data: string, additionalKeys?: Object, validatorFn?: (v: any) => void): Object => {
  const stringValueFn = () => data
  let decryptedValue
  const decryptedValueFn = () => {
    if (decryptedValue) {
      return decryptedValue
    }
    const rootState = sbp('chelonia/rootState')
    console.log('encryptedIncomingData', { contractID, state, rootState, rS: rootState?.[contractID], data })
    decryptedValue = decryptData.call(state || rootState?.[contractID], data, additionalKeys, validatorFn)
    return decryptedValue
  }

  return {
    toJSON: stringValueFn,
    toString: stringValueFn,
    valueOf: decryptedValueFn
  }
}

export const encryptedDataKeyId = (data: string): string => {
  const deserializedData = JSON.parse(data)

  if (!Array.isArray(deserializedData) || deserializedData.length !== 2 || deserializedData.map(v => typeof v).filter(v => v !== 'string').length !== 0) {
    throw new ChelErrorDecryptionError('Invalid message format')
  }

  return deserializedData[0]
}
