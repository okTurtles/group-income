'use strict'

// =======================
// Domain: Data persistence
// =======================

import sbp from '../../sbp'

const _store = new Map()

const Data = {
  '/get': function (path) {
    return sbp('lodash/get', _store, path)
  },
  '/set': function (path, data) {
    sbp('lodash/set', _store, path, data)
  },
  '/add': function (path, data) {
    const targetArray = sbp('lodash/get', _store, path)
    if (targetArray instanceof Array) {
      targetArray.push(data)
    } else {
      sbp('lodash/set', _store, path, [data])
    }
  }
  // TODO: '/remove' method
}

export default Data
