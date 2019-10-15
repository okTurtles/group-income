'use strict'

export function handleFetchResult (type: string) {
  return function (r: Object) {
    if (!r.ok) throw new Error(`${r.status}: ${r.statusText}`)
    return r[type]()
  }
}
