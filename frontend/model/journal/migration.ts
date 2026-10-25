import sbp from '@sbp/sbp'
import { DEVICE_SETTINGS } from '../../utils/constants.ts'
import { JOURNAL_REDACTIONS_VERSION } from './redactions.ts'

// Clears persisted Chelonia journals that were written under an older set of
// redaction rules, then records the current redaction version so the clear only
// runs once per version bump.
//
// The version is stored in `rootState.deviceSettings`, which belongs to the
// persisted Chelonia state, so `chelonia/reset` replaces it with whatever
// state is being restored. Run this right after a state is restored, before
// anything syncs:
// - a restored state written under older rules is then cleared before new
//   entries are appended to it;
// - a fresh state has no contracts yet, so the call only records the version.
// Running it any later would find journals recorded under the current rules in
// a state that has no version yet, and delete them.
export const clearStaleJournalsAfterRedactions = (
  rootState: Record<string, any>,
  reactiveSet: (o: Record<string, any>, k: string, v: unknown) => void,
  clearJournals: () => number
): void => {
  if (!rootState.deviceSettings) {
    reactiveSet(rootState, 'deviceSettings', Object.create(null))
  }
  if (rootState.deviceSettings[DEVICE_SETTINGS.JOURNAL_REDACTIONS_APPLIED_VERSION] === JOURNAL_REDACTIONS_VERSION) return

  if (rootState.contracts && Object.keys(rootState.contracts).length > 0) {
    const cleared = clearJournals()
    if (cleared > 0) {
      console.info(`[journal] Cleared stale Chelonia journals after updating redactions (count: ${cleared})`)
    }
  }
  reactiveSet(rootState.deviceSettings, DEVICE_SETTINGS.JOURNAL_REDACTIONS_APPLIED_VERSION, JOURNAL_REDACTIONS_VERSION)
}

// Journals are a debugging aid, so a failure here must not reject Chelonia's
// initialization or abort a login.
export const clearStaleJournals = (): void => {
  try {
    clearStaleJournalsAfterRedactions(
      sbp('chelonia/rootState'),
      sbp('chelonia/config').reactiveSet,
      () => sbp('chelonia/journal/clear')
    )
  } catch (e) {
    console.error('[journal] Failed to clear stale journals', e)
  }
}
