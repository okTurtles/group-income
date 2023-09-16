import sbp from '@sbp/sbp'
import { has } from '~/frontend/model/contracts/shared/giLodash.js'
import { blake32Hash } from '~/shared/functions.js'
import type { Key } from './crypto.js'
import { deserializeKey, keyId, serializeKey, sign, verifySignature } from './crypto.js'
import { ChelErrorSignatureError, ChelErrorSignatureKeyNotFound, ChelErrorUnexpected } from './errors.js'

export interface SignedData<T> {
  signingKeyId: string,
  valueOf: () => T,
  serialize: (additionalData: ?string) => { _signedData: [string, string, string] },
  context?: [string, Object, number, string],
  toString: (additionalData: ?string) => string,
  recreate?: (data: T) => SignedData<T>,
  toJSON?: () => [string, string],
  get: (k: string) => any,
  set?: (k: string, v: any) => void
}

// `proto` & `wrapper` are utilities for `isSignedData`
const proto: Object = Object.create(null)

const wrapper = <T>(o: T): T => {
  return Object.setPrototypeOf(o, proto)
}

// `isSignedData` will return true for objects created by the various
// `signed*Data` functions. It's meant to implement functionality equivalent
// to `o instanceof SignedData`
export const isSignedData = (o: any): boolean => {
  return !!o && Object.getPrototypeOf(o) === proto
}

// TODO: Check for permissions and allowedActions; this requires passing some
// additional context
const signData = function (sKeyId: string, data: any, extraFields: Object, additionalKeys: Object, additionalData: string) {
  if (!additionalData) {
    throw new ChelErrorSignatureError('Signature additional data must be provided')
  }
  // Has the key been revoked? If so, attempt to find an authorized key by the same name
  // $FlowFixMe
  const designatedKey = this._vm?.authorizedKeys?.[sKeyId]
  if (!designatedKey?.purpose.includes(
    'sig'
  )) {
    throw new ChelErrorSignatureError(`Signing key ID ${sKeyId} is missing or is missing signing purpose`)
  }
  if (designatedKey._notAfterHeight !== undefined) {
    const name = (this._vm: any).authorizedKeys[sKeyId].name
    console.log({ state: this })
    const newKeyId = (Object.values(this._vm?.authorizedKeys).find((v: any) => v._notAfterHeight === undefined && v.name === name && v.purpose.includes('sig')): any)?.id

    if (!newKeyId) {
      throw new ChelErrorSignatureError(`Signing key ID ${sKeyId} has been revoked and no new key exists by the same name (${name})`)
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
// entire GIMessage
const verifySignatureData = function (height: number, data: any, additionalData: string) {
  if (!this) {
    throw new ChelErrorSignatureError('Missing contract state')
  }

  if (!isRawSignedData(data)) {
    throw new ChelErrorSignatureError('Invalid message format')
  }

  if (!Number.isSafeInteger(height) || height < 0) {
    throw new ChelErrorSignatureError(`Height ${height} is invalid or out of range`)
  }

  const [serializedMessage, sKeyId, signature] = data._signedData
  const designatedKey = this._vm?.authorizedKeys?.[sKeyId]

  if (!designatedKey || (height > designatedKey._notAfterHeight) || (height < designatedKey._notBeforeHeight) || !designatedKey.purpose.includes(
    'sig'
  )) {
    throw new ChelErrorUnexpected(
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

export const signedOutgoingData = <T>(state: Object, sKeyId: string, data: T, additionalKeys?: Object): SignedData<T> => {
  if (!state || data === undefined || !sKeyId) throw new TypeError('Invalid invocation')
  const rootState = sbp('chelonia/rootState')

  if (!additionalKeys) {
    additionalKeys = rootState.secretKeys
  }

  const extraFields = Object.create(null)

  const boundStringValueFn = signData.bind(state, sKeyId, data, extraFields, additionalKeys)
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
      return (data: T) => signedOutgoingData(state, sKeyId, data, additionalKeys)
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
export const signedOutgoingDataWithRawKey = <T>(key: Key, data: T, height?: number): SignedData<T> => {
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

  const boundStringValueFn = signData.bind(state, sKeyId, data, extraFields, { [sKeyId]: key })
  const serializefn = (additionalData: ?string) => boundStringValueFn(additionalData || '')

  return wrapper({
    get signingKeyId () {
      return sKeyId
    },
    get serialize () {
      return serializefn
    },
    get toString () {
      return (additionalData: ?string) => JSON.stringify(this.serialize(additionalData, height))
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
  // TODO: Temporary until the server can validate signatures
  const verifySignedValueFn = process.env.BUILD === 'web'
    ? () => {
        if (verifySignedValue) {
          return verifySignedValue[1]
        }
        const rootState = sbp('chelonia/rootState')
        verifySignedValue = verifySignatureData.call(state || rootState?.[contractID], height, data, additionalData)
        if (mapperFn) verifySignedValue[1] = mapperFn(verifySignedValue[1])
        return verifySignedValue[1]
      }
    : () => JSON.parse(data._signedData[0])

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
