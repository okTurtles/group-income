'use strict'

import sbp from '@sbp/sbp'
import { CHELONIA_RESET } from '@chelonia/lib/events'
import { NAMESPACE_REGISTRATION } from '~/frontend/utils/events.js'
import { createNamespaceResolver } from './namespaceResolver.js'

const fetchName = (name: string, signal: AbortSignal): Promise<?string> => {
  return fetch(`${sbp('okTurtles.data/get', 'API_URL')}/name/${encodeURIComponent(name)}`, { signal }).then((r: Object) => {
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

// Writes an answer into the cache. NAMESPACE_REGISTRATION is only emitted when
// the cache actually changes.
const project = (name: string, value: ?string) => {
  const { reactiveSet, reactiveDel } = sbp('chelonia/config')
  const rootState = sbp('chelonia/rootState')
  if (!rootState.namespaceLookups) reactiveSet(rootState, 'namespaceLookups', Object.create(null))
  if (!rootState.reverseNamespaceLookups) reactiveSet(rootState, 'reverseNamespaceLookups', Object.create(null))
  const cache = rootState.namespaceLookups
  const reverseCache = rootState.reverseNamespaceLookups
  const currentValue = cache[name]
  if (value === null || value === undefined) {
    if (!currentValue) return
    reactiveDel(cache, name)
    if (reverseCache[currentValue] === name) {
      reactiveDel(reverseCache, currentValue)
    }
    sbp('okTurtles.events/emit', NAMESPACE_REGISTRATION, { name, deletedValue: currentValue })
    return
  }
  if (currentValue === value && reverseCache[value] === name) return
  reactiveSet(cache, name, value)
  reactiveSet(reverseCache, value, name)
  sbp('okTurtles.events/emit', NAMESPACE_REGISTRATION, { name, value })
}

const resolver = createNamespaceResolver({
  fetchName,
  // 'namespaceLookups' may be undefined when starting up or after calling chelonia/reset
  readCache: (name) => sbp('chelonia/rootState').namespaceLookups?.[name] ?? null,
  project
})

sbp('okTurtles.events/on', CHELONIA_RESET, () => resolver.reset())

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
  // Called from contracts (including pinned versions), so the arguments and
  // the result (contract ID, `null` if not registered, or a rejection on
  // errors) must stay the same. Server answers are reused for a short time
  // (see `namespaceResolver.js`), also for `skipCache` callers.
  'namespace/lookup': (name: string, options?: { skipCache?: boolean, forceRefresh?: boolean }): Promise<?string> => {
    const { skipCache = false, forceRefresh = false } = options || {}
    return resolver.lookup(name, { skipCache: !!skipCache, forceRefresh: !!forceRefresh })
  },
  // The server's answer for a name, without writing it into the cache.
  'namespace/resolve': (name: string, options?: { forceRefresh?: boolean }): Promise<?string> => {
    return resolver.resolve(name, { forceRefresh: !!options?.forceRefresh })
  },
  // Forget the last server answer for a name (e.g., after registering it).
  'namespace/invalidate': (name: string) => {
    resolver.invalidate(name)
  }
})
