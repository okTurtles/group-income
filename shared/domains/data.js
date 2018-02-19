'use strict'

// =======================
// Domain: Data persistence
// =======================

import _ from 'lodash'

const _store = {}

export default {
  '/get/v1': function (path) {
    return _.get(_store, path, [])
  },
  '/set/v1': function (path, data) {
    _.set(_store, path, data)
  },
  '/add/v1': function (path, data) {
    if (_.get(_store, path)) {
      _.get(_store, path).push(data)
    } else {
      _.set(_store, path, [data])
    }
  }
}
