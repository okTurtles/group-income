/* globals fetchServerTime */

'use strict'

import sbp from '@sbp/sbp'
import { Vue, L } from '@common/common.js'
import { merge, cloneDeep } from './shared/giLodash.js'
import {
  CHATROOM_NAME_LIMITS_IN_CHARS,
  CHATROOM_DESCRIPTION_LIMITS_IN_CHARS,
  CHATROOM_ACTIONS_PER_PAGE,
  CHATROOM_TYPES,
  CHATROOM_PRIVACY_LEVEL,
  MESSAGE_TYPES,
  MESSAGE_NOTIFICATIONS,
  CHATROOM_MESSAGE_ACTION,
  MESSAGE_RECEIVE,
  MESSAGE_NOTIFY_SETTINGS
} from './shared/constants.js'
import { chatRoomAttributesType, messageType } from './shared/types.js'
import { createMessage, leaveChatRoom, findMessageIdx, makeMentionFromUsername } from './shared/functions.js'
import { makeNotification } from './shared/nativeNotification.js'
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
  if (!sbp('chelonia/contract/isSyncing', contractID)) {
    sbp('okTurtles.events/emit', `${CHATROOM_MESSAGE_ACTION}-${contractID}`, { hash })
  }
}

function setReadUntilWhileJoining ({ contractID, hash, createdDate }: {
  contractID: string,
  hash: string,
  createdDate: string
}): void {
  if (sbp('chelonia/contract/isSyncing', contractID, { firstSync: true })) {
    sbp('state/vuex/commit', 'setChatRoomReadUntil', {
      chatRoomId: contractID,
      messageHash: hash,
      createdDate: createdDate
    })
  }
}

function messageReceivePostEffect ({
  contractID, messageHash, datetime, text,
  isDMOrMention, messageType, username, chatRoomName
}: {
  contractID: string,
  messageHash: string,
  datetime: string,
  text: string,
  messageType: string,
  isDMOrMention: boolean,
  username: string,
  chatRoomName: string
}): void {
  if (sbp('chelonia/contract/isSyncing', contractID)) {
    return
  }
  const rootGetters = sbp('state/vuex/getters')
  const isDirectMessage = rootGetters.isDirectMessage(contractID)
  const unreadMessageType = {
    [MESSAGE_TYPES.TEXT]: isDMOrMention ? MESSAGE_TYPES.TEXT : undefined,
    [MESSAGE_TYPES.INTERACTIVE]: MESSAGE_TYPES.INTERACTIVE,
    [MESSAGE_TYPES.POLL]: MESSAGE_TYPES.POLL
  }[messageType]

  if (unreadMessageType) {
    sbp('state/vuex/commit', 'addChatRoomUnreadMessage', {
      chatRoomId: contractID,
      messageHash,
      createdDate: datetime,
      type: unreadMessageType
    })
  }

  let title = `# ${chatRoomName}`
  let partnerProfile
  if (isDirectMessage) {
    if (rootGetters.isGroupDirectMessage(contractID)) {
      title = `# ${rootGetters.groupDirectMessageInfo(contractID).title}`
    } else {
      partnerProfile = rootGetters.ourContactProfiles[username]
      // NOTE: partner identity contract could not be synced at the time of use
      title = `# ${partnerProfile?.displayName || username}`
    }
  }
  const path = `/group-chat/${contractID}`

  const chatNotificationSettings = rootGetters.chatNotificationSettings[contractID] || rootGetters.chatNotificationSettings.default
  const { messageNotification, messageSound } = chatNotificationSettings
  const shouldNotifyMessage = messageNotification === MESSAGE_NOTIFY_SETTINGS.ALL_MESSAGES ||
    (messageNotification === MESSAGE_NOTIFY_SETTINGS.DIRECT_MESSAGES && isDMOrMention)
  const shouldSoundMessage = messageSound === MESSAGE_NOTIFY_SETTINGS.ALL_MESSAGES ||
    (messageSound === MESSAGE_NOTIFY_SETTINGS.DIRECT_MESSAGES && isDMOrMention)

  shouldNotifyMessage && makeNotification({ title, body: text, icon: partnerProfile?.picture, path })
  shouldSoundMessage && sbp('okTurtles.events/emit', MESSAGE_RECEIVE)
}

