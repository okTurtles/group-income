/* globals fetchServerTime */

'use strict'

import { L, Vue } from '@common/common.js'
import sbp from '@sbp/sbp'
import { objectOf, optional, object, number, string, arrayOf, actionRequireInnerSignature } from '~/frontend/model/contracts/misc/flowTyper.js'
import { ChelErrorGenerator } from '~/shared/domains/chelonia/errors.js'
import { findForeignKeysByContractID, findKeyIdByName } from '~/shared/domains/chelonia/utils.js'
import {
  CHATROOM_ACTIONS_PER_PAGE,
  CHATROOM_DESCRIPTION_LIMITS_IN_CHARS,
  CHATROOM_NAME_LIMITS_IN_CHARS,
  CHATROOM_MAX_MESSAGES,
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
  swapMentionIDForDisplayname
} from './shared/functions.js'
import { cloneDeep, merge } from './shared/giLodash.js'
import { makeNotification } from './shared/nativeNotification.js'
import { chatRoomAttributesType, messageType } from './shared/types.js'

export const GIChatroomAlreadyMemberError: typeof Error = ChelErrorGenerator('GIChatroomAlreadyMemberError')
export const GIChatroomNotMemberError: typeof Error = ChelErrorGenerator('GIChatroomNotMemberError')

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

function messageReceivePostEffect ({
  contractID, messageHash, height, text,
  isDMOrMention, messageType, memberID, chatRoomName
}: {
  contractID: string,
  messageHash: string,
  height: number,
  text: string,
  messageType: string,
  isDMOrMention: boolean,
  memberID: string,
  chatRoomName: string
}): void {
  const rootGetters = sbp('state/vuex/getters')
  const isDirectMessage = rootGetters.isDirectMessage(contractID)
  const shouldAddToUnreadMessages = isDMOrMention || [MESSAGE_TYPES.INTERACTIVE, MESSAGE_TYPES.POLL].includes(messageType)

  if (shouldAddToUnreadMessages) {
    sbp('gi.actions/kv/addChatRoomUnreadMessage', { contractID, messageHash, createdHeight: height })
  }

  if (sbp('chelonia/contract/isSyncing', contractID)) {
    return
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
    body: messageType === MESSAGE_TYPES.TEXT ? swapMentionIDForDisplayname(text) : L('New message'),
    icon,
    path
  })
  shouldSoundMessage && sbp('okTurtles.events/emit', MESSAGE_RECEIVE)
}

async function deleteEncryptedFiles (manifestCids: string | string[], option: Object) {
  if (Object.values(option).reduce((a, c) => a || c, false)) {
    if (!Array.isArray(manifestCids)) {
      manifestCids = [manifestCids]
    }
    await sbp('gi.actions/identity/removeFiles', { manifestCids, option })
  }
}

