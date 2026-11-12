// @ts-nocheck
// The pragma is for editors. `**/*.test.ts` is ignored by the project's tsconfig.json,
// but the editor's language server doesn't honour that exclusion.

/* eslint-env mocha */

import assert from 'node:assert'
import { JOURNAL_REDACTIONS_VERSION } from './redactions.ts'
import { clearStaleJournalsAfterRedactions } from './migration.ts'
import { DEVICE_SETTINGS } from '../../utils/constants.ts'

const VERSION_KEY = DEVICE_SETTINGS.JOURNAL_REDACTIONS_APPLIED_VERSION

const reactiveSet = (o: Record<string, any>, k: string, v: unknown) => { o[k] = v }

// Runs the migration and returns how many times it asked to clear journals.
const runMigration = (rootState: Record<string, any>): number => {
  let cleared = 0
  clearStaleJournalsAfterRedactions(rootState, reactiveSet, () => {
    cleared++
    return Object.keys(rootState.contracts || {}).length
  })
  return cleared
}

describe('clearStaleJournalsAfterRedactions migration', () => {
  it('initializes deviceSettings and records the version when no contracts exist', () => {
    const rootState = { contracts: {} }

    assert.strictEqual(runMigration(rootState), 0)
    assert.strictEqual(rootState.deviceSettings[VERSION_KEY], JOURNAL_REDACTIONS_VERSION)
  })

  it('clears journals and records the version when contracts exist', () => {
    const rootState = { contracts: { contract1: {} }, deviceSettings: Object.create(null) }

    assert.strictEqual(runMigration(rootState), 1)
    assert.strictEqual(rootState.deviceSettings[VERSION_KEY], JOURNAL_REDACTIONS_VERSION)
  })

  it('clears again when an older redaction version was recorded', () => {
    // The case every future version bump depends on.
    const rootState = {
      contracts: { contract1: {} },
      deviceSettings: { [VERSION_KEY]: JOURNAL_REDACTIONS_VERSION - 1 }
    }

    assert.strictEqual(runMigration(rootState), 1)
    assert.strictEqual(rootState.deviceSettings[VERSION_KEY], JOURNAL_REDACTIONS_VERSION)
  })

  it('is a no-op when the current version was already recorded', () => {
    const rootState = {
      contracts: { contract1: {} },
      deviceSettings: { [VERSION_KEY]: JOURNAL_REDACTIONS_VERSION }
    }

    assert.strictEqual(runMigration(rootState), 0)
  })

  it('records the version only after the clear succeeds', () => {
    // Otherwise a failed clear would leave the stale journals in place for good.
    const rootState = { contracts: { contract1: {} }, deviceSettings: Object.create(null) }

    assert.throws(() => clearStaleJournalsAfterRedactions(rootState, reactiveSet, () => {
      throw new Error('clear failed')
    }), /clear failed/)
    assert.strictEqual(rootState.deviceSettings[VERSION_KEY], undefined)
  })
})
