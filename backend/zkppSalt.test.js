/* eslint-env mocha */

import should from 'should'
import { initDB } from './database.js'
import 'should-sinon'
import nacl from 'tweetnacl'

import { AUTHSALT, CONTRACTSALT, CS, SALT_LENGTH_IN_OCTETS, SU } from '@chelonia/lib/zkppConstants'
import { getChallenge, getContractSalt, redeemSaltRegistrationToken, register, registrationKey, updateContractSalt } from './zkppSalt.js'

const saltsAndEncryptedHashedPassword = (p: string, secretKey: Uint8Array, hash: string) => {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)
  const dhKey = nacl.hash(nacl.box.before(Buffer.from(p, 'base64url'), secretKey))
  const authSalt = Buffer.from(nacl.hash(Buffer.concat([nacl.hash(Buffer.from(AUTHSALT)), dhKey]))).slice(0, SALT_LENGTH_IN_OCTETS).toString('base64')
  const contractSalt = Buffer.from(nacl.hash(Buffer.concat([nacl.hash(Buffer.from(CONTRACTSALT)), dhKey]))).slice(0, SALT_LENGTH_IN_OCTETS).toString('base64')
  const encryptionKey = nacl.hash(Buffer.from(authSalt + contractSalt)).slice(0, nacl.secretbox.keyLength)
  const encryptedHashedPassword = Buffer.concat([nonce, nacl.secretbox(Buffer.from(hash), nonce, encryptionKey)]).toString('base64url')

  return [authSalt, contractSalt, encryptedHashedPassword]
}

const decryptRegistrationRedemptionToken = (p: string, secretKey: Uint8Array, encryptedToken: string) => {
  const dhKey = nacl.hash(nacl.box.before(Buffer.from(p, 'base64url'), secretKey))
  const authSalt = Buffer.from(nacl.hash(Buffer.concat([nacl.hash(Buffer.from(AUTHSALT)), dhKey]))).slice(0, SALT_LENGTH_IN_OCTETS).toString('base64')
  const contractSalt = Buffer.from(nacl.hash(Buffer.concat([nacl.hash(Buffer.from(CONTRACTSALT)), dhKey]))).slice(0, SALT_LENGTH_IN_OCTETS).toString('base64')
  const encryptionKey = nacl.hash(Buffer.concat([Buffer.from(CS), nacl.hash(Buffer.from(authSalt + contractSalt)).slice(0, nacl.secretbox.keyLength)])).slice(0, nacl.secretbox.keyLength)
  const encryptedTokenBuf = Buffer.from(encryptedToken, 'base64url')
  const nonce = encryptedTokenBuf.slice(0, nacl.secretbox.nonceLength)
  const ciphertext = encryptedTokenBuf.slice(nacl.secretbox.nonceLength)
  const token = Buffer.from(nacl.secretbox.open(ciphertext, nonce, encryptionKey)).toString()

  return token
}

before(async () => {
  await initDB()
})

