'use strict'

import sbp from '@sbp/sbp'
import { NAMESPACE_REGISTRATION } from '~/frontend/utils/events.js'

// NOTE: prefix groups with `group/` and users with `user/` ?
sbp('sbp/selectors/register', {
  'namespace/lookupCached': (name: string) => {
    const cache = sbp('chelonia/rootState').namespaceLookups
    // 'cache' may be undefined when starting up or after calling chelonia/reset
    return cache?.[name] ?? null
  },
  'namespace/lookupReverseCached': (id: string) => {
    const cache = sbp('chelonia/rootState').reverseNamespaceLookups
    return cache?.[id] ?? null
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
      if (value !== null) {
        const reactiveSet = sbp('chelonia/config').reactiveSet
        const rootState = sbp('chelonia/rootState')
        if (!rootState.namespaceLookups) reactiveSet(rootState, 'namespaceLookups', Object.create(null))
        if (!rootState.reverseNamespaceLookups) reactiveSet(rootState, 'reverseNamespaceLookups', Object.create(null))
        const cache = rootState.namespaceLookups
        const reverseCache = rootState.reverseNamespaceLookups
        reactiveSet(cache, name, value)
        reactiveSet(reverseCache, value, name)
        sbp('okTurtles.events/emit', NAMESPACE_REGISTRATION, { name, value })
      }
      return value
    })
  }
})
