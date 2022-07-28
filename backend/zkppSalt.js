import { blake32Hash } from '~/shared/functions.js'
import { timingSafeEqual } from 'crypto'
import nacl from 'tweetnacl'
import sbp from '@sbp/sbp'

// TODO HARDCODED VALUES
const recordPepper = 'pepper'
const recordMasterKey = 'masterKey'
const challengeSecret = 'secret'
const registrationSecret = 'secret'
const maxAge = 30

const hashStringArray = (...args: Array<Uint8Array | string>) => {
  return nacl.hash(Buffer.concat(args.map((s) => nacl.hash(Buffer.from(s)))))
}

const hashRawStringArray = (...args: Array<Uint8Array | string>) => {
  return nacl.hash(Buffer.concat(args.map((s) => Buffer.from(s))))
}

const getZkppSaltRecord = async (contract: string) => {
  const recordId = blake32Hash(hashStringArray('RID', contract, recordPepper))
  const record = await sbp('chelonia/db/get', recordId)

  if (record) {
    const encryptionKey = hashStringArray('REK', contract, recordMasterKey).slice(0, nacl.secretbox.keyLength)

    const recordBuf = Buffer.from(record, 'base64url')
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
  const record = recordBuf.toString('base64url')
  await sbp('chelonia/db/set', recordId, record)
}

export const getChallenge = async (contract: string, b: string): Promise<false | {authSalt: string; s: string; sig: string;}> => {
  const record = await getZkppSaltRecord(contract)
  if (!record) {
    return false
  }
  const { authSalt } = record
  const s = Buffer.from(nacl.randomBytes(12)).toString('base64url')
  const now = (Date.now() / 1000 | 0).toString(16)
  const sig = [now, Buffer.from(hashStringArray(contract, b, s, now, challengeSecret)).toString('base64url')].join(',')

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

  const b = Buffer.from(nacl.hash(Buffer.from(r))).toString('base64url')
  const sig = hashStringArray(contract, b, s, then, challengeSecret)
  const macBuf = Buffer.from(mac, 'base64url')

  return sig.byteLength === macBuf.byteLength && timingSafeEqual(sig, macBuf)
}

export const registrationKey = async (contract: string, b: string): Promise<false | {s: string; p: string; sig: string;}> => {
  const record = await getZkppSaltRecord(contract)
  if (record) {
    return false
  }

  const encryptionKey = hashStringArray('REG', contract, registrationSecret).slice(0, nacl.secretbox.keyLength)
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)
  const keyPair = nacl.box.keyPair()
  const s = Buffer.concat([nonce, nacl.secretbox(keyPair.secretKey, nonce, encryptionKey)]).toString('base64url')
  const now = (Date.now() / 1000 | 0).toString(16)
  const sig = [now, Buffer.from(hashStringArray(contract, b, s, now, challengeSecret)).toString('base64url')].join(',')

  return {
    s,
    p: Buffer.from(keyPair.publicKey).toString('base64url'),
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

  const clientPublicKeyBuf = Buffer.from(clientPublicKey, 'base64url')
  const encryptedSecretKeyBuf = Buffer.from(encryptedSecretKey, 'base64url')
  const encryptionKey = hashStringArray('REG', contract, registrationSecret).slice(0, nacl.secretbox.keyLength)
  const secretKeyBuf = nacl.secretbox.open(encryptedSecretKeyBuf.slice(nacl.secretbox.nonceLength), encryptedSecretKeyBuf.slice(0, nacl.secretbox.nonceLength), encryptionKey)

  if (clientPublicKeyBuf.byteLength !== nacl.box.publicKeyLength || !secretKeyBuf || secretKeyBuf.byteLength !== nacl.box.secretKeyLength) {
    return false
  }

  const dhKey = nacl.box.before(clientPublicKeyBuf, secretKeyBuf)

  const encryptedHashedPasswordBuf = Buffer.from(encryptedHashedPassword, 'base64url')

  const hashedPasswordBuf = nacl.box.open.after(encryptedHashedPasswordBuf.slice(nacl.box.nonceLength), encryptedHashedPasswordBuf.slice(0, nacl.box.nonceLength), dhKey)

  if (!hashedPasswordBuf) {
    return false
  }

  const authSalt = Buffer.from(hashStringArray('AUTHSALT', dhKey)).slice(0, 18).toString('base64url')
  const contractSalt = Buffer.from(hashStringArray('CONTRACTSALT', dhKey)).slice(0, 18).toString('base64url')

  await setZkppSaltRecord(contract, Buffer.from(hashedPasswordBuf).toString(), authSalt, contractSalt)

  return true
}

const contractSaltVerifyC = (h: string, r: string, s: string, userHc: string) => {
  const ħ = hashStringArray(r, s)
  const c = hashStringArray(h, ħ)
  const hc = nacl.hash(c)
  const userHcBuf = Buffer.from(userHc, 'base64url')

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

  const encryptionKey = hashRawStringArray('CS', c).slice(0, nacl.secretbox.keyLength)
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)

  const encryptedContractSalt = nacl.secretbox(Buffer.from(contractSalt), nonce, encryptionKey)

  return Buffer.concat([nonce, encryptedContractSalt]).toString('base64url')
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
  const encryptedArgsBuf = Buffer.from(encryptedArgs, 'base64url')
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
