'use strict'

import { has } from 'turtledash'

// Used by both the service worker and tabs, so this module must not import
// Vue or register selectors.

// The value stored under `key`, ignoring inherited properties. Maps keyed by
// username must be read with this: after state is saved and restored (e.g.,
// IndexedDB, JSON or `postMessage`), they have `Object.prototype` as their
// prototype, and `constructor` is a valid username.
export const ownValue = (obj: ?Object, key: string): any => obj && has(obj, key) ? obj[key] : undefined

export type NamespaceUpdate = { name: string, value?: ?string, deletedValue?: ?string }

// The update that records `value` (a contract ID, or `null` if the name isn't
// registered) as the current answer for `name` in `cache`.
export const answerToUpdate = (cache: ?Object, name: string, value: ?string): NamespaceUpdate =>
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
  state: Object,
  { name, value, deletedValue }: NamespaceUpdate,
  { set, del }: { set: (obj: Object, key: string, value: any) => mixed, del: (obj: Object, key: string) => mixed }
): boolean => {
  if (!state.namespaceLookups) set(state, 'namespaceLookups', Object.create(null))
  if (!state.reverseNamespaceLookups) set(state, 'reverseNamespaceLookups', Object.create(null))
  const cache = state.namespaceLookups
  const reverseCache = state.reverseNamespaceLookups
  const currentValue = ownValue(cache, name)
  // Removes reverse entries that still point to `name`
  const forget = (values: Array<?string>): boolean => {
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
