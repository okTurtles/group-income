'use strict'

// =======================
// Domain: Data persistence
// =======================

const _store = new Map()

const Data = {
  '/get': function (path) {
    const pathArray = path.split('/')
    const length = pathArray.length
    let nested = _store
    let index = 0
    while (nested !== undefined && index < length) {
      nested = nested.get(pathArray[index++])
    }
    return (index && index === length) ? nested : undefined
  },
  '/set': function (path, data) {
    const pathArray = path.split('/')
    const length = pathArray.length
    let nested = _store
    let index = -1
    while (++index < length - 1) {
      const key = pathArray[index]
      if (!(nested.get(key) instanceof Map)) {
        nested.set(key, new Map())
      }
      nested = nested.get(key)
    }
    nested.set(pathArray[index], data)
  },
  '/add': function (path, data) {
    const targetArray = Data['/get'](path)
    if (targetArray instanceof Array) {
      targetArray.push(data)
    } else {
      Data['/set'](path, [data])
    }
  }
  // TODO: '/remove' method
}

export default Data