function addMessage (state, message) {
  state.messages.push(message)
  // NOTE: 'renderingContext' attribute is not original attribute which is set in Chat page
  if (state.renderingContext) {
    return
  }
  while (state.messages.length > CHATROOM_MAX_MESSAGES) {
    state.messages.shift()
  }
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
    chatRoomRecentMessages (state, getters) {
      return getters.currentChatRoomState.messages || []
    },
    chatRoomPinnedMessages (state, getters) {
      return (getters.currentChatRoomState.pinnedMessages || []).sort((a, b) => a.height < b.height ? 1 : -1)
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
          messages: [],
          pinnedMessages: []
        }, data)
        for (const key in initialState) {
          Vue.set(state, key, initialState[key])
        }
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

        if (!state.renderingContext) {
          if (!state.members) {
            Vue.set(state, 'members', {})
          }
          if (state.members[memberID]) {
            throw new GIChatroomAlreadyMemberError(`Can not join the chatroom which ${memberID} is already part of`)
          }
        }

        Vue.set(state.members, memberID, { joinedDate: meta.createdDate })

        // NOTE: this patch solves the issue of the action failing to process.
        //       when the contract was not fully synced because some encryption keys are missing.
        //       this normally happens when the user (not a member of PRIVATE chatroom)
        //       is trying to sync the contract.
        //       this comment works same for another checks like `if (!state.members)` of above and below codes
        if (!state.attributes) return

        if (state.attributes.type === CHATROOM_TYPES.DIRECT_MESSAGE) {
          // NOTE: we don't make notification message for joining in direct messages
          return
        }

        const notificationType = memberID === innerSigningContractID ? MESSAGE_NOTIFICATIONS.JOIN_MEMBER : MESSAGE_NOTIFICATIONS.ADD_MEMBER
        const notificationData = createNotificationData(
          notificationType,
          notificationType === MESSAGE_NOTIFICATIONS.ADD_MEMBER ? { memberID, actorID: innerSigningContractID } : { memberID }
        )
        addMessage(state, createMessage({ meta, hash, height, state, data: notificationData, innerSigningContractID }))
      },
      sideEffect ({ data, contractID, hash, height, meta, innerSigningContractID }, { state }) {
        sbp('chelonia/queueInvocation', contractID, () => {
          const rootGetters = sbp('state/vuex/getters')
          const state = sbp('state/vuex/state')[contractID]
          const loggedIn = sbp('state/vuex/state').loggedIn
          const memberID = data.memberID || innerSigningContractID

          if (!state?.members?.[memberID]) {
            return
          }

          if (memberID === loggedIn.identityContractID) {
            sbp('gi.actions/kv/initChatRoomUnreadMessages', {
              contractID, messageHash: hash, createdHeight: height
            })

            // subscribe to founder's IdentityContract & everyone else's
            const profileIds = Object.keys(state.members).filter((id) =>
              id !== loggedIn.identityContractID && !rootGetters.ourContactProfilesById[id]
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
      validate: actionRequireInnerSignature((data, { state, message: { innerSigningContractID } }) => {
        objectOf({ name: string })(data)

        if (state.attributes.creatorID !== innerSigningContractID) {
          throw new TypeError(L('Only the channel creator can rename.'))
        }
      }),
      process ({ data, meta, hash, height, innerSigningContractID }, { state }) {
        Vue.set(state.attributes, 'name', data.name)

        const notificationData = createNotificationData(MESSAGE_NOTIFICATIONS.UPDATE_NAME, {})
        const newMessage = createMessage({ meta, hash, height, data: notificationData, state, innerSigningContractID })
        state.messages.push(newMessage)
      }
    },
    'gi.contracts/chatroom/changeDescription': {
      validate: actionRequireInnerSignature((data, { state, message: { innerSigningContractID } }) => {
        objectOf({ description: string })(data)

        if (state.attributes.creatorID !== innerSigningContractID) {
          throw new TypeError(L('Only the channel creator can change description.'))
        }
      }),
      process ({ data, meta, hash, height, innerSigningContractID }, { state }) {
        Vue.set(state.attributes, 'description', data.description)
        const notificationData = createNotificationData(MESSAGE_NOTIFICATIONS.UPDATE_DESCRIPTION, {})
        addMessage(state, createMessage({ meta, hash, height, state, data: notificationData, innerSigningContractID }))
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
        if (!state.renderingContext) {
          if (!state.members) {
            throw new Error('Missing members state')
          } else if (!state.members[memberID]) {
            throw new GIChatroomNotMemberError(`Can not leave the chatroom ${contractID} which ${memberID} is not part of`)
          }
        }

        Vue.delete(state.members, memberID)

        if (state.attributes.type === CHATROOM_TYPES.DIRECT_MESSAGE) {
          // NOTE: we don't make notification message for leaving in direct messages
          return
        }

        const notificationType = !isKicked ? MESSAGE_NOTIFICATIONS.LEAVE_MEMBER : MESSAGE_NOTIFICATIONS.KICK_MEMBER
        const notificationData = createNotificationData(notificationType, { memberID })
        addMessage(state, createMessage({
          meta,
          hash,
          height,
          data: notificationData,
          state,
          // Special case for a memberID being removed using the group's CSK
          // This way, we show the 'Member left' notification instead of the
          // 'kicked' notification
          innerSigningContractID: !isKicked ? memberID : innerSigningContractID
        }))
      },
      sideEffect ({ data, hash, contractID, meta, innerSigningContractID }) {
        const rootState = sbp('state/vuex/state')
        const memberID = data.memberID || innerSigningContractID
        const itsMe = memberID === rootState.loggedIn.identityContractID

        // NOTE: we don't add this 'if' statement in the queuedInvocation
        //       because these should not be running while rejoining
        if (itsMe) {
          leaveChatRoom(contractID)
        }

        sbp('chelonia/queueInvocation', contractID, () => {
          const state = rootState[contractID]
          if (!state || !!state.members?.[data.memberID]) {
            return
          }

          if (!itsMe && state.attributes.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE) {
            sbp('gi.contracts/chatroom/rotateKeys', contractID, state)
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
      sideEffect ({ meta, contractID }) {
        // NOTE: make sure *not* to await on this, since that can cause
        //       a potential deadlock. See same warning in sideEffect for
        //       'gi.contracts/group/removeMember'
        leaveChatRoom(contractID)
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
        const existingMsg = state.messages.find(msg => (msg.hash === hash))

        if (!existingMsg) {
          // If no existing message, simply add it to the messages array.
          const pending = direction === 'outgoing'
          addMessage(state, createMessage({ meta, data, hash, height, state, pending, innerSigningContractID }))
        } else if (direction !== 'outgoing') {
          // If an existing message is found, it's no longer pending.
          Vue.delete(existingMsg, 'pending')
        }
      },
      sideEffect ({ contractID, hash, height, meta, data, innerSigningContractID }, { state, getters }) {
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
          height: newMessage.height,
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
        createdHeight: number,
        text: string
      })),
      process ({ data, meta }, { state }) {
        const { hash, text } = data
        const fnEditMessage = (message) => {
          Vue.set(message, 'text', text)
          Vue.set(message, 'updatedDate', meta.createdDate)

          if (state.renderingContext && message.pending) {
            // NOTE: 'pending' message attribute is not the original message attribute
            //       and it is only set and used in Chat page
            Vue.delete(message, 'pending')
          }
        }

        [state.messages, state.pinnedMessages].forEach(messageArray => {
          const msgIndex = findMessageIdx(hash, messageArray)
          if (msgIndex >= 0) {
            fnEditMessage(messageArray[msgIndex])
          }
        })
      },
      sideEffect ({ contractID, data, innerSigningContractID }, { getters }) {
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
            height: data.createdHeight,
            text: data.text,
            isDMOrMention: isMentionedMe,
            messageType: MESSAGE_TYPES.TEXT,
            memberID: innerSigningContractID,
            chatRoomName: getters.chatRoomAttributes.name
          })
        } else if (!isMentionedMe) {
          sbp('gi.actions/kv/removeChatRoomUnreadMessage', { contractID, messageHash: data.hash })
        }
      }
    },
    'gi.contracts/chatroom/deleteMessage': {
      validate: actionRequireInnerSignature((data, { state, message: { innerSigningContractID }, contractID }) => {
        objectOf({
          hash: string,
          // NOTE: manifestCids of the attachments which belong to the message
          //       if the message is deleted, those attachments should be deleted too
          manifestCids: arrayOf(string),
          messageSender: string
        })(data)

        if (innerSigningContractID !== data.messageSender) {
          if (state.attributes.type === CHATROOM_TYPES.DIRECT_MESSAGE) {
            throw new TypeError(L('Only the person who sent the message can delete it.'))
          } else {
            const groupID = sbp('state/vuex/getters').groupIdFromChatRoomId(contractID)
            if (sbp('state/vuex/state')[groupID]?.groupOwnerID !== innerSigningContractID) {
              throw new TypeError(L('Only the group creator and the person who sent the message can delete it.'))
            }
          }
        }
      }),
      process ({ data, innerSigningContractID }, { state }) {
        [state.messages, state.pinnedMessages].forEach(messageArray => {
          const msgIndex = findMessageIdx(data.hash, messageArray)
          if (msgIndex >= 0) {
            messageArray.splice(msgIndex, 1)
          }

          // filter replied messages and check if the current message is original
          for (const message of messageArray) {
            if (message.replyingMessage?.hash === data.hash) {
              message.replyingMessage.hash = null
              message.replyingMessage.text = L('Original message was removed by {user}', {
                user: makeMentionFromUserID(innerSigningContractID).me
              })
            }
          }
        })
      },
      sideEffect ({ data, contractID, innerSigningContractID }) {
        const rootState = sbp('state/vuex/state')
        const me = rootState.loggedIn.identityContractID

        if (rootState.chatroom.chatRoomScrollPosition[contractID] === data.hash) {
          sbp('state/vuex/commit', 'setChatRoomScrollPosition', {
            chatRoomID: contractID, messageHash: null
          })
        }

        if (data.manifestCids.length) {
          const option = {
            shouldDeleteFile: me === innerSigningContractID,
            shouldDeleteToken: me === data.messageSender
          }
          deleteEncryptedFiles(data.manifestCids, option).catch(e => {
            console.error(`[gi.contracts/chatroom/deleteMessage/sideEffect] (${contractID}):`, e)
          })
        }

        if (me === innerSigningContractID) {
          return
        }

        // NOTE: ignore to check if the existance of current message (data.hash)
        //       because if not exist, removeChatRoomUnreadMessage won't do anything
        sbp('gi.actions/kv/removeChatRoomUnreadMessage', { contractID, messageHash: data.hash })
      }
    },
    'gi.contracts/chatroom/deleteAttachment': {
      validate: actionRequireInnerSignature(objectOf({
        hash: string,
        manifestCid: string,
        messageSender: string
      })),
      process ({ data }, { state }) {
        const fnDeleteAttachment = (message) => {
          const oldAttachments = message.attachments
          if (Array.isArray(oldAttachments)) {
            const newAttachments = oldAttachments.filter(attachment => {
              return attachment.downloadData.manifestCid !== data.manifestCid
            })
            Vue.set(message, 'attachments', newAttachments)
          }
        }

        [state.messages, state.pinnedMessages].forEach(messageArray => {
          const msgIndex = findMessageIdx(data.hash, messageArray)
          if (msgIndex >= 0) {
            fnDeleteAttachment(messageArray[msgIndex])
          }
        })
      },
      sideEffect ({ data, contractID, innerSigningContractID }) {
        const me = sbp('state/vuex/state').loggedIn.identityContractID
        const option = {
          shouldDeleteFile: me === innerSigningContractID,
          shouldDeleteToken: me === data.messageSender
        }
        deleteEncryptedFiles(data.manifestCid, option).catch(e => {
          console.error(`[gi.contracts/chatroom/deleteAttachment/sideEffect] (${contractID}):`, e)
        })
      }
    },
    'gi.contracts/chatroom/makeEmotion': {
      validate: actionRequireInnerSignature(objectOf({
        hash: string,
        emoticon: string
      })),
      process ({ data, innerSigningContractID }, { state }) {
        const { hash, emoticon } = data

        const fnMakeEmotion = (message) => {
          let emoticons = cloneDeep(message.emoticons || {})
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
            Vue.set(message, 'emoticons', emoticons)
          } else {
            Vue.delete(message, 'emoticons')
          }
        }

        [state.messages, state.pinnedMessages].forEach(messageArray => {
          const msgIndex = findMessageIdx(hash, messageArray)
          if (msgIndex >= 0) {
            fnMakeEmotion(messageArray[msgIndex])
          }
        })
      }
    },
    'gi.contracts/chatroom/voteOnPoll': {
      validate: actionRequireInnerSignature(objectOf({
        hash: string,
        votes: arrayOf(string),
        votesAsString: string
      })),
      process ({ data, meta, hash, height, innerSigningContractID }, { state }) {
        let shouldHideVoters = false

        const fnVoteOnPoll = (message) => {
          const myVotes = data.votes
          const pollData = message.pollData
          const optsCopy = cloneDeep(pollData.options)

          myVotes.forEach(optId => {
            optsCopy.find(x => x.id === optId)?.voted.push(innerSigningContractID)
          })

          Vue.set(message, 'pollData', { ...pollData, options: optsCopy })

          // TODO: https://github.com/okTurtles/group-income/issues/2010
          shouldHideVoters = shouldHideVoters || message.pollData.hideVoters
        }

        [state.messages, state.pinnedMessages].forEach(messageArray => {
          const msgIndex = findMessageIdx(data.hash, messageArray)
          if (msgIndex >= 0) {
            fnVoteOnPoll(messageArray[msgIndex])
          }
        })

        if (!shouldHideVoters) {
          // create & add a notification-message for user having voted.
          const notificationData = createNotificationData(
            MESSAGE_NOTIFICATIONS.VOTE_ON_POLL,
            {
              votedOptions: data.votesAsString,
              pollMessageHash: data.hash
            }
          )
          addMessage(state, createMessage({ meta, hash, height, state, data: notificationData, innerSigningContractID }))
        }
      }
    },
    'gi.contracts/chatroom/changeVoteOnPoll': {
      validate: actionRequireInnerSignature(objectOf({
        hash: string,
        votes: arrayOf(string),
        votesAsString: string
      })),
      process ({ data, meta, hash, height, innerSigningContractID }, { state }) {
        let shouldHideVoters = false

        const fnChangeVoteOnPoll = (message) => {
          const myUpdatedVotes = data.votes
          const pollData = message.pollData
          const optsCopy = cloneDeep(pollData.options)

          // remove all the previous votes of the user before update.
          optsCopy.forEach(opt => {
            opt.voted = opt.voted.filter(votername => votername !== innerSigningContractID)
          })

          myUpdatedVotes.forEach(optId => {
            optsCopy.find(x => x.id === optId)?.voted.push(innerSigningContractID)
          })

          Vue.set(message, 'pollData', { ...pollData, options: optsCopy })

          // TODO: https://github.com/okTurtles/group-income/issues/2010
          shouldHideVoters = shouldHideVoters || message.pollData.hideVoters
        }

        [state.messages, state.pinnedMessages].forEach(messageArray => {
          const msgIndex = findMessageIdx(data.hash, messageArray)
          if (msgIndex >= 0) {
            fnChangeVoteOnPoll(messageArray[msgIndex])
          }
        })

        if (!shouldHideVoters) {
          // create & add a notification-message for user having update his/her votes.
          const notificationData = createNotificationData(
            MESSAGE_NOTIFICATIONS.CHANGE_VOTE_ON_POLL,
            {
              votedOptions: data.votesAsString,
              pollMessageHash: data.hash
            }
          )
          addMessage(state, createMessage({ meta, hash, height, state, data: notificationData, innerSigningContractID }))
        }
      }
    },
    'gi.contracts/chatroom/closePoll': {
      validate: actionRequireInnerSignature(objectOf({
        hash: string
      })),
      process ({ data }, { state }) {
        const fnClosePoll = (message) => {
          Vue.set(message.pollData, 'status', POLL_STATUS.CLOSED)
        }

        [state.messages, state.pinnedMessages].forEach(messageArray => {
          const msgIndex = findMessageIdx(data.hash, messageArray)
          if (msgIndex >= 0) {
            fnClosePoll(messageArray[msgIndex])
          }
        })
      }
    },
    'gi.contracts/chatroom/pinMessage': {
      validate: actionRequireInnerSignature(objectOf({
        message: object
      })),
      process ({ data, innerSigningContractID }, { state }) {
        const { message } = data
        state.pinnedMessages.unshift(message)

        const msgIndex = findMessageIdx(message.hash, state.messages)
        if (msgIndex >= 0) {
          Vue.set(state.messages[msgIndex], 'pinnedBy', innerSigningContractID)
        }
      }
    },
    'gi.contracts/chatroom/unpinMessage': {
      validate: actionRequireInnerSignature(objectOf({
        hash: string
      })),
      process ({ data }, { state }) {
        const pinnedMsgIndex = findMessageIdx(data.hash, state.pinnedMessages)
        if (pinnedMsgIndex >= 0) {
          state.pinnedMessages.splice(pinnedMsgIndex, 1)
        }

        const msgIndex = findMessageIdx(data.hash, state.messages)
        if (msgIndex >= 0) {
          Vue.delete(state.messages[msgIndex], 'pinnedBy')
        }
      }
    }
  },
  methods: {
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
