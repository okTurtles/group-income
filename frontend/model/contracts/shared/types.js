'use strict'

import {
  objectOf, objectMaybeOf, arrayOf, unionOf,
  string, number, optional, mapOf, literalOf
} from '~/frontend/model/contracts/misc/flowTyper.js'
import {
  CHATROOM_TYPES, CHATROOM_PRIVACY_LEVEL,
  MESSAGE_TYPES, MESSAGE_NOTIFICATIONS,
  MAIL_TYPE_MESSAGE, MAIL_TYPE_FRIEND_REQ
} from './constants.js'

// group.js related

export const inviteType: any = objectOf({
  inviteSecret: string,
  quantity: number,
  creator: string,
  invitee: optional(string),
  status: string,
  responses: mapOf(string, string),
  expires: number
})

// chatroom.js related

export const chatRoomAttributesType: any = objectOf({
  name: string,
  description: string,
  type: unionOf(...Object.values(CHATROOM_TYPES).map(v => literalOf(v))),
  privacyLevel: unionOf(...Object.values(CHATROOM_PRIVACY_LEVEL).map(v => literalOf(v)))
})

export const messageType: any = objectMaybeOf({
  type: unionOf(...Object.values(MESSAGE_TYPES).map(v => literalOf(v))),
  text: string, // message text | proposalId when type is INTERACTIVE | notificationType when type if NOTIFICATION
  notification: objectMaybeOf({
    type: unionOf(...Object.values(MESSAGE_NOTIFICATIONS).map(v => literalOf(v))),
    params: mapOf(string, string) // { username }
  }),
  replyingMessage: objectOf({
    id: string, // scroll to the original message and highlight
    text: string // display text(if too long, truncate)
  }),
  emoticons: mapOf(string, arrayOf(string)), // mapping of emoticons and usernames
  onlyVisibleTo: arrayOf(string) // list of usernames, only necessary when type is NOTIFICATION
  // TODO: need to consider POLL and add more down here
})

// mailbox.js related

export const mailType: any = unionOf(...[MAIL_TYPE_MESSAGE, MAIL_TYPE_FRIEND_REQ].map(k => literalOf(k)))
