'use strict'

import sbp from '@sbp/sbp'
import Vue from 'vue'
// HACK: work around esbuild code splitting / chunking bug: https://github.com/evanw/esbuild/issues/399
import '~/shared/domains/chelonia/chelonia.js'
import {
  objectMaybeOf, objectOf, mapOf, arrayOf,
  string, literalOf, unionOf, optional
} from '~/frontend/utils/flowTyper.js'
import { merge, cloneDeep } from '~/frontend/utils/giLodash.js'
import { makeNotification } from '~/frontend/utils/notification.js'
import L from '~/frontend/views/utils/translations.js'
import {
  CHATROOM_NAME_LIMITS_IN_CHARS,
  CHATROOM_DESCRIPTION_LIMITS_IN_CHARS,
  CHATROOM_ACTIONS_PER_PAGE,
  CHATROOM_MESSAGES_PER_PAGE,
  CHATROOM_TYPES,
  CHATROOM_PRIVACY_LEVEL,
  MESSAGE_TYPES,
  MESSAGE_NOTIFICATIONS
} from './constants.js'
import { CHATROOM_MESSAGE_ACTION, MESSAGE_RECEIVE } from '~/frontend/utils/events.js'
import { logExceptNavigationDuplicated } from '~/frontend/views/utils/misc.js'

// HACK: work around esbuild code splitting / chunking bug: https://github.com/evanw/esbuild/issues/399
// console.debug('esbuild import hack', GIMessage && '')

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

function emitMessageEvent ({ contractID, hash }: {
  contractID: string,
  hash: string
}): void {
  sbp('okTurtles.events/emit', `${CHATROOM_MESSAGE_ACTION}-${contractID}`, { hash })
}

export function makeMentionFromUsername (username: string): {
  me: string, all: string
} {
  return {
    me: `@${username}`,
    all: '@here'
  }
}

function addMentioning ({ contractID, messageId, datetime, text, username, chatRoomName }: {
  contractID: string,
  messageId: string,
  datetime: string,
  text: string,
  username: string,
  chatRoomName: string
}): void {
  sbp('state/vuex/commit', 'addChatRoomUnreadMentioning', {
    chatRoomId: contractID,
    messageId,
    createdDate: new Date(datetime).getTime()
  })

  const rootGetters = sbp('state/vuex/getters')
  // Commented to make notification for mentions
  // const isExist = rootGetters.currentGroupNotifications.find(n =>
  //   n.type === 'MENTION_ADDED' && n.linkTo === `/group-chat/${contractID}`
  // )
  // if (!isExist) {
  //   const rootState = sbp('state/vuex/state')
  //   const groupID = Object.keys(rootState.contracts)
  //     .find(cID => rootState.contracts[cID].type === 'gi.contracts/group' &&
  //       Object.keys(rootState[cID].chatRooms).includes(contractID)
  //     )
  //   sbp('gi.notifications/emit', 'MENTION_ADDED', {
  //     groupID: groupID,
  //     chatRoomId: contractID,
  //     username: rootState.loggedIn.username
  //   })
  // }
  if (!sbp('okTurtles.data/get', 'READY_TO_JOIN_CHATROOM')) {
    makeNotification({
      title: `# ${chatRoomName}`,
      body: text,
      icon: rootGetters.globalProfile(username).picture
    })

    sbp('okTurtles.events/emit', `${MESSAGE_RECEIVE}`, {})
  }
}

