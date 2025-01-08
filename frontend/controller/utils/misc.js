'use strict'

import { ChelErrorUnexpectedHttpResponseCode } from '~/shared/domains/chelonia/errors.js'

export function handleFetchResult (type: string): ((r: any) => any) {
  return function (r: Object) {
    if (!r.ok) throw new ChelErrorUnexpectedHttpResponseCode(`${r.status}: ${r.statusText}`)
    return r[type]()
  }
}
