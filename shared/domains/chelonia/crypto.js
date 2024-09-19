'use strict'

import nacl from 'tweetnacl'

import { blake32Hash, bytesToB64, b64ToBuf, strToBuf } from '~/shared/functions.js'

import scrypt from 'scrypt-async'

// ENULL and SNULL are 'null' algorithms for asymmetric encryption and
// signatures, respectively. They are useful for development and testing because
// their values can easily be inspected by hand but they offer ABSOLUTELY NO
// PROTECTION and should *NEVER* be used in production.
export const ENULL = 'eNULL'
export const SNULL = 'sNULL'

export const EDWARDS25519SHA512BATCH = 'edwards25519sha512batch'
export const CURVE25519XSALSA20POLY1305 = 'curve25519xsalsa20poly1305'
export const XSALSA20POLY1305 = 'xsalsa20poly1305'
// 32 bytes of keying material, used for external keys (such as files)
export const EXTERNALKM32 = 'externalkm32'

const bytesOrObjectToB64 = (ary: Uint8Array) => {
  if (!(ary instanceof Uint8Array)) {
    console.error('@@@bytesOrObjectToB64', ary, ary.constructor, ary instanceof Uint8Array)
    throw Error('Unsupported type')
  }
  return bytesToB64(ary)
}

export type Key = {
  type: string;
  secretKey?: any;
  publicKey?: any;
}

export const keygen = (type: string): Key => {
  if (process.env.ENABLE_UNSAFE_NULL_CRYPTO === 'true' && (type === ENULL || type === SNULL)) {
    const res: Key = {
      type,
      publicKey: bytesOrObjectToB64(nacl.randomBytes(18))
    }
    Object.defineProperty(res, 'secretKey', { value: res.publicKey })

    return res
  }

  if (type === EDWARDS25519SHA512BATCH) {
    const key = nacl.sign.keyPair()

    const res: Key = {
      type: type,
      publicKey: key.publicKey
    }
    // prevents 'secretKey' from being enumerated or appearing in JSON
    Object.defineProperty(res, 'secretKey', { value: key.secretKey })

    return res
  } else if (type === CURVE25519XSALSA20POLY1305) {
    const key = nacl.box.keyPair()

    const res: Key = {
      type: type,
      publicKey: key.publicKey
    }

    Object.defineProperty(res, 'secretKey', { value: key.secretKey })

    return res
  } else if (type === XSALSA20POLY1305) {
    const res: Key = {
      type: type
    }

    Object.defineProperty(res, 'secretKey', { value: nacl.randomBytes(nacl.secretbox.keyLength) })

    return res
  } else if (type === EXTERNALKM32) {
    const res: Key = {
      type: type
    }

    Object.defineProperty(res, 'secretKey', { value: nacl.randomBytes(32) })

    return res
  }

  throw new Error('Unsupported key type')
}
export const generateSalt = (): string => {
  return bytesOrObjectToB64(nacl.randomBytes(18))
}
export const deriveKeyFromPassword = (type: string, password: string, salt: string): Promise<Key> => {
  if (process.env.ENABLE_UNSAFE_NULL_CRYPTO === 'true' && (type === ENULL || type === SNULL)) {
    const v = blake32Hash(blake32Hash(salt) + blake32Hash(password))
    return Promise.resolve({
      type,
      secretKey: v,
      publicKey: v
    })
  }

  if (![EDWARDS25519SHA512BATCH, CURVE25519XSALSA20POLY1305, XSALSA20POLY1305].includes(type)) {
    return Promise.reject(new Error('Unsupported type'))
  }

  return new Promise((resolve) => {
    scrypt(password, salt, {
      N: 16384,
      r: 8,
      p: 1,
      dkLen: type === EDWARDS25519SHA512BATCH ? nacl.sign.keyLength : type === CURVE25519XSALSA20POLY1305 ? nacl.box.keyLength : type === XSALSA20POLY1305 ? nacl.secretbox.keyLength : 0,
      encoding: 'binary'
    }, (derivedKey) => {
      if (type === EDWARDS25519SHA512BATCH) {
        const key = nacl.sign.keyPair.fromSeed(derivedKey)

        resolve({
          type: type,
          secretKey: key.secretKey,
          publicKey: key.publicKey
        })
      } else if (type === CURVE25519XSALSA20POLY1305) {
        const key = nacl.box.keyPair.fromSecretKey(derivedKey)

        resolve({
          type: type,
          secretKey: key.secretKey,
          publicKey: key.publicKey
        })
      } else if (type === XSALSA20POLY1305) {
        resolve({
          type: type,
          secretKey: derivedKey
        })
      }
    })
  })
}

