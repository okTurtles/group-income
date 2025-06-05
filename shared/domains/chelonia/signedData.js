import sbp from '@sbp/sbp'
import { has } from 'turtledash'
import { blake32Hash } from '~/shared/functions.js'
import type { Key } from '@chelonia/crypto'
import { deserializeKey, keyId, serializeKey, sign, verifySignature } from '@chelonia/crypto'
import { ChelErrorSignatureError, ChelErrorSignatureKeyNotFound, ChelErrorSignatureKeyUnauthorized } from './errors.js'

const rootStateFn = () => sbp('chelonia/rootState')

export interface SignedData<T> {
  // The ID of the signing key used
  signingKeyId: string,
  // The unsigned data. For outgoing data, this is the original data given
  // as input. For incoming data, signature verification will be attempted.
  valueOf: () => T,
  // The serialized _signed_ data. For outgoing data, signing will be
  // attempted. For incoming data, this is the original data given as input.
  // The `additionalData` parameter is only used for outgoing data, and binds
  // the signed payload to additional information.
  serialize: (additionalData: ?string) => { _signedData: [string, string, string] },
  // Data needed to recreate signed data.
  // [contractID, data, height, additionalData]
  context?: [string, Object, number, string],
  // A string version of the serialized signed data (i.e., `JSON.stringify()`)
  toString: (additionalData: ?string) => string,
  // For outgoing data, recreate SignedData using different data and the same
  // parameters
  recreate?: (data: T) => SignedData<T>,
  // For incoming data, this is an alias of `serialize`. Undefined for outgoing
  // data.
  toJSON?: () => [string, string],
  // `get` and `set` can set additional (unsigned) fields within `SignedData`
  get: (k: string) => any,
  set?: (k: string, v: any) => void
}

// `proto` & `wrapper` are utilities for `isSignedData`
const proto: Object = Object.create(null, {
  _isSignedData: {
    value: true
  }
})

const wrapper = <T>(o: T): T => {
  return Object.setPrototypeOf(o, proto)
}

// `isSignedData` will return true for objects created by the various
// `signed*Data` functions. It's meant to implement functionality equivalent
// to `o instanceof SignedData`
export const isSignedData = (o: any): boolean => {
  return !!o && !!Object.getPrototypeOf(o)?._isSignedData
}

// TODO: Check for permissions and allowedActions; this requires passing some
// additional context
const signData = function (stateOrContractID: string | Object, sKeyId: string, data: any, extraFields: Object, additionalKeys: Object, additionalData: string) {
  const state = typeof stateOrContractID === 'string' ? rootStateFn()[stateOrContractID] : stateOrContractID
  if (!additionalData) {
    throw new ChelErrorSignatureError('Signature additional data must be provided')
  }
  // Has the key been revoked? If so, attempt to find an authorized key by the same name
  // $FlowFixMe
  const designatedKey = state?._vm?.authorizedKeys?.[sKeyId]
  if (!designatedKey?.purpose.includes(
    'sig'
  )) {
    throw new ChelErrorSignatureKeyNotFound(`Signing key ID ${sKeyId} is missing or is missing signing purpose`)
  }
  if (designatedKey._notAfterHeight != null) {
    const name = (state._vm: any).authorizedKeys[sKeyId].name
    const newKeyId = (Object.values(state._vm?.authorizedKeys).find((v: any) => v._notAfterHeight == null && v.name === name && v.purpose.includes('sig')): any)?.id

    if (!newKeyId) {
      throw new ChelErrorSignatureKeyNotFound(`Signing key ID ${sKeyId} has been revoked and no new key exists by the same name (${name})`)
    }

    sKeyId = newKeyId
  }

  const key = additionalKeys[sKeyId]

  if (!key) {
    throw new ChelErrorSignatureKeyNotFound(`Missing signing key ${sKeyId}`)
  }

  const deserializedKey = typeof key === 'string' ? deserializeKey(key) : key

  const serializedData = JSON.stringify(data, (_, v) => {
    if (v && has(v, 'serialize') && typeof v.serialize === 'function') {
      if (v.serialize.length === 1) {
        return v.serialize(additionalData)
      } else {
        return v.serialize()
      }
    }
    return v
  })

  const payloadToSign = blake32Hash(`${blake32Hash(additionalData)}${blake32Hash(serializedData)}`)

  return {
    ...extraFields,
    _signedData: [
      serializedData,
      keyId(deserializedKey),
      sign(deserializedKey, payloadToSign)
    ]
  }
}

