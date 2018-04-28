'use strict'

// =======================
// Domain: Data persistence
// =======================

import { deepGet, deepSet } from '../../../../frontend/simple/js/utils'

const _store = new Map()

export default {
  '/get': function (key) {
    return _store[key]
  },
  '/set': function (key, data) {
    _store[key] = data
  },
  '/add': function (key, data) {
    const targetArray = _store[key]
    if (targetArray instanceof Array) {
      targetArray.push(data)
    } else {
      _store[key] = [data]
    }
  },
  '/deepGet': function (path) {
    return deepGet(_store, path)
  },
  '/deepSet': function (path, data) {
    deepSet(_store, path, data)
  },
  '/deepAdd': function (path, data) {
    const targetArray = deepGet(_store, path)
    if (targetArray instanceof Array) {
      targetArray.push(data)
    } else {
      deepSet(_store, path, [data])
    }
  }
  // TODO: '/remove' method
}
