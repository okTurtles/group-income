'use strict'

import sbp from '~/shared/sbp.js'
import Vue from 'vue'
import {
  objectMaybeOf, objectOf, mapOf, arrayOf,
  string, boolean, literalOf, unionOf, number
} from '~/frontend/utils/flowTyper.js'
import { merge } from '~/frontend/utils/giLodash.js'
import {
  CHATROOM_NAME_LIMITS_IN_CHARS,
  CHATROOM_DESCRIPTION_LIMITS_IN_CHARS,
  CHATROOM_MESSAGES_PER_PAGE,
  MESSAGE_ACTION_TYPES,
  CHATROOM_TYPES,
  MESSAGE_TYPES
} from './constants.js'
import { CHATROOM_MESSAGE_ACTION } from '~/frontend/utils/events.js'

export const chatRoomType: any = objectOf({
  name: string,
  description: string,
  type: unionOf(...Object.values(CHATROOM_TYPES).map(v => literalOf(v))),
  private: boolean
})

export const messageType: any = objectMaybeOf({
  id: string, // hash of message once it is initialized
  type: unionOf(...Object.values(MESSAGE_TYPES).map(v => literalOf(v))),
  from: string, // username
  time: string, // new Date()
  text: string, // message text | proposalId when type is INTERACTIVE
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

export function createMessage ({ meta, data, hash }: {
  meta: Object, data: Object, hash: string
}): Object {
  const { type, text, replyingMessage } = data
  const { username, createdDate } = meta

  let newMessage = { type, time: new Date(createdDate), id: hash }
  switch (type) {
    case MESSAGE_TYPES.TEXT:
      newMessage = !replyingMessage
        ? { ...newMessage, from: username, text }
        : { ...newMessage, from: username, text, replyingMessage }
      break
    case MESSAGE_TYPES.POLL:
      break
    case MESSAGE_TYPES.NOTIFICATION:
      break
    case MESSAGE_TYPES.INTERACTIVE:
      break
  }
  return newMessage
}

export function getLatestMessages ({
  count, messages
}: { count: number, messages: Array<Object> }): Array<Object> {
  return messages.slice(Math.max(messages.length - count, 0))
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
  state (contractID) {
    return sbp('state/vuex/state')[contractID]
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
      validate: chatRoomType,
      process ({ meta, data }, { state }) {
        const initialState = merge({
          settings: {
            messagesPerPage: CHATROOM_MESSAGES_PER_PAGE,
            maxNameLetters: CHATROOM_NAME_LIMITS_IN_CHARS,
            maxDescriptionLetters: CHATROOM_DESCRIPTION_LIMITS_IN_CHARS
          },
          users: {},
          messages: []
        }, {
          attributes: {
            ...data,
            creator: meta.username
          }
        })
        for (const key in initialState) {
          Vue.set(state, key, initialState[key])
        }
      }
    },
    'gi.contracts/chatroom/join': {
      validate: objectMaybeOf({
        username: string
      }),
      process ({ data, meta }, { state }) {
        const { username } = data
        if (state.users[username] && !state.users[username].departedDate) {
          console.log(`chatroom Join: ${username} is already joined the chatroom #${state.name}`)
          return
        }
        Vue.set(state.users, username, {
          joinedDate: meta.createdDate,
          departedDate: null
        })
        // create a new system message to inform a new member is joined
      }
    },
    'gi.contracts/chatroom/rename': {
      validate: objectOf({
        name: string
      }),
      process ({ data, meta }, { state }) {
        Vue.set(state.attributes, 'name', data.name)
      }
    },
    'gi.contracts/chatroom/changeDescription': {
      validate: objectOf({
        description: string
      }),
      process ({ data, meta }, { state }) {
        Vue.set(state.attributes, 'description', data.description)
      }
    },
    'gi.contracts/chatroom/leave': {
      validate: objectMaybeOf({
        username: string
      }),
      process ({ data, meta }, { state }) {
        const { username } = data
        if (state.users[username] && !state.users[username].departedDate) {
          Vue.set(state.users[username], 'departedDate', meta.createdDate)
          // create a new system message to inform a member is leaved
          return
        }
        console.log(`chatroom Leave: ${username} is not a member of this chatroom #${state.name}`)
      },
      async sideEffect ({ meta, data, contractID }, { state }) {
        if (sbp('okTurtles.data/get', 'JOINING_CHATROOM')) {
          return
        }
        const rootState = sbp('state/vuex/state')
        if (data.username === rootState.loggedIn.username) {
          if (contractID === rootState.currentChatRoomId) {
            await sbp('state/vuex/commit', 'setCurrentChatRoomId', {
              groupId: rootState.currentGroupId
            })
            // TODO: need to switch URL if user is in GroupChat page
            sbp('controller/router').push({ name: 'GroupChat' })
          }
          sbp('state/vuex/commit', 'removeContract', contractID)
        }
      }
    },
    'gi.contracts/chatroom/addMessage': {
      validate: objectMaybeOf({
        type: unionOf(...Object.values(MESSAGE_TYPES).map(v => literalOf(v))),
        text: string,
        replyingMessage: objectOf({
          id: string, // scroll to the original message and highlight
          username: string, // display
          text: string, // display
          time: string // to search easily
        }),
        onlyVisibleTo: arrayOf(string)
      }),
      process ({ data, meta, hash }, { state }) {
        const newMessage = createMessage({ meta, data, hash })
        Vue.set(state.messages, [state.messages.length], newMessage)
      },
      sideEffect ({ meta, data, contractID, hash }) {
        sbp('okTurtles.events/emit', `${CHATROOM_MESSAGE_ACTION}-${contractID}`, {
          type: MESSAGE_ACTION_TYPES.ADD_MESSAGE,
          data: {
            hash,
            message: createMessage({ meta, data, hash })
          }
        })
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
