'use strict'
import sbp from '@sbp/sbp'
import { KV_NOOP } from '@chelonia/lib'
import { KV_KEYS, LAST_LOGGED_IN_THROTTLE_WINDOW } from '~/frontend/utils/constants.js'
import { withKvGuard } from './kv-guard.js'

// True when our own `lastLoggedIn` entry is missing or older than the throttle
// window, i.e. when a write is warranted. Written as the negation of the
// "inside the window" test so that an unparseable timestamp counts as stale and
// the write repairs it.
const isLastLoggedInStale = (lastLoggedInRawValue: ?string, now: number): boolean => {
  if (!lastLoggedInRawValue) return true
  return !(now - new Date(lastLoggedInRawValue).getTime() < LAST_LOGGED_IN_THROTTLE_WINDOW)
}

// Decides whether the pre-flight contract sync in `withKvGuard` is worth its
// round trip. This selector runs on a 5-minute timer for every active group and
// the reducer below turns most of those runs into a `KV_NOOP`, which
// `chelonia/kv/update` short-circuits before touching the network; syncing
// unconditionally would replace that with one request per group per run.
//
// This is only a sync gate, never a write gate: the reducer stays the sole
// authority on whether the write happens, so a stale mirror can cost an extra
// sync but can neither skip nor duplicate a write (the TOCTOU gap the in-reducer
// throttle closed stays closed, KV-REVAMPED.md §3.3).
const needsHeightPreflight = (contractID: string, identityContractID: string, now: number, throttle: boolean): boolean => {
  if (!throttle) return true
  try {
    return isLastLoggedInStale(sbp('chelonia/kv/read', contractID, KV_KEYS.LAST_LOGGED_IN)?.[identityContractID], now)
  } catch (e) {
    // No readable mirror (slot not active for this contract yet). Sync, so the
    // write cannot seed from the slot default and clobber the other members'
    // timestamps.
    return true
  }
}

export default (sbp('sbp/selectors/register', {
  'gi.actions/group/kv/updateLastLoggedIn': ({ contractID, throttle }: { contractID: string, throttle: boolean }) => {
    const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to update lastLoggedIn without an active session')
    }

    // Capture wall-clock ONCE outside the reducer so conflict-retry invocations
    // produce identical output (KV-REVAMPED.md §3.3 wall-clock warning).
    const now = sbp('chelonia/time')
    const nowString = new Date(now).toISOString()
    const preflight = needsHeightPreflight(contractID, identityContractID, now, throttle)

    return withKvGuard(contractID, KV_KEYS.LAST_LOGGED_IN, () => sbp('chelonia/kv/update', {
      contractID,
      key: KV_KEYS.LAST_LOGGED_IN,
      // The 30-minute throttle lives inside the reducer (KV-REVAMPED.md §3.3):
      // reading `prev` and deciding to skip the write is atomic with the write
      // itself, closing the TOCTOU gap the old external throttle had.
      updater: (prev) => {
        if (throttle && !isLastLoggedInStale(prev?.[identityContractID], now)) return KV_NOOP
        return { ...prev, [identityContractID]: nowString }
      }
    }), { preflight })
  }
}): string[])
