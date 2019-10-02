'use strict'

export function handleFetchResult (type: string) {
  return function (r: Object) {
    if (!r.ok) throw new Error(`${r.status}: ${r.statusText}`)
    return r[type]()
  }
}

export function logExceptNavigationDuplicated (err: Error) {
  err.name !== 'NavigationDuplicated' && console.error(err)
}
