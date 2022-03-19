/* eslint-env mocha */

import should from 'should'
import 'should-sinon'
import sbp from '~/shared/sbp.js'
import './crypto.js'

describe('Crypto suite', () => {
  it('should deserialize to the same contents as when serializing', () => {
    for (const type of ['edwards25519sha512batch', 'curve25519xsalsa20poly1305', 'xsalsa20poly1305']) {
      const key = sbp('gi.crypto/key/gen', type)
      const serializedKey = sbp('gi.crypto/key/serialize', key, true)
      const deserializedKey = sbp('gi.crypto/key/deserialize', serializedKey)
      should(key).deepEqual(deserializedKey)
    }
  })

  it('should deserialize to the same contents as when serializing (public)', () => {
    for (const type of ['edwards25519sha512batch', 'curve25519xsalsa20poly1305']) {
      const key = sbp('gi.crypto/key/gen', type)
      const serializedKey = sbp('gi.crypto/key/serialize', key, false)
      delete key.secretKey
      const deserializedKey = sbp('gi.crypto/key/deserialize', serializedKey)
      should(key).deepEqual(deserializedKey)
    }
  })

  it('should derive the same key for the same password/salt combination', async () => {
    for (const type of ['edwards25519sha512batch', 'curve25519xsalsa20poly1305', 'xsalsa20poly1305']) {
      const salt = sbp('gi.crypto/util/generateSalt')
      const invocation1 = await sbp('gi.crypto/key/fromPassword', type, 'password123', salt)
      const invocation2 = await sbp('gi.crypto/key/fromPassword', type, 'password123', salt)

      should(invocation1).deepEqual(invocation2)
    }
  })

  it('should derive different keys for the different password/salt combination', async () => {
    const salt1 = 'salt1'
    const salt2 = 'salt2'

    for (const type of ['edwards25519sha512batch', 'curve25519xsalsa20poly1305', 'xsalsa20poly1305']) {
      const invocation1 = await sbp('gi.crypto/key/fromPassword', type, 'password123', salt1)
      const invocation2 = await sbp('gi.crypto/key/fromPassword', type, 'password123', salt2)
      const invocation3 = await sbp('gi.crypto/key/fromPassword', type, 'p4ssw0rd321', salt1)

      should(invocation1).not.deepEqual(invocation2)
      should(invocation2).not.deepEqual(invocation3)
      should(invocation1).not.deepEqual(invocation3)
    }
  })

  it('should correctly sign and verify messages', () => {
    const key = sbp('gi.crypto/key/gen', 'edwards25519sha512batch')
    const data = 'data'

    const signature = sbp('gi.crypto/sign', key, data)

    should(() => sbp('gi.crypto/verifySignature', key, data, signature)).not.throw()
  })

  it('should not verify signatures made with a different key', () => {
    const key1 = sbp('gi.crypto/key/gen', 'edwards25519sha512batch')
    const key2 = sbp('gi.crypto/key/gen', 'edwards25519sha512batch')
    const data = 'data'

    const signature = sbp('gi.crypto/sign', key1, data)

    should(() => sbp('gi.crypto/verifySignature', key2, data, signature)).throw()
  })

  it('should not verify signatures made with different data', () => {
    const key = sbp('gi.crypto/key/gen', 'edwards25519sha512batch')
    const data1 = 'data1'
    const data2 = 'data2'

    const signature = sbp('gi.crypto/sign', key, data1)

    should(() => sbp('gi.crypto/verifySignature', key, data2, signature)).throw()
  })

  it('should not verify invalid signatures', () => {
    const key = sbp('gi.crypto/key/gen', 'edwards25519sha512batch')
    const data = 'data'

    should(() => sbp('gi.crypto/verifySignature', key, data, 'INVALID SIGNATURE')).throw()
  })

  it('should correctly encrypt and decrypt messages', () => {
    const data = 'data'

    for (const type of ['curve25519xsalsa20poly1305', 'xsalsa20poly1305']) {
      const key = sbp('gi.crypto/key/gen', type)
      const encryptedMessage = sbp('gi.crypto/encrypt', key, data)

      should(encryptedMessage).not.equal(data)

      const result = sbp('gi.crypto/decrypt', key, encryptedMessage)

      should(result).equal(data)
    }
  })

  it('should not decrypt messages encrypted with a different key', () => {
    const data = 'data'

    for (const type of ['curve25519xsalsa20poly1305', 'xsalsa20poly1305']) {
      const key1 = sbp('gi.crypto/key/gen', type)
      const key2 = sbp('gi.crypto/key/gen', type)
      const encryptedMessage = sbp('gi.crypto/encrypt', key1, data)

      should(encryptedMessage).not.equal(data)

      should(() => sbp('gi.crypto/decrypt', key2, encryptedMessage)).throw()
    }
  })

  it('should not decrypt invalid messages', () => {
    for (const type of ['curve25519xsalsa20poly1305', 'xsalsa20poly1305']) {
      const key = sbp('gi.crypto/key/gen', type)
      should(() => sbp('gi.crypto/decrypt', key, 'Invalid message')).throw()
    }
  })
})
