/* eslint-env mocha */

import assert from 'node:assert'
import { stringMax } from '../contracts/misc/flowTyper.js'
import { REDACTED } from './redactions.js'
import { sanitizeJournal, scrubErrorMessage } from './sanitize.js'

const SCRUBBED_VALUE_LINE = `    value    ${REDACTED}`

// Compares whole lines: a substring match would also accept the replacement
// with a different indentation.
const scrubbedLineCount = (message: string): number =>
  message.split('\n').filter(line => line === SCRUBBED_VALUE_LINE).length

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

const makeEntry = (kind: string, message?: string, field: string = 'error'): Object => {
  const entry = Object.create(null)
  entry.kind = kind
  entry.hash = 'zQmhash'
  entry.height = 1
  entry.opType = 'gi.contracts/group/paymentUpdate'
  if (message !== undefined) {
    entry[field] = { name: 'TypeValidatorError', message }
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
    assert.strictEqual(scrubbedLineCount(scrubbed), 1)
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

  it('scrubs values that contain JS line separators', () => {
    // `JSON.stringify` leaves U+2028 and U+2029 unescaped, and a regex `.` or a
    // multiline `$` stops at them.
    for (const separator of ['\u2028', '\u2029']) {
      const message = realValidatorMessage(`rent money${separator}my secret diagnosis`)
      assert.ok(message.includes('my secret diagnosis'))

      const scrubbed = scrubErrorMessage(message)

      assert.ok(!scrubbed.includes('my secret diagnosis'))
      assert.ok(!scrubbed.includes('rent money'))
      assert.strictEqual(scrubbedLineCount(scrubbed), 1)
      assert.ok(scrubbed.includes('type     string'))
    }
  })

  it('scrubs every value line in a message', () => {
    const message = '    value    "first secret"\nnested:\n    value    "second secret"'
    const scrubbed = scrubErrorMessage(message)

    assert.ok(!scrubbed.includes('first secret'))
    assert.ok(!scrubbed.includes('second secret'))
    assert.strictEqual(scrubbedLineCount(scrubbed), 2)
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
    assert.strictEqual(scrubbedLineCount(patch.error.message), 1)
    assert.strictEqual(patch.error.name, 'TypeValidatorError')
    assert.strictEqual(patch.hash, 'zQmhash')
    assert.strictEqual(clean.error, undefined)
  })

  it('scrubs the journal-side diffError and redactionError fields too', () => {
    // Chelonia records these next to `error`, verbatim, and copies them onto
    // boundary snapshots.
    const secret = 'a chat message that should never be exported'
    const diffPatch = makeEntry('patch', realValidatorMessage(secret), 'diffError')
    const diffSnapshot = makeEntry('snapshot', realValidatorMessage(secret), 'diffError')
    const redactionPatch = makeEntry('patch', realValidatorMessage(secret), 'redactionError')
    const both = makeEntry('patch', realValidatorMessage(secret))
    both.redactionError = { name: 'TypeValidatorError', message: realValidatorMessage(secret) }
    const journal = makeJournal([diffPatch, diffSnapshot, redactionPatch, both])

    sanitizeJournal(journal)

    assert.ok(!JSON.stringify(journal).includes(secret))
    for (const detail of [diffPatch.diffError, diffSnapshot.diffError, redactionPatch.redactionError, both.error, both.redactionError]) {
      assert.strictEqual(scrubbedLineCount(detail.message), 1)
      assert.strictEqual(detail.name, 'TypeValidatorError')
    }
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
      { kind: 'patch', error: { message: 42 } },
      { kind: 'patch', diffError: null },
      { kind: 'patch', redactionError: {} },
      { kind: 'patch', redactionError: { message: 42 } },
      null
    ])

    assert.doesNotThrow(() => sanitizeJournal(journal))
    assert.strictEqual(journal.entries[3].error.message, 42)
    assert.strictEqual(journal.entries[6].redactionError.message, 42)
  })
})
