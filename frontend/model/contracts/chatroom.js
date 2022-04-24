'use strict'

import sbp from '@sbp/sbp'
import Vue from 'vue'
// HACK: work around esbuild code splitting / chunking bug: https://github.com/evanw/esbuild/issues/399
import '~/shared/domains/chelonia/chelonia.js'
import {
  objectMaybeOf, objectOf, mapOf, arrayOf,
  string, literalOf, unionOf, number, optional
} from '~/frontend/utils/flowTyper.js'
import { merge } from '~/frontend/utils/giLodash.js'
import L from '~/frontend/views/utils/translations.js'
import {
  CHATROOM_NAME_LIMITS_IN_CHARS,
  CHATROOM_DESCRIPTION_LIMITS_IN_CHARS,
  CHATROOM_MESSAGES_PER_PAGE,
  MESSAGE_ACTION_TYPES,
  CHATROOM_TYPES,
  CHATROOM_PRIVACY_LEVEL,
  MESSAGE_TYPES,
  MESSAGE_NOTIFICATIONS
} from './constants.js'
import { CHATROOM_MESSAGE_ACTION } from '~/frontend/utils/events.js'
import { logExceptNavigationDuplicated } from '~/frontend/views/utils/misc.js'

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
    index: number, // index of the list of messages
    username: string, // display username
    text: string // display text(if too long, truncate)
  }),
  emoticons: mapOf(string, arrayOf(string)), // mapping of emoticons and usernames
  onlyVisibleTo: arrayOf(string) // list of usernames, only necessary when type is NOTIFICATION
  // TODO: need to consider POLL and add more down here
})

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
    // TODO: Interactive message creation for proposals
  }
  return newMessage
}

export function getLatestMessages ({
  count, messages
}: { count: number, messages: Array<Object> }): Array<Object> {
  return messages.slice(Math.max(messages.length - count, 0))
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
  sbp('chelonia/contract/remove', contractID)
}

function createNotificationData (
  notificationType: string,
  moreParams: Object = {}
): Object {
  return {
    type: MESSAGE_TYPES.NOTIFICATION,
    notification: {
      type: notificationType,
      ...moreParams
    }
  }
}

function emitMessageEvent ({ type, contractID, hash, state }: {
  type: string, contractID: string, hash: string, state: Object
}): void {
  for (let i = state.messages.length - 1; i >= 0; i--) {
    if (state.messages[i].id === hash) {
      sbp('okTurtles.events/emit', `${CHATROOM_MESSAGE_ACTION}-${contractID}`, {
        type,
        data: { message: state.messages[i] }
      })
      break
    }
  }
}

