'use strict'

import multihash from 'multihashes'
import {RESPONSE_TYPE} from './constants.js'
import type {JSONType, Response, ResType} from './types.js'

const Primus = require('primus')
const nacl = require('tweetnacl')
const blake = require('blakejs')

export function makeResponse (
  type: ResType,
  data: JSONType,
  err?: string | {message: string}
): Response {
  //   // This type wrangling voodoo comes courtesy of: https://github.com/facebook/flow/issues/3041#issuecomment-268027891
  if (type === RESPONSE_TYPE.ERROR) {
    return err
      ? {type, data, err: typeof err === 'string' ? err : err.message}
      : {type, err: String(data)}
  }
  return {type, data}
}

// generate and save primus client file
// https://github.com/primus/primus#client-library
export function setupPrimus (server: Object, saveAndDestroy: boolean = false) {
  var primus = new Primus(server, {
    transformer: 'uws',
    rooms: {wildcard: false}
  })
  // these 'requires' are placed inline instead of at the top to prevent
  // their contents from being inlined to the app bundle on the frontend
  // (thanks to Webpack/Rollup "tree-shaking" and "hoisting")
  primus.plugin('rooms', require('primus-rooms'))
  primus.plugin('responder', require('primus-responder'))
  if (saveAndDestroy) {
    primus.save(require('path').join(__dirname, '../frontend/simple/assets/vendor/primus.js'))
    primus.destroy()
  }
  return primus
}

export function blake32Hash (data: string) {
  // TODO: for node/electron, switch to: https://github.com/ludios/node-blake2
  let uint8array = blake.blake2b(data, null, 32)
  // TODO: if we switch to webpack we may need: https://github.com/feross/buffer
  // https://github.com/feross/typedarray-to-buffer
  var buf = Buffer.from(uint8array.buffer)
  return multihash.toB58String(multihash.encode(buf, 'blake2b-32', 32))
}

export const b64ToBuf = b64 => Buffer.from(b64, 'base64')
export const b64ToStr = b64 => b64ToBuf(b64).toString('utf8')
export const bufToB64 = buf => Buffer.from(buf).toString('base64')
export const strToBuf = str => Buffer.from(str, 'utf8')
export const strToB64 = str => strToBuf(str).toString('base64')
export const bytesToB64 = ary => Buffer.from(ary).toString('base64')

export function sign (
  {publicKey, secretKey}: {publicKey: string, secretKey: string},
  msg: string = 'hello!',
  futz: string = ''
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
