'use strict'

// =======================
// Domain: Data persistence
// =======================

import _ from 'lodash'

export default {
  _store: {},
  '/get/v1': function (path) {
    return _.get(this._store, path, [])
  },
  '/set/v1': function (path, data) {
    _.set(this._store, path, data)
  },
  '/add/v1': function (path, data) {
    if (_.get(this._store, path)) {
      _.get(this._store, path).push(data)
    } else {
      _.set(this._store, path, [data])
    }
  }
}
