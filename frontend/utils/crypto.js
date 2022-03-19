'use strict'

import nacl from 'tweetnacl'
import base64 from '@stablelib/base64'
import utf8 from '@stablelib/utf8'

import sbp from '~/shared/sbp.js'

import scrypt from 'scrypt-async'

type Key = {
  type: string;
  secretKey?: any;
  publicKey?: any;
}

export default (sbp('sbp/selectors/register', {
  'gi.crypto/key/gen': (type: string) => {
    if (type === 'edwards25519sha512batch') {
      const key = nacl.sign.keyPair()

      return {
        type: type,
        secretKey: key.secretKey,
        publicKey: key.publicKey
      }
    } else if (type === 'curve25519xsalsa20poly1305') {
      const key = nacl.box.keyPair()

      return {
        type: type,
        secretKey: key.secretKey,
        publicKey: key.publicKey
      }
    } else if (type === 'xsalsa20poly1305') {
      return {
        type: type,
        secretKey: nacl.randomBytes(nacl.secretbox.keyLength)
      }
    }

    throw new Error('Unsupported key type')
  },
  'gi.crypto/util/generateSalt': () => {
    return base64.encode(nacl.randomBytes(18))
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
          publicKey: base64.encode(key.publicKey)
        })
      }

      if (!key.secretKey) {
        throw new Error('Unsupported operation: no secret key to export')
      }

      return JSON.stringify({
        type: key.type,
        secretKey: base64.encode(key.secretKey)
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
        secretKey: base64.encode(key.secretKey)
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
        const key = nacl.sign.keyPair.fromSecretKey(base64.decode(keyData.secretKey))

        return {
          type: keyData.type,
          secretKey: key.secretKey,
          publicKey: key.publicKey
        }
      } else if (keyData.publicKey) {
        return {
          type: keyData.type,
          publicKey: base64.decode(keyData.publicKey)
        }
      }

      throw new Error('Missing secret or public key')
    } else if (keyData.type === 'curve25519xsalsa20poly1305') {
      if (keyData.secretKey) {
        const key = nacl.box.keyPair.fromSecretKey(base64.decode(keyData.secretKey))

        return {
          type: keyData.type,
          secretKey: key.secretKey,
          publicKey: key.publicKey
        }
      } else if (keyData.publicKey) {
        return {
          type: keyData.type,
          publicKey: base64.decode(keyData.publicKey)
        }
      }

      throw new Error('Missing secret or public key')
    } else if (keyData.type === 'xsalsa20poly1305') {
      if (!keyData.secretKey) {
        throw new Error('Secret key missing')
      }

      return {
        type: keyData.type,
        secretKey: base64.decode(keyData.secretKey)
      }
    }
  },
  'gi.crypto/sign': (key: Key, data: string) => {
    if (key.type !== 'edwards25519sha512batch') {
      throw new Error('Unsupported algorithm')
    }

    if (!key.secretKey) {
      throw new Error('Secret key missing')
    }

    const messageUint8 = utf8.encode(data)
    const signature = nacl.sign.detached(messageUint8, key.secretKey)
    const base64Signature = base64.encode(signature)

    return base64Signature
  },
  'gi.crypto/verifySignature': (key: Key, data: string, signature: string) => {
    if (key.type !== 'edwards25519sha512batch') {
      throw new Error('Unsupported algorithm')
    }

    if (!key.publicKey) {
      throw new Error('Public key missing')
    }

    const decodedSignature = base64.decode(signature)
    const messageUint8 = utf8.encode(data)

    return nacl.sign.detached.verify(messageUint8, decodedSignature, key.publicKey)
  },
  'gi.crypto/encrypt': (key: Key, data: string) => {
    if (key.type === 'xsalsa20poly1305') {
      if (!key.secretKey) {
        throw new Error('Secret key missing')
      }

      const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)

      const messageUint8 = utf8.encode(data)
      const box = nacl.secretbox(messageUint8, nonce, key.secretKey)

      const fullMessage = new Uint8Array(nonce.length + box.length)

      fullMessage.set(nonce)
      fullMessage.set(box, nonce.length)

      const base64FullMessage = base64.encode(fullMessage)

      return base64FullMessage
    } else if (key.type === 'curve25519xsalsa20poly1305') {
      if (!key.secretKey || !key.publicKey) {
        throw new Error('Keypair missing')
      }

      const nonce = nacl.randomBytes(nacl.box.nonceLength)

      const messageUint8 = utf8.encode(data)
      const box = nacl.box(messageUint8, nonce, key.publicKey, key.secretKey)

      const fullMessage = new Uint8Array(nonce.length + box.length)

      fullMessage.set(nonce)
      fullMessage.set(box, nonce.length)

      const base64FullMessage = base64.encode(fullMessage)

      return base64FullMessage
    }

    throw new Error('Unsupported algorithm')
  },
  'gi.crypto/decrypt': (key: Key, data: string) => {
    if (key.type === 'xsalsa20poly1305') {
      if (!key.secretKey) {
        throw new Error('Secret key missing')
      }

      const messageWithNonceAsUint8Array = base64.decode(data)

      const nonce = messageWithNonceAsUint8Array.slice(0, nacl.secretbox.nonceLength)
      const message = messageWithNonceAsUint8Array.slice(
        nacl.secretbox.nonceLength,
        messageWithNonceAsUint8Array.length
      )

      const decrypted = nacl.secretbox.open(message, nonce, key)

      if (!decrypted) {
        throw new Error('Could not decrypt message')
      }

      return utf8.decode(decrypted)
    } else if (key.type === 'curve25519xsalsa20poly1305') {
      if (!key.secretKey || !key.publicKey) {
        throw new Error('Keypair missing')
      }

      const messageWithNonceAsUint8Array = base64.decode(data)

      const nonce = messageWithNonceAsUint8Array.slice(0, nacl.box.nonceLength)
      const message = messageWithNonceAsUint8Array.slice(
        nacl.box.nonceLength,
        messageWithNonceAsUint8Array.length
      )

      const decrypted = nacl.box.open(message, nonce, key.publicKey, key.secretKey)

      if (!decrypted) {
        throw new Error('Could not decrypt message')
      }

      return utf8.decode(decrypted)
    }

    throw new Error('Unsupported algorithm')
  }
}))
