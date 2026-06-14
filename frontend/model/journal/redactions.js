/* @flow */

import { shortHashRedactor } from '@chelonia/lib'

export const REDACTED = '[REDACTED]'

export const hashRedactor = (value: mixed): string => shortHashRedactor(value).slice(0, 6)
export const messageTextRedactor = (): string => 'xxxxxxxx'
export const redactedRedactor = (): string => REDACTED

export const JOURNAL_REDACTIONS = [
  { path: 'attributes.email', redact: hashRedactor },
  { path: 'attributes.picture', redact: hashRedactor },
  { path: 'profiles.*.incomeAmount', redact: redactedRedactor },
  { path: 'profiles.*.pledgeAmount', redact: redactedRedactor },
  { path: 'profiles.*.paymentMethods', redact: redactedRedactor },
  { path: 'payments.*.data.details', redact: redactedRedactor },
  { path: 'payments.*.data.memo', redact: redactedRedactor },
  { path: 'thankYousFrom.*.*', redact: redactedRedactor },
  { path: 'messages.*.text', redact: messageTextRedactor },
  { path: 'pinnedMessages.*.text', redact: messageTextRedactor },
  { path: 'messages.*.replyingMessage.text', redact: messageTextRedactor },
  { path: 'pinnedMessages.*.replyingMessage.text', redact: messageTextRedactor },
  { path: 'messages.*.pollData.question', redact: messageTextRedactor },
  { path: 'pinnedMessages.*.pollData.question', redact: messageTextRedactor },
  { path: 'messages.*.pollData.options.*.value', redact: messageTextRedactor },
  { path: 'pinnedMessages.*.pollData.options.*.value', redact: messageTextRedactor },
  { path: 'messages.*.attachments.*.name', redact: messageTextRedactor },
  { path: 'pinnedMessages.*.attachments.*.name', redact: messageTextRedactor },
  { path: 'messages.*.attachments.*.downloadData.downloadParams', redact: redactedRedactor },
  { path: 'pinnedMessages.*.attachments.*.downloadData.downloadParams', redact: redactedRedactor },
  { path: 'settings.groupPicture.downloadParams', redact: redactedRedactor },
  { path: '_vm.authorizedKeys.*._private', redact: redactedRedactor },
  { path: '_vm.authorizedKeys.*.meta.private.content', redact: hashRedactor },
  { path: '_vm.invites.*.inviteSecret', redact: redactedRedactor }
]
