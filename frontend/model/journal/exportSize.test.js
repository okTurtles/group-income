/* eslint-env mocha */

import assert from 'node:assert'
import {
  EXPORT_JSON_INDENT,
  JOURNAL_CONTAINER_OVERHEAD_BYTES,
  JOURNAL_ENTRY_DEPTH,
  JOURNAL_ENTRY_SLACK_BYTES,
  journalEntryBytes,
  journalKeyBytes
} from './exportSize.js'

const utf8Encoder = new TextEncoder()

// The exported file is `{ journal: { "<contractID>": entry, … } }`, written with
// `JSON.stringify(payload, undefined, EXPORT_JSON_INDENT)`.
const realExportBytes = (journals: Object): number => {
  return utf8Encoder.encode(
    JSON.stringify({ journal: journals }, undefined, EXPORT_JSON_INDENT)
  ).length
}

// Same shape as `journalEntryBytes`, but counting UTF-16 code units of the
// pretty-printed entry instead of UTF-8 bytes. Used to pin down the exact
// difference the two counting strategies make.
const utf16AccountedBytes = (contractID: string, entry: Object): number => {
  const pretty = JSON.stringify(entry, undefined, EXPORT_JSON_INDENT)
  const continuationLines = pretty.split('\n').length - 1
  return pretty.length +
    continuationLines * EXPORT_JSON_INDENT * JOURNAL_ENTRY_DEPTH +
    journalKeyBytes(contractID) +
    JOURNAL_ENTRY_SLACK_BYTES
}

const journalEntry = (hash: string, extra?: Object): Object => {
  return Object.assign(Object.create(null), {
    kind: 'patch',
    hash,
    height: 1,
    opType: 'gi.contracts/chatroom/addMessage',
    description: `<op_ae|${hash}> of zQmContract`,
    data: { text: `message body ${hash}`, createdDate: '2026-01-01T00:00:00.000Z' }
  }, extra || {})
}

const makeContract = (type: string, count: number, extra?: Object): Object => {
  const entries = Array.from({ length: count }, (_, i) => journalEntry(`zQmHash${i}`, extra))
  const journal = Object.create(null)
  journal.entries = entries
  return { type, journal }
}

describe('journal export size accounting', () => {
  it('never under-counts the file that is actually written', () => {
    // `sw/journal/getAll` builds a null-prototype map of one entry per synced
    // contract; the shapes below differ in size the way real ones do.
    const journals = Object.create(null)
    journals.zQmIdentityContract = makeContract('gi.contracts/identity', 1)
    journals.zQmGroupContract = makeContract('gi.contracts/group', 10)
    journals.zQmChatroomContract = makeContract('gi.contracts/chatroom', 40, {
      // Non-ASCII text costs more UTF-8 bytes than UTF-16 code units.
      text: '秘密のチャンネル 🎉'
    })

    let accounted = JOURNAL_CONTAINER_OVERHEAD_BYTES
    for (const contractID of Object.keys(journals)) {
      accounted += journalEntryBytes(contractID, journals[contractID])
    }
    const actual = realExportBytes(journals)

    assert.ok(accounted >= actual, `accounted ${accounted} should cover ${actual}`)
    assert.ok(
      (accounted - actual) / actual < 0.05,
      `accounted ${accounted} overshoots ${actual} by more than 5%`
    )
  })

  it('measures the pretty-printed export, not the compact one', () => {
    const contractID = 'zQmChatroomContract'
    const entry = makeContract('gi.contracts/chatroom', 5)
    const compact = utf8Encoder.encode(JSON.stringify({ [contractID]: entry })).length
    const accounted = journalEntryBytes(contractID, entry)

    assert.ok(accounted > compact, `${accounted} should exceed the compact ${compact}`)
    // The entry is nested at `payload.journal[contractID]`, so each of its
    // continuation lines gains `EXPORT_JSON_INDENT * JOURNAL_ENTRY_DEPTH`.
    const pretty = JSON.stringify(entry, undefined, EXPORT_JSON_INDENT)
    const continuationLines = pretty.split('\n').length - 1
    assert.ok(
      accounted >= utf8Encoder.encode(pretty).length +
        continuationLines * EXPORT_JSON_INDENT * JOURNAL_ENTRY_DEPTH,
      'indentation of the nested entry should be counted'
    )
  })

  it('counts UTF-8 bytes rather than UTF-16 code units', () => {
    // Each of these code points is 3 bytes in UTF-8 but 1 UTF-16 code unit, so
    // a `String.length` based count would under-report by 2 bytes each. This
    // guards against a regression to `JSON.stringify(entry).length`.
    const contractID = 'zQmChatroomContract'
    const entry = makeContract('gi.contracts/chatroom', 1, {
      text: '秘密のチャンネル'
    })

    const bytes = journalEntryBytes(contractID, entry)
    const utf16Bytes = utf16AccountedBytes(contractID, entry)

    assert.ok(bytes > utf16Bytes, `${bytes} should exceed ${utf16Bytes}`)
    assert.strictEqual(bytes - utf16Bytes, '秘密のチャンネル'.length * 2)
  })

  it('counts emoji outside the basic multilingual plane', () => {
    // A surrogate pair is 2 UTF-16 code units but 4 UTF-8 bytes.
    const entry = makeContract('gi.contracts/chatroom', 1, { text: '🎉' })

    assert.strictEqual(
      journalEntryBytes('', entry) - utf16AccountedBytes('', entry),
      2
    )
  })

  it('accounts for the JSON punctuation around each contract key', () => {
    // `,\n` + the key's indentation + `"<contractID>": `
    assert.strictEqual(
      journalKeyBytes('z9brRu3V'),
      2 + EXPORT_JSON_INDENT * (JOURNAL_ENTRY_DEPTH - 1) + 4 + 'z9brRu3V'.length
    )
    // Contract IDs are base58 in practice; this pins the counting to UTF-8.
    assert.strictEqual(journalKeyBytes('秘密') - journalKeyBytes('ab'), '秘密'.length * 2)
  })

  it('keeps the per-entry slack that makes the estimate conservative', () => {
    const entry = makeContract('gi.contracts/identity', 1)
    const withoutSlack = utf8Encoder.encode(
      JSON.stringify(entry, undefined, EXPORT_JSON_INDENT)
    ).length

    assert.ok(JOURNAL_ENTRY_SLACK_BYTES > 0)
    assert.ok(journalEntryBytes('', entry) > withoutSlack)
  })
})
