import sbp from '@sbp/sbp'
import { randomBytes, timingSafeEqual } from 'crypto'
import { Buffer } from 'node:buffer'
import nacl from 'tweetnacl'
import { base64ToBase64url, base64urlToBase64, boxKeyPair, computeCAndHc, decryptSaltUpdate, encryptContractSalt, encryptSaltUpdate, hash, hashRawStringArray, hashStringArray, parseRegisterSalt, randomNonce } from '~/shared/zkpp.js'
import { AUTHSALT, CONTRACTSALT, SALT_LENGTH_IN_OCTETS, SU } from '~/shared/zkppConstants.js'

// used to encrypt salts in database
let recordSecret: string
// corresponds to the key for the keyed Hash function in "Log in / session establishment"
let challengeSecret: string
// corresponds to a component of s in Step 3 of "Salt registration"
let registrationSecret: string
// used to encrypt a stateless token for atomic hash updates
let hashUpdateSecret: string

// Input keying material used to derive various secret keys used in this
// protocol: recordSecret, challengeSecret and registrationSecret.
// This key is unique to each instance (instance here means a single server or
// multiple servers if they are meant to act as a single server from a user's
// perspective, such as multiple servers behind a load balancer) and it should
// not change after it is set. If it changes, the following will happen:
//   1. The most severe consequence is that `recordSecret` will change.
//      `recordSecret` is used to derive an encryption key used for encrypting
//      salt values. Thus, those entries will become unreadable and passwords
//      will stop working altogether. Rotating this value requires re-encrypting
//      all ZKPP salt records, which must be done manually as it's not yet
//      implemented.
//   2. Less significant consequences are that `challengeSecret` and
//      `registrationSecret` will change. These values are only used during a
//      registration or login session and the impact of changing them is limited
//      to ongoing login or registration sessions (note that this means the login
//      process itself, not the 'session' created after login, which is
//      unaffected). This means that in theory the impact of rotating these
//      values is rather low. The only reason to use a stable value for these
//      parameters is to ensure that users are as little inconvenienced as
//      possible if the server is restarted or if they are handed over to a
//      different machine (e.g., under a load balancer).
// When migrating to a different server, note the following:
//   1. For internal migrations (i.e., the server administrator doesn't change):
//      When transfering data over to a new instance, ensure that the key
//      `_private_immutable_zkpp_ikm` is moved over and that it's the same as
//      for the old instance.
//   2. For other migrations (when the server administrator changes):
//      a. Instances could implement a method to transfer salt records from one
//         server to the other, either in an encrypted or unencrypted form.
//         Since the actual encryption key used for `_private_rid_` entries is
//         different for each contract ID, either key is possible. However, this
//         is not implemented.
//      b. Alternatively, migration can be done without migrating password salt
//         records. This requires user interaction to create new salt records
//         on the new server.
export const initZkpp = async () => {
  const IKM = await sbp('chelonia.db/get', '_private_immutable_zkpp_ikm').then((IKM) => {
    if (!IKM) {
      const secret = randomBytes(33).toString('base64')
      return sbp('chelonia.db/set', '_private_immutable_zkpp_ikm', secret).then(() => {
        return secret
      })
    }
    return IKM
  })

  recordSecret = Buffer.from(hashStringArray('private/recordSecret', IKM)).toString('base64')
  challengeSecret = Buffer.from(hashStringArray('private/challengeSecret', IKM)).toString('base64')
  registrationSecret = Buffer.from(hashStringArray('private/registrationSecret', IKM)).toString('base64')
  hashUpdateSecret = Buffer.from(hashStringArray('private/hashUpdateSecret', IKM)).toString('base64')
}

const maxAge = 30

const computeZkppSaltRecordId = async (contractID: string) => {
  const recordId = `_private_rid_${contractID}`
  const record = await sbp('chelonia.db/get', recordId)

  if (!record) {
    return null
  }

  const recordBuf = Buffer.concat([Buffer.from(contractID), Buffer.from(record)])
  return hash(recordBuf)
}