sbp('chelonia/defineContract', {
  name: 'gi.contracts/chatroom',
  metadata: {
    validate: objectOf({
      createdDate: string, // action created date
      username: string, // action creator
      identityContractID: string // action creator identityContractID
    }),
    create () {
      const { username, identityContractID } = sbp('state/vuex/state').loggedIn
      return {
        createdDate: new Date().toISOString(),
        username,
        identityContractID
      }
    }
  },
  getters: {
    currentChatRoomState (state) {
      return state
    },
    chatRoomSettings (state, getters) {
      return getters.currentChatRoomState.settings || {}
    },
    chatRoomAttributes (state, getters) {
      return getters.currentChatRoomState.attributes || {}
    },
    chatRoomUsers (state, getters) {
      return getters.currentChatRoomState.users || {}
    },
    chatRoomLatestMessages (state, getters) {
      const messages = getters.currentChatRoomState.messages || []
      return getLatestMessages({
        count: getters.chatRoomSettings.messagesPerPage,
        messages
      })
    }
  },
  actions: {
    // This is the constructor of Chat contract
    'gi.contracts/chatroom': {
      validate: objectOf({
        attributes: chatRoomAttributesType
      }),
      process ({ meta, data }, { state }) {
        const initialState = merge({
          settings: {
            messagesPerPage: CHATROOM_MESSAGES_PER_PAGE,
            maxNameLength: CHATROOM_NAME_LIMITS_IN_CHARS,
            maxDescriptionLength: CHATROOM_DESCRIPTION_LIMITS_IN_CHARS
          },
          attributes: {
            creator: meta.username,
            deletedDate: null,
            archievedDate: null
          },
          users: {},
          messages: []
        }, data)
        for (const key in initialState) {
          Vue.set(state, key, initialState[key])
        }
      }
    },
    'gi.contracts/chatroom/join': {
      validate: objectOf({
        username: string // username of joining member
      }),
      process ({ data, meta, hash }, { state, getters }) {
        const { username } = data
        if (state.users[username]) {
          throw new Error('Can not join the chatroom which you are already part of')
        }

        const notificationType = username === meta.username ? MESSAGE_NOTIFICATIONS.JOIN_MEMBER : MESSAGE_NOTIFICATIONS.ADD_MEMBER
        const notificationData = createNotificationData(
          notificationType,
          notificationType === MESSAGE_NOTIFICATIONS.ADD_MEMBER ? { username } : {}
        )
        const newMessage = createMessage({ meta, hash, data: notificationData, state })
        state.messages.push(newMessage)

        Vue.set(state.users, username, { joinedDate: meta.createdDate })
      },
      sideEffect ({ contractID, hash }, { state }) {
        emitMessageEvent({ type: MESSAGE_ACTION_TYPES.ADD_MESSAGE, contractID, hash, state })
      }
    },
    'gi.contracts/chatroom/rename': {
      validate: objectOf({
        name: string
      }),
      process ({ data, meta, hash }, { state }) {
        Vue.set(state.attributes, 'name', data.name)
        const notificationData = createNotificationData(MESSAGE_NOTIFICATIONS.UPDATE_NAME, {})
        const newMessage = createMessage({ meta, hash, data: notificationData, state })
        state.messages.push(newMessage)
      },
      sideEffect ({ contractID, hash }, { state }) {
        emitMessageEvent({ type: MESSAGE_ACTION_TYPES.ADD_MESSAGE, contractID, hash, state })
      }
    },
    'gi.contracts/chatroom/changeDescription': {
      validate: objectOf({
        description: string
      }),
      process ({ data, meta, hash }, { state }) {
        Vue.set(state.attributes, 'description', data.description)
        const notificationData = createNotificationData(
          MESSAGE_NOTIFICATIONS.UPDATE_DESCRIPTION, {}
        )
        const newMessage = createMessage({ meta, hash, data: notificationData, state })
        state.messages.push(newMessage)
      },
      sideEffect ({ contractID, hash }, { state }) {
        emitMessageEvent({ type: MESSAGE_ACTION_TYPES.ADD_MESSAGE, contractID, hash, state })
      }
    },
    'gi.contracts/chatroom/leave': {
      validate: objectOf({
        username: optional(string), // coming from the gi.contracts/group/leaveChatRoom
        member: string // username to be removed
      }),
      process ({ data, meta, hash }, { state }) {
        const { member } = data
        const isKicked = data.username && member !== data.username
        if (!state.users[member]) {
          throw new Error(`Can not leave the chatroom which ${member} are not part of`)
        }
        Vue.delete(state.users, member)

        const notificationType = !isKicked ? MESSAGE_NOTIFICATIONS.LEAVE_MEMBER : MESSAGE_NOTIFICATIONS.KICK_MEMBER
        const notificationData = createNotificationData(notificationType, isKicked ? { username: member } : {})
        const newMessage = createMessage({
          meta: isKicked ? meta : { ...meta, username: member },
          hash,
          data: notificationData,
          state
        })
        state.messages.push(newMessage)
      },
      sideEffect ({ data, hash, contractID }, { state }) {
        const rootState = sbp('state/vuex/state')
        if (data.member === rootState.loggedIn.username) {
          if (sbp('okTurtles.data/get', 'JOINING_CHATROOM')) {
            return
          }
          leaveChatRoom({ contractID })
        }
        emitMessageEvent({ type: MESSAGE_ACTION_TYPES.ADD_MESSAGE, contractID, hash, state })
      }
    },
    'gi.contracts/chatroom/delete': {
      validate: (data, { state, getters, meta }) => {
        if (state.attributes.creator !== meta.username) {
          throw new TypeError(L('Only the channel creator can delete channel.'))
        }
      },
      process ({ data, meta }, { state, rootState }) {
        Vue.set(state.attributes, 'deletedDate', meta.createdDate)
        for (const username in state.users) {
          Vue.delete(state.users, username)
        }
      },
      sideEffect ({ meta, contractID }, { state }) {
        if (state.attributes.creator === meta.username) { // Not sure this condition is necessary
          if (sbp('okTurtles.data/get', 'JOINING_CHATROOM')) {
            return
          }
          leaveChatRoom({ contractID })
        }
      }
    },
    'gi.contracts/chatroom/addMessage': {
      validate: messageType,
      process ({ data, meta, hash }, { state }) {
        const newMessage = createMessage({ meta, data, hash, state })
        state.messages.push(newMessage)
      },
      sideEffect ({ contractID, hash }, { state }) {
        emitMessageEvent({ type: MESSAGE_ACTION_TYPES.ADD_MESSAGE, contractID, hash, state })
      }
    },
    'gi.contracts/chatroom/deleteMessage': {
      validate: objectMaybeOf({

      }),
      process ({ data, meta }, { state }) {

      }
    },
    'gi.contracts/chatroom/editMessage': {
      validate: objectMaybeOf({

      }),
      process ({ data, meta }, { state }) {

      }
    },
    'gi.contracts/chatroom/addEmoticon': {
      validate: objectMaybeOf({

      }),
      process ({ data, meta }, { state }) {

      }
    },
    'gi.contracts/chatroom/deleteEmoticon': {
      validate: objectMaybeOf({

      }),
      process ({ data, meta }, { state }) {

      }
    }
  }
})
