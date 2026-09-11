'use strict'

// Shared guard for writes to Chelonia KV slots.
//
// Every device that can write a KV key races every other one. When the local
// contract is behind the height a server-side value was written at, the lib
// cannot decode that value: `chelonia/kv/set` swallows
// `ChelErrorInvalidMessageHeight` while resolving the server's current value,
// so `onconflict` receives `currentData === undefined`, which is
// indistinguishable from "key absent". `chelonia/kv/update` then seeds its
// reducer from the slot's `defaultValue` and writes the result back under the
// server's etag, silently clobbering everything else the key held (for
// `unreadMessages` that is every other chatroom's unread state and cursor; for
// `lastLoggedIn` every other member's timestamp).
//
// Until the lib distinguishes "absent" from "undecodable", guard the writes:
// keep the local contract current beforehand, and on a height / conflict
// failure re-sync the contract plus the slot and retry once. Note that the
// clobber itself does not throw (the retried write succeeds), so the
// pre-flight sync is the half that actually prevents it; the retry half covers
// the cases that do surface as errors.
//
// Both halves run strictly OUTSIDE any Chelonia queue lane. The retry half is
// safe to reach from a contract side effect because it only runs after
// `chelonia/kv/update` has already rejected, i.e. after the contract's write
// lane was released; awaiting a network round trip *inside* a lane would stall
// event processing (see the fire-and-forget note on the `namespace-cache` slot
// in kv-slots.js).

import sbp from '@sbp/sbp'

export const isHeightAheadError = (e: ?Object): boolean => {
  // Chelonia may rewrap the original error, so walk the cause chain instead of
  // only checking the top-level error (e.g. `chelonia/kv/*` wraps decode
  // failures in `ChelErrorKvValidation`). Matching on `name` alone is enough
  // and is realm-safe: `ChelErrorGenerator` hard-codes the name on every
  // instance, so the test keeps working when the error crosses a bundle
  // boundary, where `instanceof` fails because the class identity differs.
  for (let cur = e, i = 0; cur && i < 5; cur = cur.cause, i++) {
    if (cur.name === 'ChelErrorInvalidMessageHeight') return true
  }
  return false
}

export const isKvConflictError = (e: ?Object): boolean => e?.name === 'ChelErrorKvConflict'

const HEIGHT_CHECK_INTERVAL = 10000
const lastHeightCheckByContractID: Map<string, number> = new Map()

// Cheap when the local contract is already current: `chelonia/contract/sync`
// only issues a `latestHEADinfo` request in that case. Throttled per contract
// (and the timestamp is taken before the await, so failures are throttled too)
// so that a burst of writes doesn't turn into a burst of syncs.
export const ensureContractHeightCurrent = async (contractID: string, force: boolean = false): Promise<void> => {
  const now = Date.now()
  if (!force && now - (lastHeightCheckByContractID.get(contractID) ?? 0) < HEIGHT_CHECK_INTERVAL) return
  lastHeightCheckByContractID.set(contractID, now)
  await sbp('chelonia/contract/sync', contractID)
}

export const withKvHeightRetry = async (contractID: string, key: string, write: () => Promise<any>): Promise<any> => {
  try {
    return await write()
  } catch (e) {
    if (!isHeightAheadError(e) && !isKvConflictError(e)) throw e
    console.warn(`[kv-guard.js] '${key}' write on ${contractID} raced a newer server value; syncing before retrying`, e)
    await ensureContractHeightCurrent(contractID, true)
    await sbp('chelonia/kv/sync', contractID, key).catch((syncError) => {
      console.warn(`[kv-guard.js] failed to re-sync '${key}' before retrying`, syncError)
    })
    return write()
  }
}

// Pre-flight sync plus retry. Pass `preflight: false` for writes that run on a
// timer for many contracts and usually turn out to be a no-op, where an
// unconditional round trip per contract would cost more than the race it
// prevents; the retry half still applies. A failed pre-flight is not fatal:
// the write is attempted anyway.
export const withKvGuard = async (
  contractID: string,
  key: string,
  write: () => Promise<any>,
  { preflight = true }: { preflight?: boolean } = {}
): Promise<any> => {
  if (preflight) {
    await ensureContractHeightCurrent(contractID).catch((e) => {
      console.warn(`[kv-guard.js] pre-write sync of ${contractID} failed; writing '${key}' anyway`, e)
    })
  }
  return withKvHeightRetry(contractID, key, write)
}
