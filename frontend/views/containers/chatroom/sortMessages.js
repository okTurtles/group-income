// Message ordering and send-failure resolution helpers used by `ChatMain.vue`.
//
// These live in a plain module (no Vue, no SBP, no contract imports) so that
// they can be unit-tested by mocha, which cannot import `.vue` single-file
// components.

// Fallback rank for messages whose height is missing entirely. Temporary
// messages created while attachments are uploading also sort last, but by
// magnitude: `SPMessage.createV1_0` gives them `Number.MAX_SAFE_INTEGER`.
const NO_HEIGHT = Infinity

// Returns a new array with `messages` ordered by contract height, without
// mutating the input. Messages that don't have a usable height yet (pending
// sends, temporary attachment-upload messages) sort last, and messages with the
// same height keep the relative order they have in the source array.
export function sortMessages (messages: Array<Object>): Array<Object> {
  return messages.map((message, index) => ({ message, index }))
    .sort((a, b) => {
      const ra = a.message.height == null ? NO_HEIGHT : a.message.height
      const rb = b.message.height == null ? NO_HEIGHT : b.message.height
      if (ra !== rb) return ra - rb
      return a.index - b.index
    })
    .map(({ message }) => message)
}

// Determines which message should be flagged as failed after a send error,
// returning `null` when there is nothing to flag.
//
// `null` is returned both when the message isn't in the rendered state and when
// it is there but has already been delivered: the server copy clears `pending`
// (see the `addMessage` `process` function in
// `frontend/model/contracts/chatroom.js`), and flagging a delivered message
// would offer to resend something that already exists in the chatroom.
export function resolveFailedMessage (hash: ?string, messages: ?Array<Object>): Object | null {
  if (!hash || !Array.isArray(messages)) return null
  // Search backwards so that the most recent entry for a hash wins, matching
  // `findMessageIdx` in `frontend/model/contracts/shared/functions.js`.
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message.hash === hash) {
      return message.pending ? message : null
    }
  }
  return null
}
