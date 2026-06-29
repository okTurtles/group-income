/* @flow */

import { shortHashRedactor } from '@chelonia/lib'

export const REDACTED = '[REDACTED]'

export const hashRedactor = (value: mixed): string => shortHashRedactor(value).slice(0, 6)
export const messageTextRedactor = (_value: mixed): string => 'xxxxxxxx'
export const redactedRedactor = (_value: mixed): string => REDACTED
export const JOURNAL_REDACTIONS_VERSION = 2

export const JOURNAL_REDACTIONS = [
  { path: 'attributes.email', redact: hashRedactor },
  { path: 'attributes.picture', redact: hashRedactor },
  { path: 'attributes.bio', redact: messageTextRedactor },
  { path: 'groups.*.inviteSecretId', redact: redactedRedactor },
  { path: 'fileDeleteTokens', redact: redactedRedactor },
  { path: 'profiles.*.incomeAmount', redact: redactedRedactor },
  { path: 'profiles.*.pledgeAmount', redact: redactedRedactor },
  { path: 'profiles.*.paymentMethods', redact: redactedRedactor },
  { path: 'payments.*.data.details', redact: redactedRedactor },
  { path: 'payments.*.data.memo', redact: redactedRedactor },
  { path: 'payments.*.data.amount', redact: redactedRedactor },
  { path: 'payments.*.data.txid', redact: redactedRedactor },
  { path: 'paymentsByPeriod.*.haveNeedsSnapshot', redact: redactedRedactor },
  { path: 'paymentsByPeriod.*.lastAdjustedDistribution', redact: redactedRedactor },
  { path: 'thankYousFrom.*.*', redact: redactedRedactor },
  { path: 'messages.*.text', redact: messageTextRedactor },
  { path: 'pinnedMessages.*.text', redact: messageTextRedactor },
  { path: 'messages.*.replyingMessage.text', redact: messageTextRedactor },
  { path: 'pinnedMessages.*.replyingMessage.text', redact: messageTextRedactor },
  { path: 'messages.*.pollData.question', redact: messageTextRedactor },
  { path: 'pinnedMessages.*.pollData.question', redact: messageTextRedactor },
  { path: 'messages.*.pollData.options.*.value', redact: messageTextRedactor },
  { path: 'pinnedMessages.*.pollData.options.*.value', redact: messageTextRedactor },
  { path: 'messages.*.pollData.options.*.voted', redact: redactedRedactor },
  { path: 'pinnedMessages.*.pollData.options.*.voted', redact: redactedRedactor },
  { path: 'messages.*.attachments.*.name', redact: messageTextRedactor },
  { path: 'pinnedMessages.*.attachments.*.name', redact: messageTextRedactor },
  { path: 'messages.*.attachments.*.downloadData.downloadParams', redact: redactedRedactor },
  { path: 'pinnedMessages.*.attachments.*.downloadData.downloadParams', redact: redactedRedactor },
  { path: 'messages.*.proposal.proposalData', redact: redactedRedactor },
  { path: 'pinnedMessages.*.proposal.proposalData', redact: redactedRedactor },
  { path: 'messages.*.notification.params.channelDescription', redact: messageTextRedactor },
  { path: 'pinnedMessages.*.notification.params.channelDescription', redact: messageTextRedactor },
  { path: 'settings.groupPicture.downloadParams', redact: redactedRedactor },
  { path: 'proposals.*.payload', redact: redactedRedactor },
  { path: 'proposals.*.data.proposalData', redact: redactedRedactor },
  { path: '_vm.authorizedKeys.*._private', redact: redactedRedactor },
  { path: '_vm.authorizedKeys.*.meta.private.content', redact: hashRedactor },
  { path: '_vm.authorizedKeys.*.meta.private.oldKeys', redact: hashRedactor },
  { path: '_vm.invites.*.inviteSecret', redact: redactedRedactor },
  { path: 'settings.groupName', redact: redactedRedactor },
  { path: 'settings.sharedValues', redact: redactedRedactor }
]
