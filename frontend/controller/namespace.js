// @no-flow
'use strict'

import sbp from '@sbp/sbp'
import Vue from 'vue'
import { handleFetchResult } from './utils/misc.js'

// NOTE: prefix groups with `group/` and users with `user/` ?
sbp('sbp/selectors/register', {
  'namespace/register': (name, value) => {
    return fetch(`${sbp('okTurtles.data/get', 'API_URL')}/name`, {
      method: 'POST',
      body: JSON.stringify({ name, value }),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(handleFetchResult('json')).then(result => {
      Vue.set(sbp('state/vuex/state').namespaceLookups, name, value)
      return result
    })
  },
  'namespace/lookup': (name) => {
    // TODO: should `name` be encodeURI'd?
    const cache = sbp('state/vuex/state').namespaceLookups
    if (name in cache) {
      return cache[name]
    }
    return fetch(`${sbp('okTurtles.data/get', 'API_URL')}/name/${name}`).then((r) => {
		if (!r.ok) {
        console.warn(`namespace/lookup: ${r.status} for ${name}`)
        if (r.status !== 404) {
          throw new Error(`${r.status}: ${r.statusText}`)
        }
        return null
      }
      return r['text']()
    }).then(value => {
      if (value !== null) {
        Vue.set(cache, name, value)
      }
      return value
    })
  }
})