// TODO: Check for permissions and allowedActions; this requires passing the
// entire SPMessage
const verifySignatureData = function (state: Object, height: number, data: any, additionalData: string) {
  if (!state) {
    throw new ChelErrorSignatureError('Missing contract state')
  }

  if (!isRawSignedData(data)) {
    throw new ChelErrorSignatureError('Invalid message format')
  }

  if (!Number.isSafeInteger(height) || height < 0) {
    throw new ChelErrorSignatureError(`Height ${height} is invalid or out of range`)
  }

  const [serializedMessage, sKeyId, signature] = data._signedData
  const designatedKey = state._vm?.authorizedKeys?.[sKeyId]

  if (!designatedKey || (height > designatedKey._notAfterHeight) || (height < designatedKey._notBeforeHeight) || !designatedKey.purpose.includes(
    'sig'
  )) {
    // These errors (ChelErrorSignatureKeyUnauthorized) are serious and
    // indicate a bug. Make them fatal when running integration tests
    // (otherwise, they get swallowed and shown as a notification)
    if (process.env.CI) {
      console.error(`Key ${sKeyId} is unauthorized or expired for the current contract`, { designatedKey, height, state: JSON.parse(JSON.stringify(sbp('state/vuex/state'))) })
      // An unhandled promise rejection will cause Cypress to fail
      Promise.reject(new ChelErrorSignatureKeyUnauthorized(
        `Key ${sKeyId} is unauthorized or expired for the current contract`
      ))
    }
    throw new ChelErrorSignatureKeyUnauthorized(
      `Key ${sKeyId} is unauthorized or expired for the current contract`
    )
  }

  // TODO
  const deserializedKey = designatedKey.data

  const payloadToSign = blake32Hash(`${blake32Hash(additionalData)}${blake32Hash(serializedMessage)}`)

  try {
    verifySignature(deserializedKey, payloadToSign, signature)

    const message = JSON.parse(serializedMessage)

    return [sKeyId, message]
  } catch (e) {
    throw new ChelErrorSignatureError(e?.message || e)
  }
}

export const signedOutgoingData = <T>(stateOrContractID: string | Object, sKeyId: string, data: T, additionalKeys?: Object): SignedData<T> => {
  if (!stateOrContractID || data === undefined || !sKeyId) throw new TypeError('Invalid invocation')

  if (!additionalKeys) {
    additionalKeys = rootStateFn().secretKeys
  }

  const extraFields = Object.create(null)

  const boundStringValueFn = signData.bind(null, stateOrContractID, sKeyId, data, extraFields, additionalKeys)
  const serializefn = (additionalData: ?string) => boundStringValueFn(additionalData || '')

  return wrapper({
    get signingKeyId () {
      return sKeyId
    },
    get serialize () {
      return serializefn
    },
    get toString () {
      return (additionalData: ?string) => JSON.stringify(this.serialize(additionalData))
    },
    get valueOf () {
      return () => data
    },
    get recreate () {
      return (data: T) => signedOutgoingData(stateOrContractID, sKeyId, data, additionalKeys)
    },
    get get () {
      return (k: string) => extraFields[k]
    },
    get set () {
      return (k: string, v: any) => {
        extraFields[k] = v
      }
    }
  })
}