// Format: [type, publicKey, secretKey]: [string, string, null] | [string, null, string]
// Using an array instead of an object ensures that the object is serialized in order since the JSON specification does not define the order for object keys
// and therefore different it could vary across implementations
export const serializeKey = (key: Key, saveSecretKey: boolean): string => {
  if (process.env.ENABLE_UNSAFE_NULL_CRYPTO === 'true' && (key.type === ENULL || key.type === SNULL)) {
    return JSON.stringify([
      key.type,
      saveSecretKey ? null : key.publicKey,
      saveSecretKey ? key.secretKey : null
    ], undefined, 0)
  }

  if (key.type === EDWARDS25519SHA512BATCH || key.type === CURVE25519XSALSA20POLY1305) {
    if (!saveSecretKey) {
      if (!key.publicKey) {
        throw new Error('Unsupported operation: no public key to export')
      }

      return JSON.stringify([
        key.type,
        bytesOrObjectToB64(key.publicKey),
        null
      ], undefined, 0)
    }

    if (!key.secretKey) {
      throw new Error('Unsupported operation: no secret key to export')
    }

    return JSON.stringify([
      key.type,
      null,
      bytesOrObjectToB64(key.secretKey)
    ], undefined, 0)
  } else if (key.type === XSALSA20POLY1305) {
    if (!saveSecretKey) {
      throw new Error('Unsupported operation: no public key to export')
    }

    if (!key.secretKey) {
      throw new Error('Unsupported operation: no secret key to export')
    }

    return JSON.stringify([
      key.type,
      null,
      bytesOrObjectToB64(key.secretKey)
    ], undefined, 0)
  }

  throw new Error('Unsupported key type')
}
export const deserializeKey = (data: string): Key => {
  const keyData = JSON.parse(data)

  if (!keyData || keyData.length !== 3) {
    throw new Error('Invalid key object')
  }

  if (process.env.ENABLE_UNSAFE_NULL_CRYPTO === 'true' && (keyData[0] === ENULL || keyData[0] === SNULL)) {
    const res: Key = {
      type: keyData[0]
    }

    if (keyData[2]) {
      Object.defineProperty(res, 'secretKey', { value: keyData[2] })
      res.publicKey = keyData[2]
    } else {
      res.publicKey = keyData[1]
    }

    return res
  }

  if (keyData[0] === EDWARDS25519SHA512BATCH) {
    if (keyData[2]) {
      const key = nacl.sign.keyPair.fromSecretKey(b64ToBuf(keyData[2]))

      const res: Key = {
        type: keyData[0],
        publicKey: key.publicKey
      }

      Object.defineProperty(res, 'secretKey', { value: key.secretKey })

      return res
    } else if (keyData[1]) {
      return {
        type: keyData[0],
        publicKey: new Uint8Array(b64ToBuf(keyData[1]))
      }
    }

    throw new Error('Missing secret or public key')
  } else if (keyData[0] === CURVE25519XSALSA20POLY1305) {
    if (keyData[2]) {
      const key = nacl.box.keyPair.fromSecretKey(b64ToBuf(keyData[2]))

      const res: Key = {
        type: keyData[0],
        publicKey: key.publicKey
      }

      Object.defineProperty(res, 'secretKey', { value: key.secretKey })

      return res
    } else if (keyData[1]) {
      return {
        type: keyData[0],
        publicKey: new Uint8Array(b64ToBuf(keyData[1]))
      }
    }

    throw new Error('Missing secret or public key')
  } else if (keyData[0] === XSALSA20POLY1305) {
    if (!keyData[2]) {
      throw new Error('Secret key missing')
    }

    const res: Key = {
      type: keyData[0]
    }

    Object.defineProperty(res, 'secretKey', { value: new Uint8Array(b64ToBuf(keyData[2])) })

    return res
  }

  throw new Error('Unsupported key type')
}
export const keygenOfSameType = (inKey: Key | string): Key => {
  const key = (Object(inKey) instanceof String) ? deserializeKey(((inKey: any): string)) : ((inKey: any): Key)

  return keygen(key.type)
}
export const keyId = (inKey: Key | string): string => {
  const key = (Object(inKey) instanceof String) ? deserializeKey(((inKey: any): string)) : ((inKey: any): Key)

  const serializedKey = serializeKey(key, !key.publicKey)
  return blake32Hash(serializedKey)
}
export const sign = (inKey: Key | string, data: string): string => {
  const key = (Object(inKey) instanceof String) ? deserializeKey(((inKey: any): string)) : ((inKey: any): Key)

  if (process.env.ENABLE_UNSAFE_NULL_CRYPTO === 'true' && key.type === SNULL) {
    if (!key.secretKey) {
      throw new Error('Secret key missing')
    }

    return key.secretKey + ';' + blake32Hash(data)
  }

  if (key.type !== EDWARDS25519SHA512BATCH) {
    throw new Error('Unsupported algorithm')
  }

  if (!key.secretKey) {
    throw new Error('Secret key missing')
  }

  const messageUint8 = strToBuf(data)
  const signature = nacl.sign.detached(messageUint8, key.secretKey)
  const base64Signature = bytesOrObjectToB64(signature)

  return base64Signature
}
export const verifySignature = (inKey: Key | string, data: string, signature: string): void => {
  const key = (Object(inKey) instanceof String) ? deserializeKey(((inKey: any): string)) : ((inKey: any): Key)

  if (process.env.ENABLE_UNSAFE_NULL_CRYPTO === 'true' && key.type === SNULL) {
    if (!key.publicKey) {
      throw new Error('Public key missing')
    }
    if ((key.publicKey + ';' + blake32Hash(data)) !== signature) {
      throw new Error('Invalid signature')
    }
    return
  }

  if (key.type !== EDWARDS25519SHA512BATCH) {
    throw new Error('Unsupported algorithm')
  }

  if (!key.publicKey) {
    throw new Error('Public key missing')
  }

  const decodedSignature = b64ToBuf(signature)
  const messageUint8 = strToBuf(data)

  const result = nacl.sign.detached.verify(messageUint8, decodedSignature, key.publicKey)

  if (!result) {
    throw new Error('Invalid signature')
  }
}