const getZkppSaltRecord = async (contractID: string) => {
  const recordId = `_private_rid_${contractID}`
  const record = await sbp('chelonia.db/get', recordId)

  if (record) {
    const encryptionKey = hashStringArray('REK', contractID, recordSecret).slice(0, nacl.secretbox.keyLength)

    const recordBuf = Buffer.from(base64urlToBase64(record), 'base64')
    const nonce = recordBuf.slice(0, nacl.secretbox.nonceLength)
    const recordCiphertext = recordBuf.slice(nacl.secretbox.nonceLength)
    const recordPlaintext = nacl.secretbox.open(recordCiphertext, nonce, encryptionKey)

    if (!recordPlaintext) {
      return null
    }

    const recordString = Buffer.from(recordPlaintext).toString('utf-8')

    try {
      const recordObj = JSON.parse(recordString)

      if (
        !Array.isArray(recordObj) ||
        (recordObj.length !== 3 && recordObj.length !== 4) ||
        recordObj.slice(0, 3).some((r) => !r || typeof r !== 'string') ||
        (recordObj[3] != null && typeof recordObj[3] !== 'string')
      ) {
        console.error('Error validating encrypted JSON object ' + recordId)
        return null
      }

      const [hashedPassword, authSalt, contractSalt, cid] = recordObj

      return {
        hashedPassword,
        authSalt,
        contractSalt,
        cid
      }
    } catch {
      console.error('Error parsing encrypted JSON object ' + recordId)
    }
  }

  return null
}

const setZkppSaltRecord = async (contractID: string, hashedPassword: string, authSalt: string, contractSalt: string, cid: ?string) => {
  const recordId = `_private_rid_${contractID}`
  const encryptionKey = hashStringArray('REK', contractID, recordSecret).slice(0, nacl.secretbox.keyLength)
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)
  const recordPlaintext = JSON.stringify([hashedPassword, authSalt, contractSalt, cid])
  const recordCiphertext = nacl.secretbox(Buffer.from(recordPlaintext), nonce, encryptionKey)
  const recordBuf = Buffer.concat([nonce, recordCiphertext])
  const record = base64ToBase64url(recordBuf.toString('base64'))
  await sbp('chelonia.db/set', recordId, record)
}

export const getChallenge = async (contract: string, b: string): Promise<false | {authSalt: string; s: string; sig: string;}> => {
  const record = await getZkppSaltRecord(contract)
  if (!record) {
    console.debug('getChallenge: Error obtaining ZKPP salt record for contract ID ' + contract)
    return false
  }
  const { authSalt } = record
  const s = randomNonce()
  const now = (Date.now() / 1000 | 0).toString(16)
  // sig here refers to sigma (σ) in Step 3 of the "Log in / session establishment" part of the protocol.
  // Also, we use base64ToBase64url() instead of .toString('base64url') because Buffer is not
  // standard JS and the shim that we're using doesn't support it.
  const sig = [now, base64ToBase64url(Buffer.from(hashStringArray(contract, b, s, now, challengeSecret)).toString('base64'))].join(',')

  return {
    authSalt,
    s,
    sig
  }
}

const verifyChallenge = (contractID: string, r: string, s: string, userSig: string): boolean => {
  // Check sig has the right format
  if (!/^[a-fA-F0-9]{1,11},[a-zA-Z0-9_-]{86}(?:==)?$/.test(userSig)) {
    console.info(`wrong signature format for challenge for contract: ${contractID}`)
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
  const sig = hashStringArray(contractID, b, s, then, challengeSecret)
  const macBuf = Buffer.from(base64urlToBase64(mac), 'base64')

  return sig.byteLength === macBuf.byteLength && timingSafeEqual(sig, macBuf)
}

export const registrationKey = (provisionalId: string, b: string): false | {s: string; p: string; sig: string;} => {
  const encryptionKey = hashStringArray('REG', provisionalId, registrationSecret).slice(0, nacl.secretbox.keyLength)
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)
  const keyPair = boxKeyPair()
  const s = base64ToBase64url(Buffer.concat([nonce, nacl.secretbox(keyPair.secretKey, nonce, encryptionKey)]).toString('base64'))
  const now = (Date.now() / 1000 | 0).toString(16)
  const sig = [now, base64ToBase64url(Buffer.from(hashStringArray(provisionalId, b, s, now, challengeSecret)).toString('base64'))].join(',')

  return {
    s,
    p: base64ToBase64url(Buffer.from(keyPair.publicKey).toString('base64')),
    sig
  }
}

