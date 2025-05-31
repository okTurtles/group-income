'use strict'

import { ChelErrorResourceGone, ChelErrorUnexpectedHttpResponseCode } from 'libchelonia/errors'

export function handleFetchResult (type: string): ((r: any) => any) {
  return function (r: Object) {
    if (!r.ok) {
      const msg = `${r.status}: ${r.statusText}`
      // 410 is sometimes special (for example, it can mean that a contract or
      // a file been deleted)
      // $FlowFixMe[extra-arg]
      if (r.status === 404 || r.status === 410) throw new ChelErrorResourceGone(msg, { cause: r.status })
      throw new ChelErrorUnexpectedHttpResponseCode(msg)
    }
    return r[type]()
  }
}
