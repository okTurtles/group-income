/* eslint-env mocha */

import should from 'should'
import 'should-sinon'
import { CURVE25519XSALSA20POLY1305, keygen, keyId, serializeKey } from '@chelonia/crypto'
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
    should(encryptedData.serialize).type('function')
    should(encryptedData.valueOf).type('function')
    should(encryptedData.valueOf()).equal('foo')

    const stringifiedEncryptedData = encryptedData.toString('')
    should(stringifiedEncryptedData).not.equal('foo')
    should(encryptedData.serialize('')).not.equal('foo')

    const incoming = encryptedIncomingData('', state, JSON.parse(stringifiedEncryptedData), 0, {
      [id]: key
    })

    should(incoming).type('object')
    should(incoming.toString).type('function')
    should(incoming.toJSON).type('function')
    should(incoming.valueOf).type('function')
    should(incoming.toJSON()).deepEqual(JSON.parse(stringifiedEncryptedData))
    should(incoming.toString()).equal(stringifiedEncryptedData)
    should(incoming.valueOf()).equal('foo')
  })

  it('should encrypt outgoing data and decrypt incoming data when using a raw key', () => {
    const key = keygen(CURVE25519XSALSA20POLY1305)
    const id = keyId(key)

    const encryptedData = encryptedOutgoingDataWithRawKey(key, 'foo')
    should(encryptedData).type('object')
    should(encryptedData.toString).type('function')
    should(encryptedData.serialize).type('function')
    should(encryptedData.valueOf).type('function')
    should(encryptedData.valueOf()).equal('foo')

    const serializedEncryptedData = encryptedData.serialize()
    should(serializedEncryptedData).not.equal('foo')
    should(encryptedData.serialize()).not.equal('foo')

    const incoming = encryptedIncomingData('', {
      _vm: {
        authorizedKeys: {
          [id]: {
            purpose: ['enc']
          }
        }
      }
    }, serializedEncryptedData, 0, { [id]: key })

    should(incoming).type('object')
    should(incoming.toString).type('function')
    should(incoming.toJSON).type('function')
    should(incoming.valueOf).type('function')
    should(incoming.valueOf()).equal('foo')
    should(incoming.toJSON()).equal(serializedEncryptedData)
    should(incoming.toString()).equal(JSON.stringify(serializedEncryptedData))
  })
})
