'use strict'

import { ChelErrorResourceGone, ChelErrorUnexpectedHttpResponseCode } from '~/shared/domains/chelonia/errors.js'

export function handleFetchResult (type: string): ((r: any) => any) {
  return function (r: Object) {
    if (!r.ok) {
      const msg = `${r.status}: ${r.statusText}`
      // 410 is sometimes special (for example, it can mean that a contract or
      // a file been deleted)
      if (r.status === 410) throw new ChelErrorResourceGone(msg)
      throw new ChelErrorUnexpectedHttpResponseCode(msg)
    }
    return r[type]()
  }
}
