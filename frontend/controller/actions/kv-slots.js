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
import { isExpired } from '@model/notifications/utils.js'
import { checkAndAugmentNames } from './identity-kv.js'

// Prune-expired transform for the notifications slot. Zod is not installed, so
// the slot's `schema` is a plain `{ parse }` object. This is the canonical
// `applyStorageRules` normalization from `identity-kv.js` (drop entries past
// their max age) modelled as a `schema.transform` so it runs once on every
// reducer output before the network write and on every load/pubsub value
// (KV-REVAMPED.md §6). It must:
//   - reject the reserved wire sentinels `null` / `undefined` (defineSlot
//     guards probe these at registration time);
//   - be idempotent on its own output (`parse(parse(x))` deep-equals
//     `parse(x)`): pruning an already-pruned map is a no-op;
//   - return a plain JSON object (no Date/Map) for the mirror.
// The stored shape is `{ [hash]: { timestamp, read } }`.
const notificationStatusSchema = {
  parse (value: Object): Object {
    if (value == null || typeof value !== 'object') {
      throw new TypeError('notifications: expected an object of notification statuses')
    }
    return Object.keys(value).reduce((acc, hash) => {
      if (!isExpired(value[hash])) {
        acc[hash] = value[hash]
      }
      return acc
    }, {})
  }
}

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

  // `preferences` — per-user UI preferences on the own identity contract
  // (e.g. `hideDistributionBanner`, `lastSeenNewsDate`). Single-shape slot:
  // every write shallow-merges a patch over the previous value, so call sites
  // use the `value` form of `chelonia/kv/update` (KV-REVAMPED.md §4.1 / §7.2).
  // No schema (Zod is not installed).
  sbp('chelonia/kv/defineSlot', {
    contractType: 'gi.contracts/identity',
    key: KV_KEYS.PREFERENCES,
    defaultValue: {},
    match: onOwnIdentity,
    defaultUpdater: (patch) => (prev) => ({ ...prev, ...patch })
  })

  // `notifications` — per-user notification read/seen status on the own
  // identity contract, keyed by notification hash (`{ [hash]: { timestamp,
  // read } }`). Multiple distinct write intents (add-new, mark-read) so the
  // call sites use explicit `updater`s, not the `value`/`defaultUpdater`
  // sugar. The TTL prune that used to live in `saveNotificationStatus` is the
  // slot `schema.transform` (`notificationStatusSchema`), applied once per
  // reducer output and per load/pubsub value. (KV-REVAMPED.md §6 / §7.2)
  sbp('chelonia/kv/defineSlot', {
    contractType: 'gi.contracts/identity',
    key: KV_KEYS.NOTIFICATIONS,
    defaultValue: {},
    match: onOwnIdentity,
    schema: notificationStatusSchema
  })

  // `unreadMessages` — per-chatroom unread cursor + message list on the own
  // identity contract:
  //   `{ [chatRoomID]: { readUntil: { messageHash, createdHeight,
  //      isManuallyMarked? }, unreadMessages: Array<{ messageHash,
  //      createdHeight }> } }`.
  // Multiple distinct write intents against this key (init / set-read-cursor /
  // mark-unread / add-msg / remove-msg / delete-room), so the call sites keep
  // explicit `updater`s rather than the `value`/`defaultUpdater` sugar
  // (KV-REVAMPED.md §4.1 / §8). No schema (Zod is not installed). `autoSubscribe`
  // (default) replaces the manual `setFilter` entry; `autoLoad: 'on-sync'`
  // (default) replaces the `loadChatRoomUnreadMessages` initial fetch.
  sbp('chelonia/kv/defineSlot', {
    contractType: 'gi.contracts/identity',
    key: KV_KEYS.UNREAD_MESSAGES,
    defaultValue: {},
    match: onOwnIdentity
  })

  // `namespace-cache` — the set of namespace (username) lookups the user
  // knows, stored as a sorted `string[]` on the own identity contract. Unlike
  // the other identity slots this one is `autoSubscribe: false` (it was never
  // in the pubsub `setFilter`) and `autoLoad: 'on-demand'` (fetched explicitly
  // by `gi.actions/identity/kv/loadCachedNames` → `chelonia/kv/sync`, not on
  // every sync). `onUpdate` re-runs `checkAndAugmentNames` on every value
  // change (load / local write), which reconciles the cache against
  // `namespaceLookups` and re-verifies conflicted names. This single hook
  // replaces both the post-fetch augmentation that lived in `loadCachedNames`
  // and the `NS_CACHE` branch of the `sw-primary.js` `KV_EVENT` switch.
  // `checkAndAugmentNames` is async; the library serializes `onUpdate` per
  // contract and catches throws, so it cannot wedge the pipeline.
  // (KV-REVAMPED.md §4.1 / §4.8)
  sbp('chelonia/kv/defineSlot', {
    contractType: 'gi.contracts/identity',
    key: KV_KEYS.NS_CACHE,
    defaultValue: [],
    match: onOwnIdentity,
    autoSubscribe: false,
    autoLoad: 'on-demand',
    onUpdate: (value, ctx) => {
      // Augment on load/remote/reconnect. `saveCachedNames` writes through the
      // low-level `chelonia/kv/queuedSet` (see identity-kv.js) and so never
      // produces a 'local' mirror update for this slot, but the guard is kept
      // as cheap insurance: re-running `checkAndAugmentNames` after our own
      // write would only schedule a redundant batch of `namespace/lookup`
      // calls. (KV-REVAMPED.md §4.1)
      if (ctx.reason === 'local') return
      return checkAndAugmentNames(value || [])
    }
  })
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