/**
 * @param inKey - Encryption key to use
 * @param data - Data to encrypt
 * @param ad - Additional data (the AD in AEAD), used for validation
 */
export const encrypt = (inKey: Key | string, data: string, ad?: string): string => {
  const key = (Object(inKey) instanceof String) ? deserializeKey(((inKey: any): string)) : ((inKey: any): Key)

  if (process.env.ENABLE_UNSAFE_NULL_CRYPTO === 'true' && key.type === ENULL) {
    if (!key.publicKey) {
      throw new Error('Public key missing')
    }

    return `${key.publicKey};${data};${ad ?? ''}`
  }

  if (key.type === XSALSA20POLY1305) {
    if (!key.secretKey) {
      throw new Error('Secret key missing')
    }

    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)
    let encryptionNonce: typeof nonce

    if (ad) {
      encryptionNonce = new Uint8Array(nonce)
      const adHash = nacl.hash(strToBuf(ad))
      const len = Math.min(adHash.length, nonce.length)
      for (let i = 0; i < len; i++) {
        encryptionNonce[i] ^= adHash[i]
      }
    } else {
      encryptionNonce = nonce
    }

    const messageUint8 = strToBuf(data)
    const box = nacl.secretbox(messageUint8, encryptionNonce, key.secretKey)

    const fullMessage = new Uint8Array(nonce.length + box.length)

    fullMessage.set(nonce)
    fullMessage.set(box, nonce.length)

    const base64FullMessage = bytesOrObjectToB64(fullMessage)

    return base64FullMessage
  } else if (key.type === CURVE25519XSALSA20POLY1305) {
    if (!key.publicKey) {
      throw new Error('Public key missing')
    }

    const nonce = nacl.randomBytes(nacl.box.nonceLength)
    let encryptionNonce: typeof nonce

    if (ad) {
      encryptionNonce = new Uint8Array(nonce)
      const adHash = nacl.hash(strToBuf(ad))
      const len = Math.min(adHash.length, nonce.length)
      for (let i = 0; i < len; i++) {
        encryptionNonce[i] ^= adHash[i]
      }
    } else {
      encryptionNonce = nonce
    }

    const messageUint8 = strToBuf(data)
    const ephemeralKey = nacl.box.keyPair()
    const box = nacl.box(messageUint8, encryptionNonce, key.publicKey, ephemeralKey.secretKey)
    // Attempt to discard the data in memory for ephemeralKey.secretKey
    ephemeralKey.secretKey.fill(0)

    const fullMessage = new Uint8Array(nacl.box.publicKeyLength + nonce.length + box.length)

    fullMessage.set(ephemeralKey.publicKey)
    fullMessage.set(nonce, nacl.box.publicKeyLength)
    fullMessage.set(box, nacl.box.publicKeyLength + nonce.length)

    const base64FullMessage = bytesOrObjectToB64(fullMessage)

    return base64FullMessage
  }

  throw new Error('Unsupported algorithm')
}
export const decrypt = (inKey: Key | string, data: string, ad?: string): string => {
  const key = (Object(inKey) instanceof String) ? deserializeKey(((inKey: any): string)) : ((inKey: any): Key)

  if (process.env.ENABLE_UNSAFE_NULL_CRYPTO === 'true' && key.type === ENULL) {
    if (!key.secretKey) {
      throw new Error('Secret key missing')
    }

    if (!data.startsWith(key.secretKey + ';') || !data.endsWith(';' + (ad ?? ''))) {
      throw new Error('Additional data mismatch')
    }
    return data.slice(String(key.secretKey).length + 1, data.length - 1 - (ad ?? '').length)
  }

  if (key.type === XSALSA20POLY1305) {
    if (!key.secretKey) {
      throw new Error('Secret key missing')
    }

    const messageWithNonceAsUint8Array = b64ToBuf(data)

    const nonce = messageWithNonceAsUint8Array.slice(0, nacl.secretbox.nonceLength)
    const message = messageWithNonceAsUint8Array.slice(
      nacl.secretbox.nonceLength,
      messageWithNonceAsUint8Array.length
    )

    if (ad) {
      const adHash = nacl.hash(strToBuf(ad))
      const len = Math.min(adHash.length, nonce.length)
      for (let i = 0; i < len; i++) {
        nonce[i] ^= adHash[i]
      }
    }

    const decrypted = nacl.secretbox.open(message, nonce, key.secretKey)

    if (!decrypted) {
      throw new Error('Could not decrypt message')
    }

    return Buffer.from(decrypted).toString('utf-8')
  } else if (key.type === CURVE25519XSALSA20POLY1305) {
    if (!key.secretKey) {
      throw new Error('Secret key missing')
    }

    const messageWithNonceAsUint8Array = b64ToBuf(data)

    const ephemeralPublicKey = messageWithNonceAsUint8Array.slice(0, nacl.box.publicKeyLength)
    const nonce = messageWithNonceAsUint8Array.slice(nacl.box.publicKeyLength, nacl.box.publicKeyLength + nacl.box.nonceLength)
    const message = messageWithNonceAsUint8Array.slice(
      nacl.box.publicKeyLength + nacl.box.nonceLength
    )

    if (ad) {
      const adHash = nacl.hash(strToBuf(ad))
      const len = Math.min(adHash.length, nonce.length)
      for (let i = 0; i < len; i++) {
        nonce[i] ^= adHash[i]
      }
    }

    const decrypted = nacl.box.open(message, nonce, ephemeralPublicKey, key.secretKey)

    if (!decrypted) {
      throw new Error('Could not decrypt message')
    }

    return Buffer.from(decrypted).toString('utf-8')
  }

  throw new Error('Unsupported algorithm')
}
