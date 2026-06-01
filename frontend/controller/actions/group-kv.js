'use strict'
import sbp from '@sbp/sbp'
import { KV_NOOP } from '@chelonia/lib'
import { KV_KEYS, LAST_LOGGED_IN_THROTTLE_WINDOW } from '~/frontend/utils/constants.js'

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

    return sbp('chelonia/kv/update', {
      contractID,
      key: KV_KEYS.LAST_LOGGED_IN,
      // The 30-minute throttle lives inside the reducer (KV-REVAMPED.md §3.3):
      // reading `prev` and deciding to skip the write is atomic with the write
      // itself, closing the TOCTOU gap the old external throttle had.
      updater: (prev) => {
        if (throttle) {
          const lastLoggedInRawValue: ?string = prev?.[identityContractID]
          if (lastLoggedInRawValue) {
            const lastLoggedIn = new Date(lastLoggedInRawValue).getTime()
            if ((now - lastLoggedIn) < LAST_LOGGED_IN_THROTTLE_WINDOW) return KV_NOOP
          }
        }
        return { ...prev, [identityContractID]: nowString }
      }
    })
  }
}): string[])
