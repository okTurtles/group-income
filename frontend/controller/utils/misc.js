'use strict'

export function handleFetchResult (type /*: string */) /*: (r: Response) => any */ {
  return function (r /*: Response */) /*: any */ {
    if (!r.ok) throw new Error(`${r.status}: ${r.statusText}`)
    // Can't just write `r[type]` here because of a Flow error.
    switch (type) {
      case 'blob': return r.blob()
      case 'json': return r.json()
      case 'text': return r.text()
      default: throw new TypeError(`Invalid fetch result type: ${type}.`)
    }
  }
}
