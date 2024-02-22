'use strict'

import nacl from 'tweetnacl'
import { blake2b256stream } from '~/shared/blake2bstream.js'
import { base58btc } from '~/shared/multiformats/bases/base58.js'
import { blake2b256 } from '~/shared/multiformats/blake2b.js'
import { CID } from '~/shared/multiformats/cid.js'

// Values from https://github.com/multiformats/multicodec/blob/master/table.csv
const multicodes = { JSON: 0x0200, RAW: 0x00 }

// Makes the `Buffer` global available in the browser if needed.
if (typeof window === 'object' && typeof Buffer === 'undefined') {
  // Only import `Buffer` to hopefully help treeshaking.
  const { Buffer } = require('buffer')
  window.Buffer = Buffer
}

export async function createCIDfromStream (data: string | Uint8Array | ReadableStream, multicode: number = multicodes.RAW): Promise<string> {
  const uint8array = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const digest = await blake2b256stream.digest(uint8array)
  return CID.create(1, multicode, digest).toString(base58btc.encoder)
}

// TODO: implement a streaming hashing function for large files.
// Note: in fact this returns a serialized CID, not a CID object.
export function createCID (data: string | Uint8Array, multicode: number = multicodes.RAW): string {
  const uint8array = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const digest = blake2b256.digest(uint8array)
  return CID.create(1, multicode, digest).toString(base58btc.encoder)
}

export function blake32Hash (data: string | Uint8Array): string {
  const uint8array = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const digest = blake2b256.digest(uint8array)
  // While `digest.digest` is only 32 bytes long in this case,
  // `digest.bytes` is 36 bytes because it includes a multiformat prefix.
  return base58btc.encode(digest.bytes)
}

// NOTE: to preserve consistency across browser and node, we use the Buffer
//       class. We could use btoa and atob in web browsers (functions that
//       are unavailable on Node.js), but they do not support Unicode,
//       and you have to jump through some hoops to get it to work:
//       https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/btoa#Unicode_strings
//       These hoops might result in inconsistencies between Node.js and the frontend.
export const b64ToBuf = (b64: string): Buffer => Buffer.from(b64, 'base64')
export const b64ToStr = (b64: string): string => b64ToBuf(b64).toString('utf8')
export const bufToB64 = (buf: Buffer): string => Buffer.from(buf).toString('base64')
export const strToBuf = (str: string): Buffer => Buffer.from(str, 'utf8')
export const strToB64 = (str: string): string => strToBuf(str).toString('base64')
export const bytesToB64 = (ary: Uint8Array): string => Buffer.from(ary).toString('base64')

export function sign (
  { publicKey, secretKey }: {publicKey: string, secretKey: string},
  msg: string = 'hello!',
  futz: string = ''
): string {
  return strToB64(JSON.stringify({
    msg: msg + futz,
    key: publicKey,
    sig: bytesToB64(nacl.sign.detached(strToBuf(msg), b64ToBuf(secretKey)))
  }))
}

export function verify (
  msg: string, key: string, sig: string
): any {
  return nacl.sign.detached.verify(strToBuf(msg), b64ToBuf(sig), b64ToBuf(key))
}