// Used for OP_CONTRACT as a state does not yet exist
export const signedOutgoingDataWithRawKey = <T>(key: Key, data: T, _height?: number): SignedData<T> => {
  const sKeyId = keyId(key)
  const state = {
    _vm: {
      authorizedKeys: {
        [sKeyId]: {
          purpose: ['sig'],
          data: serializeKey(key, false),
          _notBeforeHeight: 0,
          _notAfterHeight: undefined
        }
      }
    }
  }

  const extraFields = Object.create(null)

  const boundStringValueFn = signData.bind(null, state, sKeyId, data, extraFields, { [sKeyId]: key })
  const serializefn = (additionalData: ?string) => boundStringValueFn(additionalData || '')

  return wrapper({
    get signingKeyId () {
      return sKeyId
    },
    get serialize () {
      return serializefn
    },
    get toString () {
      return (additionalData: ?string) => JSON.stringify(this.serialize(additionalData))
    },
    get valueOf () {
      return () => data
    },
    get recreate () {
      return (data: T) => signedOutgoingDataWithRawKey(key, data)
    },
    get get () {
      return (k: string) => extraFields[k]
    },
    get set () {
      return (k: string, v: any) => {
        extraFields[k] = v
      }
    }
  })
}

export const signedIncomingData = (contractID: string, state: ?Object, data: any, height: number, additionalData: string, mapperFn?: Function): SignedData<any> => {
  const stringValueFn = () => data
  let verifySignedValue
  const verifySignedValueFn = () => {
    if (verifySignedValue) {
      return verifySignedValue[1]
    }
    verifySignedValue = verifySignatureData(state || rootStateFn()[contractID], height, data, additionalData)
    if (mapperFn) verifySignedValue[1] = mapperFn(verifySignedValue[1])
    return verifySignedValue[1]
  }

  return wrapper({
    get signingKeyId () {
      if (verifySignedValue) return verifySignedValue[0]
      return signedDataKeyId(data)
    },
    get serialize () {
      return stringValueFn
    },
    get context () {
      return [contractID, data, height, additionalData]
    },
    get toString () {
      return () => JSON.stringify(this.serialize())
    },
    get valueOf () {
      return verifySignedValueFn
    },
    get toJSON () {
      return this.serialize
    },
    get get () {
      return (k: string) => k !== '_signedData' ? data[k] : undefined
    }
  })
}

export const signedDataKeyId = (data: any): string => {
  if (!isRawSignedData(data)) {
    throw new ChelErrorSignatureError('Invalid message format')
  }

  return data._signedData[1]
}

export const isRawSignedData = (data: any): boolean => {
  if (!data || typeof data !== 'object' || !has(data, '_signedData') || !Array.isArray(data._signedData) || data._signedData.length !== 3 || data._signedData.map(v => typeof v).filter(v => v !== 'string').length !== 0) {
    return false
  }

  return true
}

// WARNING: The following function (rawSignedIncomingData) will not check signatures
export const rawSignedIncomingData = (data: any): SignedData<any> => {
  if (!isRawSignedData(data)) {
    throw new ChelErrorSignatureError('Invalid message format')
  }

  const stringValueFn = () => data
  let verifySignedValue
  const verifySignedValueFn = () => {
    if (verifySignedValue) {
      return verifySignedValue[1]
    }
    verifySignedValue = [data._signedData[1], JSON.parse(data._signedData[0])]
    return verifySignedValue[1]
  }

  return wrapper({
    get signingKeyId () {
      if (verifySignedValue) return verifySignedValue[0]
      return signedDataKeyId(data)
    },
    get serialize () {
      return stringValueFn
    },
    get toString () {
      return () => JSON.stringify(this.serialize())
    },
    get valueOf () {
      return verifySignedValueFn
    },
    get toJSON () {
      return this.serialize
    },
    get get () {
      return (k: string) => k !== '_signedData' ? data[k] : undefined
    }
  })
}
