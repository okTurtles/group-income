'use strict'

import sbp from '@sbp/sbp'

// NOTE: prefix groups with `group/` and users with `user/` ?
sbp('sbp/selectors/register', {
  'namespace/lookupCached': (name: string) => {
    const cache = sbp('state/vuex/state').namespaceLookups
    return cache?.[name] ?? null
  },
  'namespace/lookupReverseCached': (id: string) => {
    const cache = sbp('state/vuex/state').reverseNamespaceLookups
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
    return sbp('sw-namespace/lookup', name, { skipCache })
  }
})
