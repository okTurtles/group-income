'use strict'

// =======================
// Domain: Lodash-like collection helpers
// =======================

export default {
  '/get': function (tree, path) {
    const pathArray = path.split('/')
    const length = pathArray.length
    let nested = tree
    let index = 0
    while (nested !== undefined && index < length) {
      nested = nested.get(pathArray[index++])
    }
    return (index && index === length) ? nested : undefined
  },
  '/set': function (tree, path, data) {
    const pathArray = path.split('/')
    const length = pathArray.length
    let nested = tree
    let index = -1
    while (++index < length - 1) {
      const key = pathArray[index]
      if (!(nested.get(key) instanceof Map)) {
        nested.set(key, new Map())
      }
      nested = nested.get(key)
    }
    nested.set(pathArray[index], data)
  }
  // TODO: '/remove' method
}
