import multihash from 'multihashes'
import {EVENT_TYPE} from './constants'
const createHash = require('sha.js')
const Primus = require('primus')
const path = require('path')

export function toHash (value) {
  // TODO: use safe/guaranteed JSON encoding? https://github.com/primus/ejson
  // TODO: get rid of this check when we switch to Flowtype
  switch (typeof value) {
    case 'object': value = JSON.stringify(value); break
    case 'string': break
    default: throw new Error('value must be string or object.')
  }
  value = createHash('sha256').update(value, 'utf8').digest('hex')
  var buff = multihash.encode(Buffer.from(value, 'hex'), 'sha2-256')
  return multihash.toB58String(buff)
}

export function makeResponse (event, data, err) {
  if (!err && event === EVENT_TYPE.ERROR) {
    err = data
    data = null
  }
  var response = {event, data}
  if (err) response.err = err.message || err
  return response
}

export function makeEntry (id, data, parentHash = null, version = '0.0.1') {
  return {id, version, parentHash, data}
}

// generate and save primus client file
// https://github.com/primus/primus#client-library
export function setupPrimus (server, saveAndDestroy = false) {
  var primus = new Primus(server, {
    transformer: 'uws',
    rooms: {wildcard: false}
  })
  primus.plugin('rooms', require('primus-rooms'))
  primus.plugin('responder', require('primus-responder'))
  if (saveAndDestroy) {
    primus.save(path.join(__dirname, '../frontend/simple/js/primus.js'))
    primus.destroy()
  }
  return primus
}
