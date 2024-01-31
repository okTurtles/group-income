'use strict'

import {
  objectOf, objectMaybeOf, arrayOf, unionOf,
  string, optional, number, mapOf, literalOf
} from '~/frontend/model/contracts/misc/flowTyper.js'
import {
  CHATROOM_TYPES, CHATROOM_PRIVACY_LEVEL,
  MESSAGE_TYPES, MESSAGE_NOTIFICATIONS, PROPOSAL_VARIANTS
} from './constants.js'

// group.js related

export const inviteType: any = objectOf({
  inviteKeyId: string,
  creator: string,
  invitee: optional(string)
})

// chatroom.js related

export const chatRoomAttributesType: any = objectOf({
  name: string,
  description: string,
  type: unionOf(...Object.values(CHATROOM_TYPES).map(v => literalOf(v))),
  privacyLevel: unionOf(...Object.values(CHATROOM_PRIVACY_LEVEL).map(v => literalOf(v))),
  groupContractID: optional(string)
})

export const messageType: any = objectMaybeOf({
  type: unionOf(...Object.values(MESSAGE_TYPES).map(v => literalOf(v))),
  text: string, // message text | notificationType when type if NOTIFICATION
  proposal: objectMaybeOf({
    proposalId: string,
    proposalType: string,
    expires_date_ms: number,
    createdDate: string,
    creator: string,
    variant: unionOf(...Object.values(PROPOSAL_VARIANTS).map(v => literalOf(v)))
  }),
  notification: objectMaybeOf({
    type: unionOf(...Object.values(MESSAGE_NOTIFICATIONS).map(v => literalOf(v))),
    params: mapOf(string, string) // { username }
  }),
  replyingMessage: objectOf({
    hash: string, // scroll to the original message and highlight
    text: string // display text(if too long, truncate)
  }),
  emoticons: mapOf(string, arrayOf(string)), // mapping of emoticons and usernames
  onlyVisibleTo: arrayOf(string) // list of usernames, only necessary when type is NOTIFICATION
  // TODO: need to consider POLL and add more down here
})
