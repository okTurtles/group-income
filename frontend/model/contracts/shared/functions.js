'use strict'

import sbp from '@sbp/sbp'
import { MESSAGE_TYPES, POLL_STATUS } from './constants.js'
import { logExceptNavigationDuplicated } from '~/frontend/views/utils/misc.js'

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
  meta: Object, data: Object, hash: string, height: number, state?: Object, pending?: boolean, innerSigningContractID?: String
}): Object {
  const { type, text, replyingMessage } = data
  const { createdDate } = meta

  let newMessage = {
    type,
    hash,
    height,
    from: innerSigningContractID,
    datetime: new Date(createdDate).toISOString(),
    pending
  }

  if (type === MESSAGE_TYPES.TEXT) {
    newMessage = !replyingMessage ? { ...newMessage, text } : { ...newMessage, text, replyingMessage }
  } else if (type === MESSAGE_TYPES.POLL) {
    const pollData = data.pollData

    newMessage = {
      ...newMessage,
      pollData: {
        ...pollData,
        creatorID: innerSigningContractID,
        status: POLL_STATUS.ACTIVE,
        // 'voted' field below will contain the user names of the users who has voted for this option
        options: pollData.options.map(opt => ({ ...opt, voted: [] }))
      }
    }
  } else if (type === MESSAGE_TYPES.NOTIFICATION) {
    const params = {
      channelName: state?.attributes.name,
      channelDescription: state?.attributes.description,
      ...data.notification
    }
    delete params.type
    newMessage = {
      ...newMessage,
      notification: { type: data.notification.type, params }
    }
  } else if (type === MESSAGE_TYPES.INTERACTIVE) {
    newMessage = {
      ...newMessage,
      proposal: data.proposal
    }
  }
  return newMessage
}

export async function leaveChatRoom ({ contractID }: {
  contractID: string
}) {
  const rootState = sbp('state/vuex/state')
  const rootGetters = sbp('state/vuex/getters')
  if (contractID === rootGetters.currentChatRoomId) {
    sbp('state/vuex/commit', 'setCurrentChatRoomId', {
      groupId: rootState.currentGroupId
    })
    const curRouteName = sbp('controller/router').history.current.name
    if (curRouteName === 'GroupChat' || curRouteName === 'GroupChatConversation') {
      await sbp('controller/router')
        .push({ name: 'GroupChatConversation', params: { chatRoomId: rootGetters.currentChatRoomId } })
        .catch(logExceptNavigationDuplicated)
    }
  }

  sbp('state/vuex/commit', 'deleteChatRoomUnread', { chatRoomId: contractID })
  sbp('state/vuex/commit', 'deleteChatRoomScrollPosition', { chatRoomId: contractID })
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
    me: userID ? `@${userID}` : '',
    all: '@all'
  }
}
