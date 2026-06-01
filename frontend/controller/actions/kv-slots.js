'use strict'

// Slot registry for the new `@chelonia/lib` KV API (`chelonia/kv/defineSlot`).
//
// This module is the single home for every `defineSlot` declaration in Group
// Income. It runs in the service-worker / Chelonia context (imported from
// `frontend/controller/actions/index.js`, which is only loaded by
// `sw-primary.js`), where `chelonia/kv/*` selectors and `rootState.loggedIn`
// are available.
//
// Slots are migrated key-by-key in later phases of the KV revamp; this file
// currently provides only the shared `onOwnIdentity` match helper and the
// registration entry point so the boot wiring lands first without removing any
// existing behavior.

import sbp from '@sbp/sbp'
import { KV_KEYS } from '~/frontend/utils/constants.js'
import { LOGIN, LOGOUT } from '~/frontend/utils/events.js'

// Identity-scoped slots attach only to the logged-in user's own identity
// contract. Without this predicate the slot would attach to every identity
// contract the user has synced (group members, mentions, etc.), over-fetching
// and 404ing. Mirrors the own-identity `setFilter` gating in `setupChelonia.js`.
// (KV-REVAMPED.md §4.1 / §7.2)
export const onOwnIdentity = (
  contractID: string,
  _contractState: Object,
  rootState: Object
): boolean => contractID === rootState.loggedIn?.identityContractID

// Registers every GI KV slot. Idempotent: `chelonia/kv/defineSlot` is
// last-write-wins per `(contractType, key)`, so calling this more than once is
// safe. Slot declarations are added here as each key is migrated.
export const registerKvSlots = (): void => {
  // `lastLoggedIn` — one entry per group contract, mapping each member's
  // identity contract ID to the ISO timestamp of their last login. No `match`:
  // every group the user has synced gets the slot (this replaces the group
  // branch of the manual `setFilter` switch in `setupChelonia.js`). The
  // 30-minute write throttle lives in the reducer at the call site
  // (`gi.actions/group/kv/updateLastLoggedIn`), not here. (KV-REVAMPED.md §7.2)
  sbp('chelonia/kv/defineSlot', {
    contractType: 'gi.contracts/group',
    key: KV_KEYS.LAST_LOGGED_IN,
    defaultValue: {}
  })

  // Phase C–F add the remaining `defineSlot` calls here.
}

// `registerKvSlots()` is NOT called eagerly here because the `chelonia/kv/*`
// selectors are registered by `@chelonia/lib`, which is imported from
// `setupChelonia.js`. That module is an import sibling of this one in
// `sw-primary.js`, and ES module evaluation order guarantees that a sibling's
// transitive imports finish before any sibling body runs — but `@chelonia/lib`
// is the *dependency* of `setupChelonia`, not of `kv-slots`, so its selectors
// may not be registered yet when this module's body executes. The caller
// (`sw-primary.js`) invokes `registerKvSlots()` after `setupChelonia()` has
// resolved, at which point the `chelonia/kv/*` selectors are guaranteed to
// exist.

// The `match` predicates above (e.g. `onOwnIdentity`) depend on
// `rootState.loggedIn`, which Chelonia cannot observe directly. A login or
// logout flips the "own identity" predicate, so we run a full slot reconcile
// pass once each transition completes. Both events are emitted in this (SW)
// context — `LOGIN` after `chelonia/reset({ ... loggedIn })` populates
// `rootState.loggedIn`, and `LOGOUT` after it is cleared — which is exactly
// where the slot registry and `chelonia/kv/refreshFilters` live.
// `refreshFilters` is a no-op when no slot's `match` result changed, so these
// hooks are harmless until slots are registered in later phases.
// (KV-REVAMPED.md §4.7 / §7.2)
sbp('okTurtles.events/on', LOGIN, () => {
  sbp('chelonia/kv/refreshFilters')
})
sbp('okTurtles.events/on', LOGOUT, () => {
  sbp('chelonia/kv/refreshFilters')
})
