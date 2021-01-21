'use strict'

// =======================
// Domain: Data persistence
// =======================

import sbp from '~/shared/sbp.js'

const _store = new Map()

export default (sbp('sbp/selectors/register', {
  'okTurtles.data/get': function (key: any): any {
    return _store.get(key)
  },
  'okTurtles.data/set': function (key: any, data: any): any {
    _store.set(key, data)
    return data
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
    if (array) {
      const aLen = array.length
      const filtered = array.filter(v => v !== data)
      _store.set(key, filtered)
      return aLen - filtered.length
    }
  },
  'okTurtles.data/apply': function (key: any, fn: Function) {
    return fn(_store.get(key))
  }
}): string[])