sbp('chelonia/defineContract', {
  name: 'gi.contracts/chatroom',
  metadata: {
    validate: objectOf({
      createdDate: string, // action created date
      username: string, // action creator
      identityContractID: string // action creator identityContractID
    }),
    async create () {
      const { username, identityContractID } = sbp('state/vuex/state').loggedIn
      return {
        createdDate: await fetchServerTime(),
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
            maxNameLength: CHATROOM_NAME_LIMITS_IN_CHARS,
            maxDescriptionLength: CHATROOM_DESCRIPTION_LIMITS_IN_CHARS
          },
          attributes: {
            creator: meta.username,
            deletedDate: null,
            archivedDate: null
          },
          users: {},
          messages: []
        }, data)
        for (const key in initialState) {
          Vue.set(state, key, initialState[key])
        }
      },
      sideEffect ({ contractID }) {
        Vue.set(sbp('state/vuex/state').chatRoomUnread, contractID, {
          readUntil: undefined,
          messages: []
        })
      }
    },
    'gi.contracts/chatroom/join': {
      validate: objectOf({
        username: string // username of joining member
      }),
      process ({ data, meta, hash, id }, { state }) {
        const { username } = data
        if (!state.onlyRenderMessage && state.users[username]) {
          // this can happen when we're logging in on another machine, and also in other circumstances
          console.warn('Can not join the chatroom which you are already part of')
          return
        }

        Vue.set(state.users, username, { joinedDate: meta.createdDate })

        const { type, privacyLevel } = state.attributes
        const isPrivateDM = type === CHATROOM_TYPES.INDIVIDUAL && privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE
        if (!state.onlyRenderMessage || isPrivateDM) {
          return
        }

        const notificationType = username === meta.username ? MESSAGE_NOTIFICATIONS.JOIN_MEMBER : MESSAGE_NOTIFICATIONS.ADD_MEMBER
        const notificationData = createNotificationData(
          notificationType,
          notificationType === MESSAGE_NOTIFICATIONS.ADD_MEMBER ? { username } : {}
        )
        const newMessage = createMessage({ meta, hash, id, data: notificationData, state })
        state.messages.push(newMessage)
      },
      sideEffect ({ data, contractID, hash, meta }, { state }) {
        emitMessageEvent({ contractID, hash })
        setReadUntilWhileJoining({ contractID, hash, createdDate: meta.createdDate })
        if (data.username === sbp('state/vuex/state').loggedIn.username) {
          const { type, privacyLevel } = state.attributes
          const isPrivateDM = type === CHATROOM_TYPES.INDIVIDUAL && privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE
          if (isPrivateDM) {
            // NOTE: To ignore scroll to the message of this hash
            //       since we don't create notification for join activity in privateDM
            sbp('state/vuex/commit', 'deleteChatRoomReadUntil', {
              chatRoomId: contractID,
              deletedDate: meta.createdDate
            })
          }
        }
      }
    },
    'gi.contracts/chatroom/rename': {
      validate: objectOf({
        name: string
      }),
      process ({ data, meta, hash, id }, { state }) {
        Vue.set(state.attributes, 'name', data.name)

        if (!state.onlyRenderMessage) {
          return
        }

        const notificationData = createNotificationData(MESSAGE_NOTIFICATIONS.UPDATE_NAME, {})
        const newMessage = createMessage({ meta, hash, id, data: notificationData, state })
        state.messages.push(newMessage)
      },
      sideEffect ({ contractID, hash, meta }) {
        emitMessageEvent({ contractID, hash })
        setReadUntilWhileJoining({ contractID, hash, createdDate: meta.createdDate })
      }
    },
    'gi.contracts/chatroom/changeDescription': {
      validate: objectOf({
        description: string
      }),
      process ({ data, meta, hash, id }, { state }) {
        Vue.set(state.attributes, 'description', data.description)

        if (!state.onlyRenderMessage) {
          return
        }

        const notificationData = createNotificationData(
          MESSAGE_NOTIFICATIONS.UPDATE_DESCRIPTION, {}
        )
        const newMessage = createMessage({ meta, hash, id, data: notificationData, state })
        state.messages.push(newMessage)
      },
      sideEffect ({ contractID, hash, meta }) {
        emitMessageEvent({ contractID, hash })
        setReadUntilWhileJoining({ contractID, hash, createdDate: meta.createdDate })
      }
    },
    'gi.contracts/chatroom/leave': {
      validate: objectOf({
        username: optional(string), // coming from the gi.contracts/group/leaveChatRoom
        member: string // username to be removed
      }),
      process ({ data, meta, hash, id }, { state }) {
        const { member } = data
        const isKicked = data.username && member !== data.username
        if (!state.onlyRenderMessage && !state.users[member]) {
          throw new Error(`Can not leave the chatroom which ${member} are not part of`)
        }
        Vue.delete(state.users, member)

        if (!state.onlyRenderMessage || state.attributes.type === CHATROOM_TYPES.INDIVIDUAL) {
          return
        }

        const notificationType = !isKicked ? MESSAGE_NOTIFICATIONS.LEAVE_MEMBER : MESSAGE_NOTIFICATIONS.KICK_MEMBER
        const notificationData = createNotificationData(notificationType, isKicked ? { username: member } : {})
        const newMessage = createMessage({
          meta: isKicked ? meta : { ...meta, username: member },
          hash,
          id,
          data: notificationData,
          state
        })
        state.messages.push(newMessage)
      },
      sideEffect ({ data, hash, contractID, meta }) {
        if (data.member === sbp('state/vuex/state').loggedIn.username) {
          if (sbp('chelonia/contract/isSyncing', contractID)) {
            return
          }
          leaveChatRoom({ contractID })
        } else {
          emitMessageEvent({ contractID, hash })
          setReadUntilWhileJoining({ contractID, hash, createdDate: meta.createdDate })
        }
      }
    },
    'gi.contracts/chatroom/delete': {
      validate: (data, { state, meta }) => {
        if (state.attributes.creator !== meta.username) {
          throw new TypeError(L('Only the channel creator can delete channel.'))
        }
      },
      process ({ data, meta }, { state }) {
        Vue.set(state.attributes, 'deletedDate', meta.createdDate)
        for (const username in state.users) {
          Vue.delete(state.users, username)
        }
      },
      sideEffect ({ meta, contractID }, { state }) {
        if (sbp('chelonia/contract/isSyncing', contractID)) {
          return
        }
        leaveChatRoom({ contractID })
      }
    },
    'gi.contracts/chatroom/addMessage': {
      validate: messageType,
      process ({ data, meta, hash, id }, { state }) {
        if (!state.onlyRenderMessage) {
          return
        }
        // NOTE: id(GIMessage.id()) should be used as identifier for GIMessages, but not hash(GIMessage.hash())
        //       https://github.com/okTurtles/group-income/issues/1503
        const pendingMsg = state.messages.find(msg => msg.id === id && msg.pending)
        if (pendingMsg) {
          delete pendingMsg.pending
          pendingMsg.hash = hash // NOTE: hash could be different from the one before publishEvent
        } else {
          state.messages.push(createMessage({ meta, data, hash, id, state }))
        }
      },
      sideEffect ({ contractID, hash, id, meta, data }, { state, getters }) {
        emitMessageEvent({ contractID, hash })
        setReadUntilWhileJoining({ contractID, hash, createdDate: meta.createdDate })

        const me = sbp('state/vuex/state').loggedIn.username

        if (me === meta.username && data.type !== MESSAGE_TYPES.INTERACTIVE) {
          return
        }
        const newMessage = createMessage({ meta, data, hash, id, state })
        const mentions = makeMentionFromUsername(me)
        const isMentionedMe = data.type === MESSAGE_TYPES.TEXT &&
          (newMessage.text.includes(mentions.me) || newMessage.text.includes(mentions.all))

        messageReceivePostEffect({
          contractID,
          messageHash: newMessage.hash,
          datetime: newMessage.datetime,
          text: newMessage.text,
          isDMOrMention: isMentionedMe || getters.chatRoomAttributes.type === CHATROOM_TYPES.INDIVIDUAL,
          messageType: data.type,
          username: meta.username,
          chatRoomName: getters.chatRoomAttributes.name
        })
      }
    },
    'gi.contracts/chatroom/editMessage': {
      validate: objectOf({
        hash: string,
        createdDate: string,
        text: string
      }),
      process ({ data, meta }, { state }) {
        // NOTE: edit message whose type is MESSAGE_TYPES.TEXT
        if (!state.onlyRenderMessage) {
          return
        }
        const msgIndex = findMessageIdx(data.hash, state.messages)
        if (msgIndex >= 0 && meta.username === state.messages[msgIndex].from) {
          state.messages[msgIndex].text = data.text
          state.messages[msgIndex].updatedDate = meta.createdDate
          if (state.onlyRenderMessage && state.messages[msgIndex].pending) {
            delete state.messages[msgIndex].pending
          }
        }
      },
      sideEffect ({ contractID, hash, meta, data }, { getters }) {
        emitMessageEvent({ contractID, hash })

        const rootState = sbp('state/vuex/state')
        const me = rootState.loggedIn.username
        if (me === meta.username || getters.chatRoomAttributes.type === CHATROOM_TYPES.INDIVIDUAL) {
          return
        }

        const isAlreadyAdded = !!sbp('state/vuex/getters')
          .chatRoomUnreadMessages(contractID).find(m => m.messageHash === data.hash)
        const mentions = makeMentionFromUsername(me)
        const isMentionedMe = data.text.includes(mentions.me) || data.text.includes(mentions.all)

        if (!isAlreadyAdded) {
          messageReceivePostEffect({
            contractID,
            messageHash: data.hash,
            /*
            * the following datetime is the time when the message(which made mention) is created
            * the reason why it is it instead of datetime when the mention created is because
            * it is compared to the datetime of other messages when user scrolls
            * to decide if it should be removed from the list of mentions or not
            */
            datetime: data.createdDate,
            text: data.text,
            isDMOrMention: isMentionedMe,
            messageType: MESSAGE_TYPES.TEXT,
            username: meta.username,
            chatRoomName: getters.chatRoomAttributes.name
          })
        } else if (!isMentionedMe) {
          sbp('state/vuex/commit', 'deleteChatRoomUnreadMessage', {
            chatRoomId: contractID,
            messageHash: data.hash
          })
        }
      }
    },
    'gi.contracts/chatroom/deleteMessage': {
      validate: objectOf({ hash: string }),
      process ({ data, meta }, { state }) {
        if (!state.onlyRenderMessage) {
          return
        }
        const msgIndex = findMessageIdx(data.hash, state.messages)
        if (msgIndex >= 0) {
          state.messages.splice(msgIndex, 1)
        }
        // filter replied messages and check if the current message is original
        for (const message of state.messages) {
          if (message.replyingMessage?.hash === data.hash) {
            message.replyingMessage.hash = null
            message.replyingMessage.text = L('Original message was removed by {username}', {
              username: makeMentionFromUsername(meta.username).me
            })
          }
        }
      },
      sideEffect ({ data, contractID, hash, meta }) {
        emitMessageEvent({ contractID, hash })

        const rootState = sbp('state/vuex/state')
        const me = rootState.loggedIn.username

        if (rootState.chatRoomScrollPosition[contractID] === data.hash) {
          sbp('state/vuex/commit', 'setChatRoomScrollPosition', {
            chatRoomId: contractID, messageHash: null
          })
        }

        // NOTE: readUntil can't be undefined because it would be set in advance
        //       while syncing the contracts events especially join, addMessage, ...
        if (rootState.chatRoomUnread[contractID].readUntil.messageHash === data.hash) {
          sbp('state/vuex/commit', 'deleteChatRoomReadUntil', {
            chatRoomId: contractID,
            deletedDate: meta.createdDate
          })
        }

        if (me === meta.username) {
          return
        }

        // NOTE: ignore to check if the existance of current message (data.hash)
        //       because if not exist, deleteChatRoomUnreadMessage won't do anything
        sbp('state/vuex/commit', 'deleteChatRoomUnreadMessage', {
          chatRoomId: contractID,
          messageHash: data.hash
        })
      }
    },
    'gi.contracts/chatroom/makeEmotion': {
      validate: objectOf({
        hash: string,
        emoticon: string
      }),
      process ({ data, meta, contractID }, { state }) {
        if (!state.onlyRenderMessage) {
          return
        }
        const { hash, emoticon } = data
        const msgIndex = findMessageIdx(hash, state.messages)
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
