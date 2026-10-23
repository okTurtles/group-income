/* eslint-env mocha */

import assert from 'node:assert'
import { JOURNAL_REDACTIONS_VERSION } from './redactions.js'
import { clearStaleJournalsAfterRedactions } from './migration.js'
import { DEVICE_SETTINGS } from '../../utils/constants.js'

const VERSION_KEY = DEVICE_SETTINGS.JOURNAL_REDACTIONS_APPLIED_VERSION

const reactiveSet = (o: Object, k: string, v: mixed) => { o[k] = v }

// Runs the migration and returns how many times it asked to clear journals.
const runMigration = (rootState: Object): number => {
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
