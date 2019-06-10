'use strict'

import { RESPONSE_TYPE } from '~/shared/constants.js'
import { makeResponse as request } from '~/shared/functions.js'
import Primus from './primus.js'
// const Primus = require('./primus.js')

const { ERROR, PUB, SUB, UNSUB } = RESPONSE_TYPE

// see commentary in ./backend/hapi.js for more info about this file
export default function (
  { options, url, handlers }: {options: Object, url: string, handlers: Object}
) {
  var primus = new Primus(url, options)
  Object.keys(handlers).forEach(event => primus.on(event, handlers[event]))
  return primus
}

Primus.prototype.sub = function (contractID: string) {
  return new Promise((resolve, reject) => {
    this.writeAndWait(request(SUB, { contractID }), function (response) {
      (response.type === ERROR ? reject : resolve)(response)
    })
  })
}

Primus.prototype.unsub = function (contractID: string) {
  return new Promise((resolve, reject) => {
    this.writeAndWait(request(UNSUB, { contractID }), function (response) {
      (response.type === ERROR ? reject : resolve)(response)
    })
  })
}

Primus.prototype.pub = function (contractID: string, data: Object) {
  // TODO: do not send message, return error immediately if connection is down
  return new Promise((resolve, reject) => {
    this.writeAndWait(request(PUB, { contractID, data }), function (response) {
      (response.type === ERROR ? reject : resolve)(response)
    })
  })
}
