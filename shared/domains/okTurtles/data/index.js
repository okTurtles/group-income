'use strict'

// =======================
// Domain: Data persistence
// =======================

import sbp from '../../../sbp.js'

const _store = new Map()

const SELECTORS = {
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

sbp('sbp/selectors/register', SELECTORS)

export default SELECTORS
