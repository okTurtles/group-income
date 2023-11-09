/* globals fetchServerTime */

'use strict'

import { L, Vue } from '@common/common.js'
import sbp from '@sbp/sbp'
import { objectOf, optional, string, arrayOf } from '~/frontend/model/contracts/misc/flowTyper.js'
import { findForeignKeysByContractID, findKeyIdByName } from '~/shared/domains/chelonia/utils.js'
import {
  CHATROOM_ACTIONS_PER_PAGE,
  CHATROOM_DESCRIPTION_LIMITS_IN_CHARS,
  CHATROOM_MESSAGE_ACTION,
  CHATROOM_NAME_LIMITS_IN_CHARS,
  CHATROOM_PRIVACY_LEVEL,
  CHATROOM_TYPES,
  MESSAGE_NOTIFICATIONS,
  MESSAGE_NOTIFY_SETTINGS,
  MESSAGE_RECEIVE,
  MESSAGE_TYPES,
  POLL_STATUS
} from './shared/constants.js'
import { createMessage, findMessageIdx, leaveChatRoom, makeMentionFromUsername } from './shared/functions.js'
import { cloneDeep, merge } from './shared/giLodash.js'
import { makeNotification } from './shared/nativeNotification.js'
import { chatRoomAttributesType, messageType } from './shared/types.js'

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
  let icon
  if (isDirectMessage) {
    // NOTE: partner identity contract could not be synced yet
    title = rootGetters.ourGroupDirectMessages[contractID].title
    icon = rootGetters.ourGroupDirectMessages[contractID].picture
  }
  const path = `/group-chat/${contractID}`

  const chatNotificationSettings = rootGetters.chatNotificationSettings[contractID] || rootGetters.chatNotificationSettings.default
  const { messageNotification, messageSound } = chatNotificationSettings
  const shouldNotifyMessage = messageNotification === MESSAGE_NOTIFY_SETTINGS.ALL_MESSAGES ||
    (messageNotification === MESSAGE_NOTIFY_SETTINGS.DIRECT_MESSAGES && isDMOrMention)
  const shouldSoundMessage = messageSound === MESSAGE_NOTIFY_SETTINGS.ALL_MESSAGES ||
    (messageSound === MESSAGE_NOTIFY_SETTINGS.DIRECT_MESSAGES && isDMOrMention)

  shouldNotifyMessage && makeNotification({ title, body: text, icon, path })
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
            deletedDate: null
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
          throw new Error(`Can not join the chatroom which ${username} is already part of`)
        }

        Vue.set(state.users, username, { joinedDate: meta.createdDate })

        if (!state.onlyRenderMessage || state.attributes.type === CHATROOM_TYPES.DIRECT_MESSAGE) {
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
      async sideEffect ({ data, contractID, hash, meta }, { state }) {
        const rootGetters = sbp('state/vuex/getters')
        const { username } = data
        const loggedIn = sbp('state/vuex/state').loggedIn

        emitMessageEvent({ contractID, hash })
        setReadUntilWhileJoining({ contractID, hash, createdDate: meta.createdDate })

        if (username === loggedIn.username) {
          if (state.attributes.type === CHATROOM_TYPES.DIRECT_MESSAGE) {
            // NOTE: To ignore scroll to the message of this hash
            //       since we don't create notification when join the direct message
            sbp('state/vuex/commit', 'deleteChatRoomReadUntil', {
              chatRoomId: contractID,
              deletedDate: meta.createdDate
            })
          }
          const lookupResult = await Promise.allSettled(
            Object.keys(state.users)
              .filter((name) =>
                !rootGetters.ourContactProfiles[name] && name !== loggedIn.username)
              .map(async (name) => await sbp('namespace/lookup', name).then((r) => {
                if (!r) throw new Error('Cannot lookup username: ' + name)
                return r
              }))
          )
          const errors = lookupResult
            .filter(({ status }) => status === 'rejected')
            .map((r) => (r: any).reason)
          await sbp('chelonia/contract/sync',
            lookupResult
              .filter(({ status }) => status === 'fulfilled')
              .map((r) => (r: any).value)
          ).catch(e => errors.push(e))
          if (errors.length) {
            const msg = `Encountered ${errors.length} errors while joining a chatroom`
            console.error(msg, errors)
            throw new Error(msg)
          }
        } else {
          if (!rootGetters.ourContactProfiles[username]) {
            const contractID = await sbp('namespace/lookup', username)
            if (!contractID) {
              throw new Error('Cannot lookup username: ' + username)
            }
            await sbp('chelonia/contract/sync', contractID)
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
        username: string,
        // NOTE: 'showKickedBy' is someone whose profile picture should be used for the notification message
        //       it has it's value only when someone else kicks 'data.username' from the chatroom
        showKickedBy: optional(string)
      }),
      process ({ data, meta, hash, id, contractID }, { state }) {
        const { username, showKickedBy } = data
        const isKicked = showKickedBy && username !== showKickedBy
        if (!state.onlyRenderMessage && !state.users[username]) {
          throw new Error(`Can not leave the chatroom ${contractID} which ${username} is not part of`)
        }
        Vue.delete(state.users, username)

        if (!state.onlyRenderMessage || state.attributes.type === CHATROOM_TYPES.DIRECT_MESSAGE) {
          return
        }

        const notificationType = isKicked ? MESSAGE_NOTIFICATIONS.KICK_MEMBER : MESSAGE_NOTIFICATIONS.LEAVE_MEMBER
        const notificationData = createNotificationData(notificationType, isKicked ? { username } : {})
        const newMessage = createMessage({
          meta: { ...meta, username: showKickedBy || username },
          hash,
          id,
          data: notificationData,
          state
        })
        state.messages.push(newMessage)
      },
      sideEffect ({ data, hash, contractID, meta }, { state }) {
        if (data.username === sbp('state/vuex/state').loggedIn.username) {
          if (sbp('chelonia/contract/isSyncing', contractID)) {
            return
          }
          leaveChatRoom({ contractID })
        } else {
          emitMessageEvent({ contractID, hash })
          setReadUntilWhileJoining({ contractID, hash, createdDate: meta.createdDate })

          if (state.attributes.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE) {
            sbp('gi.contracts/chatroom/rotateKeys', contractID)
          }
        }

        const rootGetters = sbp('state/vuex/getters')
        const userID = rootGetters.ourContactProfiles[data.username]?.contractID
        if (userID) {
          sbp('gi.contracts/chatroom/removeForeignKeys', contractID, userID)
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
      process ({ direction, data, meta, hash, id }, { state }) {
        if (!state.onlyRenderMessage) {
          return
        }
        // Called from the prepublish hook
        if (direction === 'outgoing') {
          // NOTE: pending is useful to turn the message gray meaning failed (just like Slack)
          // when we don't get event after a certain period
          state.messages.push({ ...createMessage({ meta, data, hash, id, state }), pending: true })
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
          isDMOrMention: isMentionedMe || getters.chatRoomAttributes.type === CHATROOM_TYPES.DIRECT_MESSAGE,
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
        if (me === meta.username || getters.chatRoomAttributes.type === CHATROOM_TYPES.DIRECT_MESSAGE) {
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
    },
    'gi.contracts/chatroom/voteOnPoll': {
      validate: objectOf({
        hash: string,
        votes: arrayOf(string),
        votesAsString: string
      }),
      process ({ data, meta, hash, id }, { state }) {
        if (!state.onlyRenderMessage) {
          return
        }

        const msgIndex = findMessageIdx(data.hash, state.messages)

        if (msgIndex >= 0) {
          const myVotes = data.votes
          const pollData = state.messages[msgIndex].pollData
          const optsCopy = cloneDeep(pollData.options)
          const votedOptNames = []

          myVotes.forEach(optId => {
            const foundOpt = optsCopy.find(x => x.id === optId)

            if (foundOpt) {
              foundOpt.voted.push(meta.username)
              votedOptNames.push(`"${foundOpt.value}"`)
            }
          })

          Vue.set(state.messages[msgIndex], 'pollData', { ...pollData, options: optsCopy })
        }

        // create & add a notification-message for user having voted.
        const notificationData = createNotificationData(
          MESSAGE_NOTIFICATIONS.VOTE_ON_POLL,
          {
            votedOptions: data.votesAsString,
            pollMessageHash: data.hash
          }
        )
        const newMessage = createMessage({ meta, hash, id, data: notificationData, state })
        state.messages.push(newMessage)
      },
      sideEffect ({ contractID, hash, meta }) {
        emitMessageEvent({ contractID, hash })
        setReadUntilWhileJoining({ contractID, hash, createdDate: meta.createdDate })
      }
    },
    'gi.contracts/chatroom/changeVoteOnPoll': {
      validate: objectOf({
        hash: string,
        votes: arrayOf(string),
        votesAsString: string
      }),
      process ({ data, meta, hash, id }, { state }) {
        if (!state.onlyRenderMessage) {
          return
        }

        const msgIndex = findMessageIdx(data.hash, state.messages)

        if (msgIndex >= 0) {
          const me = meta.username
          const myUpdatedVotes = data.votes
          const pollData = state.messages[msgIndex].pollData
          const optsCopy = cloneDeep(pollData.options)
          const votedOptNames = []

          // remove all the previous votes of the user before update.
          optsCopy.forEach(opt => {
            opt.voted = opt.voted.filter(votername => votername !== me)
          })

          myUpdatedVotes.forEach(optId => {
            const foundOpt = optsCopy.find(x => x.id === optId)

            if (foundOpt) {
              foundOpt.voted.push(me)
              votedOptNames.push(`"${foundOpt.value}"`)
            }
          })

          Vue.set(state.messages[msgIndex], 'pollData', { ...pollData, options: optsCopy })
        }

        // create & add a notification-message for user having update his/her votes.
        const notificationData = createNotificationData(
          MESSAGE_NOTIFICATIONS.CHANGE_VOTE_ON_POLL,
          {
            votedOptions: data.votesAsString,
            pollMessageHash: data.hash
          }
        )
        const newMessage = createMessage({ meta, hash, id, data: notificationData, state })
        state.messages.push(newMessage)
      },
      sideEffect ({ contractID, hash, meta }) {
        emitMessageEvent({ contractID, hash })
        setReadUntilWhileJoining({ contractID, hash, createdDate: meta.createdDate })
      }
    },
    'gi.contracts/chatroom/closePoll': {
      validate: objectOf({
        hash: string
      }),
      process ({ data }, { state }) {
        if (!state.onlyRenderMessage) {
          return
        }

        const msgIndex = findMessageIdx(data.hash, state.messages)

        if (msgIndex >= 0) {
          const pollData = state.messages[msgIndex].pollData

          Vue.set(state.messages[msgIndex], 'pollData', { ...pollData, status: POLL_STATUS.CLOSED })
        }
      },
      sideEffect ({ contractID, hash }) {
        emitMessageEvent({ contractID, hash })
      }
    }
  },
  methods: {
    'gi.contracts/chatroom/rotateKeys': (contractID) => {
      const state = sbp('state/vuex/state')[contractID]
      if (!state._volatile) Vue.set(state, '_volatile', Object.create(null))
      if (!state._volatile.pendingKeyRevocations) Vue.set(state._volatile, 'pendingKeyRevocations', Object.create(null))

      const CSKid = findKeyIdByName(state, 'csk')
      const CEKid = findKeyIdByName(state, 'cek')

      Vue.set(state._volatile.pendingKeyRevocations, CSKid, true)
      Vue.set(state._volatile.pendingKeyRevocations, CEKid, true)

      sbp('chelonia/queueInvocation', contractID, ['gi.actions/out/rotateKeys', contractID, 'gi.contracts/chatroom', 'pending', 'gi.actions/chatroom/shareNewKeys']).catch(e => {
        console.warn(`rotateKeys: ${e.name} thrown during queueEvent to ${contractID}:`, e)
      })
    },
    'gi.contracts/chatroom/removeForeignKeys': (contractID, userID) => {
      const state = sbp('state/vuex/state')[contractID]
      const keyIds = findForeignKeysByContractID(state, userID)

      if (!keyIds?.length) return

      const CSKid = findKeyIdByName(state, 'csk')
      const CEKid = findKeyIdByName(state, 'cek')

      if (!CEKid) throw new Error('Missing encryption key')

      sbp('chelonia/queueInvocation', contractID, ['chelonia/out/keyDel', {
        contractID,
        contractName: 'gi.contracts/chatroom',
        data: keyIds,
        signingKeyId: CSKid
      }]).catch(e => {
        console.warn(`removeForeignKeys: ${e.name} thrown during queueEvent to ${contractID}:`, e)
      })
    }
  }
})
