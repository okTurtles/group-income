/* eslint-env mocha */

import should from 'should'
import 'should-sinon'
import { CURVE25519XSALSA20POLY1305, keygen, keyId, serializeKey } from './crypto.js'
import { encryptedIncomingData, encryptedOutgoingData, encryptedOutgoingDataWithRawKey } from './encryptedData.js'

describe('Encrypted data API', () => {
  it('should encrypt outgoing data and decrypt incoming data when using a key from the state', () => {
    const key = keygen(CURVE25519XSALSA20POLY1305)
    const id = keyId(key)
    const state = {
      _vm: {
        authorizedKeys: {
          [id]: {
            name: 'name',
            purpose: ['enc'],
            data: serializeKey(key, false)
          }
        }
      }
    }

    const encryptedData = encryptedOutgoingData(state, id, 'foo')
    should(encryptedData).type('object')
    should(encryptedData.toString).type('function')
    should(encryptedData.toJSON).type('function')
    should(encryptedData.valueOf).type('function')
    should(encryptedData.valueOf()).equal('foo')

    const stringifiedEncryptedData = encryptedData.toString()
    should(stringifiedEncryptedData).not.equal('foo')
    should(encryptedData.toJSON()).not.equal('foo')

    const incoming = encryptedIncomingData('', state, stringifiedEncryptedData)

    should(incoming).type('object')
    should(incoming.toString).type('function')
    should(incoming.toJSON).type('function')
    should(incoming.valueOf).type('function')
    should(incoming.valueOf()).equal('foo')
    should(incoming.toJSON()).equal(stringifiedEncryptedData)
    should(incoming.toString()).equal(stringifiedEncryptedData)
  })

  it('should encrypt outgoing data and decrypt incoming data when using a raw key', () => {
    const key = keygen(CURVE25519XSALSA20POLY1305)
    const id = keyId(key)

    const encryptedData = encryptedOutgoingDataWithRawKey(key, 'foo')
    should(encryptedData).type('object')
    should(encryptedData.toString).type('function')
    should(encryptedData.toJSON).type('function')
    should(encryptedData.valueOf).type('function')
    should(encryptedData.valueOf()).equal('foo')

    const stringifiedEncryptedData = encryptedData.toString()
    should(stringifiedEncryptedData).not.equal('foo')
    should(encryptedData.toJSON()).not.equal('foo')

    const incoming = encryptedIncomingData('', {
      _vm: {
        authorizedKeys: {
          [id]: {
            purpose: ['enc']
          }
        }
      }
    }, stringifiedEncryptedData, { [id]: key })

    should(incoming).type('object')
    should(incoming.toString).type('function')
    should(incoming.toJSON).type('function')
    should(incoming.valueOf).type('function')
    should(incoming.valueOf()).equal('foo')
    should(incoming.toJSON()).equal(stringifiedEncryptedData)
    should(incoming.toString()).equal(stringifiedEncryptedData)
  })
})
