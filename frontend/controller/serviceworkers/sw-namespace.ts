'use strict'

import sbp from '@sbp/sbp'
import { CHELONIA_RESET } from '@chelonia/lib/events'
import { NAMESPACE_REGISTRATION } from '~/frontend/utils/events.js'
import { answerToUpdate, applyNamespaceUpdate, ownValue } from '~/frontend/utils/namespaceCache.ts'
import { createNamespaceResolver } from './namespaceResolver.ts'

const fetchName = (name: string, signal: AbortSignal): Promise<string | null | undefined> => {
  return fetch(`${sbp('okTurtles.data/get', 'API_URL')}/name/${encodeURIComponent(name)}`, { signal }).then((r: Response) => {
    if (!r.ok) {
      console.warn(`namespace/lookup: ${r.status} for ${name}`)
      if (r.status !== 404) {
        throw new Error(`${r.status}: ${r.statusText}`)
      }
      return null
    }
    // An empty answer isn't a contract ID
    return r['text']().then((text: string) => text || null)
  })
}

// Writes an answer into the cache. NAMESPACE_REGISTRATION is only emitted when
// the cache actually changes; tabs apply the same update to their copy (see
// `applyNamespaceUpdateToVuex` in `controller/namespace.ts`).
const project = (name: string, value: string | null | undefined) => {
  const { reactiveSet, reactiveDel } = sbp('chelonia/config')
  const rootState = sbp('chelonia/rootState')
  const update = answerToUpdate(rootState.namespaceLookups, name, value)
  if (applyNamespaceUpdate(rootState, update, { set: reactiveSet, del: reactiveDel })) {
    sbp('okTurtles.events/emit', NAMESPACE_REGISTRATION, update)
  }
}

const resolver = createNamespaceResolver({
  fetchName,
  readCache: (name) => sbp('namespace/lookupCached', name),
  project
})

sbp('okTurtles.events/on', CHELONIA_RESET, () => resolver.reset())

// NOTE: prefix groups with `group/` and users with `user/` ?
sbp('sbp/selectors/register', {
  'namespace/lookupCached': (name: string) => {
    // 'namespaceLookups' may be undefined when starting up or after calling chelonia/reset
    return ownValue(sbp('chelonia/rootState').namespaceLookups, name) ?? null
  },
  'namespace/lookupReverseCached': (id: string) => {
    return ownValue(sbp('chelonia/rootState').reverseNamespaceLookups, id) ?? null
  },
  // Called from contracts (including pinned versions), so the arguments and
  // the result (contract ID, `null` if not registered, or a rejection on
  // errors) must stay the same. Server answers are reused for a short time
  // (5 minutes for registered names, 15 seconds for 'not registered'; see
  // `namespaceResolver.ts`), also for `skipCache` callers. `forceRefresh`
  // always makes a new request.
  'namespace/lookup': (name: string, options?: { skipCache?: boolean, forceRefresh?: boolean }): Promise<string | null | undefined> => {
    const { skipCache = false, forceRefresh = false } = options || {}
    return resolver.lookup(name, { skipCache: !!skipCache, forceRefresh: !!forceRefresh })
  },
  // The server's answer for a name, without writing it into the cache.
  'namespace/resolve': (name: string): Promise<string | null | undefined> => {
    return resolver.resolve(name)
  },
  // Forget the last server answer for a name (e.g., after registering it).
  'namespace/invalidate': (name: string) => {
    resolver.invalidate(name)
  }
})