describe('ZKPP Salt functions', () => {
  it('register() conforms to the API to register a new salt', async () => {
    const keyPair = nacl.box.keyPair()
    const publicKey = Buffer.from(keyPair.publicKey).toString('base64url')
    const publicKeyHash = Buffer.from(nacl.hash(Buffer.from(publicKey))).toString('base64url')

    const regKeyAlice1 = registrationKey('alice', publicKeyHash)
    const regKeyAlice2 = registrationKey('alice', publicKeyHash)
    should(regKeyAlice1).be.of.type('object')
    should(regKeyAlice2).be.of.type('object')
    const [, , encryptedHashedPasswordAlice1] = saltsAndEncryptedHashedPassword(regKeyAlice1.p, keyPair.secretKey, 'hash')
    const res1 = register('alice', publicKey, regKeyAlice1.s, regKeyAlice1.sig, encryptedHashedPasswordAlice1)
    should(typeof res1).equal('string', 'register should return a token (alice)')
    const token = decryptRegistrationRedemptionToken(regKeyAlice1.p, keyPair.secretKey, res1)
    await redeemSaltRegistrationToken('alice', 'alice', token)

    const [, , encryptedHashedPasswordAlice2] = saltsAndEncryptedHashedPassword(regKeyAlice1.p, keyPair.secretKey, 'hash')
    const res2 = register('alice', publicKey, regKeyAlice2.s, regKeyAlice2.sig, encryptedHashedPasswordAlice2)
    should(res2).equal(false, 'register should not overwrite entry (alice)')

    const regKeyBob1 = registrationKey('bob', publicKeyHash)
    should(regKeyBob1).be.of.type('object')
    const [, , encryptedHashedPasswordBob1] = saltsAndEncryptedHashedPassword(regKeyBob1.p, keyPair.secretKey, 'hash')
    const res3 = register('bob', publicKey, regKeyBob1.s, regKeyBob1.sig, encryptedHashedPasswordBob1)
    should(typeof res3).equal('string', 'register should return a token (bob)')
  })

  it('getContractSalt() conforms to the API to obtain salt', async () => {
    const keyPair = nacl.box.keyPair()
    const publicKey = Buffer.from(keyPair.publicKey).toString('base64url')
    const publicKeyHash = Buffer.from(nacl.hash(Buffer.from(publicKey))).toString('base64url')

    const [contract, hash, r] = ['getContractSalt', 'hash', 'r']
    const regKey = registrationKey(contract, publicKeyHash)
    should(regKey).be.of.type('object')

    const [authSalt, contractSalt, encryptedHashedPassword] = saltsAndEncryptedHashedPassword(regKey.p, keyPair.secretKey, hash)

    const res = register(contract, publicKey, regKey.s, regKey.sig, encryptedHashedPassword)
    should(typeof res).equal('string', 'register should allow new entry (' + contract + ')')
    const token = decryptRegistrationRedemptionToken(regKey.p, keyPair.secretKey, res)
    await redeemSaltRegistrationToken(contract, contract, token)

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
    const encryptionKey = nacl.hash(Buffer.concat([Buffer.from(CS), c])).slice(0, nacl.secretbox.keyLength)
    const [retrievedContractSalt] = JSON.parse(
      Buffer.from(nacl.secretbox.open(saltBuf.slice(nacl.secretbox.nonceLength), nonce, encryptionKey)).toString()
    )
    should(retrievedContractSalt).equal(contractSalt, 'mismatched contractSalt')
  })

  it('updateContractSalt() conforms to the API to update salt', async () => {
    const keyPair = nacl.box.keyPair()
    const publicKey = Buffer.from(keyPair.publicKey).toString('base64url')
    const publicKeyHash = Buffer.from(nacl.hash(Buffer.from(publicKey))).toString('base64url')

    const [contract, hash, r] = ['update', 'hash', 'r']
    const regKey = registrationKey(contract, publicKeyHash)
    should(regKey).be.of.type('object')

    const [authSalt, , encryptedHashedPassword] = saltsAndEncryptedHashedPassword(regKey.p, keyPair.secretKey, hash)

    const res = register(contract, publicKey, regKey.s, regKey.sig, encryptedHashedPassword)
    should(typeof res).equal('string', 'register should allow new entry (' + contract + ')')
    const token = decryptRegistrationRedemptionToken(regKey.p, keyPair.secretKey, res)
    await redeemSaltRegistrationToken(contract, contract, token)

    const b = Buffer.from(nacl.hash(Buffer.from(r))).toString('base64url')
    const challenge = await getChallenge(contract, b)
    should(challenge).be.of.type('object', 'challenge should be object')
    should(challenge.authSalt).equal(authSalt, 'mismatched authSalt')

    const ħ = nacl.hash(Buffer.concat([nacl.hash(Buffer.from(r)), nacl.hash(Buffer.from(challenge.s))]))
    const c = nacl.hash(Buffer.concat([nacl.hash(Buffer.from(hash)), nacl.hash(ħ)]))
    const hc = nacl.hash(c)

    const encryptionKey = nacl.hash(Buffer.concat([Buffer.from(SU), c])).slice(0, nacl.secretbox.keyLength)
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)

    const encryptedArgsCiphertext = nacl.secretbox(Buffer.from(JSON.stringify(['a', 'b', 'c'])), nonce, encryptionKey)

    const encryptedArgs = Buffer.concat([nonce, encryptedArgsCiphertext]).toString('base64url')

    const updateRes = await updateContractSalt(contract, r, challenge.s, challenge.sig, Buffer.from(hc).toString('base64url'), encryptedArgs)
    should(!!updateRes).equal(true, 'updateContractSalt should be successful')
  })
})
