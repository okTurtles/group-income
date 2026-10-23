/* @flow */

import { REDACTED } from './redactions.js'

// `error.message` on failed journal entries is not covered by
// JOURNAL_REDACTIONS: Chelonia redacts contract state only, and its journal
// recorder stores `{ name, message }` verbatim. GI's TypeValidatorError appends
// `    value    <JSON.stringify(offendingValue)>` to its message (see
// frontend/model/contracts/misc/flowTyper.js), so a failed validation would
// otherwise carry a raw memo, payment detail or chat string into the exported
// journal. Only the value line is dropped: `file`, `scope`, `expected` and
// `type` stay, because they are what makes the entry diagnosable.
//
// This covers the journal only. Chelonia also logs the same message when
// processing fails (`[chelonia] ERROR ... in processMutation`), and error logs
// are always part of the captured logs exported next to the journal.
//
// The line is matched up to the next `\n` rather than with `.*$`:
// `JSON.stringify` leaves U+2028 and U+2029 unescaped, and both `.` and a
// multiline `$` stop at them, which would keep the rest of the value. A
// JSON-encoded value never contains a raw `\n`, so the line ends there.
const VALUE_LINE = /^[ \t]*value[ \t]+[^\n]*/gm
const VALUE_LINE_REPLACEMENT = `    value    ${REDACTED}`

export const scrubErrorMessage = (message: string): string => {
  return message.replace(VALUE_LINE, VALUE_LINE_REPLACEMENT)
}

// Mutates and returns the journal produced by `chelonia/journal/get`, which is
// already a deep clone of the persisted journal, so live state is never
// touched. Must run BEFORE the byte accounting in `sw/journal/getAll`, so that
// the export budget measures what is actually written to the file.
export const sanitizeJournal = (journal: Object): Object => {
  const entries = journal?.entries
  if (!Array.isArray(entries)) return journal
  for (const entry of entries) {
    const message = entry?.error?.message
    if (typeof message === 'string') {
      entry.error.message = scrubErrorMessage(message)
    }
  }
  return journal
}
