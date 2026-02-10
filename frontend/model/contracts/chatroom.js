/* globals fetchServerTime */

'use strict'

import { L } from '@common/common.js'
import sbp from '@sbp/sbp'
import { NEW_CHATROOM_SCROLL_POSITION } from '@utils/events.js'
import { actionRequireInnerSignature, arrayOf, number, object, objectOf, optional, string, stringMax } from '~/frontend/model/contracts/misc/flowTyper.js'
import { ChelErrorGenerator } from '@chelonia/lib/errors'
import {
  CHATROOM_ACTIONS_PER_PAGE,
  CHATROOM_DESCRIPTION_LIMITS_IN_CHARS,
  CHATROOM_MAX_MESSAGES,
  CHATROOM_MAX_MESSAGE_LEN,
  CHATROOM_NAME_LIMITS_IN_CHARS,
  CHATROOM_PRIVACY_LEVEL,
  CHATROOM_TYPES,
  MAX_HASH_LEN,
  MESSAGE_NOTIFICATIONS,
  MESSAGE_RECEIVE_RAW,
  MESSAGE_TYPES,
  POLL_STATUS,
  POLL_OPTION_MAX_CHARS,
  POLL_QUESTION_MAX_CHARS,
  GROUP_PERMISSIONS
} from './shared/constants.js'
import {
  createMessage,
  findMessageIdx,
  postLeaveChatRoomCleanup,
  makeMentionFromUserID,
  referenceTally
} from './shared/functions.js'
import chatroomGetters from './shared/getters/chatroom.js'
import { cloneDeep, merge } from 'turtledash'
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
    ...chatroomGetters
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
            adminIDs: [],
            membersWithDeletePermission: [],
            deletedDate: null
          },
          members: {},
          messages: [],
          pinnedMessages: []
        }, data)
        for (const key in initialState) {
          state[key] = initialState[key]
        }
      }
    },
    'gi.contracts/chatroom/join': {
      validate: actionRequireInnerSignature(objectOf({
        memberID: optional(string) // user id of joining memberID
      })),
      process ({ data, meta, hash, height, contractID, innerSigningContractID }, { state, getters }) {
        const memberID = data.memberID || innerSigningContractID

        if (!memberID) {
          throw new Error('The new member must be given either explicitly or implcitly with an inner signature')
        }

        if (!state.renderingContext) {
          if (!state.members) {
            state.members = {}
          }
          if (getters.isJoinedChatRoomForChatRoom(state, memberID)) {
            throw new GIChatroomAlreadyMemberError(`Can not join the chatroom which ${memberID} is already part of`)
          }
        }

        state.members[memberID] = { joinedDate: meta.createdDate, joinedHeight: height }

        // NOTE: this patch solves the issue of the action failing to process.
        //       when the contract was not fully synced because some encryption keys are missing.
        //       this normally happens when the user (not a member of PRIVATE chatroom)
        //       is trying to sync the contract.
        //       this comment works same for another checks like `if (!state.members)` of above and below codes
        //       https://github.com/okTurtles/group-income/pull/2147#discussion_r1680495897
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
      sideEffect ({ data, contractID, hash, meta, innerSigningContractID, height }, { state, getters }) {
        const memberID = data.memberID || innerSigningContractID
        sbp('gi.contracts/chatroom/referenceTally', contractID, memberID, 'retain')

        sbp('chelonia/queueInvocation', contractID, async () => {
          const state = await sbp('chelonia/contract/state', contractID)

          if (!getters.isJoinedChatRoomForChatRoom(state, memberID)) {
            return
          }

          const identityContractID = sbp('state/vuex/state').loggedIn.identityContractID

          if (memberID === identityContractID) {
            await sbp('gi.actions/identity/kv/initChatRoomUnreadMessages', {
              contractID, messageHash: hash, createdHeight: height
            })
          }
        }).catch((e) => {
          console.error('[gi.contracts/chatroom/join/sideEffect] Error at sideEffect', e?.message || e)
        })
      }
    },
    'gi.contracts/chatroom/rename': {
      validate: actionRequireInnerSignature((data, { state, message: { innerSigningContractID } }) => {
        objectOf({ name: stringMax(CHATROOM_NAME_LIMITS_IN_CHARS, 'name') })(data)

        if (state.attributes.creatorID !== innerSigningContractID) {
          throw new TypeError(L('Only the channel creator can rename.'))
        }
      }),
      process ({ data, meta, hash, height, innerSigningContractID }, { state }) {
        state.attributes['name'] = data.name

        const notificationData = createNotificationData(MESSAGE_NOTIFICATIONS.UPDATE_NAME, {})
        const newMessage = createMessage({ meta, hash, height, data: notificationData, state, innerSigningContractID })
        state.messages.push(newMessage)
      }
    },
    'gi.contracts/chatroom/changeDescription': {
      validate: actionRequireInnerSignature((data, { state, message: { innerSigningContractID } }) => {
        objectOf({ description: stringMax(CHATROOM_DESCRIPTION_LIMITS_IN_CHARS, 'description') })(data)

        if (state.attributes.creatorID !== innerSigningContractID) {
          throw new TypeError(L('Only the channel creator can change description.'))
        }
      }),
      process ({ data, meta, hash, height, innerSigningContractID }, { state }) {
        state.attributes['description'] = data.description
        const notificationData = createNotificationData(MESSAGE_NOTIFICATIONS.UPDATE_DESCRIPTION, {})
        addMessage(state, createMessage({ meta, hash, height, state, data: notificationData, innerSigningContractID }))
      }
    },
    'gi.contracts/chatroom/leave': {
      validate: objectOf({
        memberID: optional(string) // member to be removed
      }),
      process ({ data, meta, hash, height, contractID, innerSigningContractID }, { state, getters }) {
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
          } else if (!getters.isJoinedChatRoomForChatRoom(state, memberID)) {
            throw new GIChatroomNotMemberError(`Can not leave the chatroom ${contractID} which ${memberID} is not part of`)
          }
        }

        state.members[memberID].hasLeft = true
        // delete state.members[memberID]

        if (!state.attributes) return

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
      async sideEffect ({ data, hash, contractID, meta, innerSigningContractID }, { state, getters }) {
        const memberID = data.memberID || innerSigningContractID
        const itsMe = memberID === sbp('state/vuex/state').loggedIn.identityContractID

        // NOTE: we don't add this 'if' statement in the queuedInvocation
        //       because these should not be running while rejoining
        if (itsMe) {
          await postLeaveChatRoomCleanup(contractID, state).catch(e => {
            console.error('[gi.contracts/chatroom/leave] Error at leaveChatRoom', e)
          })
        }

        sbp('gi.contracts/chatroom/referenceTally', contractID, memberID, 'release')
        sbp('chelonia/queueInvocation', contractID, async () => {
          const state = await sbp('chelonia/contract/state', contractID)
          if (!state || getters.isJoinedChatRoomForChatRoom(state, memberID) || !state.attributes) {
            return
          }

          if (!itsMe && state.attributes.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE) {
            sbp('gi.contracts/chatroom/rotateKeys', contractID)
          }

          await sbp('gi.contracts/chatroom/removeForeignKeys', contractID, memberID, state, getters)
        }).catch((e) => {
          console.error('[gi.contracts/chatroom/leave/sideEffect] Error at sideEffect', e?.message || e)
        })
      }
    },
    'gi.contracts/chatroom/delete': {
      validate: actionRequireInnerSignature((data, { state, getters, meta, message: { innerSigningContractID } }) => {
        if (state.attributes.creatorID !== innerSigningContractID && !getters.ourGroupPermissionsHas(GROUP_PERMISSIONS.DELETE_CHANNEL)) {
          throw new TypeError(L('You do not have permission to delete this channel.'))
        }
      }),
      process ({ meta, contractID }, { state, getters }) {
        if (!state.attributes) return
        state.attributes['deletedDate'] = meta.createdDate
        const activeMemberIds = getters.chatRoomActiveMemberIdsForChatRoom(state)
        sbp('gi.contracts/chatroom/pushSideEffect', contractID,
          ['gi.contracts/chatroom/referenceTally', contractID, activeMemberIds, 'release']
        )
        for (const memberID in state.members) {
          delete state.members[memberID]
        }
      },
      async sideEffect ({ contractID }, { state }) {
        // NOTE: make sure *not* to await on this, since that can cause
        //       a potential deadlock. See same warning in sideEffect for
        //       'gi.contracts/group/removeMember'
        await postLeaveChatRoomCleanup(contractID, state)
        const me = sbp('state/vuex/state').loggedIn.identityContractID
        if (me === state.attributes.creatorID || state.attributes.adminIDs.includes(me)) {
          // The contract owner isn't part of the contract state and is managed
          // by the server. We assume that the owner is either the creator or
          // an admin, and issue the `deleteContract` request in this case.
          await sbp('chelonia/out/deleteContract', contractID, {
            [contractID]: {
              billableContractID: me
            }
          }).catch((e) => {
            // We can expect this to happen, as we're guessing who the owner
            // might be.
            console.warn('[gi.contracts/chatroom/delete] Error calling chelonia/out/deleteContract', contractID, e)
          })
        }
      }
    },
    'gi.contracts/chatroom/addMessage': {
      validate: (data, props) => {
        actionRequireInnerSignature(messageType)(data, props)

        if (data.type === MESSAGE_TYPES.POLL) {
          const optionStrings = data.pollData.options.map(o => o.value)
          if (data.pollData.question.length > POLL_QUESTION_MAX_CHARS) {
            throw new TypeError(L('Poll question must be less than {n} characters', { n: POLL_QUESTION_MAX_CHARS }))
          }
          if (optionStrings.some(v => v.length > POLL_OPTION_MAX_CHARS)) {
            throw new TypeError(L('Poll option must be less than {n} characters', { n: POLL_OPTION_MAX_CHARS }))
          }
        }
      },
      // NOTE: This function is 'reentrant' and may be called multiple times
      // for the same message and state. The `direction` attributes handles
      // these situations especially, and it's meant to mark sent-by-the-user
      // but not-yet-received-over-the-network messages.
      process ({ direction, data, meta, hash, height, innerSigningContractID }, { state }) {
        if (!state.messages) return
        const existingMsg = state.messages.find(msg => (msg.hash === hash))

        if (!existingMsg) {
          // If no existing message, simply add it to the messages array.
          const pending = direction === 'outgoing'
          addMessage(state, createMessage({ meta, data, hash, height, state, pending, innerSigningContractID }))
        } else if (direction !== 'outgoing') {
          // If an existing message is found, it's no longer pending.
          delete existingMsg['pending']
        }
      },
      sideEffect ({ contractID, hash, height, meta, data, innerSigningContractID }, { state, getters }) {
        const me = sbp('state/vuex/state').loggedIn.identityContractID

        if (me === innerSigningContractID && data.type !== MESSAGE_TYPES.INTERACTIVE) {
          return
        }

        // Ensure that this happens after everything has been initialised, i.e.,
        // after all side effects from joins and rejoins have been processed.
        // (In particular, this should happen after `kv/initChatRoomUnreadMessages`.)
        // See <https://github.com/okTurtles/group-income/issues/2780>
        sbp('chelonia/queueInvocation', contractID, async () => {
          const state = await sbp('chelonia/contract/state', contractID)
          if (!getters.isJoinedChatRoomForChatRoom(state, me)) {
            return
          }

          const newMessage = createMessage({ meta, data, hash, height, state, innerSigningContractID })
          sbp('okTurtles.events/emit', MESSAGE_RECEIVE_RAW, {
            contractID,
            data,
            innerSigningContractID,
            newMessage
          })
        })
      }
    },
    'gi.contracts/chatroom/editMessage': {
      validate: actionRequireInnerSignature(objectOf({
        hash: stringMax(MAX_HASH_LEN, 'hash'),
        createdHeight: number,
        text: stringMax(CHATROOM_MAX_MESSAGE_LEN, 'text')
      })),
      process ({ data, meta }, { state }) {
        if (!state.messages) return
        const { hash, text } = data
        const fnEditMessage = (message) => {
          message['text'] = text
          message['updatedDate'] = meta.createdDate

          if (state.renderingContext && message.pending) {
            // NOTE: 'pending' message attribute is not the original message attribute
            //       and it is only set and used in Chat page
            delete message['pending']
          }
        }

        [state.messages, state.pinnedMessages].forEach(messageArray => {
          const msgIndex = findMessageIdx(hash, messageArray)
          if (msgIndex >= 0) {
            fnEditMessage(messageArray[msgIndex])
          }
        })
      },
      sideEffect ({ contractID, hash, meta, data, innerSigningContractID }, { state, getters }) {
        const me = sbp('state/vuex/state').loggedIn.identityContractID
        if (me === innerSigningContractID || getters.chatRoomAttributes.type === CHATROOM_TYPES.DIRECT_MESSAGE) {
          return
        }

        // Ensure that this happens after everything has been initialised, i.e.,
        // after all side effects from joins and rejoins have been processed.
        sbp('chelonia/queueInvocation', contractID, async () => {
          const state = await sbp('chelonia/contract/state', contractID)
          if (!getters.isJoinedChatRoomForChatRoom(state, me)) {
            return
          }

          sbp('okTurtles.events/emit', MESSAGE_RECEIVE_RAW, {
            contractID,
            data,
            innerSigningContractID
          })
        })
      }
    },
    'gi.contracts/chatroom/deleteMessage': {
      validate: actionRequireInnerSignature((data, { state, message: { innerSigningContractID }, contractID }) => {
        objectOf({
          hash: stringMax(MAX_HASH_LEN, 'hash'),
          // NOTE: manifestCids of the attachments which belong to the message
          //       if the message is deleted, those attachments should be deleted too
          manifestCids: arrayOf(stringMax(MAX_HASH_LEN, 'manifestCids')),
          messageSender: stringMax(MAX_HASH_LEN, 'messageSender')
        })(data)

        if (innerSigningContractID !== data.messageSender) {
          if (state.attributes.type === CHATROOM_TYPES.DIRECT_MESSAGE) {
            throw new TypeError(L('Only the person who sent the message can delete it.'))
          } else if (!state.attributes.adminIDs.includes(innerSigningContractID)) {
            throw new TypeError(L('Only the group creator and the person who sent the message can delete it.'))
          }
        }
      }),
      process ({ data, innerSigningContractID }, { state }) {
        if (!state.messages) return
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
      sideEffect ({ data, contractID, innerSigningContractID }, { getters }) {
        const rootState = sbp('state/vuex/state')
        const me = rootState.loggedIn.identityContractID

        if (rootState.chatroom?.chatRoomScrollPosition?.[contractID] === data.hash) {
          sbp('okTurtles.events/emit', NEW_CHATROOM_SCROLL_POSITION, {
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
        // Ensure that this happens after everything has been initialised, i.e.,
        // after all side effects from joins and rejoins have been processed.
        sbp('chelonia/queueInvocation', contractID, async () => {
          const state = await sbp('chelonia/contract/state', contractID)
          if (!getters.isJoinedChatRoomForChatRoom(state, me)) {
            return
          }

          sbp('gi.actions/identity/kv/removeChatRoomUnreadMessage', { contractID, messageHash: data.hash }).catch(e => {
            console.error('[gi.contracts/chatroom/deleteMessage/sideEffect] Error calling removeChatRoomUnreadMessage', e)
          })
        })
      }
    },
    'gi.contracts/chatroom/deleteAttachment': {
      validate: actionRequireInnerSignature(objectOf({
        hash: stringMax(MAX_HASH_LEN, 'hash'),
        manifestCid: stringMax(MAX_HASH_LEN, 'manifestCid'),
        messageSender: stringMax(MAX_HASH_LEN, 'messageSender')
      })),
      process ({ data }, { state }) {
        if (!state.messages) return
        const fnDeleteAttachment = (message) => {
          const oldAttachments = message.attachments
          if (Array.isArray(oldAttachments)) {
            const newAttachments = oldAttachments.filter(attachment => {
              return attachment.downloadData.manifestCid !== data.manifestCid
            })
            message['attachments'] = newAttachments
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
        hash: stringMax(MAX_HASH_LEN, 'hash'),
        emoticon: string
      })),
      process ({ data, innerSigningContractID }, { state }) {
        if (!state.messages) return
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
            message['emoticons'] = emoticons
          } else {
            delete message['emoticons']
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
        hash: stringMax(MAX_HASH_LEN, 'hash'),
        votes: arrayOf(string),
        votesAsString: string
      })),
      process ({ data, meta, hash, height, innerSigningContractID }, { state }) {
        if (!state.messages) return
        const fnVoteOnPoll = (message) => {
          const myVotes = data.votes
          const pollData = message.pollData
          const optsCopy = cloneDeep(pollData.options)

          myVotes.forEach(optId => {
            optsCopy.find(x => x.id === optId)?.voted.push(innerSigningContractID)
          })

          message['pollData'] = { ...pollData, options: optsCopy }
        }

        [state.messages, state.pinnedMessages].forEach(messageArray => {
          const msgIndex = findMessageIdx(data.hash, messageArray)
          if (msgIndex >= 0) {
            fnVoteOnPoll(messageArray[msgIndex])
          }
        })
      }
    },
    'gi.contracts/chatroom/changeVoteOnPoll': {
      validate: actionRequireInnerSignature(objectOf({
        hash: string,
        votes: arrayOf(string),
        votesAsString: string
      })),
      process ({ data, meta, hash, height, innerSigningContractID }, { state }) {
        if (!state.messages) return
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

          message['pollData'] = { ...pollData, options: optsCopy }
        }

        [state.messages, state.pinnedMessages].forEach(messageArray => {
          const msgIndex = findMessageIdx(data.hash, messageArray)
          if (msgIndex >= 0) {
            fnChangeVoteOnPoll(messageArray[msgIndex])
          }
        })
      }
    },
    'gi.contracts/chatroom/closePoll': {
      validate: actionRequireInnerSignature(objectOf({
        hash: stringMax(MAX_HASH_LEN, 'hash')
      })),
      process ({ data }, { state }) {
        if (!state.messages) return
        const fnClosePoll = (message) => {
          message.pollData['status'] = POLL_STATUS.CLOSED
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
        if (!state.messages) return
        const { message } = data
        state.pinnedMessages.unshift(message)

        const msgIndex = findMessageIdx(message.hash, state.messages)
        if (msgIndex >= 0) {
          state.messages[msgIndex]['pinnedBy'] = innerSigningContractID
        }
      }
    },
    'gi.contracts/chatroom/unpinMessage': {
      validate: actionRequireInnerSignature(objectOf({
        hash: stringMax(MAX_HASH_LEN, 'hash')
      })),
      process ({ data }, { state }) {
        if (!state.messages) return
        const pinnedMsgIndex = findMessageIdx(data.hash, state.pinnedMessages)
        if (pinnedMsgIndex >= 0) {
          state.pinnedMessages.splice(pinnedMsgIndex, 1)
        }

        const msgIndex = findMessageIdx(data.hash, state.messages)
        if (msgIndex >= 0) {
          delete state.messages[msgIndex]['pinnedBy']
        }
      }
    }
  },
  methods: {
    'gi.contracts/chatroom/_cleanup': ({ contractID, state }) => {
      if (state?.members) {
        // Not using a getter because _cleanup doesn't currently take a getter
        const activeMemberIds = Object.keys(state.members).filter(memberID => !state.members[memberID].hasLeft)
        sbp('chelonia/contract/release', activeMemberIds).catch(e => {
          console.error('[gi.contracts/chatroom/_cleanup] Error calling release', contractID, e)
        })
      }
    },
    'gi.contracts/chatroom/rotateKeys': (contractID) => {
      sbp('chelonia/queueInvocation', contractID, async () => {
        await sbp('chelonia/contract/setPendingKeyRevocation', contractID, ['cek', 'csk'])
        await sbp('gi.actions/out/rotateKeys', contractID, 'gi.contracts/chatroom', 'pending', 'gi.actions/chatroom/shareNewKeys')
      }).catch(e => {
        console.warn(`rotateKeys: ${e.name} thrown during queueEvent to ${contractID}:`, e)
      })
    },
    'gi.contracts/chatroom/removeForeignKeys': async (contractID, memberID, state, getters) => {
      const keyIds = await sbp('chelonia/contract/foreignKeysByContractID', state, memberID)

      if (!keyIds?.length) return

      const CSKid = await sbp('chelonia/contract/currentKeyIdByName', state, 'csk', true)
      const CEKid = await sbp('chelonia/contract/currentKeyIdByName', state, 'cek')

      if (!CEKid) throw new Error('Missing encryption key')

      sbp('chelonia/out/keyDel', {
        contractID,
        contractName: 'gi.contracts/chatroom',
        data: keyIds,
        signingKeyId: CSKid,
        hooks: {
          preSendCheck: (_, state) => {
            // Only issue OP_KEY_DEL for non-members
            return !getters.isJoinedChatRoomForChatRoom(state, memberID)
          }
        }
      }).catch(e => {
        console.warn(`removeForeignKeys: ${e.name} thrown during queueEvent to ${contractID}:`, e)
      })
    },
    ...referenceTally('gi.contracts/chatroom/referenceTally')
  }
})
