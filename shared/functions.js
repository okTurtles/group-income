'use strict'

import { base58btc } from '@chelonia/multiformats/bases/base58'
import { blake2b256 } from '@chelonia/multiformats/blake2b'
import { blake2b256stream } from '@chelonia/multiformats/blake2bstream'
import { CID } from '@chelonia/multiformats/cid'
import { Buffer } from 'buffer'
import { has } from 'turtledash'

// Values from https://github.com/multiformats/multicodec/blob/master/table.csv
export const multicodes: { [x: string]: number } = {
  RAW: 0x00,
  JSON: 0x0200,
  SHELTER_CONTRACT_MANIFEST: 0x511e00,
  SHELTER_CONTRACT_TEXT: 0x511e01,
  SHELTER_CONTRACT_DATA: 0x511e02,
  SHELTER_FILE_MANIFEST: 0x511e03,
  SHELTER_FILE_CHUNK: 0x511e04
}

export const parseCID = (cid: string): Object => {
  if (!cid || cid.length < 52 || cid.length > 64) {
    throw new RangeError('CID length too short or too long')
  }
  const parsed = CID.parse(cid, base58btc)
  if (
    parsed.version !== 1 ||
    parsed.multihash.code !== blake2b256.code ||
    !Object.values(multicodes).includes(parsed.code)
  ) {
    throw new Error('Invalid CID')
  }

  return parsed
}

export const maybeParseCID = (cid: string): Object | null => {
  try {
    return parseCID(cid)
  } catch {
    // Ignore errors if the CID couldn't be parsed
    return null
  }
}

// Makes the `Buffer` global available in the browser if needed.
// $FlowFixMe[cannot-resolve-name]
if (typeof globalThis === 'object' && !has(globalThis, 'Buffer')) {
  globalThis.Buffer = Buffer
}

export async function createCIDfromStream (data: string | Uint8Array | ReadableStream, multicode: number = multicodes.RAW): Promise<string> {
  const uint8array = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const digest = await blake2b256stream.digest(uint8array)
  return CID.create(1, multicode, digest).toString(base58btc)
}

// TODO: implement a streaming hashing function for large files.
// Note: in fact this returns a serialized CID, not a CID object.
export function createCID (data: string | Uint8Array, multicode: number = multicodes.RAW): string {
  const uint8array = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const digest = blake2b256.digest(uint8array)
  return CID.create(1, multicode, digest).toString(base58btc)
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

// Generate an UUID from a `PushSubscription'
export const getSubscriptionId = async (subscriptionInfo: Object): Promise<string> => {
  const textEncoder = new TextEncoder()
  // <https://w3c.github.io/push-api/#pushsubscription-interface>
  const endpoint = textEncoder.encode(subscriptionInfo.endpoint)
  // <https://w3c.github.io/push-api/#pushencryptionkeyname-enumeration>
  const p256dh = textEncoder.encode(subscriptionInfo.keys.p256dh)
  const auth = textEncoder.encode(subscriptionInfo.keys.auth)

  const canonicalForm = new ArrayBuffer(
    8 +
      (4 + endpoint.byteLength) + (2 + p256dh.byteLength) +
      (2 + auth.byteLength)
  )
  const canonicalFormU8 = new Uint8Array(canonicalForm)
  const canonicalFormDV = new DataView(canonicalForm)
  let offset = 0
  canonicalFormDV.setFloat64(
    offset,
    subscriptionInfo.expirationTime == null
      ? NaN
      : subscriptionInfo.expirationTime,
    false
  )
  offset += 8
  canonicalFormDV.setUint32(offset, endpoint.byteLength, false)
  offset += 4
  canonicalFormU8.set(endpoint, offset)
  offset += endpoint.byteLength
  canonicalFormDV.setUint16(offset, p256dh.byteLength, false)
  offset += 2
  canonicalFormU8.set(p256dh, offset)
  offset += p256dh.byteLength
  canonicalFormDV.setUint16(offset, auth.byteLength, false)
  offset += 2
  canonicalFormU8.set(auth, offset)

  const digest = await crypto.subtle.digest('SHA-384', canonicalForm)
  const id = Buffer.from(digest.slice(0, 16))
  id[6] = 0x80 | (id[6] & 0x0F)
  id[8] = 0x80 | (id[8] & 0x3F)

  return [
    id.slice(0, 4),
    id.slice(4, 6),
    id.slice(6, 8),
    id.slice(8, 10),
    id.slice(10, 16)
  ].map((p) => p.toString('hex')).join('-')
}
