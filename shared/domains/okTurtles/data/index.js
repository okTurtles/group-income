'use strict'

// =======================
// Domain: Data persistence
// =======================

const _store = new Map()

export default {
  'okTurtles.data/get': function (key: any) {
    return _store.get(key)
  },
  'okTurtles.data/set': function (key: any, data: any) {
    _store.set(key, data)
  },
  'okTurtles.data/add': function (key: any, data: any) {
    const targetArray = _store.get(key)
    if (targetArray instanceof Array) {
      targetArray.push(data)
    } else {
      _store.set(key, [data])
    }
  }
  // TODO: '/remove' method
}
