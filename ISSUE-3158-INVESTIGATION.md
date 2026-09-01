# Issue #3158 — "Less than 1 week left" notification spam (investigation notes)

**Issue:** https://github.com/okTurtles/group-income/issues/3158
**Scope:** staging only (2.9.0). Prod (2.8.0) unaffected. The pre-existing `shouldClearStateKey` bug is tracked separately in [#3159](https://github.com/okTurtles/group-income/issues/3159) and is *not* the cause here.

## TL;DR

The `NEAR_DISTRIBUTION_END` dedup depends entirely on `rootState.notifications.items` surviving service-worker restarts via the `CHELONIA_STATE` IndexedDB snapshot. On staging 2.9.0 that snapshot repeatedly fails to retain the emitted notification, so every SW restart re-emits it. The exact 1-minute cadence comes from the browser, not the app: with the tab hidden, Chrome's intensive timer throttling coalesces the 5-second SW keep-alive ping (`service-worker.js:225`) to once per minute, so the SW dies (~30s idle limit) and cold-starts on every ping.

## Verified mechanics (from code)

1. Native notifications are only produced by `gi.notifications/emit` after its hash-dedup guard (`selectors.js:44`). The hash over `{groupID, period, type}` is deterministic → at each emit, `notifications.items` genuinely lacked the previous one.
2. The periodic runner's floor is 5 min (MIN15 entry + MIN5 entries), so a 1-min beat must come from external re-triggers — i.e. SW cold starts.
3. Every SW cold start (and every `PUBSUB_ERROR`, which resets the `setupChelonia` singleton and re-runs it in full) does:
   load `CHELONIA_STATE` → `chelonia/reset(saved)` → `CHELONIA_RESET` → `clearStatesAndStopTimers()` → `init()`.
   `clearStatesAndStopTimers` wipes **`lastRun`, not just `alreadyFired`**, so the MIN15 gate is bypassed and the entry is re-evaluated *immediately, every cycle*.
4. Nothing else can drop items: `gi.periodicNotifications/*` is not RPC-routed from the window, no KV handler prunes `notifications.items`, `gi.notifications/remove` is UI-only. The IndexedDB round-trip is the single point of failure.

## Root-cause hypothesis (2.9.0 regression)

Two changes, likely compounding, both on the snapshot path:

- **Journal enabled** (`setupChelonia.js:257`, `journal: { enabled: true, snapshotInterval: 75 }`): every contract now carries `_journal` inside the state blob that is written whole to IndexedDB on every state change. Bigger, slower, more frequent saves — on a path with an unhandled `QuotaExceededError` TODO (`sw-database.js`). A save that doesn't commit before the throttled SW is killed leaves the snapshot stale → next cold start re-emits.
- **Reset rollback race:** `chelonia/reset(loadedState)` has several `await`s between *loading* and *applying* the snapshot. A notification emitted in that window is rolled back, and the follow-up debounced save persists the rollback — actively erasing it from disk. The `PUBSUB_ERROR` → full `setupChelonia` re-run loop makes this routine on staging, where the new `chel serve` backend + hourly DB clone generate reconnect/error churn the old hapi backend never did.

Prod 2.8.0 has the same SW restart cycle but no journal and no chel-serve churn, so its snapshot stays fresh and the dedup holds.

## Evidence gathered live on staging (2026-09-01)

- Persisted snapshot is **~4.3 MB** with `_journal` on **19 contracts** (identity at 141/150 entries).
- Two `CHELONIA_ERROR` notifications from the same day ("Cannot join a chatroom that you're already part of" / "Cannot leave a chatroom that you're not part of") — direct client-state vs. server-log divergence from the hourly DB clone.
- Group is in the trigger window: `distributionDate 2026-08-06` + 30-day period → ends 2026-09-05.
- KV store holds 27 notification-status hashes vs. 11 local items — consistent with items being lost locally while the server-side status map survives (some hashes may be from other devices).
- With the tab foregrounded, the runner is healthy (staggered 5/15-min `lastRun` cadence) — the pathology belongs to the hidden-tab / SW-restart regime.

## How to confirm on an affected device

- Inspect the SW console (`chrome://serviceworker-internals`): an `APP_VERSION:` banner ~once a minute = cold-start cycle; `Error saving Chelonia state` = failing saves; **absence** of `[gi.notifications/emit] This notification is already in the store.` during spam = empty dedup list.
- Check `Group Income--Settings → uCHELONIA_STATE` in IndexedDB for staleness/`_journal` size.
- Close the staging tab entirely: if spam stops, the ping/throttle cycle is confirmed as the clock.

## Suggested fixes

1. Don't wipe `lastRun` on `CHELONIA_RESET` (reset it only on login/logout/group switch). Caps worst case at 1 per 15 min. Tiny and safe.
2. Make the dedup durable independently of the monolithic snapshot: `emitCondition` should also check the KV notification-status map (`_kv[identityID].notifications`) by hash — `addNotificationStatus` already writes it server-side. (Complements fix 1; `_kv` is also reset-wiped and reloaded async.)
3. Rein in the journal in the SW (redactions / `contractIDs` allowlist, or disable) and surface `CHELONIA_STATE` save failures loudly.
