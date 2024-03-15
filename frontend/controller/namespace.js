'use strict'

import sbp from '@sbp/sbp'
import Vue from 'vue'

// NOTE: prefix groups with `group/` and users with `user/` ?
sbp('sbp/selectors/register', {
  /*
  // Registration is done when creating a contract, using the
  // `shelter-namespace-registration` header
  'namespace/register': (name: string, value: string) => {
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
  */
  'namespace/lookupCached': (name: string) => {
    const cache = sbp('state/vuex/state').namespaceLookups
    if (name in cache) {
      // Wrapping in a Promise to return a consistent type across all execution
      // paths (next return is a Promise)
      // This way we can call .then() on the result
      return cache[name]
    }
  },
  'namespace/lookup': (name: string, { skipCache }: { skipCache: boolean } = { skipCache: false }) => {
    if (!skipCache) {
      const cached = sbp('namespace/lookupCached', name)
      if (cached) {
        // Wrapping in a Promise to return a consistent type across all execution
        // paths (next return is a Promise)
        // This way we can call .then() on the result
        return Promise.resolve(cached)
      }
    }
    return fetch(`${sbp('okTurtles.data/get', 'API_URL')}/name/${encodeURIComponent(name)}`).then((r: Object) => {
      if (!r.ok) {
        console.warn(`namespace/lookup: ${r.status} for ${name}`)
        if (r.status !== 404) {
          throw new Error(`${r.status}: ${r.statusText}`)
        }
        return null
      }
      return r['text']()
    }).then(value => {
      const cache = sbp('state/vuex/state').namespaceLookups
      if (value !== null) {
        Vue.set(cache, name, value)
      }
      return value
    })
  }
})
