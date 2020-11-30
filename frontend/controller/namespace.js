'use strict'

import sbp from '../../shared/sbp.js'
import { handleFetchResult } from './utils/misc.js'

// NOTE: prefix groups with `group/` and users with `user/` ?
sbp('sbp/selectors/register', {
  'namespace/register': (name: string, value: string) => {
    return fetch(`${sbp('okTurtles.data/get', 'API_URL')}/name`, {
      method: 'POST',
      body: JSON.stringify({ name, value }),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(handleFetchResult('json'))
  },
  'namespace/lookup': (name: string) => {
    // TODO: should `name` be encodeURI'd?
    return fetch(`${sbp('okTurtles.data/get', 'API_URL')}/name/${name}`).then((r: Object) => {
      if (!r.ok) {
        console.warn(`namespace/lookup: ${r.status} for ${name}`)
        if (r.status !== 404) {
          throw new Error(`${r.status}: ${r.statusText}`)
        }
        return null
      }
      return r['text']()
    })
  }
})
