'use strict'

// =======================
// Domain: Data persistence
// =======================

import sbp from '../../../sbp'

const _store = new Map()

export default {
  '/get': function (path) {
    return sbp('okTurtles.lodash/get', _store, path)
  },
  '/set': function (path, data) {
    sbp('okTurtles.lodash/set', _store, path, data)
  },
  '/add': function (path, data) {
    const targetArray = sbp('okTurtles.lodash/get', _store, path)
    if (targetArray instanceof Array) {
      targetArray.push(data)
    } else {
      sbp('okTurtles.lodash/set', _store, path, [data])
    }
  }
  // TODO: '/remove' method
}
