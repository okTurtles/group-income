/* @flow */

// Byte accounting for the contract journal export in `sw/journal/getAll`.
// Extracted from the service worker so the arithmetic can be unit tested.

// `{}` for an export containing no journals.
export const EMPTY_OBJECT_BYTES = 2
// `,"<contractID>":` — comma, two quotes and a colon around each key.
export const JOURNAL_KEY_OVERHEAD_BYTES = 4

const utf8Encoder = new TextEncoder()

// Serialized size of one journal entry as it appears in the exported JSON
// object. Counts UTF-8 bytes rather than UTF-16 code units, because the export
// is written to a file: non-ASCII text (channel names, display names) costs 2-4
// bytes per code point, so `String.length` under-counts and lets the export
// exceed its budget.
export const journalEntryBytes = (contractID: string, entry: Object): number => {
  return utf8Encoder.encode(JSON.stringify(entry) ?? '').length +
    utf8Encoder.encode(contractID).length +
    JOURNAL_KEY_OVERHEAD_BYTES
}
