/* @flow */

import { blake32Hash } from '@chelonia/lib/functions'

export const REDACTED = '[REDACTED]'

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
export const messageTextRedactor = (_value: mixed): string => 'xxxxxxxx'
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
export const JOURNAL_REDACTIONS_VERSION = 2

type Redactor = (value: mixed) => mixed
type JournalRedaction = { path: string, redact: Redactor }

// `pinnedMessages` holds the same message objects as `messages` (the chatroom
// pinMessage action unshifts the object itself), so every rule must exist for
// both containers. Generating the pairs keeps the two lists from drifting
// apart. Add new message rules here, not to `JOURNAL_REDACTIONS`.
const MESSAGE_FIELD_REDACTIONS: Array<[string, Redactor]> = [
  ['text', messageTextRedactor],
  ['emoticons', emoticonsRedactor],
  ['replyingMessage.text', messageTextRedactor],
  ['pollData.question', messageTextRedactor],
  ['pollData.options.*.value', messageTextRedactor],
  ['pollData.options.*.voted', redactedRedactor],
  ['attachments.*.name', messageTextRedactor],
  ['attachments.*.downloadData.downloadParams', redactedRedactor],
  ['proposal.proposalData', redactedRedactor],
  ['notification.params.channelName', messageTextRedactor],
  ['notification.params.channelDescription', messageTextRedactor]
]

const messageRedactions: Array<JournalRedaction> = ['messages', 'pinnedMessages'].flatMap(
  (container) => MESSAGE_FIELD_REDACTIONS.map(
    ([path, redact]) => ({ path: `${container}.*.${path}`, redact })
  )
)

export const JOURNAL_REDACTIONS: Array<JournalRedaction> = [
  // A 6-character base58 hash is ~35 bits, so a short dictionary recovers the
  // address: it would only look protective in a file users are told to attach
  // publicly. `attributes.username` already carries the diagnostic value.
  { path: 'attributes.email', redact: redactedRedactor },
  // Only `downloadParams` is sensitive (it carries the file IKM); keeping
  // `manifestCid` preserves avatar download/delete diagnostics, matching the
  // `settings.groupPicture` rule. The string form of the union is the public
  // default-avatar URL.
  { path: 'attributes.picture.downloadParams', redact: redactedRedactor },
  { path: 'attributes.bio', redact: messageTextRedactor },
  // Chatroom channel name and description. `attributes.type`,
  // `attributes.privacyLevel`, `attributes.creatorID` and `attributes.adminIDs`
  // are deliberately kept: they are diagnostically valuable and not free text.
  { path: 'attributes.name', redact: messageTextRedactor },
  { path: 'attributes.description', redact: messageTextRedactor },
  { path: 'groups.*.inviteSecretId', redact: redactedRedactor },
  // The invited member's display name, copied from the passed proposal's
  // `memberName`. `proposals.*.data.proposalData` is redacted for the same
  // reason; this is the copy that survives in `state.invites`.
  { path: 'invites.*.invitee', redact: messageTextRedactor },
  { path: 'fileDeleteTokens', redact: redactedRedactor },
  // The group's copy of every channel's name and description.
  { path: 'chatRooms.*.name', redact: messageTextRedactor },
  { path: 'chatRooms.*.description', redact: messageTextRedactor },
  { path: 'profiles.*.incomeAmount', redact: redactedRedactor },
  { path: 'profiles.*.pledgeAmount', redact: redactedRedactor },
  { path: 'profiles.*.paymentMethods', redact: redactedRedactor },
  // Element form rather than the bare array path, so the element count survives.
  { path: 'profiles.*.nonMonetaryContributions.*', redact: messageTextRedactor },
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
  // Only the object form needs a rule: the string form is always a public URL
  // (the default avatar set by `gi.actions/group/create`, or an image URL the
  // user entered), never an uploaded file, and hashing the whole value would
  // destroy the `manifestCid` needed to debug avatar downloads.
  { path: 'settings.groupPicture.downloadParams', redact: redactedRedactor },
  { path: 'proposals.*.payload', redact: redactedRedactor },
  { path: 'proposals.*.data.proposalData', redact: redactedRedactor },
  { path: '_vm.authorizedKeys.*._private', redact: redactedRedactor },
  { path: '_vm.authorizedKeys.*.meta.private.content', redact: hashRedactor },
  { path: '_vm.authorizedKeys.*.meta.private.oldKeys', redact: hashRedactor },
  { path: '_vm.invites.*.inviteSecret', redact: redactedRedactor },
  { path: 'settings.groupName', redact: redactedRedactor },
  { path: 'settings.sharedValues', redact: redactedRedactor },
  // `settings.mincomeCurrency` and `settings.distributionDate` stay: they are
  // needed to interpret distribution bugs and are not sensitive.
  { path: 'settings.mincomeAmount', redact: redactedRedactor },
  ...messageRedactions
]
