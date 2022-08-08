import { blake32Hash } from '~/shared/functions.js'
import { timingSafeEqual } from 'crypto'
import nacl from 'tweetnacl'
import sbp from '@sbp/sbp'
import { boxKeyPair, encryptContractSalt, hashStringArray, hashRawStringArray, hash, parseRegisterSalt, randomNonce, computeCAndHc } from '~/shared/zkpp.js'

// TODO HARDCODED VALUES
const recordPepper = 'pepper'
const recordMasterKey = 'masterKey'
const challengeSecret = 'secret'
const registrationSecret = 'secret'
const maxAge = 30

const getZkppSaltRecord = async (contract: string) => {
  const recordId = blake32Hash(hashStringArray('RID', contract, recordPepper))
  const record = await sbp('chelonia/db/get', recordId)

  if (record) {
    const encryptionKey = hashStringArray('REK', contract, recordMasterKey).slice(0, nacl.secretbox.keyLength)

    const recordBuf = Buffer.from(record.replace(/_/g, '/').replace(/-/g, '+'), 'base64')
    const nonce = recordBuf.slice(0, nacl.secretbox.nonceLength)
    const recordCiphertext = recordBuf.slice(nacl.secretbox.nonceLength)
    const recordPlaintext = nacl.secretbox.open(recordCiphertext, nonce, encryptionKey)

    if (!recordPlaintext) {
      return null
    }

    const recordString = Buffer.from(recordPlaintext).toString('utf-8')

    try {
      const recordObj = JSON.parse(recordString)

      if (!Array.isArray(recordObj) || recordObj.length !== 3 || !recordObj.reduce((acc, cv) => acc && typeof cv === 'string', true)) {
        return null
      }

      const [hashedPassword, authSalt, contractSalt] = recordObj

      return {
        hashedPassword,
        authSalt,
        contractSalt
      }
    } catch {
      // empty
    }
  }

  return null
}

const setZkppSaltRecord = async (contract: string, hashedPassword: string, authSalt: string, contractSalt: string) => {
  const recordId = blake32Hash(hashStringArray('RID', contract, recordPepper))
  const encryptionKey = hashStringArray('REK', contract, recordMasterKey).slice(0, nacl.secretbox.keyLength)
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)
  const recordPlaintext = JSON.stringify([hashedPassword, authSalt, contractSalt])
  const recordCiphertext = nacl.secretbox(Buffer.from(recordPlaintext), nonce, encryptionKey)
  const recordBuf = Buffer.concat([nonce, recordCiphertext])
  const record = recordBuf.toString('base64').replace(/\//g, '_').replace(/\+/g, '-').replace(/=*$/, '')
  await sbp('chelonia/db/set', recordId, record)
}

