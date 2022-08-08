import nacl from 'tweetnacl'
import scrypt from 'scrypt-async'

export const hashStringArray = (...args: Array<Uint8Array | string>): Uint8Array => {
  return nacl.hash(Buffer.concat(args.map((s) => nacl.hash(Buffer.from(s)))))
}

export const hashRawStringArray = (...args: Array<Uint8Array | string>): Uint8Array => {
  return nacl.hash(Buffer.concat(args.map((s) => Buffer.from(s))))
}

export const randomNonce = (): string => {
  return Buffer.from(nacl.randomBytes(12)).toString('base64').replace(/\//g, '_').replace(/\+/g, '-')
}

export const hash = (v: string): string => {
  return Buffer.from(nacl.hash(Buffer.from(v))).toString('base64').replace(/\//g, '_').replace(/\+/g, '-').replace(/=*$/, '')
}

export const computeCAndHc = (r: string, s: string, h: string): [Uint8Array, Uint8Array] => {
  const ħ = hashStringArray(r, s)
  const c = hashStringArray(h, ħ)
  const hc = nacl.hash(c)

  return [c, hc]
}

export const encryptContractSalt = (c: Uint8Array, contractSalt: string): string => {
  const encryptionKey = hashRawStringArray('CS', c).slice(0, nacl.secretbox.keyLength)
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)

  const encryptedContractSalt = nacl.secretbox(Buffer.from(contractSalt), nonce, encryptionKey)

  return Buffer.concat([nonce, encryptedContractSalt]).toString('base64').replace(/\//g, '_').replace(/\+/g, '-')
}

export const decryptContractSalt = (c: Uint8Array, encryptedContractSaltBox: string): string => {
  const encryptionKey = hashRawStringArray('CS', c).slice(0, nacl.secretbox.keyLength)
  const encryptedContractSaltBoxBuf = Buffer.from(encryptedContractSaltBox.replace(/_/g, '/').replace(/-/g, '+'), 'base64')

  const nonce = encryptedContractSaltBoxBuf.slice(0, nacl.secretbox.nonceLength)
  const encryptedContractSalt = encryptedContractSaltBoxBuf.slice(nacl.secretbox.nonceLength)

  return Buffer.from(nacl.secretbox.open(encryptedContractSalt, nonce, encryptionKey)).toString()
}

export const hashPassword = (password: string, salt: string): Promise<string> => {
  return new Promise(resolve => scrypt(password, salt, {
    N: 16384,
    r: 8,
    p: 1,
    dkLen: 32,
    encoding: 'hex'
  }, resolve))
}

export const boxKeyPair = (): any => {
  return nacl.box.keyPair()
}

export const saltAgreement = (publicKey: string, secretKey: Uint8Array): false | [string, string] => {
  const publicKeyBuf = Buffer.from(publicKey.replace(/_/g, '/').replace(/-/g, '+'), 'base64')
  const dhKey = nacl.box.before(publicKeyBuf, secretKey)

  if (!publicKeyBuf || publicKeyBuf.byteLength !== nacl.box.publicKeyLength) {
    return false
  }

  const authSalt = Buffer.from(hashStringArray('AUTHSALT', dhKey)).slice(0, 18).toString('base64')
  const contractSalt = Buffer.from(hashStringArray('CONTRACTSALT', dhKey)).slice(0, 18).toString('base64')

  return [authSalt, contractSalt]
}

export const parseRegisterSalt = (publicKey: string, secretKey: Uint8Array, encryptedHashedPassword: string): false | [string, string, Uint8Array] => {
  const saltAgreementRes = saltAgreement(publicKey, secretKey)
  if (!saltAgreementRes) {
    return false
  }

  const [authSalt, contractSalt] = saltAgreementRes

  const encryptionKey = nacl.hash(Buffer.from(authSalt + contractSalt)).slice(0, nacl.secretbox.keyLength)
  const encryptedHashedPasswordBuf = Buffer.from(encryptedHashedPassword.replace(/_/g, '/').replace(/-/g, '+'), 'base64')

  const hashedPasswordBuf = nacl.secretbox.open(encryptedHashedPasswordBuf.slice(nacl.box.nonceLength), encryptedHashedPasswordBuf.slice(0, nacl.box.nonceLength), encryptionKey)

  if (!hashedPasswordBuf) {
    return false
  }

  return [authSalt, contractSalt, hashedPasswordBuf]
}

export const buildRegisterSaltRequest = async (publicKey: string, secretKey: Uint8Array, password: string): Promise<[string, string]> => {
  const saltAgreementRes = saltAgreement(publicKey, secretKey)
  if (!saltAgreementRes) {
    throw new Error('Invalid public or secret key')
  }

  const [authSalt, contractSalt] = saltAgreementRes

  const hashedPassword = await hashPassword(password, authSalt)

  const nonce = nacl.randomBytes(nacl.box.nonceLength)
  const encryptionKey = nacl.hash(Buffer.from(authSalt + contractSalt)).slice(0, nacl.secretbox.keyLength)

  const encryptedHashedPasswordBuf = nacl.secretbox(Buffer.from(hashedPassword), nonce, encryptionKey)

  return [contractSalt, Buffer.concat([nonce, encryptedHashedPasswordBuf]).toString('base64').replace(/\//g, '_').replace(/\+/g, '-')]
}
