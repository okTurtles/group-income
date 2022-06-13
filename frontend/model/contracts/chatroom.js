'use strict'

import sbp from '@sbp/sbp'
import {
  Vue,
  L
} from '@common/common.js'
import { merge, cloneDeep } from './shared/giLodash.js'
import {
  CHATROOM_NAME_LIMITS_IN_CHARS,
  CHATROOM_DESCRIPTION_LIMITS_IN_CHARS,
  CHATROOM_ACTIONS_PER_PAGE,
  CHATROOM_MESSAGES_PER_PAGE,
  MESSAGE_TYPES,
  MESSAGE_NOTIFICATIONS,
  CHATROOM_MESSAGE_ACTION
} from './shared/constants.js'
import { chatRoomAttributesType, messageType } from './shared/types.js'
import { createMessage, leaveChatRoom, findMessageIdx } from './shared/functions.js'
import { objectOf, string, optional } from '~/frontend/model/contracts/misc/flowTyper.js'

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
      process ({ data, meta, hash }, { state, getters }) {
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
      sideEffect ({ contractID, hash }) {
        emitMessageEvent({ contractID, hash })
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
      sideEffect ({ contractID, hash }) {
        emitMessageEvent({ contractID, hash })
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
      sideEffect ({ contractID, hash }) {
        emitMessageEvent({ contractID, hash })
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
      sideEffect ({ data, hash, contractID }, { state }) {
        const rootState = sbp('state/vuex/state')
        if (!state.saveMessage && data.member === rootState.loggedIn.username) {
          if (sbp('okTurtles.data/get', 'JOINING_CHATROOM')) {
            return
          }
          leaveChatRoom({ contractID })
        }
        emitMessageEvent({ contractID, hash })
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
        if (!state.saveMessage && state.attributes.creator === meta.username) { // Not sure this condition is necessary
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
        if (!state.saveMessage) {
          return
        }
        const pendingMsg = state.messages.find(msg => msg.id === hash && msg.pending)
        if (pendingMsg) {
          delete pendingMsg.pending
        } else {
          state.messages.push(newMessage)
        }
      },
      sideEffect ({ contractID, hash }) {
        emitMessageEvent({ contractID, hash })
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
      sideEffect ({ contractID, hash }) {
        emitMessageEvent({ contractID, hash })
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
      sideEffect ({ contractID, hash }) {
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
