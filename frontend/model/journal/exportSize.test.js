/* eslint-env mocha */

import assert from 'node:assert'
import {
  EXPORT_JSON_INDENT,
  JOURNAL_CONTAINER_OVERHEAD_BYTES,
  JOURNAL_ENTRY_DEPTH,
  JOURNAL_ENTRY_SLACK_BYTES,
  journalEntryBytes,
  journalKeyBytes,
  orderJournalCandidates,
  selectJournalsWithinBudget
} from './exportSize.js'

const utf8Encoder = new TextEncoder()

// The exported file is `{ journals: { "<contractID>": entry, … } }`, written with
// `JSON.stringify(payload, undefined, EXPORT_JSON_INDENT)`.
const realExportBytes = (journals: Object): number => {
  return utf8Encoder.encode(
    JSON.stringify({ journals }, undefined, EXPORT_JSON_INDENT)
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
    // The entry is nested at `payload.journals[contractID]`, so each of its
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

  it('counts contract key bytes as UTF-8', () => {
    // Contract IDs are base58 in practice; this pins the counting to UTF-8.
    assert.strictEqual(journalKeyBytes('秘密') - journalKeyBytes('ab'), '秘密'.length * 2)
  })

  it('counts the actual indentation of every contract key', () => {
    const journals = Object.create(null)
    journals.first = {}
    journals.second = {}
    const serialized = JSON.stringify({ journals }, undefined, EXPORT_JSON_INDENT)
    const secondKey = '    "second": '

    assert.ok(serialized.includes(`\n${secondKey}{}`))
    assert.strictEqual(
      journalKeyBytes('second'),
      utf8Encoder.encode(',\n' + secondKey).length
    )
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

describe('journal export selection', () => {
  const candidate = (contractID: string, type: string, count: number = 1) => ({
    contractID,
    entry: makeContract(type, count)
  })
  const ids = (candidates) => candidates.map(c => c.contractID)

  it('orders the own identity first, then groups, chatrooms and other identities', () => {
    const candidates = [
      candidate('zOtherIdentity1', 'gi.contracts/identity'),
      candidate('zChatroom1', 'gi.contracts/chatroom'),
      candidate('zUnknown', '(unknown)'),
      candidate('zGroup', 'gi.contracts/group'),
      candidate('zOwnIdentity', 'gi.contracts/identity'),
      candidate('zOtherIdentity2', 'gi.contracts/identity'),
      candidate('zChatroom2', 'gi.contracts/chatroom')
    ]

    const ordered = orderJournalCandidates(candidates, 'zOwnIdentity')

    assert.deepStrictEqual(ids(ordered), [
      'zOwnIdentity',
      'zGroup',
      // Same-rank candidates keep their original order.
      'zChatroom1',
      'zChatroom2',
      'zOtherIdentity1',
      'zOtherIdentity2',
      'zUnknown'
    ])
    // The input is not reordered in place.
    assert.strictEqual(candidates[0].contractID, 'zOtherIdentity1')
  })

  it('keeps every journal and omits nothing when the budget allows', () => {
    const candidates = [
      candidate('zIdentity', 'gi.contracts/identity'),
      candidate('zGroup', 'gi.contracts/group', 3)
    ]

    const { journals, omitted, truncated } = selectJournalsWithinBudget(candidates)

    assert.deepStrictEqual(Object.keys(journals), ['zIdentity', 'zGroup'])
    assert.strictEqual(journals.zGroup, candidates[1].entry)
    assert.deepStrictEqual({ ...omitted }, {})
    assert.strictEqual(truncated, false)
  })

  it('names every journal it leaves out, and still fits later smaller ones', () => {
    const small = candidate('zSmall1', 'gi.contracts/identity')
    const large = candidate('zLarge', 'gi.contracts/group', 50)
    const small2 = candidate('zSmall2', 'gi.contracts/chatroom')
    const smallBytes = journalEntryBytes(small.contractID, small.entry)
    const small2Bytes = journalEntryBytes(small2.contractID, small2.entry)
    const largeBytes = journalEntryBytes(large.contractID, large.entry)
    // Room for both small journals, but not for the large one as well.
    const maxBytes = JOURNAL_CONTAINER_OVERHEAD_BYTES + smallBytes + small2Bytes
    assert.ok(largeBytes > small2Bytes)

    const { journals, omitted, truncated } = selectJournalsWithinBudget([small, large, small2], maxBytes)

    assert.deepStrictEqual(Object.keys(journals), ['zSmall1', 'zSmall2'])
    assert.deepStrictEqual({ ...omitted }, {
      zLarge: { type: 'gi.contracts/group', bytes: largeBytes }
    })
    assert.strictEqual(truncated, true)
  })

  it('keeps the written file within the budget it selects for', () => {
    const candidates = orderJournalCandidates([
      candidate('zChatroom', 'gi.contracts/chatroom', 30),
      candidate('zGroup', 'gi.contracts/group', 20),
      candidate('zOwnIdentity', 'gi.contracts/identity', 5)
    ], 'zOwnIdentity')
    const maxBytes = JOURNAL_CONTAINER_OVERHEAD_BYTES +
      journalEntryBytes('zOwnIdentity', candidates[0].entry) +
      journalEntryBytes('zGroup', candidates[1].entry)

    const { journals, omitted } = selectJournalsWithinBudget(candidates, maxBytes)

    assert.deepStrictEqual(Object.keys(journals), ['zOwnIdentity', 'zGroup'])
    assert.deepStrictEqual(Object.keys(omitted), ['zChatroom'])
    assert.ok(realExportBytes(journals) <= maxBytes)
  })
})
