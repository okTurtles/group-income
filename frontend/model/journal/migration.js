/* @flow */

import { DEVICE_SETTINGS } from '../../utils/constants.js'
import { JOURNAL_REDACTIONS_VERSION } from './redactions.js'

// Clears persisted Chelonia journals that were written under an older set of
// redaction rules, then records the current redaction version so the clear only
// runs once per version bump.
//
// The flag is always written once the version check passes (even when there are
// no contracts to clear). This is safe because journals created after Chelonia
// is configured always apply the current redactions; only journals persisted
// under an older version are stale, and those require pre-existing contracts.
export const clearStaleJournalsAfterRedactions = (
  rootState: Object,
  cheloniaConfig: { reactiveSet: (o: Object, k: string, v: mixed) => void },
  clearJournals: () => number
): void => {
  if (!rootState.deviceSettings) {
    cheloniaConfig.reactiveSet(rootState, 'deviceSettings', Object.create(null))
  }
  if (rootState.deviceSettings[DEVICE_SETTINGS.JOURNAL_REDACTIONS_CLEARED] === JOURNAL_REDACTIONS_VERSION) return

  if (rootState.contracts && Object.keys(rootState.contracts).length > 0) {
    const cleared = clearJournals()
    if (cleared > 0) {
      console.info(`[setupChelonia] Cleared ${cleared} stale Chelonia journals after updating redactions`)
    }
  }
  cheloniaConfig.reactiveSet(rootState.deviceSettings, DEVICE_SETTINGS.JOURNAL_REDACTIONS_CLEARED, JOURNAL_REDACTIONS_VERSION)
}