function deleteMentioning ({ contractID, messageId }: {
  contractID: string, messageId: string
}): void {
  sbp('state/vuex/commit', 'deleteChatRoomUnreadMentioning', { chatRoomId: contractID, messageId })

  // Commented to delete notification for mentions
  // const rootState = sbp('state/vuex/state')
  // if (!rootState.chatRoomUnread[contractID] ||
  //   !rootState.chatRoomUnread[contractID].mentionings.length) {
  //   const rootGetters = sbp('state/vuex/getters')
  //   const notification = rootGetters.currentGroupNotifications.find(n =>
  //     n.type === 'MENTION_ADDED' && n.linkTo === `/group-chat/${contractID}`
  //   )
  //   if (notification) {
  //     sbp('gi.notifications/remove', notification)
  //   }
  // }
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
      return getters.currentChatRoomState.messages || []
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
            actionsPerPage: CHATROOM_ACTIONS_PER_PAGE,
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
      process ({ data, meta, hash }, { state }) {
        const { username } = data
        if (!state.saveMessage && state.users[username]) {
          // this can happen when we're logging in on another machine, and also in other circumstances
          console.warn('Can not join the chatroom which you are already part of')
          return
        }

        Vue.set(state.users, username, { joinedDate: meta.createdDate })

        if (!state.saveMessage) {
          return
        }

        const notificationType = username === meta.username ? MESSAGE_NOTIFICATIONS.JOIN_MEMBER : MESSAGE_NOTIFICATIONS.ADD_MEMBER
        const notificationData = createNotificationData(
          notificationType,
          notificationType === MESSAGE_NOTIFICATIONS.ADD_MEMBER ? { username } : {}
        )
        const newMessage = createMessage({ meta, hash, data: notificationData, state })
        state.messages.push(newMessage)
      },
      sideEffect ({ contractID, hash, meta }) {
        emitMessageEvent({ contractID, hash })

        if (sbp('okTurtles.data/get', 'READY_TO_JOIN_CHATROOM')) {
          sbp('state/vuex/commit', 'setChatRoomUnreadSince', {
            chatRoomId: contractID,
            messageId: hash,
            createdDate: new Date(meta.createdDate).getTime()
          })
        }
      }
    },
    'gi.contracts/chatroom/rename': {
      validate: objectOf({
        name: string
      }),
      process ({ data, meta, hash }, { state }) {
        Vue.set(state.attributes, 'name', data.name)

        if (!state.saveMessage) {
          return
        }

        const notificationData = createNotificationData(MESSAGE_NOTIFICATIONS.UPDATE_NAME, {})
        const newMessage = createMessage({ meta, hash, data: notificationData, state })
        state.messages.push(newMessage)
      },
      sideEffect ({ contractID, hash, meta }) {
        emitMessageEvent({ contractID, hash })

        if (sbp('okTurtles.data/get', 'READY_TO_JOIN_CHATROOM')) {
          sbp('state/vuex/commit', 'setChatRoomUnreadSince', {
            chatRoomId: contractID,
            messageId: hash,
            createdDate: new Date(meta.createdDate).getTime()
          })
        }
      }
    },
    'gi.contracts/chatroom/changeDescription': {
      validate: objectOf({
        description: string
      }),
      process ({ data, meta, hash }, { state }) {
        Vue.set(state.attributes, 'description', data.description)

        if (!state.saveMessage) {
          return
        }

        const notificationData = createNotificationData(
          MESSAGE_NOTIFICATIONS.UPDATE_DESCRIPTION, {}
        )
        const newMessage = createMessage({ meta, hash, data: notificationData, state })
        state.messages.push(newMessage)
      },
      sideEffect ({ contractID, hash, meta }) {
        emitMessageEvent({ contractID, hash })

        if (sbp('okTurtles.data/get', 'READY_TO_JOIN_CHATROOM')) {
          sbp('state/vuex/commit', 'setChatRoomUnreadSince', {
            chatRoomId: contractID,
            messageId: hash,
            createdDate: new Date(meta.createdDate).getTime()
          })
        }
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
        if (!state.saveMessage && !state.users[member]) {
          throw new Error(`Can not leave the chatroom which ${member} are not part of`)
        }
        Vue.delete(state.users, member)

        if (!state.saveMessage) {
          return
        }

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
      sideEffect ({ data, hash, contractID, meta }, { state }) {
        const rootState = sbp('state/vuex/state')
        if (data.member === rootState.loggedIn.username) {
          if (sbp('okTurtles.data/get', 'READY_TO_JOIN_CHATROOM')) {
            sbp('state/vuex/commit', 'setChatRoomUnreadSince', {
              chatRoomId: contractID,
              messageId: hash,
              createdDate: new Date(meta.createdDate).getTime()
            })
          }
          if (sbp('okTurtles.data/get', 'JOINING_CHATROOM_ID')) {
            return
          }
          leaveChatRoom({ contractID })
        }
        emitMessageEvent({ contractID, hash })
      }
    },
    'gi.contracts/chatroom/delete': {
      validate: (data, { state, meta }) => {
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
          if (sbp('okTurtles.data/get', 'JOINING_CHATROOM_ID')) {
            return
          }
          leaveChatRoom({ contractID })
        }
      }
    },
    'gi.contracts/chatroom/addMessage': {
      validate: messageType,
      process ({ data, meta, hash }, { state }) {
        if (!state.saveMessage) {
          return
        }
        const pendingMsg = state.messages.find(msg => msg.id === hash && msg.pending)
        if (pendingMsg) {
          delete pendingMsg.pending
        } else {
          state.messages.push(createMessage({ meta, data, hash, state }))
        }
      },
      sideEffect ({ contractID, hash, meta, data }, { state, getters }) {
        emitMessageEvent({ contractID, hash })

        const rootState = sbp('state/vuex/state')
        const me = rootState.loggedIn.username

        if (me === meta.username) {
          return
        }
        const newMessage = createMessage({ meta, data, hash, state })
        const mentions = makeMentionFromUsername(me)
        if (data.type === MESSAGE_TYPES.TEXT &&
          (newMessage.text.includes(mentions.me) || newMessage.text.includes(mentions.all))) {
          addMentioning({
            contractID,
            messageId: newMessage.id,
            datetime: newMessage.datetime,
            text: newMessage.text,
            username: meta.username,
            chatRoomName: getters.chatRoomAttributes.name
          })
        }

        if (sbp('okTurtles.data/get', 'READY_TO_JOIN_CHATROOM')) {
          sbp('state/vuex/commit', 'setChatRoomUnreadSince', {
            chatRoomId: contractID,
            messageId: hash,
            createdDate: new Date(meta.createdDate).getTime()
          })
        }
      }
    },
    'gi.contracts/chatroom/editMessage': {
      validate: (data, { state, meta }) => {
        objectOf({
          id: string,
          text: string
        })(data)
        // TODO: Actually NOT SURE it's needed to check if the meta.username === message.from
        // there is no messagess in vuex state
        // to check if the meta.username is creator seems like too heavy
      },
      process ({ data, meta }, { state }) {
        if (!state.saveMessage) {
          return
        }
        const msgIndex = findMessageIdx(data.id, state.messages)
        if (msgIndex >= 0 && meta.username === state.messages[msgIndex].from) {
          state.messages[msgIndex].text = data.text
          state.messages[msgIndex].updatedDate = meta.createdDate
          if (state.saveMessage && state.messages[msgIndex].pending) {
            delete state.messages[msgIndex].pending
          }
        }
      },
      sideEffect ({ contractID, hash, meta, data }, { getters }) {
        emitMessageEvent({ contractID, hash })

        const rootState = sbp('state/vuex/state')
        const me = rootState.loggedIn.username

        if (me === meta.username) {
          return
        }
        const isAlreadyAdded = rootState.chatRoomUnread[contractID].mentionings.find(m => m.messageId === data.id)
        const mentions = makeMentionFromUsername(me)
        const isIncludeMention = data.text.includes(mentions.me) || data.text.includes(mentions.all)
        if (!isAlreadyAdded && isIncludeMention) {
          // TODO: Not sure createdDate should be this way
          addMentioning({
            contractID,
            messageId: data.id,
            datetime: meta.createdDate,
            text: data.text,
            username: meta.username,
            chatRoomName: getters.chatRoomAttributes.name
          })
        } else if (isAlreadyAdded && !isIncludeMention) {
          deleteMentioning({ contractID, messageId: data.id })
        }
      }
    },
    'gi.contracts/chatroom/deleteMessage': {
      validate: objectOf({
        id: string
      }),
      process ({ data, meta }, { state }) {
        if (!state.saveMessage) {
          return
        }
        const msgIndex = findMessageIdx(data.id, state.messages)
        if (msgIndex >= 0) {
          state.messages.splice(msgIndex, 1)
        }
      },
      sideEffect ({ data, contractID, hash, meta }) {
        emitMessageEvent({ contractID, hash })

        const rootState = sbp('state/vuex/state')
        const me = rootState.loggedIn.username

        if (rootState.chatRoomScrollPosition[contractID] === data.id) {
          sbp('state/vuex/commit', 'setChatRoomScrollPosition', {
            chatRoomId: contractID, messageId: null
          })
        }
        if (me === meta.username) {
          return
        }
        if (rootState.chatRoomUnread[contractID].mentionings.find(m => m.messageId === data.id)) {
          deleteMentioning({ contractID, messageId: data.id })
        }

        emitMessageEvent({ contractID, hash })
      }
    },
    'gi.contracts/chatroom/makeEmotion': {
      validate: objectOf({
        id: string,
        emoticon: string
      }),
      process ({ data, meta, contractID }, { state }) {
        if (!state.saveMessage) {
          return
        }
        const { id, emoticon } = data
        const msgIndex = findMessageIdx(id, state.messages)
        if (msgIndex >= 0) {
          let emoticons = cloneDeep(state.messages[msgIndex].emoticons || {})
          if (emoticons[emoticon]) {
            const alreadyAdded = emoticons[emoticon].indexOf(meta.username)
            if (alreadyAdded >= 0) {
              emoticons[emoticon].splice(alreadyAdded, 1)
              if (!emoticons[emoticon].length) {
                delete emoticons[emoticon]
                if (!Object.keys(emoticons).length) {
                  emoticons = null
                }
              }
            } else {
              emoticons[emoticon].push(meta.username)
            }
          } else {
            emoticons[emoticon] = [meta.username]
          }
          if (emoticons) {
            Vue.set(state.messages[msgIndex], 'emoticons', emoticons)
          } else {
            Vue.delete(state.messages[msgIndex], 'emoticons')
          }
        }
      },
      sideEffect ({ contractID, hash }) {
        emitMessageEvent({ contractID, hash })
      }
    }
  }
})
