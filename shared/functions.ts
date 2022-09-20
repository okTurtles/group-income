'use strict'

import multihash from 'multihashes'
import nacl from 'tweetnacl'
import blake from 'blakejs'

import { Buffer } from 'buffer'

if (typeof window === 'object') {
  // @ts-expect-error TS2339 [ERROR]: Property 'Buffer' does not exist on type 'Window & typeof globalThis'.
  window.Buffer = Buffer
} else {
  // @ts-expect-error TS7017 [ERROR]: Element implicitly has an 'any' type because type 'typeof globalThis' has no index signature.
  globalThis.Buffer = Buffer
}

export function blake32Hash (data: unknown) {
  // TODO: for node/electron, switch to: https://github.com/ludios/node-blake2
  const uint8array = blake.blake2b(data, null, 32)
  // TODO: if we switch to webpack we may need: https://github.com/feross/buffer
  // https://github.com/feross/typedarray-to-buffer
  const buf = Buffer.from(uint8array.buffer)
  return multihash.toB58String(multihash.encode(buf, 'blake2b-32', 32))
}

// NOTE: to preserve consistency across browser and node, we use the Buffer
//       class. We could use btoa and atob in web browsers (functions that
//       are unavailable on Node.js), but they do not support Unicode,
//       and you have to jump through some hoops to get it to work:
//       https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/btoa#Unicode_strings
//       These hoops might result in inconsistencies between Node.js and the frontend.
export const b64ToBuf = (b64: string) => Buffer.from(b64, 'base64')
export const b64ToStr = (b64: string) => b64ToBuf(b64).toString('utf8')
export const bufToB64 = (buf: ArrayBuffer) => Buffer.from(buf).toString('base64')
export const strToBuf = (str: string) => Buffer.from(str, 'utf8')
export const strToB64 = (str: string) => strToBuf(str).toString('base64')
export const bytesToB64 = (ary: ArrayBuffer) => Buffer.from(ary).toString('base64')

type KeyPair = {
  publicKey: string
  secretKey: string
}

export function sign (
  { publicKey, secretKey }: KeyPair,
  msg = 'hello!',
  futz = ''
) {
  return strToB64(JSON.stringify({
    msg: msg + futz,
    key: publicKey,
    sig: bytesToB64(nacl.sign.detached(strToBuf(msg), b64ToBuf(secretKey)))
  }))
}

export function verify (
  msg: string, key: string, sig: string
) {
  return nacl.sign.detached.verify(strToBuf(msg), b64ToBuf(sig), b64ToBuf(key))
}
