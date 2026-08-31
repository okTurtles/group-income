/* @flow */

import { blake32Hash } from '@chelonia/lib/functions'

export const REDACTED = '[REDACTED]'

// Takes the LAST 6 characters of the base58btc multihash, not the first: the
// leading 7 characters are a constant multiformat prefix, so a prefix slice is
// the same string for every input. The suffix is uniformly distributed.
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
export const JOURNAL_REDACTIONS_VERSION = 3

type Redactor = (value: mixed) => string
type JournalRedaction = { path: string, redact: Redactor }

// `pinnedMessages` holds the same message objects as `messages` (the chatroom
// pinMessage action unshifts the object itself), so every rule must exist for
// both containers. Generating the pairs keeps the two lists from drifting
// apart. Add new message rules here, not to `JOURNAL_REDACTIONS`.
const MESSAGE_FIELD_REDACTIONS: Array<[string, Redactor]> = [
  ['text', messageTextRedactor],
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
  { path: 'attributes.email', redact: hashRedactor },
  { path: 'attributes.picture', redact: hashRedactor },
  { path: 'attributes.bio', redact: messageTextRedactor },
  // Chatroom channel name and description. `attributes.type`,
  // `attributes.privacyLevel`, `attributes.creatorID` and `attributes.adminIDs`
  // are deliberately kept: they are diagnostically valuable and not free text.
  { path: 'attributes.name', redact: messageTextRedactor },
  { path: 'attributes.description', redact: messageTextRedactor },
  { path: 'groups.*.inviteSecretId', redact: redactedRedactor },
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
  { path: 'paymentsByPeriod.*.haveNeedsSnapshot', redact: redactedRedactor },
  { path: 'paymentsByPeriod.*.lastAdjustedDistribution', redact: redactedRedactor },
  { path: 'thankYousFrom.*.*', redact: redactedRedactor },
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
