/* eslint-env mocha */

import should from 'should'
import 'should-sinon'
import { EDWARDS25519SHA512BATCH, CURVE25519XSALSA20POLY1305, XSALSA20POLY1305, keygen, deriveKeyFromPassword, generateSalt, serializeKey, deserializeKey, encrypt, decrypt, sign, verifySignature } from './crypto.js'

describe('Crypto suite', () => {
  it('should deserialize to the same contents as when serializing', () => {
    for (const type of [EDWARDS25519SHA512BATCH, CURVE25519XSALSA20POLY1305, XSALSA20POLY1305]) {
      const key = keygen(type)
      const serializedKey = serializeKey(key, true)
      const deserializedKey = deserializeKey(serializedKey)
      should(key).deepEqual(deserializedKey)
    }
  })

  it('should deserialize to the same contents as when serializing (public)', () => {
    for (const type of [EDWARDS25519SHA512BATCH, CURVE25519XSALSA20POLY1305]) {
      const key = keygen(type)
      const serializedKey = serializeKey(key, false)
      const publicKey = { type: key.type, publicKey: key.publicKey }
      const deserializedKey = deserializeKey(serializedKey)
      should(publicKey).deepEqual(deserializedKey)
    }
  })

  it('should derive the same key for the same password/salt combination', async () => {
    for (const type of [EDWARDS25519SHA512BATCH, CURVE25519XSALSA20POLY1305, XSALSA20POLY1305]) {
      const salt = generateSalt()

      should(salt).not.be.empty()

      const invocation1 = await deriveKeyFromPassword(type, 'password123', salt)
      const invocation2 = await deriveKeyFromPassword(type, 'password123', salt)

      should(invocation1).deepEqual(invocation2)
    }
  })

  it('should derive different keys for the different password/salt combination', async () => {
    const salt1 = 'salt1'
    const salt2 = 'salt2'

    for (const type of [EDWARDS25519SHA512BATCH, CURVE25519XSALSA20POLY1305, XSALSA20POLY1305]) {
      const invocation1 = await deriveKeyFromPassword(type, 'password123', salt1)
      const invocation2 = await deriveKeyFromPassword(type, 'password123', salt2)
      const invocation3 = await deriveKeyFromPassword(type, 'p4ssw0rd321', salt1)

      should(invocation1).not.deepEqual(invocation2)
      should(invocation2).not.deepEqual(invocation3)
      should(invocation1).not.deepEqual(invocation3)
    }
  })

  it('should correctly sign and verify messages', () => {
    const key = keygen(EDWARDS25519SHA512BATCH)
    const data = 'data'

    const signature = sign(key, data)

    should(() => verifySignature(key, data, signature)).not.throw()
  })

  it('should not verify signatures made with a different key', () => {
    const key1 = keygen(EDWARDS25519SHA512BATCH)
    const key2 = keygen(EDWARDS25519SHA512BATCH)
    const data = 'data'

    const signature = sign(key1, data)

    should(() => verifySignature(key2, data, signature)).throw()
  })

  it('should not verify signatures made with different data', () => {
    const key = keygen(EDWARDS25519SHA512BATCH)
    const data1 = 'data1'
    const data2 = 'data2'

    const signature = sign(key, data1)

    should(() => verifySignature(key, data2, signature)).throw()
  })

  it('should not verify invalid signatures', () => {
    const key = keygen(EDWARDS25519SHA512BATCH)
    const data = 'data'

    should(() => verifySignature(key, data, 'INVALID SIGNATURE')).throw()
  })

  it('should correctly encrypt and decrypt messages', () => {
    const data = 'data'

    for (const type of [CURVE25519XSALSA20POLY1305, XSALSA20POLY1305]) {
      const key = keygen(type)
      const encryptedMessage = encrypt(key, data)

      should(encryptedMessage).not.equal(data)

      const result = decrypt(key, encryptedMessage)

      should(result).equal(data)
    }
  })

  it('should not decrypt messages encrypted with a different key', () => {
    const data = 'data'

    for (const type of [CURVE25519XSALSA20POLY1305, XSALSA20POLY1305]) {
      const key1 = keygen(type)
      const key2 = keygen(type)
      const encryptedMessage = encrypt(key1, data)

      should(encryptedMessage).not.equal(data)

      should(() => decrypt(key2, encryptedMessage)).throw()
    }
  })

  it('should not decrypt invalid messages', () => {
    for (const type of [CURVE25519XSALSA20POLY1305, XSALSA20POLY1305]) {
      const key = keygen(type)
      should(() => decrypt(key, 'Invalid message')).throw()
    }
  })
})
