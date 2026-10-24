/* @flow */

// Byte accounting and journal selection for the contract journal export in
// `sw/journal/getAll`. Extracted from the service worker so it can be unit
// tested.
//
// The export is written with
// `JSON.stringify(payload, undefined, EXPORT_JSON_INDENT)` (AppLogs.vue), so the
// accounting measures the same formatting: measuring compact JSON under-counts
// the real file by roughly 1.9x.

// Shared with AppLogs.vue so the writer and the accountant cannot drift.
export const EXPORT_JSON_INDENT = 2
// Entries live at `payload.journals[contractID]`, so every continuation line of
// an entry's pretty-printed form carries this many extra levels of indentation.
export const JOURNAL_ENTRY_DEPTH = 2
// Payload punctuation the per-entry accounting cannot see: the opening brace,
// the `"journals": {` key line, and the closing braces and newlines.
export const JOURNAL_CONTAINER_OVERHEAD_BYTES = 48
// Per-entry allowance so the estimate never under-counts the real file.
export const JOURNAL_ENTRY_SLACK_BYTES = 32
// Cap on the journal portion of the export. `logs` is not counted here.
export const MAX_JOURNAL_EXPORT_BYTES = 5 * 1024 * 1024

export type JournalExportEntry = { type: string, journal: Object }
export type JournalCandidate = {
  contractID: string,
  type: string,
  // Returns the journal as it will be written (already sanitized), or nothing
  // if the contract has no journal. Must be synchronous, so that every journal
  // is read from the same state.
  loadJournal: () => ?Object
}
export type JournalSelection = {
  // `contractID -> JournalExportEntry`
  journals: Object,
  // `contractID -> { type, bytes }` for the journals left out to stay within
  // the budget, so the person reading the report can tell what is missing.
  omitted: Object,
  truncated: boolean
}

const utf8Encoder = new TextEncoder()

// `,\n` + the key's indentation + `"<contractID>": `
export const journalKeyBytes = (contractID: string): number => {
  return 2 + EXPORT_JSON_INDENT * JOURNAL_ENTRY_DEPTH + 4 +
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

// Lower ranks are kept first when the export is over budget: the user's own
// identity, then groups, then chatrooms, then other members' identities.
const journalExportRank = (contractID: string, type: string, ownIdentityID: ?string): number => {
  if (contractID === ownIdentityID) return 0
  switch (type) {
    case 'gi.contracts/group': return 1
    case 'gi.contracts/chatroom': return 2
    case 'gi.contracts/identity': return 3
    default: return 4
  }
}

// Returns a sorted copy. The sort is stable, so candidates of the same rank
// keep their original order.
export const orderJournalCandidates = (
  candidates: Array<JournalCandidate>,
  ownIdentityID: ?string
): Array<JournalCandidate> => {
  const rank = ({ contractID, type }) => journalExportRank(contractID, type, ownIdentityID)
  return candidates.slice().sort((a, b) => rank(a) - rank(b))
}

// Takes candidates in priority order and keeps each one that still fits in the
// budget. A journal that doesn't fit is recorded in `omitted` and skipped, so a
// smaller one later in the list can still be included. A contract without a
// journal is left out of both.
export const selectJournalsWithinBudget = (
  candidates: Array<JournalCandidate>,
  maxBytes: number = MAX_JOURNAL_EXPORT_BYTES
): JournalSelection => {
  const journals = Object.create(null)
  const omitted = Object.create(null)
  let exportBytes = JOURNAL_CONTAINER_OVERHEAD_BYTES
  let truncated = false

  for (const { contractID, type, loadJournal } of candidates) {
    // Loaded here, one at a time, rather than up front: a journal left out
    // becomes garbage as soon as it has been measured, instead of staying in
    // memory with every other journal until the selection is done.
    const journal = loadJournal()
    if (!journal) continue
    const entry: JournalExportEntry = { type, journal }
    const bytes = journalEntryBytes(contractID, entry)
    if (exportBytes + bytes > maxBytes) {
      omitted[contractID] = { type, bytes }
      truncated = true
      continue
    }
    journals[contractID] = entry
    exportBytes += bytes
  }

  return { journals, omitted, truncated }
}
