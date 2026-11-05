'use strict'

import sbp from '@sbp/sbp'
import Vue from 'vue'
import { answerToUpdate, applyNamespaceUpdate, ownValue } from '~/frontend/utils/namespaceCache.ts'
import type { NamespaceUpdate } from '~/frontend/utils/namespaceCache.ts'

const vueSetters = { set: Vue.set, del: Vue.delete }

// Applies a namespace cache update (as broadcast by the service worker with
// NAMESPACE_REGISTRATION) to this tab's Vuex state. Does nothing if unchanged.
export const applyNamespaceUpdateToVuex = (state: Record<string, any>, update: NamespaceUpdate) => {
  applyNamespaceUpdate(state, update, vueSetters)
}

// NOTE: prefix groups with `group/` and users with `user/` ?
sbp('sbp/selectors/register', {
  'namespace/lookupCached': (name: string) => {
    return ownValue(sbp('state/vuex/state').namespaceLookups, name) ?? null
  },
  'namespace/lookupReverseCached': (id: string) => {
    return ownValue(sbp('state/vuex/state').reverseNamespaceLookups, id) ?? null
  },
  'namespace/lookup': (name: string, options?: { skipCache?: boolean, forceRefresh?: boolean }): Promise<string | null | undefined> => {
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
    return sbp('sw-namespace/lookup', name, { skipCache: !!skipCache, forceRefresh: !!forceRefresh }).then(async (value) => {
      // The service worker only broadcasts changes, so keep this tab's cache in
      // sync in case it missed a broadcast. Copy what the service worker's
      // cache holds now rather than the answer: answers made outdated by a
      // reset (e.g., logging out), a forced refresh or an invalidation aren't
      // written into it.
      try {
        const cached = await sbp('sw-namespace/lookupCached', name)
        const state = sbp('state/vuex/state')
        applyNamespaceUpdateToVuex(state, answerToUpdate(state.namespaceLookups, name, cached))
      } catch (e) {
        // The answer is still valid; the broadcasts keep the cache up to date
        console.warn(`namespace/lookup: unable to update this tab's cache for ${name}`, e)
      }
      return value
    })
  }
})
