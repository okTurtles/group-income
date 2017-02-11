'use strict'

import Primus from '../assets/vendor/primus'
import {RESPONSE_TYPE} from '../../../shared/constants'
import {makeResponse as request} from '../../../shared/functions'
const {ERROR, PUB, SUB, UNSUB} = RESPONSE_TYPE

// see commentary in ./backend/hapi.js for more info about this file
export default function (
  {options, url, handlers}: {options: Object, url: string, handlers: Object}
) {
  var primus = new Primus(url, options)
  Object.keys(handlers).forEach(event => primus.on(event, handlers[event]))
  return primus
}

Primus.prototype.sub = function (contractId: string) {
  return new Promise((resolve, reject) => {
    this.writeAndWait(request(SUB, {contractId}), function (response) {
      (response.type === ERROR ? reject : resolve)(response)
    })
  })
}

Primus.prototype.unsub = function (contractId: string) {
  return new Promise((resolve, reject) => {
    this.writeAndWait(request(UNSUB, {contractId}), function (response) {
      (response.type === ERROR ? reject : resolve)(response)
    })
  })
}

Primus.prototype.pub = function (contractId: string, data: Object) {
  // TODO: do not send message, return error immediately if connection is down
  return new Promise((resolve, reject) => {
    this.writeAndWait(request(PUB, {contractId, data}), function (response) {
      (response.type === ERROR ? reject : resolve)(response)
    })
  })
}
