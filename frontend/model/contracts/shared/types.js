'use strict'

import {
  objectOf, objectMaybeOf, arrayOf, unionOf, boolean,
  object, string, stringMax, optional, number, mapOf, literalOf, numberRange
} from '~/frontend/model/contracts/misc/flowTyper.js'
import {
  CHATROOM_TYPES,
  CHATROOM_PRIVACY_LEVEL,
  MESSAGE_TYPES,
  MESSAGE_NOTIFICATIONS,
  POLL_TYPES,
  STATUS_OPEN,
  STATUS_PASSED,
  STATUS_FAILED,
  STATUS_EXPIRING,
  STATUS_EXPIRED,
  STATUS_CANCELLED,
  CHATROOM_NAME_LIMITS_IN_CHARS,
  CHATROOM_DESCRIPTION_LIMITS_IN_CHARS
} from './constants.js'

// group.js related

export const inviteType: any = objectOf({
  inviteKeyId: string,
  creatorID: string,
  invitee: optional(string)
})

// chatroom.js related

export const chatRoomAttributesType: any = objectOf({
  name: stringMax(CHATROOM_NAME_LIMITS_IN_CHARS),
  description: stringMax(CHATROOM_DESCRIPTION_LIMITS_IN_CHARS),
  // NOTE: creatorID is optional parameter which is not being used
  //       in group contract function gi.actions/group/addChatRoom
  creatorID: optional(string),
  adminIDs: optional(arrayOf(string)),
  type: unionOf(...Object.values(CHATROOM_TYPES).map(v => literalOf(v))),
  privacyLevel: unionOf(...Object.values(CHATROOM_PRIVACY_LEVEL).map(v => literalOf(v)))
})

export const messageType: any = objectMaybeOf({
  type: unionOf(...Object.values(MESSAGE_TYPES).map(v => literalOf(v))),
  text: string,
  proposal: objectOf({
    proposalId: string,
    proposalType: string,
    proposalData: object,
    expires_date_ms: number,
    createdDate: string,
    creatorID: string,
    status: unionOf(...[
      STATUS_OPEN,
      STATUS_PASSED,
      STATUS_FAILED,
      STATUS_EXPIRING,
      STATUS_EXPIRED,
      STATUS_CANCELLED
    ].map(v => literalOf(v)))
  }),
  notification: objectMaybeOf({
    type: unionOf(...Object.values(MESSAGE_NOTIFICATIONS).map(v => literalOf(v))),
    params: mapOf(string, string) // { username }
  }),
  attachments: optional(
    arrayOf(objectOf({
      name: string,
      mimeType: string,
      size: numberRange(1, Number.MAX_SAFE_INTEGER),
      dimension: optional(objectOf({
        width: number,
        height: number
      })),
      downloadData: objectOf({
        manifestCid: string,
        downloadParams: optional(object)
      })
    }))
  ),
  replyingMessage: objectOf({
    hash: string, // scroll to the original message and highlight
    text: string // display text(if too long, truncate)
  }),
  pollData: objectOf({
    question: string,
    options: arrayOf(objectOf({ id: string, value: string })),
    expires_date_ms: number,
    hideVoters: boolean,
    pollType: unionOf(...Object.values(POLL_TYPES).map(v => literalOf(v)))
  }),
  onlyVisibleTo: arrayOf(string) // list of usernames, only necessary when type is NOTIFICATION
})
