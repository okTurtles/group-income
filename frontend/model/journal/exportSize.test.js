/* eslint-env mocha */

import assert from 'node:assert'
import {
  EMPTY_OBJECT_BYTES,
  JOURNAL_KEY_OVERHEAD_BYTES,
  journalEntryBytes
} from './exportSize.js'

describe('journal export size accounting', () => {
  it('counts the serialized entry, the key and the JSON punctuation', () => {
    const contractID = 'z9brRu3V'
    const entry = { type: 'gi.contracts/group', journal: [] }
    const serializedBytes = JSON.stringify(entry).length

    assert.strictEqual(
      journalEntryBytes(contractID, entry),
      serializedBytes + contractID.length + JOURNAL_KEY_OVERHEAD_BYTES
    )
  })

  it('counts UTF-8 bytes rather than UTF-16 code units', () => {
    // Each of these code points is 3 bytes in UTF-8 but 1 UTF-16 code unit, so
    // a `String.length` based count would under-report by 2 bytes each. This
    // guards against a regression to `JSON.stringify(entry).length`.
    const entry = { type: 'gi.contracts/chatroom', journal: ['秘密のチャンネル'] }
    const contractID = 'z9brRu3V'

    const bytes = journalEntryBytes(contractID, entry)
    const utf16Bytes = JSON.stringify(entry).length + contractID.length +
      JOURNAL_KEY_OVERHEAD_BYTES

    assert.ok(bytes > utf16Bytes, `${bytes} should exceed ${utf16Bytes}`)
    assert.strictEqual(bytes - utf16Bytes, '秘密のチャンネル'.length * 2)
  })

  it('counts emoji outside the basic multilingual plane', () => {
    // A surrogate pair is 2 UTF-16 code units but 4 UTF-8 bytes.
    const entry = { journal: ['🎉'] }

    assert.strictEqual(
      journalEntryBytes('', entry) - JOURNAL_KEY_OVERHEAD_BYTES,
      JSON.stringify(entry).length + 2
    )
  })

  it('accounts for the empty export object', () => {
    assert.strictEqual(EMPTY_OBJECT_BYTES, JSON.stringify({}).length)
  })
})