export const register = (provisionalId: string, clientPublicKey: string, encryptedSecretKey: string, userSig: string, encryptedHashedPassword: string): string | false => {
  if (!verifyChallenge(provisionalId, clientPublicKey, encryptedSecretKey, userSig)) {
    console.warn('register: Error validating challenge: ' + JSON.stringify({ contract: provisionalId, clientPublicKey, userSig }))
    throw new Error('register: Invalid challenge')
  }

  const encryptedSecretKeyBuf = Buffer.from(base64urlToBase64(encryptedSecretKey), 'base64')
  const encryptionKey = hashStringArray('REG', provisionalId, registrationSecret).slice(0, nacl.secretbox.keyLength)
  const secretKeyBuf = nacl.secretbox.open(encryptedSecretKeyBuf.slice(nacl.secretbox.nonceLength), encryptedSecretKeyBuf.slice(0, nacl.secretbox.nonceLength), encryptionKey)

  // Likely a bad implementation on the client side
  if (!secretKeyBuf) {
    console.warn(`register: Error decrypting arguments for contract ID ${provisionalId} (${JSON.stringify({ clientPublicKey, userSig })})`)
    return false
  }

  const parseRegisterSaltRes = parseRegisterSalt(clientPublicKey, secretKeyBuf, encryptedHashedPassword)

  // Likely a bad implementation on the client side
  if (!parseRegisterSaltRes) {
    console.warn(`register: Error parsing registration salt for contract ID ${provisionalId} (${JSON.stringify({ clientPublicKey, userSig })})`)
    return false
  }

  const [authSalt, contractSalt, hashedPasswordBuf, sharedEncryptionKey] = parseRegisterSaltRes

  const token = encryptSaltUpdate(
    hashUpdateSecret,
    provisionalId,
    JSON.stringify([Date.now(), Buffer.from(hashedPasswordBuf).toString(), authSalt, contractSalt])
  )

  return encryptContractSalt(sharedEncryptionKey, token)
}

const contractSaltVerifyC = (h: string, r: string, s: string, userHc: string) => {
  const [c, hc] = computeCAndHc(r, s, h)
  const userHcBuf = Buffer.from(base64urlToBase64(userHc), 'base64')

  if (hc.byteLength === userHcBuf.byteLength && timingSafeEqual(hc, userHcBuf)) {
    return c
  }

  return false
}

export const getContractSalt = async (contract: string, r: string, s: string, sig: string, hc: string): Promise<false | string> => {
  if (!verifyChallenge(contract, r, s, sig)) {
    console.debug('getContractSalt: Error validating challenge: ' + JSON.stringify({ contract, r, s, sig }))
    throw new Error('getContractSalt: Bad challenge')
  }

  const record = await getZkppSaltRecord(contract)
  if (!record) {
    // This shouldn't happen at this stage as the record was already obtained
    console.error('getContractSalt: Error obtaining ZKPP salt record for contract ID ' + contract)
    return false
  }

  const { hashedPassword, contractSalt, cid } = record

  const c = contractSaltVerifyC(hashedPassword, r, s, hc)

  if (!c) {
    console.error(`getContractSalt: Error verifying challenge for contract ID ${contract} (${JSON.stringify({ r, s, hc })})`)
    throw new Error('getContractSalt: Bad challenge')
  }

  return encryptContractSalt(c, JSON.stringify([contractSalt, cid]))
}

