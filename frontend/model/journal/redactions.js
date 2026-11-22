/* @flow */

import { blake32Hash } from '@chelonia/lib/functions'

// Which sentinel to use: `freeTextRedactor` (`REDACTED_TEXT`) for text a person
// typed (messages, names, descriptions, bios), `redactedRedactor` (`REDACTED`)
// for structured or secret values (amounts, payment details, contact data,
// tokens, key material, opaque objects).
export const REDACTED = '[REDACTED]'
export const REDACTED_TEXT = 'xxxxxxxx'

// Takes the LAST 6 characters of the base58btc multihash, not the first: the
// leading 7 characters are constant for every input (the multibase `z` plus the
// `2Drjgb` multihash prefix), verified over 200k random blake2b-256 hashes, so a
// prefix slice carries no information. The suffix is uniformly distributed.
export const hashRedactor = (value: mixed): string => {
  let serialized
  try {
    serialized = JSON.stringify(value) ?? 'undefined'
  } catch {
    // Cyclic or otherwise unserializable, so hash a tag of the type instead.
    serialized = `[unserializable:${typeof value}]`
  }
  return blake32Hash(serialized).slice(-6)
}
export const freeTextRedactor = (_value: mixed): string => REDACTED_TEXT
export const redactedRedactor = (_value: mixed): string => REDACTED
// Reaction strings are arbitrary user-supplied text that the chatroom contract
// turns into object *keys* (`message.emoticons[emoticon] = [memberID, ...]`),
// and a redaction path can only replace values, never rename keys. Rebuild the
// map rather than blanking it: each reaction becomes a short hash and each
// value the number of reactors, so reaction activity stays diagnosable while
// neither the raw string nor the reactor member IDs reach the export. Hashing
// fits here even though picker emoji are low entropy, unlike the
// `attributes.email` rule: an emoji identifies nobody, and the free text a
// modified client can smuggle into a reaction is high entropy.
export const emoticonsRedactor = (value: mixed): Object => {
  const redacted = {}
  if (typeof value !== 'object' || value === null) return redacted
  for (const [emoticon, reactors] of Object.entries(value)) {
    redacted[hashRedactor(emoticon)] = Array.isArray(reactors) ? reactors.length : 0
  }
  return redacted
}

// The keys the app puts into `notification.params`: `createMessage` adds the
// channel name and description, and the chatroom contract adds the member IDs.
const NOTIFICATION_PARAM_KEYS = new Set(['channelName', 'channelDescription', 'memberID', 'actorID'])
// `addMessage` validates `notification` with `objectMaybeOf`, which accepts any
// extra key, and `createMessage` spreads it into `params`. So, like a reaction,
// a param *key* can carry free text. Known keys are kept so the notification
// stays readable, any other key is hashed, and every value is blanked.
export const notificationParamsRedactor = (value: mixed): Object => {
  const redacted = {}
  if (typeof value !== 'object' || value === null) return redacted
  for (const key of Object.keys(value)) {
    redacted[NOTIFICATION_PARAM_KEYS.has(key) ? key : hashRedactor(key)] = REDACTED_TEXT
  }
  return redacted
}

// Top-level message fields: set by `createMessage`, or later by the chatroom
// contract (`emoticons`, `pinnedBy`, `updatedDate`, `pending`).
const MESSAGE_KEYS = new Set([
  'type', 'hash', 'height', 'from', 'datetime', 'pending', 'text',
  'replyingMessage', 'attachments', 'pollData', 'notification', 'proposal',
  'emoticons', 'pinnedBy', 'updatedDate'
])
// `pinMessage` validates its `message` only as `object` and stores it as is.
// An honest client pins a copy of a `messages` entry, but any client can add
// fields that no path rule knows about. Known fields are kept (the
// `MESSAGE_FIELD_REDACTIONS` that run after this rule still apply to them), and
// any other field is reduced to a hashed key with a redacted value.
export const pinnedMessageRedactor = (value: mixed): mixed => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return REDACTED
  const redacted = {}
  for (const [key, field] of Object.entries(value)) {
    if (MESSAGE_KEYS.has(key)) {
      redacted[key] = field
    } else {
      redacted[hashRedactor(key)] = REDACTED
    }
  }
  return redacted
}

// Bump whenever `JOURNAL_REDACTIONS` changes, so journals persisted under the
// old rules get cleared (see `migration.js`). The pin test in
// `redactions.test.js` fails until both are updated together.
export const JOURNAL_REDACTIONS_VERSION = 4

type Redactor = (value: mixed) => mixed
type JournalRedaction = { path: string, redact: Redactor }

// `pinnedMessages` holds copies of `messages` entries, so every message rule
// must exist for both containers. Generating the pairs keeps the two lists from
// drifting apart. Add new message rules here, not to `JOURNAL_REDACTIONS`.
//
// A pinned entry is whatever object the pinning client sent, though. Unknown
// top-level fields are handled by `pinnedMessageRedactor`, but the values of
// known fields (such as `hash` or `from`) and unknown fields nested inside
// known ones are only covered by the rules below, which assume an honest
// client. A modified client can still place text there.
const MESSAGE_FIELD_REDACTIONS: Array<[string, Redactor]> = [
  ['text', freeTextRedactor],
  ['emoticons', emoticonsRedactor],
  ['replyingMessage.text', freeTextRedactor],
  ['pollData.question', freeTextRedactor],
  ['pollData.options.*.value', freeTextRedactor],
  ['pollData.options.*.voted', redactedRedactor],
  ['attachments.*.name', freeTextRedactor],
  ['attachments.*.downloadData.downloadParams', redactedRedactor],
  ['proposal.proposalData', redactedRedactor],
  ['notification.params', notificationParamsRedactor]
]

