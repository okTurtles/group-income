/* eslint-env mocha */

import nacl from 'tweetnacl'
import should from 'should'
import 'should-sinon'

import { registrationKey, register, getChallenge, getContractSalt, update } from './zkppSalt.js'

describe('ZKPP Salt functions', () => {
  it('register', async () => {
    const keyPair = nacl.box.keyPair()
    const nonce = nacl.randomBytes(nacl.box.nonceLength)
    const publicKey = Buffer.from(keyPair.publicKey).toString('base64url')
    const publicKeyHash = Buffer.from(nacl.hash(Buffer.from(publicKey))).toString('base64url')

    const regKeyAlice1 = await registrationKey('alice', publicKeyHash)
    const regKeyAlice2 = await registrationKey('alice', publicKeyHash)
    should(regKeyAlice1).be.of.type('object')
    should(regKeyAlice2).be.of.type('object')
    const encryptedHashedPasswordAlice1 = Buffer.concat([nonce, nacl.box(Buffer.from('hash'), nonce, Buffer.from(regKeyAlice1.p, 'base64url'), keyPair.secretKey)]).toString('base64url')
    const res1 = await register('alice', publicKey, regKeyAlice1.s, regKeyAlice1.sig, encryptedHashedPasswordAlice1)
    should(res1).equal(true, 'register should allow new entry (alice)')

    const encryptedHashedPasswordAlice2 = Buffer.concat([nonce, nacl.box(Buffer.from('hash'), nonce, Buffer.from(regKeyAlice2.p, 'base64url'), keyPair.secretKey)]).toString('base64url')
    const res2 = await register('alice', publicKey, regKeyAlice2.s, regKeyAlice2.sig, encryptedHashedPasswordAlice2)
    should(res2).equal(false, 'register should not overwrite entry (alice)')

    const regKeyBob1 = await registrationKey('bob', publicKeyHash)
    should(regKeyBob1).be.of.type('object')
    const encryptedHashedPasswordBob1 = Buffer.concat([nonce, nacl.box(Buffer.from('hash'), nonce, Buffer.from(regKeyBob1.p, 'base64url'), keyPair.secretKey)]).toString('base64url')
    const res3 = await register('bob', publicKey, regKeyBob1.s, regKeyBob1.sig, encryptedHashedPasswordBob1)
    should(res3).equal(true, 'register should allow new entry (bob)')
  })

  it('getContractSalt', async () => {
    const keyPair = nacl.box.keyPair()
    const eNonce = nacl.randomBytes(nacl.box.nonceLength)
    const publicKey = Buffer.from(keyPair.publicKey).toString('base64url')
    const publicKeyHash = Buffer.from(nacl.hash(Buffer.from(publicKey))).toString('base64url')

    const [contract, hash, r] = ['getContractSalt', 'hash', 'r']
    const regKey = await registrationKey(contract, publicKeyHash)
    should(regKey).be.of.type('object')

    const encryptedHashedPassword = Buffer.concat([eNonce, nacl.box(Buffer.from('hash'), eNonce, Buffer.from(regKey.p, 'base64url'), keyPair.secretKey)]).toString('base64url')
    const res = await register(contract, publicKey, regKey.s, regKey.sig, encryptedHashedPassword)
    should(res).equal(true, 'register should allow new entry (' + contract + ')')

    const dhKey = nacl.hash(nacl.box.before(Buffer.from(regKey.p, 'base64url'), keyPair.secretKey))
    const authSalt = Buffer.from(nacl.hash(Buffer.concat([nacl.hash(Buffer.from('AUTHSALT')), dhKey]))).slice(0, 18).toString('base64url')
    const contractSalt = Buffer.from(nacl.hash(Buffer.concat([nacl.hash(Buffer.from('CONTRACTSALT')), dhKey]))).slice(0, 18).toString('base64url')

    const b = Buffer.from(nacl.hash(Buffer.from(r))).toString('base64url')
    const challenge = await getChallenge(contract, b)
    should(challenge).be.of.type('object', 'challenge should be object')
    should(challenge.authSalt).equal(authSalt, 'mismatched authSalt')

    const ħ = nacl.hash(Buffer.concat([nacl.hash(Buffer.from(r)), nacl.hash(Buffer.from(challenge.s))]))
    const c = nacl.hash(Buffer.concat([nacl.hash(Buffer.from(hash)), nacl.hash(ħ)]))
    const hc = nacl.hash(c)

    const salt = await getContractSalt(contract, r, challenge.s, challenge.sig, Buffer.from(hc).toString('base64url'))
    should(salt).be.of.type('string', 'salt response should be string')

    const saltBuf = Buffer.from(salt, 'base64url')
    const nonce = saltBuf.slice(0, nacl.secretbox.nonceLength)
    const encryptionKey = nacl.hash(Buffer.concat([Buffer.from('CS'), c])).slice(0, nacl.secretbox.keyLength)
    const retrievedContractSalt = Buffer.from(nacl.secretbox.open(saltBuf.slice(nacl.secretbox.nonceLength), nonce, encryptionKey)).toString()
    should(retrievedContractSalt).equal(contractSalt, 'mismatched contractSalt')
  })

  it('update', async () => {
    const keyPair = nacl.box.keyPair()
    const eNonce = nacl.randomBytes(nacl.box.nonceLength)
    const publicKey = Buffer.from(keyPair.publicKey).toString('base64url')
    const publicKeyHash = Buffer.from(nacl.hash(Buffer.from(publicKey))).toString('base64url')

    const [contract, hash, r] = ['update', 'hash', 'r']
    const regKey = await registrationKey(contract, publicKeyHash)
    should(regKey).be.of.type('object')

    const encryptedHashedPassword = Buffer.concat([eNonce, nacl.box(Buffer.from('hash'), eNonce, Buffer.from(regKey.p, 'base64url'), keyPair.secretKey)]).toString('base64url')
    const res = await register(contract, publicKey, regKey.s, regKey.sig, encryptedHashedPassword)
    should(res).equal(true, 'register should allow new entry (' + contract + ')')

    const dhKey = nacl.hash(nacl.box.before(Buffer.from(regKey.p, 'base64url'), keyPair.secretKey))
    const authSalt = Buffer.from(nacl.hash(Buffer.concat([nacl.hash(Buffer.from('AUTHSALT')), dhKey]))).slice(0, 18).toString('base64url')

    const b = Buffer.from(nacl.hash(Buffer.from(r))).toString('base64url')
    const challenge = await getChallenge(contract, b)
    should(challenge).be.of.type('object', 'challenge should be object')
    should(challenge.authSalt).equal(authSalt, 'mismatched authSalt')

    const ħ = nacl.hash(Buffer.concat([nacl.hash(Buffer.from(r)), nacl.hash(Buffer.from(challenge.s))]))
    const c = nacl.hash(Buffer.concat([nacl.hash(Buffer.from(hash)), nacl.hash(ħ)]))
    const hc = nacl.hash(c)

    const encryptionKey = nacl.hash(Buffer.concat([Buffer.from('SU'), c])).slice(0, nacl.secretbox.keyLength)
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)

    const encryptedArgsCiphertext = nacl.secretbox(Buffer.from(JSON.stringify(['a', 'b', 'c'])), nonce, encryptionKey)

    const encryptedArgs = Buffer.concat([nonce, encryptedArgsCiphertext]).toString('base64url')

    const updateRes = await update(contract, r, challenge.s, challenge.sig, Buffer.from(hc).toString('base64url'), encryptedArgs)
    should(updateRes).equal(true, 'update should be successful')
  })
})
