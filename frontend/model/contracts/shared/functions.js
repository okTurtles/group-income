'use strict'

import sbp from '@sbp/sbp'
import {
  MESSAGE_TYPES,
  POLL_STATUS,
  CHATROOM_MEMBER_MENTION_SPECIAL_CHAR,
  CHATROOM_CHANNEL_MENTION_SPECIAL_CHAR
} from './constants.js'

// !!!!!!!!!!!!!!!
// !! IMPORTANT !!
// !!!!!!!!!!!!!!!
//
// DO NOT CHANGE THE LOGIC TO ANY OF THESE FUNCTIONS!
// INSTEAD, CREATE NEW FUNCTIONS WITH DIFFERENT NAMES
// AND USE THOSE INSTEAD!
//
// THIS IS A CONSEQUENCE OF SHARING THIS CODE WITH THE REST OF THE APP.
// IF YOU DO NOT NEED TO SHARE CODE WITH THE REST OF THE APP (AND CAN
// KEEP IT WITHIN THE CONTRACT ONLY), THEN YOU DON'T NEED TO WORRY ABOUT
// THIS, AND SHOULD INCLUDE THOSE FUNCTIONS (WITHOUT EXPORTING THEM),
// DIRECTLY IN YOUR CONTRACT DEFINITION FILE. THEN YOU CAN MODIFY
// THEM AS MUCH AS YOU LIKE (and generate new contract versions out of them).

// group.js related

export function paymentHashesFromPaymentPeriod (periodPayments: Object): string[] {
  let hashes = []
  if (periodPayments) {
    const { paymentsFrom } = periodPayments
    for (const fromMemberID in paymentsFrom) {
      for (const toMemberID in paymentsFrom[fromMemberID]) {
        hashes = hashes.concat(paymentsFrom[fromMemberID][toMemberID])
      }
    }
  }

  return hashes
}

export function createPaymentInfo (paymentHash: string, payment: Object): {
  fromMemberID: string, toMemberID: string, hash: string, amount: number, isLate: boolean, when: string
} {
  return {
    fromMemberID: payment.data.fromMemberID,
    toMemberID: payment.data.toMemberID,
    hash: paymentHash,
    amount: payment.data.amount,
    isLate: !!payment.data.isLate,
    when: payment.data.completedDate
  }
}

// chatroom.js related

export function createMessage ({ meta, data, hash, height, state, pending, innerSigningContractID }: {
  meta: Object,
  data: Object,
  hash: string,
  height: number,
  state?: Object,
  pending?: boolean,
  innerSigningContractID?: String
}): Object {
  const { type, text, replyingMessage, attachments } = data
  const { createdDate } = meta

  const newMessage: any = {
    type,
    hash,
    height,
    from: innerSigningContractID,
    datetime: new Date(createdDate).toISOString()
  }

  if (pending) {
    newMessage.pending = true
  }

  if (type === MESSAGE_TYPES.TEXT) {
    newMessage.text = text
    if (replyingMessage) {
      newMessage.replyingMessage = replyingMessage
    }
    if (attachments) {
      newMessage.attachments = attachments
    }
  } else if (type === MESSAGE_TYPES.POLL) {
    newMessage.pollData = {
      ...data.pollData,
      creatorID: innerSigningContractID,
      status: POLL_STATUS.ACTIVE,
      // 'voted' field below will contain the user names of the users who has voted for this option
      options: data.pollData.options.map(opt => ({ ...opt, voted: [] }))
    }
  } else if (type === MESSAGE_TYPES.NOTIFICATION) {
    const params = {
      channelName: state?.attributes.name,
      channelDescription: state?.attributes.description,
      ...data.notification
    }
    delete params.type
    newMessage.notification = { type: data.notification.type, params }
  } else if (type === MESSAGE_TYPES.INTERACTIVE) {
    newMessage.proposal = data.proposal
  }
  return newMessage
}

export function leaveChatRoom (contractID: string) {
  if (sbp('chelonia/contract/isSyncing', contractID, { firstSync: true })) {
    return
  }
  const rootState = sbp('state/vuex/state')
  const rootGetters = sbp('state/vuex/getters')
  if (contractID === rootGetters.currentChatRoomId) {
    sbp('state/vuex/commit', 'setCurrentChatRoomId', { groupID: rootState.currentGroupId })
  }

  sbp('gi.actions/identity/deleteChatRoomLog', { contractID })
  sbp('state/vuex/commit', 'deleteChatRoomScrollPosition', { chatRoomID: contractID })
  // NOTE: The contract that keeps track of chatrooms should now call `/release`
  // This would be the group contract (for group chatrooms) or the identity
  // contract (for DMs).
}

export function findMessageIdx (hash: string, messages: Array<Object>): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].hash === hash) {
      return i
    }
  }
  return -1
}

// This function serves two purposes, depending on the forceUsername parameter
// If forceUsername is true, mentions will be like @username, @all, for display
// purposes.
// If forceUsername is false (default), mentions like @username will be converted
// to @<userID>, for internal representation purposes.
// forceUsername is used for display purposes in the UI, so that we can show
// a mention like @username instead of @userID in SendArea
export function makeMentionFromUsername (username: string, forceUsername: ?boolean): {
  me: string, all: string
} {
  const rootGetters = sbp('state/vuex/getters')
  // Even if forceUsername is true, we want to look up the contract ID to ensure
  // that it exists, so that we know it'll later succeed.
  const userID = rootGetters.ourContactProfilesByUsername[username]?.contractID
  return makeMentionFromUserID(forceUsername && userID ? username : userID)
}

export function makeMentionFromUserID (userID: string): {
  me: string, all: string
} {
  return {
    me: userID ? `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${userID}` : '',
    all: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}all`
  }
}

export function makeChannelMention (string: string): string {
  return `${CHATROOM_CHANNEL_MENTION_SPECIAL_CHAR}${string}`
}

export function swapMentionIDForDisplayname (text: string): string {
  const {
    chatRoomsInDetail,
    ourContactProfilesById,
    getChatroomNameById,
    usernameFromID
  } = sbp('state/vuex/getters')
  const possibleMentions = [
    ...Object.keys(ourContactProfilesById).map(u => makeMentionFromUserID(u).me).filter(v => !!v),
    ...Object.values(chatRoomsInDetail).map((details: any) => makeChannelMention(details.id))
  ]

  return text
    .split(new RegExp(`(?<=\\s|^)(${possibleMentions.join('|')})(?=[^\\w\\d]|$)`))
    .map(t => {
      return possibleMentions.includes(t)
        ? t[0] === CHATROOM_MEMBER_MENTION_SPECIAL_CHAR
          ? t[0] + usernameFromID(t.slice(1))
          : t[0] + getChatroomNameById(t.slice(1))
        : t
    })
    .join('')
}
