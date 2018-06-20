'use strict'

import multihash from 'multihashes'
import {RESPONSE_TYPE} from './constants'
import type {JSONType, Response, ResType} from './types'

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

var b642buf = b64 => Buffer.from(b64, 'base64')
// var b642str = b64 => b642buf(b64).toString('utf8')
// var buf2b64 = buf => Buffer.from(buf).toString('base64')
var str2buf = str => Buffer.from(str, 'utf8')
var str2b64 = str => str2buf(str).toString('base64')
var ary2b64 = ary => Buffer.from(ary).toString('base64')

export function sign (
  {publicKey, secretKey}: {publicKey: string, secretKey: string},
  msg: string = 'hello!',
  futz: string = ''
) {
  return str2b64(JSON.stringify({
    msg: msg + futz,
    key: publicKey,
    sig: ary2b64(nacl.sign.detached(str2buf(msg), b642buf(secretKey)))
  }))
}

export function verify (
  msg: string, key: string, sig: string
) {
  return nacl.sign.detached.verify(str2buf(msg), b642buf(sig), b642buf(key))
}