const messageRedactions: Array<JournalRedaction> = [
  // Runs before the field rules below, which then apply to the rebuilt entries.
  { path: 'pinnedMessages.*', redact: pinnedMessageRedactor },
  ...['messages', 'pinnedMessages'].flatMap(
    (container) => MESSAGE_FIELD_REDACTIONS.map(
      ([path, redact]) => ({ path: `${container}.*.${path}`, redact })
    )
  )
]

export const JOURNAL_REDACTIONS: Array<JournalRedaction> = [
  // A 6-character base58 hash is ~35 bits, so a short dictionary recovers the
  // address: it would only look protective in a file users are told to attach
  // publicly. `attributes.username` already carries the diagnostic value.
  { path: 'attributes.email', redact: redactedRedactor },
  // Free text, and often a real name. An export carries the identity of every
  // synced member, and `attributes.username` already tells them apart.
  { path: 'attributes.displayName', redact: freeTextRedactor },
  // Only `downloadParams` is sensitive (it carries the file IKM); keeping
  // `manifestCid` preserves avatar download/delete diagnostics, matching the
  // `settings.groupPicture` rule. The string form of the union is the public
  // default-avatar URL.
  { path: 'attributes.picture.downloadParams', redact: redactedRedactor },
  { path: 'attributes.bio', redact: freeTextRedactor },
  // Chatroom channel name and description. `attributes.type`,
  // `attributes.privacyLevel`, `attributes.creatorID` and `attributes.adminIDs`
  // are deliberately kept: they are diagnostically valuable and not free text.
  { path: 'attributes.name', redact: freeTextRedactor },
  { path: 'attributes.description', redact: freeTextRedactor },
  // Not a secret: the ID of the invite key the member joined with (the key
  // itself is never stored here). It is hidden anyway because it ties this
  // identity to one specific invite, and the group's `invites` map ties that
  // invite to the member who created it.
  { path: 'groups.*.inviteSecretId', redact: redactedRedactor },
  // The invited member's display name, copied from the passed proposal's
  // `memberName`. `proposals.*.data.proposalData` is redacted for the same
  // reason; this is the copy that survives in `state.invites`.
  { path: 'invites.*.invitee', redact: freeTextRedactor },
  { path: 'fileDeleteTokens', redact: redactedRedactor },
  // The group's copy of every channel's name and description.
  { path: 'chatRooms.*.name', redact: freeTextRedactor },
  { path: 'chatRooms.*.description', redact: freeTextRedactor },
  { path: 'profiles.*.incomeAmount', redact: redactedRedactor },
  { path: 'profiles.*.pledgeAmount', redact: redactedRedactor },
  { path: 'profiles.*.paymentMethods', redact: redactedRedactor },
  // Element form rather than the bare array path, so the element count survives.
  { path: 'profiles.*.nonMonetaryContributions.*', redact: freeTextRedactor },
  { path: 'payments.*.data.details', redact: redactedRedactor },
  { path: 'payments.*.data.memo', redact: redactedRedactor },
  { path: 'payments.*.data.amount', redact: redactedRedactor },
  { path: 'payments.*.data.txid', redact: redactedRedactor },
  // Per-payment snapshot of the group mincome (group.js `payment` process).
  // Without this rule it re-leaks the value `settings.mincomeAmount` hides.
  { path: 'payments.*.data.groupMincome', redact: redactedRedactor },
  { path: 'paymentsByPeriod.*.haveNeedsSnapshot', redact: redactedRedactor },
  { path: 'paymentsByPeriod.*.lastAdjustedDistribution', redact: redactedRedactor },
  { path: 'thankYousFrom.*.*', redact: redactedRedactor },
  // Running total of completed payment amounts (group.js `paymentUpdate`).
  { path: 'totalPledgeAmount', redact: redactedRedactor },
  // Per-member counts, keyed by member ID. They show who keeps missing
  // payments (or votes), which the payment rules above otherwise hide. As with
  // `thankYousFrom`, the member keys stay. The group-wide streaks
  // (`fullMonthlyPledges`, `fullMonthlySupport`, `lastStreakPeriod`) stay too.
  { path: 'streaks.onTimePayments.*', redact: redactedRedactor },
  { path: 'streaks.missedPayments.*', redact: redactedRedactor },
  { path: 'streaks.noVotes.*', redact: redactedRedactor },
  // Only the object form needs a rule: the string form is always a public URL
  // (the default avatar set by `gi.actions/group/create`, or an image URL the
  // user entered), never an uploaded file, and hashing the whole value would
  // destroy the `manifestCid` needed to debug avatar downloads.
  { path: 'settings.groupPicture.downloadParams', redact: redactedRedactor },
  { path: 'proposals.*.payload', redact: redactedRedactor },
  { path: 'proposals.*.data.proposalData', redact: redactedRedactor },
  // `_vm.authorizedKeys.*._private` is deliberately kept: it holds the ID of the
  // key that encrypts this key's private part (Chelonia's `encryptionKeyId`),
  // not key material, and it helps when debugging key rotation.
  { path: '_vm.authorizedKeys.*.meta.private.content', redact: hashRedactor },
  { path: '_vm.authorizedKeys.*.meta.private.oldKeys', redact: hashRedactor },
  { path: '_vm.invites.*.inviteSecret', redact: redactedRedactor },
  { path: 'settings.groupName', redact: freeTextRedactor },
  { path: 'settings.sharedValues', redact: freeTextRedactor },
  // `settings.mincomeCurrency` and `settings.distributionDate` stay: they are
  // needed to interpret distribution bugs and are not sensitive.
  { path: 'settings.mincomeAmount', redact: redactedRedactor },
  ...messageRedactions
]