export const updateContractSalt = async (contract: string, r: string, s: string, sig: string, hc: string, encryptedArgs: string): Promise<boolean | string> => {
  if (!verifyChallenge(contract, r, s, sig)) {
    console.warn('update: Error validating challenge: ' + JSON.stringify({ contract, r, s, sig }))
    throw new Error('update: Bad challenge')
  }

  const record = await getZkppSaltRecord(contract)
  if (!record) {
    // This shouldn't happen at this stage as the record was already obtained
    console.error('update: Error obtaining ZKPP salt record for contract ID ' + contract)
    return false
  }
  const { hashedPassword, contractSalt: oldContractSalt } = record

  const c = contractSaltVerifyC(hashedPassword, r, s, hc)

  if (!c) {
    console.error(`update: Error verifying challenge for contract ID ${contract} (${JSON.stringify({ r, s, hc })})`)
    throw new Error('update: Bad challenge')
  }

  const encryptionKey = hashRawStringArray(SU, c).slice(0, nacl.secretbox.keyLength)
  const encryptedArgsBuf = Buffer.from(base64urlToBase64(encryptedArgs), 'base64')
  const nonce = encryptedArgsBuf.slice(0, nacl.secretbox.nonceLength)
  const encryptedArgsCiphertext = encryptedArgsBuf.slice(nacl.secretbox.nonceLength)

  const args = nacl.secretbox.open(encryptedArgsCiphertext, nonce, encryptionKey)

  if (!args) {
    console.error(`update: Error decrypting arguments for contract ID ${contract} (${JSON.stringify({ r, s, hc })})`)
    return false
  }

  try {
    const hashedPassword = Buffer.from(args).toString()

    const recordId = await computeZkppSaltRecordId(contract)
    if (!recordId) {
      console.error(`update: Error obtaining record ID for contract ID ${contract}`)
      return false
    }

    const authSalt = Buffer.from(hashStringArray(AUTHSALT, c)).slice(0, SALT_LENGTH_IN_OCTETS).toString('base64')
    const contractSalt = Buffer.from(hashStringArray(CONTRACTSALT, c)).slice(0, SALT_LENGTH_IN_OCTETS).toString('base64')

    const token = encryptSaltUpdate(
      hashUpdateSecret,
      recordId,
      JSON.stringify([Date.now(), hashedPassword, authSalt, contractSalt])
    )

    return encryptContractSalt(c, JSON.stringify([oldContractSalt, token]))
  } catch {
    console.error(`update: Error parsing encrypted arguments for contract ID ${contract} (${JSON.stringify({ r, s, hc })})`)
  }

  return false
}

export const redeemSaltRegistrationToken = async (provisoryRegistrationKey: string, contract: string, token: string): Promise<void> => {
  const decryptedToken = decryptSaltUpdate(
    hashUpdateSecret,
    provisoryRegistrationKey,
    token
  )

  const [timestamp, hashedPassword, authSalt, contractSalt] = JSON.parse(decryptedToken)

  if (timestamp < (Date.now() - 180e3)) {
    throw new Error('ZKPP token expired')
  }

  await setZkppSaltRecord(contract, hashedPassword, authSalt, contractSalt)
}

export const redeemSaltUpdateToken = async (contract: string, token: string): Promise<(cid: ?string) => Promise<void>> => {
  const recordId = await computeZkppSaltRecordId(contract)
  if (!recordId) {
    throw new Error('Record ID not found')
  }

  const decryptedToken = decryptSaltUpdate(
    hashUpdateSecret,
    recordId,
    token
  )

  const [timestamp, hashedPassword, authSalt, contractSalt] = JSON.parse(decryptedToken)

  if (timestamp < (Date.now() - 180e3)) {
    throw new Error('ZKPP token expired')
  }

  return (cid: ?string) => {
    return setZkppSaltRecord(contract, hashedPassword, authSalt, contractSalt, cid)
  }
}
