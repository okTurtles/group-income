'use strict'

export function handleFetchResult (type: string): ((r: any) => any) {
  return function (r: Object) {
    if (!r.ok) throw new Error(`${r.status}: ${r.statusText}`)
    return r[type]()
  }
}

export function logExceptNavigationDuplicated (err: Object) {
  err.name !== 'NavigationDuplicated' && console.error(err)
}
