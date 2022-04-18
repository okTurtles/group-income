'use strict'

import nacl from 'tweetnacl'

import sbp from '~/shared/sbp.js'
import { blake32Hash, bytesToB64, b64ToBuf, strToBuf } from '~/shared/functions.js'

import scrypt from 'scrypt-async'

export type Key = {
  type: string;
  secretKey?: any;
  publicKey?: any;
}

export default (sbp('sbp/selectors/register', {
  'gi.crypto/key/gen': (type: string) => {
    if (type === 'edwards25519sha512batch') {
      const key = nacl.sign.keyPair()

      const res = {
        type: type,
        publicKey: key.publicKey
      }

      Object.defineProperty(res, 'secretKey', { value: key.secretKey })

      return res
    } else if (type === 'curve25519xsalsa20poly1305') {
      const key = nacl.box.keyPair()

      const res = {
        type: type,
        publicKey: key.publicKey
      }

      Object.defineProperty(res, 'secretKey', { value: key.secretKey })

      return res
    } else if (type === 'xsalsa20poly1305') {
      const res = {
        type: type
      }

      Object.defineProperty(res, 'secretKey', { value: nacl.randomBytes(nacl.secretbox.keyLength) })

      return res
    }

    throw new Error('Unsupported key type')
  },
  'gi.crypto/util/generateSalt': () => {
    return bytesToB64(nacl.randomBytes(18))
  },
  'gi.crypto/key/fromPassword': (type: string, password: string, salt: string) => {
    if (!['edwards25519sha512batch', 'curve25519xsalsa20poly1305', 'xsalsa20poly1305'].includes(type)) {
      return Promise.reject(new Error('Unsupported type'))
    }

    return new Promise((resolve) => {
      scrypt(password, salt, {
        N: 16384,
        r: 8,
        p: 1,
        dkLen: type === 'edwards25519sha512batch' ? nacl.sign.keyLength : type === 'curve25519xsalsa20poly1305' ? nacl.box.keyLength : type === 'xsalsa20poly1305' ? nacl.secretbox.keyLength : 0,
        encoding: 'binary'
      }, (derivedKey) => {
        if (type === 'edwards25519sha512batch') {
          const key = nacl.sign.keyPair.fromSeed(derivedKey)

          resolve({
            type: type,
            secretKey: key.secretKey,
            publicKey: key.publicKey
          })
        } else if (type === 'curve25519xsalsa20poly1305') {
          const key = nacl.box.keyPair.fromSecretKey(derivedKey)

          resolve({
            type: type,
            secretKey: key.secretKey,
            publicKey: key.publicKey
          })
        } else if (type === 'xsalsa20poly1305') {
          resolve({
            type: type,
            secretKey: derivedKey
          })
        }
      })
    })
  },
  'gi.crypto/key/serialize': (key: Key, savePrivKey: boolean) => {
    if (key.type === 'edwards25519sha512batch' || key.type === 'curve25519xsalsa20poly1305') {
      if (!savePrivKey) {
        if (!key.publicKey) {
          throw new Error('Unsupported operation: no public key to export')
        }

        return JSON.stringify({
          type: key.type,
          publicKey: bytesToB64(key.publicKey)
        })
      }

      if (!key.secretKey) {
        throw new Error('Unsupported operation: no secret key to export')
      }

      return JSON.stringify({
        type: key.type,
        secretKey: bytesToB64(key.secretKey)
      })
    } else if (key.type === 'xsalsa20poly1305') {
      if (!savePrivKey) {
        throw new Error('Unsupported operation: no public key to export')
      }

      if (!key.secretKey) {
        throw new Error('Unsupported operation: no secret key to export')
      }

      return JSON.stringify({
        type: key.type,
        secretKey: bytesToB64(key.secretKey)
      })
    }

    throw new Error('Unsupported key type')
  },
  'gi.crypto/key/deserialize': (data) => {
    const keyData = JSON.parse(data)

    if (!keyData || !keyData.type) {
      throw new Error('Invalid key object')
    }

    if (keyData.type === 'edwards25519sha512batch') {
      if (keyData.secretKey) {
        const key = nacl.sign.keyPair.fromSecretKey(b64ToBuf(keyData.secretKey))

        const res = {
          type: keyData.type,
          publicKey: key.publicKey
        }

        Object.defineProperty(res, 'secretKey', { value: key.secretKey })

        return res
      } else if (keyData.publicKey) {
        return {
          type: keyData.type,
          publicKey: new Uint8Array(b64ToBuf(keyData.publicKey))
        }
      }

      throw new Error('Missing secret or public key')
    } else if (keyData.type === 'curve25519xsalsa20poly1305') {
      if (keyData.secretKey) {
        const key = nacl.box.keyPair.fromSecretKey(b64ToBuf(keyData.secretKey))

        const res = {
          type: keyData.type,
          publicKey: key.publicKey
        }

        Object.defineProperty(res, 'secretKey', { value: key.secretKey })

        return res
      } else if (keyData.publicKey) {
        return {
          type: keyData.type,
          publicKey: new Uint8Array(b64ToBuf(keyData.publicKey))
        }
      }

      throw new Error('Missing secret or public key')
    } else if (keyData.type === 'xsalsa20poly1305') {
      if (!keyData.secretKey) {
        throw new Error('Secret key missing')
      }

      const res = {
        type: keyData.type
      }

      Object.defineProperty(res, 'secretKey', { value: new Uint8Array(b64ToBuf(keyData.secretKey)) })

      return res
    }
  },
  'gi.crypto/key/id': (key: Key) => {
    const serializedKey = sbp('gi.crypto/key/serialize', key, !key.publicKey)
    return blake32Hash(serializedKey)
  },
  'gi.crypto/sign': (key: Key, data: string) => {
    if (key.type !== 'edwards25519sha512batch') {
      throw new Error('Unsupported algorithm')
    }

    if (!key.secretKey) {
      throw new Error('Secret key missing')
    }

    const messageUint8 = strToBuf(data)
    const signature = nacl.sign.detached(messageUint8, key.secretKey)
    const base64Signature = bytesToB64(signature)

    return base64Signature
  },
  'gi.crypto/verifySignature': (key: Key, data: string, signature: string) => {
    if (key.type !== 'edwards25519sha512batch') {
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
  },
  'gi.crypto/encrypt': (key: Key, data: string) => {
    if (key.type === 'xsalsa20poly1305') {
      if (!key.secretKey) {
        throw new Error('Secret key missing')
      }

      const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)

      const messageUint8 = strToBuf(data)
      const box = nacl.secretbox(messageUint8, nonce, key.secretKey)

      const fullMessage = new Uint8Array(nonce.length + box.length)

      fullMessage.set(nonce)
      fullMessage.set(box, nonce.length)

      const base64FullMessage = bytesToB64(fullMessage)

      return base64FullMessage
    } else if (key.type === 'curve25519xsalsa20poly1305') {
      if (!key.secretKey || !key.publicKey) {
        throw new Error('Keypair missing')
      }

      const nonce = nacl.randomBytes(nacl.box.nonceLength)

      const messageUint8 = strToBuf(data)
      const box = nacl.box(messageUint8, nonce, key.publicKey, key.secretKey)

      const fullMessage = new Uint8Array(nonce.length + box.length)

      fullMessage.set(nonce)
      fullMessage.set(box, nonce.length)

      const base64FullMessage = bytesToB64(fullMessage)

      return base64FullMessage
    }

    throw new Error('Unsupported algorithm')
  },
  'gi.crypto/decrypt': (key: Key, data: string) => {
    if (key.type === 'xsalsa20poly1305') {
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
    } else if (key.type === 'curve25519xsalsa20poly1305') {
      if (!key.secretKey || !key.publicKey) {
        throw new Error('Keypair missing')
      }

      const messageWithNonceAsUint8Array = b64ToBuf(data)

      const nonce = messageWithNonceAsUint8Array.slice(0, nacl.box.nonceLength)
      const message = messageWithNonceAsUint8Array.slice(
        nacl.box.nonceLength,
        messageWithNonceAsUint8Array.length
      )

      const decrypted = nacl.box.open(message, nonce, key.publicKey, key.secretKey)

      if (!decrypted) {
        throw new Error('Could not decrypt message')
      }

      return Buffer.from(decrypted).toString('utf-8')
    }

    throw new Error('Unsupported algorithm')
  }
}))
