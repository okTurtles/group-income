/* @flow */

// Byte accounting for the contract journal export in `sw/journal/getAll`.
// Extracted from the service worker so the arithmetic can be unit tested.
//
// The export is written with
// `JSON.stringify(payload, undefined, EXPORT_JSON_INDENT)` (AppLogs.vue), so the
// accounting measures the same formatting: measuring compact JSON under-counts
// the real file by roughly 1.9x.

// Shared with AppLogs.vue so the writer and the accountant cannot drift.
export const EXPORT_JSON_INDENT = 2
// Entries live at `payload.journal[contractID]`, so every continuation line of
// an entry's pretty-printed form carries this many extra levels of indentation.
export const JOURNAL_ENTRY_DEPTH = 2
// Payload punctuation the per-entry accounting cannot see: the opening brace,
// the `"journal": {` key line, and the closing braces and newlines.
export const JOURNAL_CONTAINER_OVERHEAD_BYTES = 48
// Per-entry allowance so the estimate never under-counts the real file.
export const JOURNAL_ENTRY_SLACK_BYTES = 32
// Cap on the journal portion of the export. `logs` is not counted here.
export const MAX_JOURNAL_EXPORT_BYTES = 5 * 1024 * 1024

const utf8Encoder = new TextEncoder()

// `,\n` + the key's indentation + `"<contractID>": `
export const journalKeyBytes = (contractID: string): number => {
  return 2 + EXPORT_JSON_INDENT * (JOURNAL_ENTRY_DEPTH - 1) + 4 +
    utf8Encoder.encode(contractID).length
}

// Serialized size of one journal entry as it appears in the exported file.
// Counts UTF-8 bytes rather than UTF-16 code units, because non-ASCII text
// (channel names, display names) costs 2-4 bytes per code point and
// `String.length` would let the export exceed its budget. Adds the indentation
// the entry gains from sitting `JOURNAL_ENTRY_DEPTH` levels below the root.
export const journalEntryBytes = (contractID: string, entry: Object): number => {
  const pretty = JSON.stringify(entry, undefined, EXPORT_JSON_INDENT)
  const continuationLines = pretty.split('\n').length - 1
  return utf8Encoder.encode(pretty).length +
    continuationLines * EXPORT_JSON_INDENT * JOURNAL_ENTRY_DEPTH +
    journalKeyBytes(contractID) +
    JOURNAL_ENTRY_SLACK_BYTES
}
