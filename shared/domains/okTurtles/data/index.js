'use strict'

// =======================
// Domain: Data persistence
// =======================

import sbp from '../../../sbp.js'

const _store = new Map()

export default sbp('sbp/selectors/register', {
  'okTurtles.data/get': function (key: any) {
    return _store.get(key)
  },
  'okTurtles.data/set': function (key: any, data: any) {
    _store.set(key, data)
  },
  'okTurtles.data/delete': function (key: any) {
    return _store.delete(key)
  },
  'okTurtles.data/add': function (key: any, data: any) {
    const array = _store.get(key)
    if (array) {
      array.push(data)
    } else {
      _store.set(key, [data])
    }
  },
  'okTurtles.data/remove': function (key: any, data: any) {
    const array = _store.get(key)
    _store.set(key, array.filter(v => v !== data))
  }
})