export const getChallenge = async (contract: string, b: string): Promise<false | {authSalt: string; s: string; sig: string;}> => {
  const record = await getZkppSaltRecord(contract)
  if (!record) {
    return false
  }
  const { authSalt } = record
  const s = randomNonce()
  const now = (Date.now() / 1000 | 0).toString(16)
  const sig = [now, Buffer.from(hashStringArray(contract, b, s, now, challengeSecret)).toString('base64').replace(/\//g, '_').replace(/\+/g, '-').replace(/=*$/, '')].join(',')

  return {
    authSalt,
    s,
    sig
  }
}

const verifyChallenge = (contract: string, r: string, s: string, userSig: string): boolean => {
  // Check sig has the right format
  if (!/^[a-fA-F0-9]{1,11},[a-zA-Z0-9_-]{86}(?:==)?$/.test(userSig)) {
    return false
  }

  const [then, mac] = userSig.split(',')
  const now = Date.now() / 1000 | 0
  const iThen = Number.parseInt(then, 16)

  // Check that sig is no older than Xs
  if (!(iThen <= now) || !(iThen >= (now - maxAge))) {
    return false
  }

  const b = hash(r)
  const sig = hashStringArray(contract, b, s, then, challengeSecret)
  const macBuf = Buffer.from(mac.replace(/_/g, '/').replace(/-/g, '+'), 'base64')

  return sig.byteLength === macBuf.byteLength && timingSafeEqual(sig, macBuf)
}

export const registrationKey = async (contract: string, b: string): Promise<false | {s: string; p: string; sig: string;}> => {
  const record = await getZkppSaltRecord(contract)
  if (record) {
    return false
  }

  const encryptionKey = hashStringArray('REG', contract, registrationSecret).slice(0, nacl.secretbox.keyLength)
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)
  const keyPair = boxKeyPair()
  const s = Buffer.concat([nonce, nacl.secretbox(keyPair.secretKey, nonce, encryptionKey)]).toString('base64').replace(/\//g, '_').replace(/\+/g, '-').replace(/=*$/, '')
  const now = (Date.now() / 1000 | 0).toString(16)
  const sig = [now, Buffer.from(hashStringArray(contract, b, s, now, challengeSecret)).toString('base64').replace(/\//g, '_').replace(/\+/g, '-').replace(/=*$/, '')].join(',')

  return {
    s,
    p: Buffer.from(keyPair.publicKey).toString('base64').replace(/\//g, '_').replace(/\+/g, '-').replace(/=*$/, ''),
    sig
  }
}

export const register = async (contract: string, clientPublicKey: string, encryptedSecretKey: string, userSig: string, encryptedHashedPassword: string): Promise<boolean> => {
  if (!verifyChallenge(contract, clientPublicKey, encryptedSecretKey, userSig)) {
    return false
  }

  const record = await getZkppSaltRecord(contract)

  if (record) {
    return false
  }

  const encryptedSecretKeyBuf = Buffer.from(encryptedSecretKey.replace(/_/g, '/').replace(/-/g, '+'), 'base64')
  const encryptionKey = hashStringArray('REG', contract, registrationSecret).slice(0, nacl.secretbox.keyLength)
  const secretKeyBuf = nacl.secretbox.open(encryptedSecretKeyBuf.slice(nacl.secretbox.nonceLength), encryptedSecretKeyBuf.slice(0, nacl.secretbox.nonceLength), encryptionKey)

  const parseRegisterSaltRes = parseRegisterSalt(clientPublicKey, secretKeyBuf, encryptedHashedPassword)

  if (!parseRegisterSaltRes) {
    return false
  }

  const [authSalt, contractSalt, hashedPasswordBuf] = parseRegisterSaltRes

  await setZkppSaltRecord(contract, Buffer.from(hashedPasswordBuf).toString(), authSalt, contractSalt)

  return true
}

const contractSaltVerifyC = (h: string, r: string, s: string, userHc: string) => {
  const [c, hc] = computeCAndHc(r, s, h)
  const userHcBuf = Buffer.from(userHc.replace(/_/g, '/').replace(/-/g, '+'), 'base64')

  if (hc.byteLength === userHcBuf.byteLength && timingSafeEqual(hc, userHcBuf)) {
    return c
  }

  return false
}

export const getContractSalt = async (contract: string, r: string, s: string, sig: string, hc: string): Promise<false | string> => {
  if (!verifyChallenge(contract, r, s, sig)) {
    return false
  }

  const record = await getZkppSaltRecord(contract)
  if (!record) {
    return false
  }

  const { hashedPassword, contractSalt } = record

  const c = contractSaltVerifyC(hashedPassword, r, s, hc)

  if (!c) {
    return false
  }

  return encryptContractSalt(c, contractSalt)
}

export const update = async (contract: string, r: string, s: string, sig: string, hc: string, encryptedArgs: string): Promise<boolean> => {
  if (!verifyChallenge(contract, r, s, sig)) {
    return false
  }

  const record = await getZkppSaltRecord(contract)
  if (!record) {
    return false
  }
  const { hashedPassword } = record

  const c = contractSaltVerifyC(hashedPassword, r, s, hc)

  if (!c) {
    return false
  }

  const encryptionKey = hashRawStringArray('SU', c).slice(0, nacl.secretbox.keyLength)
  const encryptedArgsBuf = Buffer.from(encryptedArgs.replace(/_/g, '/').replace(/-/g, '+'), 'base64')
  const nonce = encryptedArgsBuf.slice(0, nacl.secretbox.nonceLength)
  const encrytedArgsCiphertext = encryptedArgsBuf.slice(nacl.secretbox.nonceLength)

  const args = nacl.secretbox.open(encrytedArgsCiphertext, nonce, encryptionKey)

  if (!args) {
    return false
  }

  try {
    const argsObj = JSON.parse(Buffer.from(args).toString())

    if (!Array.isArray(argsObj) || argsObj.length !== 3 || !argsObj.reduce((acc, cv) => acc && typeof cv === 'string', true)) {
      return false
    }

    const [hashedPassword, authSalt, contractSalt] = argsObj

    await setZkppSaltRecord(contract, hashedPassword, authSalt, contractSalt)

    return true
  } catch {
    // empty
  }

  return false
}
