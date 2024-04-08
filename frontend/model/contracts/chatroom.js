/* globals fetchServerTime */

'use strict'

import { L, Vue } from '@common/common.js'
import sbp from '@sbp/sbp'
import { objectOf, optional, string, arrayOf, actionRequireInnerSignature } from '~/frontend/model/contracts/misc/flowTyper.js'
import { findForeignKeysByContractID, findKeyIdByName } from '~/shared/domains/chelonia/utils.js'
import {
  CHATROOM_ACTIONS_PER_PAGE,
  CHATROOM_DESCRIPTION_LIMITS_IN_CHARS,
  CHATROOM_NAME_LIMITS_IN_CHARS,
  CHATROOM_PRIVACY_LEVEL,
  CHATROOM_TYPES,
  MESSAGE_NOTIFICATIONS,
  MESSAGE_NOTIFY_SETTINGS,
  MESSAGE_RECEIVE,
  MESSAGE_TYPES,
  POLL_STATUS
} from './shared/constants.js'
import {
  createMessage,
  findMessageIdx,
  leaveChatRoom,
  makeMentionFromUserID,
  swapUserIDForUsername
} from './shared/functions.js'
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
  isDMOrMention, messageType, memberID, chatRoomName
}: {
  contractID: string,
  messageHash: string,
  datetime: string,
  text: string,
  messageType: string,
  isDMOrMention: boolean,
  memberID: string,
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

  shouldNotifyMessage && makeNotification({
    title,
    body: swapUserIDForUsername(text),
    icon,
    path
  })
  shouldSoundMessage && sbp('okTurtles.events/emit', MESSAGE_RECEIVE)
}

