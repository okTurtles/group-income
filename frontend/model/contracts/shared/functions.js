'use strict'

import sbp from '@sbp/sbp'
import { INVITE_STATUS, MESSAGE_TYPES } from './constants.js'
import { DAYS_MILLIS } from './time.js'
import { PAYMENT_COMPLETED } from './payments/index.js'
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

export async function getPaymentsByPeriod (period: string) {
  const rootGetters = sbp('state/vuex/getters')
  const rootState = sbp('state/vuex/state')
  const payments = rootGetters.paymentsForPeriod(period)
  if (payments.length) {
    return payments
  }

  // the rule to make key is there inside `archivePayments` function of group.js contract
  const periodKey = `paymentPeriods/${rootGetters.ourUsername}/${rootState.currentGroupId}`
  const periods = await sbp('gi.db/archive/load', periodKey) || []
  if (periods.includes(period)) {
    const paymentsKey = `paymentsByPeriod/${rootGetters.ourUsername}/${rootState.currentGroupId}/${period}`
    const paymentsByHash = await sbp('gi.db/archive/load', paymentsKey) || {}
    for (const hash of Object.keys(paymentsByHash)) {
      const payment = paymentsByHash[hash]
      if (payment.data.status === PAYMENT_COMPLETED) {
        payments.push({
          from: payment.meta.username,
          to: payment.data.toUser,
          hash,
          amount: payment.data.amount,
          isLate: !!payment.data.isLate,
          when: payment.data.completedDate
        })
      }
    }
  }
  return payments
}

export function getHistoricalPeriods (numPeriods: number, skip?: number) {
  const rootGetters = sbp('state/vuex/getters')
  let lastPeriod = rootGetters.currentPaymentPeriod

  if (skip) {
    for (let i = 0; i < skip; i++) {
      lastPeriod = rootGetters.periodBeforePeriod(lastPeriod)
    }
  }

  const periods = [lastPeriod]
  for (let i = 0; i < numPeriods - 1; i++) {
    periods.unshift(rootGetters.periodBeforePeriod(periods[0]))
  }
  return periods
}

export async function getHistoricalPayments (numPeriods: number, skip?: number) {
  const periods = getHistoricalPeriods(numPeriods, skip)

  const payments = await Promise.all(periods.map(period => getPaymentsByPeriod(period)))

  return { periods, payments }
}

export function createInvite ({ quantity = 1, creator, expires, invitee }: {
  quantity: number, creator: string, expires: number, invitee?: string
}): {|
  creator: string,
  expires: number,
  inviteSecret: string,
  invitee: void | string,
  quantity: number,
  responses: {...},
  status: string,
|} {
  return {
    inviteSecret: `${parseInt(Math.random() * 10000)}`, // TODO: this
    quantity,
    creator,
    invitee,
    status: INVITE_STATUS.VALID,
    responses: {}, // { bob: true } list of usernames that accepted the invite.
    expires: Date.now() + DAYS_MILLIS * expires
  }
}

// chatroom.js related

export function createMessage ({ meta, data, hash, state }: {
  meta: Object, data: Object, hash: string, state?: Object
}): Object {
  const { type, text, replyingMessage } = data
  const { createdDate } = meta

  let newMessage = {
    type,
    datetime: new Date(createdDate).toISOString(),
    id: hash,
    from: meta.username
  }

  if (type === MESSAGE_TYPES.TEXT) {
    newMessage = !replyingMessage ? { ...newMessage, text } : { ...newMessage, text, replyingMessage }
  } else if (type === MESSAGE_TYPES.POLL) {
    // TODO: Poll message creation
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

  // NOTE: make sure *not* to await on this, since that can cause
  //       a potential deadlock. See same warning in sideEffect for
  //       'gi.contracts/group/removeMember'
  sbp('chelonia/contract/remove', contractID).catch(e => {
    console.error(`leaveChatRoom(${contractID}): remove threw ${e.name}:`, e)
  })
}

export function findMessageIdx (id: string, messages: Array<Object>): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].id === id) {
      return i
    }
  }
  return -1
}

export function makeMentionFromUsername (username: string): {
  me: string, all: string
} {
  return {
    me: `@${username}`,
    all: '@all'
  }
}
