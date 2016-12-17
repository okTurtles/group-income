import multihash from 'multihashes'
import {EVENT_TYPE} from './constants'
const createHash = require('sha.js')
const Primus = require('primus')
const path = require('path')

// flowtype BS
// import type {JSONType, JSONObject, Response, Entry} from './types.js'
// this gives "./types.js. Required module not found" for some reason
// so we do this instead:
var JSONType, JSONObject, Response, Entry, EvType
// note technically we could do "declare export type" instead of "declare type"
// to fix it, but then my linter complains and I don't get syntax hightlighting
// in Atom.

export function toHash (value: JSONObject | string) {
  // TODO: use safe/guaranteed JSON encoding? https://github.com/primus/ejson
  if (typeof value === 'object') {
    value = JSON.stringify(value)
  }
  value = createHash('sha256').update(value, 'utf8').digest('hex')
  var buff = multihash.encode(Buffer.from(value, 'hex'), 'sha2-256')
  return multihash.toB58String(buff)
}

// https://flowtype.org/docs/functions.html#too-many-arguments
export function makeResponse (
  event: EvType,
  data?: JSONType,
  err?: (string | {message: string})
) : Response {
  var response: Response = {event}
  if (event === EVENT_TYPE.ERROR) {
    if (err) {
      response.data = data
      response.err = err
    } else {
      response.err = data
    }
  } else {
    response.data = data
  }
  return response
}

export function makeEntry (
  data: JSONObject,
  parentHash: ?string = null,
  version: ?string = '0.0.1'
): Entry {
  return {version, parentHash, data}
}

// generate and save primus client file
// https://github.com/primus/primus#client-library
export function setupPrimus (server: Object, saveAndDestroy: boolean = false) {
  var primus = new Primus(server, {
    transformer: 'uws',
    rooms: {wildcard: false}
  })
  primus.plugin('rooms', require('primus-rooms'))
  primus.plugin('responder', require('primus-responder'))
  if (saveAndDestroy) {
    primus.save(path.join(__dirname, '../frontend/simple/assets/vendor/primus.js'))
    primus.destroy()
  }
  return primus
}
