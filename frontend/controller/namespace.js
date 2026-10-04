'use strict'

import sbp from '@sbp/sbp'
import Vue from 'vue'
import { applyNamespaceUpdate as applyUpdate, ownValue } from '~/frontend/utils/namespaceCache.js'
import type { NamespaceUpdate } from '~/frontend/utils/namespaceCache.js'

const vueSetters = { set: Vue.set, del: Vue.delete }

// Applies a namespace cache update (as broadcast by the service worker with
// NAMESPACE_REGISTRATION) to this tab's Vuex state. Does nothing if unchanged.
export const applyNamespaceUpdate = (state: Object, update: NamespaceUpdate) => {
  applyUpdate(state, update, vueSetters)
}

// NOTE: prefix groups with `group/` and users with `user/` ?
sbp('sbp/selectors/register', {
  'namespace/lookupCached': (name: string) => {
    return ownValue(sbp('state/vuex/state').namespaceLookups, name) ?? null
  },
  'namespace/lookupReverseCached': (id: string) => {
    return ownValue(sbp('state/vuex/state').reverseNamespaceLookups, id) ?? null
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
        : { name, deletedValue: ownValue(state.namespaceLookups, name) })
      return value
    })
  }
})
