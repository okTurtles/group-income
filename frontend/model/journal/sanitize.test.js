/* eslint-env mocha */

import assert from 'node:assert'
import { stringMax } from '../contracts/misc/flowTyper.js'
import { sanitizeJournal, scrubErrorMessage } from './sanitize.js'

// Builds the message Chelonia stores on a failed journal entry: the journal
// recorder keeps `{ name, message }` verbatim, and `validate` runs inside
// `processMutation`, so a contract validation failure reaches the export.
const realValidatorMessage = (value: string): string => {
  try {
    stringMax(10, 'memo')(value)
  } catch (e) {
    return e.message
  }
  throw new Error('expected stringMax to throw')
}

const makeJournal = (entries: Array<Object>): Object => {
  const journal = Object.create(null)
  journal.entries = entries
  return journal
}

const makeEntry = (kind: string, message?: string): Object => {
  const entry = Object.create(null)
  entry.kind = kind
  entry.hash = 'zQmhash'
  entry.height = 1
  entry.opType = 'gi.contracts/group/paymentUpdate'
  if (message !== undefined) {
    entry.error = { name: 'TypeValidatorError', message }
  }
  return entry
}

describe('journal export sanitization', () => {
  it('scrubs the raw value out of a real TypeValidatorError message', () => {
    const secret = 'My landlord is evicting me and I need $1200 by Friday'
    const message = realValidatorMessage(secret)

    // Sanity check on the fixture: the raw value really is in the message.
    assert.ok(message.includes(secret))

    const scrubbed = scrubErrorMessage(message)

    assert.ok(!scrubbed.includes(secret))
    assert.ok(scrubbed.includes('value    [REDACTED]'))
    // Everything that makes the failure diagnosable survives.
    assert.ok(scrubbed.includes('file  '))
    assert.ok(scrubbed.includes('expected string(max: 10)'))
    assert.ok(scrubbed.includes('type     string'))
    assert.strictEqual(
      scrubbed.split('\n')[0],
      "string type 'memo' cannot exceed 10 characters"
    )
  })

  it('leaves messages without a value line untouched', () => {
    const message = "[gi.contracts/group/inviteAccept] Existing members can't accept invites: zQmabc"

    assert.strictEqual(scrubErrorMessage(message), message)
  })

  it('only replaces a line-anchored value key, not prose', () => {
    const message = 'the value 42 is out of range\n    value    "secret"'
    const scrubbed = scrubErrorMessage(message)

    assert.ok(scrubbed.includes('the value 42 is out of range'))
    assert.ok(!scrubbed.includes('"secret"'))
  })

  it('scrubs errors on both patch and snapshot entries without touching anything else', () => {
    const secret = 'a payment memo that should never be exported'
    const patch = makeEntry('patch', realValidatorMessage(secret))
    const snapshot = makeEntry('snapshot', realValidatorMessage(secret))
    const clean = makeEntry('patch')
    const journal = makeJournal([patch, snapshot, clean])

    const returned = sanitizeJournal(journal)

    assert.strictEqual(returned, journal)
    assert.ok(!JSON.stringify(journal).includes(secret))
    assert.ok(!JSON.stringify(journal).includes('a payment memo'))
    assert.strictEqual(patch.error.message, snapshot.error.message)
    assert.ok(patch.error.message.includes('value    [REDACTED]'))
    assert.strictEqual(patch.error.name, 'TypeValidatorError')
    assert.strictEqual(patch.hash, 'zQmhash')
    assert.strictEqual(clean.error, undefined)
  })

  it('is a no-op for journals without a usable entries array', () => {
    assert.deepStrictEqual(sanitizeJournal({}), {})
    assert.deepStrictEqual(sanitizeJournal({ entries: [] }), { entries: [] })
    assert.deepStrictEqual(sanitizeJournal({ entries: 'nope' }), { entries: 'nope' })
    assert.deepStrictEqual(sanitizeJournal(Object.create(null)), Object.create(null))
  })

  it('tolerates malformed error fields', () => {
    const journal = makeJournal([
      makeEntry('patch'),
      { kind: 'patch', error: null },
      { kind: 'patch', error: {} },
      { kind: 'patch', error: { message: 42 } }
    ])

    assert.doesNotThrow(() => sanitizeJournal(journal))
    assert.strictEqual(journal.entries[3].error.message, 42)
  })
})
