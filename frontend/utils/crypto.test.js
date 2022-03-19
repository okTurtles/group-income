/* eslint-env mocha */

import should from 'should'
// import sinon from 'sinon'
import 'should-sinon'
import sbp from '~/shared/sbp.js'
import './crypto.js'

describe('xxxx', () => {
  it('should xxx', () => {
    for (const type of ['edwards25519sha512batch', 'curve25519xsalsa20poly1305', 'xsalsa20poly1305']) {
      const key = sbp('gi.crypto/key/gen', type)
      const serializedKey = sbp('gi.crypto/key/serialize', key, true)
      const deserializedKey = sbp('gi.crypto/key/deserialize', serializedKey)
      should(key).deepEqual(deserializedKey)
    }
  })
})