sbp('chelonia/defineContract', {
  name: 'gi.contracts/chatroom',
  metadata: {
    validate: objectOf({
      createdDate: string // action created date
    }),
    async create () {
      return {
        createdDate: await fetchServerTime()
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
    chatRoomMembers (state, getters) {
      return getters.currentChatRoomState.members || {}
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
      process ({ data }, { state }) {
        const initialState = merge({
          settings: {
            actionsPerPage: CHATROOM_ACTIONS_PER_PAGE,
            maxNameLength: CHATROOM_NAME_LIMITS_IN_CHARS,
            maxDescriptionLength: CHATROOM_DESCRIPTION_LIMITS_IN_CHARS
          },
          attributes: {
            deletedDate: null
          },
          members: {},
          messages: []
        }, data)
        for (const key in initialState) {
          Vue.set(state, key, initialState[key])
        }
      },
      sideEffect ({ contractID }) {
        Vue.set(sbp('state/vuex/state')?.chatroom?.chatRoomUnread, contractID, {
          readUntil: undefined,
          messages: []
        })
      }
    },
    'gi.contracts/chatroom/join': {
      validate: actionRequireInnerSignature(objectOf({
        memberID: optional(string) // user id of joining memberID
      })),
      process ({ data, meta, hash, height, contractID, innerSigningContractID }, { state }) {
        const memberID = data.memberID || innerSigningContractID
        if (!memberID) {
          throw new Error('The new member must be given either explicitly or implcitly with an inner signature')
        }
        if (!state.onlyRenderMessage) {
          // For private chatrooms, group members can see the '/join' actions
          // but nothing else. Because of this, `state.members` may be missing
          if (!state.members) {
            Vue.set(state, 'members', {})
          } else if (state.members[memberID]) {
            throw new Error(`Can not join the chatroom which ${memberID} is already part of`)
          }

          Vue.set(state.members, memberID, { joinedDate: meta.createdDate })
          return
        }

        if (state.attributes.type === CHATROOM_TYPES.DIRECT_MESSAGE) {
          return
        }

        const notificationType = memberID === innerSigningContractID ? MESSAGE_NOTIFICATIONS.JOIN_MEMBER : MESSAGE_NOTIFICATIONS.ADD_MEMBER
        const notificationData = createNotificationData(
          notificationType,
          notificationType === MESSAGE_NOTIFICATIONS.ADD_MEMBER ? { memberID, actorID: innerSigningContractID } : { memberID }
        )
        const newMessage = createMessage({ meta, hash, height, data: notificationData, state, innerSigningContractID })
        state.messages.push(newMessage)
      },
      sideEffect ({ data, contractID, hash, meta, innerSigningContractID }, { state }) {
        if (state.onlyRenderMessage) return
        sbp('chelonia/queueInvocation', contractID, () => {
          const rootState = sbp('state/vuex/state')
          const state = rootState[contractID]
          const memberID = data.memberID || innerSigningContractID

          if (!state?.members?.[memberID]) {
            return
          }

          const rootGetters = sbp('state/vuex/getters')
          const loggedIn = sbp('state/vuex/state').loggedIn

          setReadUntilWhileJoining({ contractID, hash, createdDate: meta.createdDate })

          if (memberID === loggedIn.identityContractID) {
            // The join process is now complete, so we can remove this key if
            // it was set. This key is used to prevent us from calling `/remove`
            // when the join process is incomplete. See the comment on group.js
            // (joinChatRoom sideEffect) for a more detailed explanation of
            // what this does.
            sbp('okTurtles.data/delete', `JOINING_CHATROOM-${contractID}-${memberID}`)

            if (state.attributes.type === CHATROOM_TYPES.DIRECT_MESSAGE) {
            // NOTE: To ignore scroll to the message of this hash
            //       since we don't create notification when join the direct message
              sbp('state/vuex/commit', 'deleteChatRoomReadUntil', {
                chatRoomId: contractID,
                deletedDate: meta.createdDate
              })
            }

            // subscribe to founder's IdentityContract & everyone else's
            const profileIds = Object.keys(state.members).filter((id) =>
              id !== loggedIn.identityContractID &&
              !rootGetters.ourContactProfilesById[id]
            )
            sbp('chelonia/contract/sync', profileIds).catch((e) => {
              console.error('Error while syncing other members\' contracts at chatroom join', e)
            })
          } else {
            if (!rootGetters.ourContactProfilesById[memberID]) {
              sbp('chelonia/contract/sync', memberID).catch((e) => {
                console.error(`Error while syncing new memberID's contract ${memberID}`, e)
              })
            }
          }
        }).catch((e) => {
          console.error('[gi.contracts/chatroom/join/sideEffect] Error at sideEffect', e?.message || e)
        })
      }
    },
    'gi.contracts/chatroom/rename': {
      validate: actionRequireInnerSignature(objectOf({
        name: string
      })),
      process ({ data, meta, hash, height, innerSigningContractID }, { state }) {
        Vue.set(state.attributes, 'name', data.name)

        if (!state.onlyRenderMessage) {
          return
        }

        const notificationData = createNotificationData(MESSAGE_NOTIFICATIONS.UPDATE_NAME, {})
        const newMessage = createMessage({ meta, hash, height, data: notificationData, state, innerSigningContractID })
        state.messages.push(newMessage)
      },
      sideEffect ({ contractID, hash, meta }) {
        setReadUntilWhileJoining({ contractID, hash, createdDate: meta.createdDate })
      }
    },
    'gi.contracts/chatroom/changeDescription': {
      validate: actionRequireInnerSignature(objectOf({
        description: string
      })),
      process ({ data, meta, hash, height, innerSigningContractID }, { state }) {
        Vue.set(state.attributes, 'description', data.description)

        if (!state.onlyRenderMessage) {
          return
        }

        const notificationData = createNotificationData(
          MESSAGE_NOTIFICATIONS.UPDATE_DESCRIPTION, {}
        )
        const newMessage = createMessage({ meta, hash, height, data: notificationData, state, innerSigningContractID })
        state.messages.push(newMessage)
      },
      sideEffect ({ contractID, hash, meta }) {
        setReadUntilWhileJoining({ contractID, hash, createdDate: meta.createdDate })
      }
    },
    'gi.contracts/chatroom/leave': {
      validate: objectOf({
        memberID: optional(string) // member to be removed
      }),
      process ({ data, meta, hash, height, contractID, innerSigningContractID }, { state }) {
        const memberID = data.memberID || innerSigningContractID
        if (!memberID) {
          throw new Error('The removed member must be given either explicitly or implcitly with an inner signature')
        }
        // innerSigningContractID !== contractID is the special case of a member
        // being removed using the group's CSK (usually when a member is removed)
        const isKicked = innerSigningContractID && memberID !== innerSigningContractID
        if (!state.onlyRenderMessage) {
          if (!state.members) {
            console.error('Missing state.members: ' + JSON.stringify(state))
            throw new Error('Missing members state')
          }
          if (!state.members[memberID]) {
            throw new Error(`Can not leave the chatroom ${contractID} which ${memberID} is not part of`)
          }

          Vue.delete(state.members, memberID)
          return
        }

        if (state.attributes.type === CHATROOM_TYPES.DIRECT_MESSAGE) {
          return
        }

        const notificationType = !isKicked ? MESSAGE_NOTIFICATIONS.LEAVE_MEMBER : MESSAGE_NOTIFICATIONS.KICK_MEMBER
        const notificationData = createNotificationData(notificationType, { memberID })
        const newMessage = createMessage({
          meta,
          hash,
          height,
          data: notificationData,
          state,
          // Special case for a memberID being removed using the group's CSK
          // This way, we show the 'Member left' notification instead of the
          // 'kicked' notification
          innerSigningContractID: !isKicked ? memberID : innerSigningContractID
        })
        state.messages.push(newMessage)
      },
      sideEffect ({ data, hash, contractID, meta, innerSigningContractID }, { state }) {
        if (state.onlyRenderMessage) return
        sbp('chelonia/queueInvocation', contractID, () => {
          const rootState = sbp('state/vuex/state')
          const state = rootState[contractID]
          const memberID = data.memberID || innerSigningContractID

          if (!state || !!state.members?.[data.memberID]) {
            return
          }

          if (memberID === rootState.loggedIn.identityContractID) {
            // If we're in the process of joining this chatroom, don't call
            // /remove, as we're still waiting to be added to the chatroom.
            // See group.js (joinChatRoom sideEffect) for a more detailed
            // explanation of why we need this
            if (!sbp('okTurtles.data/get', `JOINING_CHATROOM-${contractID}-${memberID}`)) {
            // NOTE: make sure *not* to await on this, since that can cause
            //       a potential deadlock. See same warning in sideEffect for
            //       'gi.contracts/group/removeMember'
              sbp('chelonia/contract/remove', contractID).catch(e => {
                console.error(`[gi.contracts/chatroom/leave/sideEffect] (${contractID}): remove threw ${e.name}:`, e)
              })
            }
          } else {
            setReadUntilWhileJoining({ contractID, hash, createdDate: meta.createdDate })

            if (state.attributes.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE) {
              sbp('gi.contracts/chatroom/rotateKeys', contractID, state)
            }
          }

          sbp('gi.contracts/chatroom/removeForeignKeys', contractID, memberID, state)
        }).catch((e) => {
          console.error('[gi.contracts/chatroom/leave/sideEffect] Error at sideEffect', e?.message || e)
        })
      }
    },
    'gi.contracts/chatroom/delete': {
      validate: actionRequireInnerSignature((_, { state, meta, message: { innerSigningContractID } }) => {
        if (state.attributes.creatorID !== innerSigningContractID) {
          throw new TypeError(L('Only the channel creator can delete channel.'))
        }
      }),
      process ({ meta }, { state }) {
        Vue.set(state.attributes, 'deletedDate', meta.createdDate)
        for (const memberID in state.members) {
          Vue.delete(state.members, memberID)
        }
      },
      sideEffect ({ meta, contractID }, { state }) {
        if (sbp('chelonia/contract/isSyncing', contractID)) {
          return
        }
        // NOTE: make sure *not* to await on this, since that can cause
        //       a potential deadlock. See same warning in sideEffect for
        //       'gi.contracts/group/removeMember'
        sbp('chelonia/contract/remove', contractID).catch(e => {
          console.error(`[gi.contracts/chatroom/delete/sideEffect] (${contractID}): remove threw ${e.name}:`, e)
        })
      }
    },
    'gi.contracts/chatroom/addMessage': {
      validate: actionRequireInnerSignature(messageType),
      // NOTE: This function is 'reentrant' and may be called multiple times
      // for the same message and state. The `direction` attributes handles
      // these situations especially, and it's meant to mark sent-by-the-user
      // but not-yet-received-over-the-network messages.
      process ({ direction, data, meta, hash, height, innerSigningContractID }, { state }) {
        // Exit early if we're only supposed to render messages.
        if (!state.onlyRenderMessage) {
          return
        }

        const existingMsg = state.messages.find(msg => (msg.hash === hash))

        if (!existingMsg) {
          // If no existing message, simply add it to the messages array.
          const pending = direction === 'outgoing'
          state.messages.push(createMessage({ meta, data, hash, height, state, pending, innerSigningContractID }))
        } else if (direction !== 'outgoing') {
          // If an existing message is found, it's no longer pending.
          existingMsg.pending = false
        }
      },
      sideEffect ({ contractID, hash, height, meta, data, innerSigningContractID }, { state, getters }) {
        setReadUntilWhileJoining({ contractID, hash, createdDate: meta.createdDate })

        const me = sbp('state/vuex/state').loggedIn.identityContractID

        if (me === innerSigningContractID && data.type !== MESSAGE_TYPES.INTERACTIVE) {
          return
        }
        const newMessage = createMessage({ meta, data, hash, height, state, innerSigningContractID })
        const mentions = makeMentionFromUserID(me)
        const isMentionedMe = data.type === MESSAGE_TYPES.TEXT &&
          (newMessage.text.includes(mentions.me) || newMessage.text.includes(mentions.all))

        messageReceivePostEffect({
          contractID,
          messageHash: newMessage.hash,
          datetime: newMessage.datetime,
          text: newMessage.text,
          isDMOrMention: isMentionedMe || getters.chatRoomAttributes.type === CHATROOM_TYPES.DIRECT_MESSAGE,
          messageType: data.type,
          memberID: innerSigningContractID,
          chatRoomName: getters.chatRoomAttributes.name
        })
      }
    },
    'gi.contracts/chatroom/editMessage': {
      validate: actionRequireInnerSignature(objectOf({
        hash: string,
        createdDate: string,
        text: string
      })),
      process ({ data, meta, innerSigningContractID }, { state }) {
        // NOTE: edit message whose type is MESSAGE_TYPES.TEXT
        if (!state.onlyRenderMessage) {
          return
        }
        const msgIndex = findMessageIdx(data.hash, state.messages)
        if (msgIndex >= 0 && innerSigningContractID === state.messages[msgIndex].from) {
          state.messages[msgIndex].text = data.text
          state.messages[msgIndex].updatedDate = meta.createdDate
          if (state.onlyRenderMessage && state.messages[msgIndex].pending) {
            delete state.messages[msgIndex].pending
          }
        }
      },
      sideEffect ({ contractID, hash, meta, data, innerSigningContractID }, { getters }) {
        const rootState = sbp('state/vuex/state')
        const me = rootState.loggedIn.identityContractID
        if (me === innerSigningContractID || getters.chatRoomAttributes.type === CHATROOM_TYPES.DIRECT_MESSAGE) {
          return
        }

        const isAlreadyAdded = !!sbp('state/vuex/getters')
          .chatRoomUnreadMessages(contractID).find(m => m.messageHash === data.hash)
        const mentions = makeMentionFromUserID(me)
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
            memberID: innerSigningContractID,
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
      validate: actionRequireInnerSignature(objectOf({ hash: string })),
      process ({ data, meta, innerSigningContractID }, { state }) {
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
            message.replyingMessage.text = L('Original message was removed by {user}', {
              user: makeMentionFromUserID(innerSigningContractID).me
            })
          }
        }
      },
      sideEffect ({ data, contractID, hash, meta, innerSigningContractID }) {
        const rootState = sbp('state/vuex/state')
        const me = rootState.loggedIn.identityContractID

        if (rootState.chatroom.chatRoomScrollPosition[contractID] === data.hash) {
          sbp('state/vuex/commit', 'setChatRoomScrollPosition', {
            chatRoomId: contractID, messageHash: null
          })
        }

        // NOTE: readUntil can't be undefined because it would be set in advance
        //       while syncing the contracts events especially join, addMessage, ...
        if (rootState.chatroom.chatRoomUnread[contractID].readUntil.messageHash === data.hash) {
          sbp('state/vuex/commit', 'deleteChatRoomReadUntil', {
            chatRoomId: contractID,
            deletedDate: meta.createdDate
          })
        }

        if (me === innerSigningContractID) {
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
    'gi.contracts/chatroom/deleteAttachment': {
      validate: actionRequireInnerSignature(objectOf({
        hash: string,
        manifestCid: string
      })),
      process ({ data, innerSigningContractID }, { state }) {
        if (!state.onlyRenderMessage) {
          return
        }
        const msgIndex = findMessageIdx(data.hash, state.messages)
        if (msgIndex >= 0 && innerSigningContractID === state.messages[msgIndex].from) {
          const oldAttachments = state.messages[msgIndex].attachments
          if (Array.isArray(oldAttachments)) {
            const newAttachments = oldAttachments.filter(attachment => {
              return attachment.downloadData.manifestCid !== data.manifestCid
            })
            Vue.set(state.messages[msgIndex], 'attachments', newAttachments)
          }
        }
      }
    },
    'gi.contracts/chatroom/makeEmotion': {
      validate: actionRequireInnerSignature(objectOf({
        hash: string,
        emoticon: string
      })),
      process ({ data, innerSigningContractID }, { state }) {
        if (!state.onlyRenderMessage) {
          return
        }
        const { hash, emoticon } = data
        const msgIndex = findMessageIdx(hash, state.messages)
        if (msgIndex >= 0) {
          let emoticons = cloneDeep(state.messages[msgIndex].emoticons || {})
          if (emoticons[emoticon]) {
            const alreadyAdded = emoticons[emoticon].indexOf(innerSigningContractID)
            if (alreadyAdded >= 0) {
              emoticons[emoticon].splice(alreadyAdded, 1)
              if (!emoticons[emoticon].length) {
                delete emoticons[emoticon]
                if (!Object.keys(emoticons).length) {
                  emoticons = null
                }
              }
            } else {
              emoticons[emoticon].push(innerSigningContractID)
            }
          } else {
            emoticons[emoticon] = [innerSigningContractID]
          }
          if (emoticons) {
            Vue.set(state.messages[msgIndex], 'emoticons', emoticons)
          } else {
            Vue.delete(state.messages[msgIndex], 'emoticons')
          }
        }
      }
    },
    'gi.contracts/chatroom/voteOnPoll': {
      validate: actionRequireInnerSignature(objectOf({
        hash: string,
        votes: arrayOf(string),
        votesAsString: string
      })),
      process ({ data, meta, hash, height, innerSigningContractID }, { state }) {
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
              foundOpt.voted.push(innerSigningContractID)
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
        const newMessage = createMessage({ meta, hash, height, data: notificationData, state, innerSigningContractID })
        state.messages.push(newMessage)
      },
      sideEffect ({ contractID, hash, meta }) {
        setReadUntilWhileJoining({ contractID, hash, createdDate: meta.createdDate })
      }
    },
    'gi.contracts/chatroom/changeVoteOnPoll': {
      validate: actionRequireInnerSignature(objectOf({
        hash: string,
        votes: arrayOf(string),
        votesAsString: string
      })),
      process ({ data, meta, hash, height, innerSigningContractID }, { state }) {
        if (!state.onlyRenderMessage) {
          return
        }

        const msgIndex = findMessageIdx(data.hash, state.messages)

        if (msgIndex >= 0) {
          const me = innerSigningContractID
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
        const newMessage = createMessage({ meta, hash, height, data: notificationData, state, innerSigningContractID })
        state.messages.push(newMessage)
      },
      sideEffect ({ contractID, hash, meta }) {
        setReadUntilWhileJoining({ contractID, hash, createdDate: meta.createdDate })
      }
    },
    'gi.contracts/chatroom/closePoll': {
      validate: actionRequireInnerSignature(objectOf({
        hash: string
      })),
      process ({ data }, { state }) {
        if (!state.onlyRenderMessage) {
          return
        }

        const msgIndex = findMessageIdx(data.hash, state.messages)

        if (msgIndex >= 0) {
          const pollData = state.messages[msgIndex].pollData

          Vue.set(state.messages[msgIndex], 'pollData', { ...pollData, status: POLL_STATUS.CLOSED })
        }
      }
    }
  },
  methods: {
    'gi.contracts/chatroom/_cleanup': ({ contractID, resync }) => {
      // If we're resyncing after having received new keys, we're not actually
      // leaving the chatroom, and there are no cleanup actions
      if (resync) return

      leaveChatRoom({ contractID }).catch((e) => {
        console.error(`[gi.contracts/chatroom/_cleanup] Error for ${contractID}`, e)
      })
    },
    'gi.contracts/chatroom/rotateKeys': (contractID, state) => {
      if (!state._volatile) Vue.set(state, '_volatile', Object.create(null))
      if (!state._volatile.pendingKeyRevocations) Vue.set(state._volatile, 'pendingKeyRevocations', Object.create(null))

      const CSKid = findKeyIdByName(state, 'csk')
      const CEKid = findKeyIdByName(state, 'cek')

      Vue.set(state._volatile.pendingKeyRevocations, CSKid, true)
      Vue.set(state._volatile.pendingKeyRevocations, CEKid, true)

      sbp('gi.actions/out/rotateKeys', contractID, 'gi.contracts/chatroom', 'pending', 'gi.actions/chatroom/shareNewKeys').catch(e => {
        console.warn(`rotateKeys: ${e.name} thrown during queueEvent to ${contractID}:`, e)
      })
    },
    'gi.contracts/chatroom/removeForeignKeys': (contractID, memberID, state) => {
      const keyIds = findForeignKeysByContractID(state, memberID)

      if (!keyIds?.length) return

      const CSKid = findKeyIdByName(state, 'csk')
      const CEKid = findKeyIdByName(state, 'cek')

      if (!CEKid) throw new Error('Missing encryption key')

      sbp('chelonia/out/keyDel', {
        contractID,
        contractName: 'gi.contracts/chatroom',
        data: keyIds,
        signingKeyId: CSKid,
        hooks: {
          preSendCheck: (_, state) => {
            // Only issue OP_KEY_DEL for non-members
            return !state.members?.[memberID]
          }
        }
      }).catch(e => {
        console.warn(`removeForeignKeys: ${e.name} thrown during queueEvent to ${contractID}:`, e)
      })
    }
  }
})
