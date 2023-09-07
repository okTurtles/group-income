import sbp from '@sbp/sbp'
import { has } from '~/frontend/model/contracts/shared/giLodash.js'
import { blake32Hash } from '~/shared/functions.js'
import type { Key } from './crypto.js'
import { deserializeKey, keyId, serializeKey, sign, verifySignature } from './crypto.js'
import { ChelErrorSignatureError, ChelErrorSignatureKeyNotFound, ChelErrorUnexpected } from './errors.js'

export interface SignedData<T> {
  signingKeyId: string,
  valueOf: () => T,
  toJSON: (additionalData: ?string) => { _signedData: [string, string, string] },
  toString: (additionalData: ?string) => string,
  recreate?: (data: T) => SignedData<T>
}

// TODO: Check for permissions and allowedActions; this requires passing some
// additional context
const signData = function (sKeyId: string, data: any, additionalKeys: Object, additionalData: string) {
  // Has the key been revoked? If so, attempt to find an authorized key by the same name
  // $FlowFixMe
  const designatedKey = this._vm?.authorizedKeys?.[sKeyId]
  if (!designatedKey?.purpose.includes(
    'sig'
  )) {
    throw new Error(`Signing key ID ${sKeyId} is missing or is missing signing purpose`)
  }
  if (designatedKey._notAfterHeight !== undefined) {
    const name = (this._vm: any).authorizedKeys[sKeyId].name
    const newKeyId = (Object.values(this._vm?.authorizedKeys).find((v: any) => designatedKey._notAfterHeight === undefined && v.name === name && v.purpose.includes('sig')): any)?.id

    if (!newKeyId) {
      throw new Error(`Signing key ID ${sKeyId} has been revoked and no new key exists by the same name (${name})`)
    }

    sKeyId = newKeyId
  }

  const key = additionalKeys[sKeyId]

  if (!key) {
    throw new ChelErrorSignatureKeyNotFound(`Missing signing key ${sKeyId}`)
  }

  const deserializedKey = typeof key === 'string' ? deserializeKey(key) : key

  const serializedData = JSON.stringify(data)

  const payloadToSign = blake32Hash(`${blake32Hash(additionalData)}${blake32Hash(serializedData)}`)

  return {
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

  if (!data || typeof data !== 'object' || !has(data, '_signedData') || !Array.isArray(data._signedData) || data._signedData.length !== 3 || data._signedData.map(v => typeof v).filter(v => v !== 'string').length !== 0) {
    throw new ChelErrorSignatureError('Invalid message format')
  }

  const [serializedMessage, sKeyId, signature] = data._signedData
  // height as NaN is used to allow checking for revokedKeys as well as
  // authorizedKeys when verifySignatureing data. This is normally inappropriate because
  // revoked keys should be considered compromised and not used for signing
  // new data
  // However, OP_KEY_SHARE may include data signed with some other contract's
  // keys when a key rotation is done. This is done, along with OP_ATOMIC and
  // OP_KEY_UPDATE to rotate keys in a contract while allowing member contracts
  // to retrieve and use the new key material.
  // In such scenarios, since the keys really live in that other contract, it is
  // impossible to know if the keys had been revoked in the 'source' contract
  // at the time the key rotation was done. This is also different from foreign
  // keys because these signing keys are not necessarily authorized in the
  // contract issuing OP_KEY_SHARE, and what is important is to refer to the
  // (keys in the) foreign contract explicitly, as an alternative to sending
  // an OP_KEY_SHARE to that contract.
  // Using revoked keys represents some security risk since, as mentioned, they
  // should generlly be considered compromised. However, in the scenario above
  // we can trust that the party issuing OP_KEY_SHARE is not maliciously using
  // old (revoked) keys, because there is little to be gained from not doing
  // this. If that party's intention were to leak or compromise keys, they can
  // already do so by other means, since they have access to the raw secrets
  // that OP_KEY_SHARE is meant to protect. Hence, this attack does not open up
  // any new attack vectors or venues that were not already available using
  // different means.
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
  const rootState = sbp('chelonia/rootState')

  if (!additionalKeys) {
    additionalKeys = rootState.secretKeys
  }

  const boundStringValueFn = signData.bind(state, sKeyId, data, additionalKeys)

  return {
    get signingKeyId () {
      return sKeyId
    },
    get toJSON () {
      return (addtionalData: ?string) => boundStringValueFn(addtionalData || '')
    },
    get toString () {
      return (addtionalData: ?string) => JSON.stringify(this.toJSON(addtionalData))
    },
    get valueOf () {
      return () => data
    },
    get recreate () {
      return (data: T) => signedOutgoingData(state, sKeyId, data, additionalKeys)
    }
  }
}

// Used for OP_CONTRACT as a state does not yet exist
export const signedOutgoingDataWithRawKey = <T>(key: Key, data: T): SignedData<T> => {
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
  const boundStringValueFn = signData.bind(state, sKeyId, data, { [sKeyId]: key })

  return {
    get signingKeyId () {
      return sKeyId
    },
    get toJSON () {
      return (addtionalData: ?string) => boundStringValueFn(addtionalData || '')
    },
    get toString () {
      return (addtionalData: ?string) => JSON.stringify(this.toJSON(addtionalData))
    },
    get valueOf () {
      return () => data
    },
    get recreate () {
      return (data: T) => signedOutgoingDataWithRawKey(key, data)
    }
  }
}

export const signedIncomingData = (contractID: string, state: Object, data: any, height: number, additionalData: string): SignedData<any> => {
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
        return verifySignedValue[1]
      }
    : () => JSON.parse(data._signedData[0])

  return {
    get signingKeyId () {
      if (verifySignedValue) return verifySignedValue[0]
      return signedDataKeyId(data)
    },
    get toJSON () {
      return stringValueFn
    },
    get toString () {
      return () => JSON.stringify(stringValueFn)
    },
    get valueOf () {
      return verifySignedValueFn
    }
  }
}

export const signedIncomingForeignData = (contractID: string, _0: any, data: any, _1: any, addtionalData: string): SignedData<any> => {
  const stringValueFn = () => data
  let verifySignedValue
  const verifySignedValueFn = () => {
    if (verifySignedValue) {
      return verifySignedValue[1]
    }
    const rootState = sbp('chelonia/rootState')
    verifySignedValue = verifySignatureData.call(rootState?.[contractID], NaN, data, addtionalData)
    return verifySignedValue[1]
  }

  return {
    get signingKeyId () {
      if (verifySignedValue) return verifySignedValue[0]
      return signedDataKeyId(data)
    },
    get toJSON () {
      return stringValueFn
    },
    get toString () {
      return () => JSON.stringify(stringValueFn)
    },
    get valueOf () {
      return verifySignedValueFn
    }
  }
}

export const signedDataKeyId = (data: any): string => {
  if (!data || typeof data !== 'object' || !has(data, '_signedData') || !Array.isArray(data._signedData) || data._signedData.length !== 3 || data._signedData.map(v => typeof v).filter(v => v !== 'string').length !== 0) {
    throw new ChelErrorSignatureError('Invalid message format')
  }

  return data._signedData[1]
}
