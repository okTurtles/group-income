'use strict'

// =======================
// Domain: Data persistence
// =======================

const _store = {}

const Data = {
  '/get': function (path) {
    const pathArray = path.split('/')
    const length = pathArray.length
    let object = _store
    let index = 0
    while (object !== undefined && index < length) {
      object = object[pathArray[index++]]
    }
    return (index && index === length) ? object : undefined
  },
  '/set': function (path, data) {
    const pathArray = path.split('/')
    const length = pathArray.length
    let nested = _store
    let index = -1
    while (++index < length - 1) {
      let key = pathArray[index]
      if (typeof nested[key] !== 'object') {
        nested[key] = {}
      }
      nested = nested[key]
    }
    nested[pathArray[index]] = data
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
