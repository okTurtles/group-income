'use strict'

import { has } from 'turtledash'

// Used by both the service worker and tabs, so this module must not import
// Vue or register selectors.

// The value stored under `key`, ignoring inherited properties. Maps keyed by
// username must be read with this: after state is saved and restored (e.g.,
// IndexedDB, JSON or `postMessage`), they have `Object.prototype` as their
// prototype, and `constructor` is a valid username.
export const ownValue = (obj: Record<string, any> | null | undefined, key: string): any => obj && has(obj, key) ? obj[key] : undefined

export type NamespaceUpdate = { name: string, value?: string | null | undefined, deletedValue?: string | null | undefined }

// The update that records `value` (a contract ID, or `null` if the name isn't
// registered) as the current answer for `name` in `cache`.
export const answerToUpdate = (cache: Record<string, any> | null | undefined, name: string, value: string | null | undefined): NamespaceUpdate =>
  value ? { name, value } : { name, deletedValue: ownValue(cache, name) }

// Applies an update to the username cache (`namespaceLookups`, name to
// contract ID) and its reverse (`reverseNamespaceLookups`). The service worker
// uses it for its cache and broadcasts the updates that changed something
// (NAMESPACE_REGISTRATION); tabs apply them to their copy.
//   - With `value`, the name belongs to that contract.
//   - Without it, the name isn't registered. `deletedValue` is the contract it
//     belonged to, if known.
// Returns whether anything changed.
export const applyNamespaceUpdate = (
  state: Record<string, any>,
  { name, value, deletedValue }: NamespaceUpdate,
  { set, del }: { set: (obj: Record<string, any>, key: string, value: any) => unknown, del: (obj: Record<string, any>, key: string) => unknown }
): boolean => {
  if (!state.namespaceLookups) set(state, 'namespaceLookups', Object.create(null))
  if (!state.reverseNamespaceLookups) set(state, 'reverseNamespaceLookups', Object.create(null))
  const cache = state.namespaceLookups
  const reverseCache = state.reverseNamespaceLookups
  const currentValue = ownValue(cache, name)
  // Removes reverse entries that still point to `name`
  const forget = (values: Array<string | null | undefined>): boolean => {
    let changed = false
    for (const oldValue of new Set(values)) {
      if (oldValue && oldValue !== value && ownValue(reverseCache, oldValue) === name) {
        del(reverseCache, oldValue)
        changed = true
      }
    }
    return changed
  }

  if (value) {
    if (currentValue === value && ownValue(reverseCache, value) === name) return false
    // The name may have belonged to a different contract before
    forget([currentValue])
    set(cache, name, value)
    set(reverseCache, value, name)
    return true
  }

  let changed = false
  if (has(cache, name)) {
    del(cache, name)
    changed = true
  }
  return forget([deletedValue, currentValue]) || changed
}
