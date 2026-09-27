'use strict'

import sbp from '@sbp/sbp'
import Vue from 'vue'

// Applies a namespace cache update (as broadcast by the service worker with
// NAMESPACE_REGISTRATION) to this tab's Vuex state. Does nothing if unchanged.
export const applyNamespaceUpdate = (state: Object, { name, value, deletedValue }: { name: string, value?: ?string, deletedValue?: ?string }) => {
  if (!state.namespaceLookups) Vue.set(state, 'namespaceLookups', Object.create(null))
  if (!state.reverseNamespaceLookups) Vue.set(state, 'reverseNamespaceLookups', Object.create(null))
  const cache = state.namespaceLookups
  const reverseCache = state.reverseNamespaceLookups
  if (value) {
    if (cache[name] === value && reverseCache[value] === name) return
    Vue.set(cache, name, value)
    Vue.set(reverseCache, value, name)
  } else if (deletedValue) {
    if (name in cache) Vue.delete(cache, name)
    if (reverseCache[deletedValue] === name) Vue.delete(reverseCache, deletedValue)
  }
}

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
  'namespace/lookup': (name: string, options?: { skipCache?: boolean, forceRefresh?: boolean }): Promise<?string> => {
    const { skipCache = false, forceRefresh = false } = options || {}
    if (!skipCache && !forceRefresh) {
      const cached = sbp('namespace/lookupCached', name)
      if (cached) {
        // Wrapping in a Promise to return a consistent type across all execution
        // paths (next return is a Promise)
        // This way we can call .then() on the result
        return Promise.resolve(cached)
      }
    }
    return sbp('sw-namespace/lookup', name, { skipCache: !!skipCache, forceRefresh: !!forceRefresh }).then((value) => {
      // The service worker only broadcasts changes, so keep this tab's cache in
      // sync with the answer in case it missed a broadcast
      const state = sbp('state/vuex/state')
      applyNamespaceUpdate(state, value
        ? { name, value }
        : { name, deletedValue: state.namespaceLookups?.[name] })
      return value
    })
  }
})
