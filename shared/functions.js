import multihash from 'multihashes'
const createHash = require('sha.js')
const Primus = require('primus')
const path = require('path')

import type {JSONType, JSONObject, Response, Entry, EvType, EvTypeErr} from './types'

export function toHash (value: JSONObject | Entry | string): string {
  // TODO: use safe/guaranteed JSON encoding? https://github.com/primus/ejson
  if (typeof value === 'object') {
    value = JSON.stringify(value)
  }
  value = createHash('sha256').update(value, 'utf8').digest('hex')
  var buff = multihash.encode(Buffer.from(value, 'hex'), 'sha2-256')
  return multihash.toB58String(buff)
}

// TODO: this is bullshit.
// import {EVENT_TYPE} from './constants'
// const ERROR: EvTypeErr = EVENT_TYPE.ERROR
// const ERROR: EvTypeErr = 'error'
// https://github.com/facebook/flow/issues/3041
// https://flowtype.org/docs/functions.html#too-many-arguments
export function makeResponse (
  event: EvType,
  data: JSONType,
  // err?: (string | {message: string})
  err?: JSONType
  // err?: string
  // err?: (JSONType | {message: JSONType})
) : Response {
  // var response: Response = {event, data}
  if (event === 'error') {
  // if (event === ERROR) {
    if (err) {
      // response.data = data
      // response.err = err
      // return data ? {event, data, err} : {event, err}
      // return {event, data, err}
      // return ({event, data, err}: {event: EvTypeErr; data: ?JSONType; err: string})
      return ({event, data, err}: {event: EvTypeErr; data: ?JSONType; err: JSONType})
      // return {event, data, err: err.message || err}
      // return ({event, data, err: err.message || err}: {event: EvTypeErr; data: ?JSONType; err: string})
      // return ({event, data, err: err.message || err}: {event: EvTypeErr; data: ?JSONType; err: JSONType})
    } else {
      // response.err = data
      return {event, err: data}
    }
  }
  return {event, data}
}

export function makeEntry (
  data: JSONObject,
  parentHash: ?string = null,
  version: ?string = '0.0.1'
): Entry {
  return {version, parentHash, data}
}

export function makeGroup (
  groupName: string,
  sharedValues: string,
  changePercentage: number,
  openMembership: boolean,
  memberApprovalPercentage: number,
  memberRemovalPercentage: number,
  incomeProvided: boolean,
  conrtibutionPrivacy: string,
  founder: string
) {
  return {
    version: '0.0.1',
    creationDate: new Date(),
    groupName,
    sharedValues,
    changePercentage,
    openMembership,
    memberApprovalPercentage,
    memberRemovalPercentage,
    incomeProvided,
    conrtibutionPrivacy,
    founder
  }
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
