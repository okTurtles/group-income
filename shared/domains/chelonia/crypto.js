'use strict'

import nacl from 'tweetnacl'

import { blake32Hash, bytesToB64, b64ToBuf, strToBuf } from '~/shared/functions.js'

import scrypt from 'scrypt-async'

export const EDWARDS25519SHA512BATCH = 'edwards25519sha512batch'
export const CURVE25519XSALSA20POLY1305 = 'curve25519xsalsa20poly1305'
export const XSALSA20POLY1305 = 'xsalsa20poly1305'

const bytesOrObjectToB64 = (ary: Uint8Array) => {
  if (!(ary instanceof Uint8Array)) {
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
  }

  throw new Error('Unsupported key type')
}
export const generateSalt = (): string => {
  return bytesOrObjectToB64(nacl.randomBytes(18))
}
export const deriveKeyFromPassword = (type: string, password: string, salt: string): Promise<Key> => {
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
export const encrypt = (inKey: Key | string, data: string): string => {
  const key = (Object(inKey) instanceof String) ? deserializeKey(((inKey: any): string)) : ((inKey: any): Key)

  if (key.type === XSALSA20POLY1305) {
    if (!key.secretKey) {
      throw new Error('Secret key missing')
    }

    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)

    const messageUint8 = strToBuf(data)
    const box = nacl.secretbox(messageUint8, nonce, key.secretKey)

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

    const messageUint8 = strToBuf(data)
    const ephemeralKey = nacl.box.keyPair()
    const box = nacl.box(messageUint8, nonce, key.publicKey, ephemeralKey.secretKey)
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
export const decrypt = (inKey: Key | string, data: string): string => {
  const key = (Object(inKey) instanceof String) ? deserializeKey(((inKey: any): string)) : ((inKey: any): Key)

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

    const decrypted = nacl.box.open(message, nonce, ephemeralPublicKey, key.secretKey)

    if (!decrypted) {
      throw new Error('Could not decrypt message')
    }

    return Buffer.from(decrypted).toString('utf-8')
  }

  throw new Error('Unsupported algorithm')
}

// Calls decrypt() and verifies that the result matches a given key ID
// Used to ensure that, when decrypting a secret key, the correct (expected)
// key is being decrypted.
// This check is to catch potential mistakes or, more cucially, to avoid
// overwriting existing good keys with wrong keys received e.g., from an
// OP_KEY_SHARE
export const decryptKey = (givenKeyId: string, inKey: Key | string, data: string): string => {
  const value = decrypt(inKey, data)
  const computedKeyId = keyId(value)

  if (computedKeyId !== givenKeyId) {
    throw new Error('Key ID of decrypted key doesn\'t match given key ID')
  }

  return value
}
