'use strict'

// =======================
// Domain: Data persistence
// =======================

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
  }
  // TODO: '/remove' method
}
