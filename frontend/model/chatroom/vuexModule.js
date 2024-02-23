'use strict'

import sbp from '@sbp/sbp'
import { Vue } from '@common/common.js'
import { merge, cloneDeep, union } from '@model/contracts/shared/giLodash.js'
import { MESSAGE_NOTIFY_SETTINGS, MESSAGE_TYPES } from '@model/contracts/shared/constants.js'
const defaultState = {
  currentChatRoomIDs: {}, // { [groupId]: currentChatRoomId }
  chatRoomScrollPosition: {}, // [chatRoomId]: messageHash
  chatRoomUnread: {}, // [chatRoomId]: { readUntil: { messageHash, createdDate }, messages: [{ messageHash, createdDate, type, deletedDate? }]}
  chatNotificationSettings: {} // { messageNotification: MESSAGE_NOTIFY_SETTINGS, messageSound: MESSAGE_NOTIFY_SETTINGS }
}

// getters
const getters = {
  currentChatRoomId (state, getters, rootState) {
    return state.currentChatRoomIDs[rootState.currentGroupId] || null
  },
  currentChatRoomState (state, getters, rootState) {
    return rootState[getters.currentChatRoomId] || {} // avoid "undefined" vue errors at inoportune times
  },
  chatNotificationSettings (state) {
    return Object.assign({
      default: {
        messageNotification: MESSAGE_NOTIFY_SETTINGS.DIRECT_MESSAGES,
        messageSound: MESSAGE_NOTIFY_SETTINGS.DIRECT_MESSAGES
      }
    }, state.chatNotificationSettings || {})
  },
  ourGroupDirectMessages (state, getters, rootState) {
    const currentGroupDirectMessages = {}
    for (const chatRoomId of Object.keys(getters.ourDirectMessages)) {
      const chatRoomState = rootState[chatRoomId]
      const directMessageSettings = getters.ourDirectMessages[chatRoomId]

      // NOTE: skip DMs whose chatroom contracts are not synced yet
      if (!chatRoomState || !chatRoomState.members?.[getters.ourIdentityContractId]) {
        continue
      }
      // NOTE: direct messages should be filtered to the ones which are visible and of active group members
      const members = Object.keys(chatRoomState.members)
      const partners = members
        .filter(memberID => memberID !== getters.ourIdentityContractId)
        .sort((p1, p2) => {
          const p1JoinedDate = new Date(chatRoomState.members[p1].joinedDate).getTime()
          const p2JoinedDate = new Date(chatRoomState.members[p2].joinedDate).getTime()
          return p1JoinedDate - p2JoinedDate
        })
      const hasActiveMember = partners.some(memberID => Object.keys(getters.groupProfiles).includes(memberID))
      if (directMessageSettings.visible && hasActiveMember) {
        // NOTE: lastJoinedParter is chatroom member who has joined the chatroom for the last time.
        //       His profile picture can be used as the picture of the direct message
        //       possibly with the badge of the number of partners.
        const lastJoinedPartner = partners[partners.length - 1]
        currentGroupDirectMessages[chatRoomId] = {
          ...directMessageSettings,
          members,
          partners,
          lastJoinedPartner,
          // TODO: The UI should display display names, usernames and (in the future)
          // identity contract IDs differently in some way (e.g., font, font size,
          // prefix (@), etc.) to make it impossible (or at least obvious) to impersonate
          // users (e.g., 'user1' changing their display name to 'user2')
          title: partners.map(cID => getters.userDisplayNameFromID(cID)).join(', '),
          picture: getters.ourContactProfiles[lastJoinedPartner]?.picture
        }
      }
    }
    return currentGroupDirectMessages
  },
  // NOTE: this getter is used to find the ID of the direct message in the current group
  //       with the name[s] of partner[s]. Normally it's more useful to find direct message
  //       by the partners instead of contractID
  ourGroupDirectMessageFromUserIds (state, getters) {
    return (partners) => { // NOTE: string | string[]
      if (typeof partners === 'string') {
        partners = [partners]
      }
      const currentGroupDirectMessages = getters.ourGroupDirectMessages
      return Object.keys(currentGroupDirectMessages).find(chatRoomId => {
        const cPartners = currentGroupDirectMessages[chatRoomId].partners
        return cPartners.length === partners.length && union(cPartners, partners).length === partners.length
      })
    }
  },
  isDirectMessage (state, getters) {
    // NOTE: identity contract could not be synced at the time of calling this getter
    return chatRoomId => !!getters.ourGroupDirectMessages[chatRoomId || getters.currentChatRoomId]
  },
  isJoinedChatRoom (state, getters, rootState) {
    return (chatRoomId: string, memberID?: string) => !!rootState[chatRoomId]?.members?.[memberID || getters.ourIdentityContractId]
  },
  currentChatVm (state, getters, rootState) {
    return rootState?.[getters.currentChatRoomId]?._vm || null
  },
  currentChatRoomScrollPosition (state, getters) {
    return state.chatRoomScrollPosition[getters.currentChatRoomId] // undefined means to the latest
  },
  ourUnreadMessages (state, getters) {
    return state.chatRoomUnread
  },
  currentChatRoomReadUntil (state, getters) {
    // NOTE: Optional Chaining (?) is necessary when user viewing the chatroom which he is not part of
    return getters.ourUnreadMessages[getters.currentChatRoomId]?.readUntil // undefined means to the latest
  },
  chatRoomUnreadMessages (state, getters) {
    return (chatRoomId: string) => {
      // NOTE: Optional Chaining (?) is necessary when user tries to get mentions of the chatroom which he is not part of
      return getters.ourUnreadMessages[chatRoomId]?.messages || []
    }
  },
  chatRoomUnreadMentions (state, getters) {
    return (chatRoomId: string) => {
      // NOTE: Optional Chaining (?) is necessary when user tries to get mentions of the chatroom which he is not part of
      return (getters.ourUnreadMessages[chatRoomId]?.messages || []).filter(m => m.type === MESSAGE_TYPES.TEXT)
    }
  },
  groupUnreadMessages (state, getters, rootState) {
    return (groupID: string) => Object.keys(getters.ourUnreadMessages)
      .filter(cID => getters.isDirectMessage(cID) || Object.keys(rootState[groupID]?.chatRooms || {}).includes(cID))
      .map(cID => getters.ourUnreadMessages[cID].messages.length)
      .reduce((sum, n) => sum + n, 0)
  },
  groupIdFromChatRoomId (state, getters, rootState) {
    return (chatRoomId: string) => Object.keys(rootState.contracts)
      .find(cId => rootState.contracts[cId].type === 'gi.contracts/group' &&
        Object.keys(rootState[cId].chatRooms).includes(chatRoomId))
  },
  chatRoomsInDetail (state, getters, rootState) {
    const chatRoomsInDetail = merge({}, getters.getGroupChatRooms)
    for (const contractID in chatRoomsInDetail) {
      const chatRoom = rootState[contractID]
      if (chatRoom && chatRoom.attributes &&
        chatRoom.members[rootState.loggedIn.identityContractID]) {
        chatRoomsInDetail[contractID] = {
          ...chatRoom.attributes,
          id: contractID,
          unreadMessagesCount: getters.chatRoomUnreadMessages(contractID).length,
          joined: true
        }
      } else {
        const { name, privacyLevel } = chatRoomsInDetail[contractID]
        chatRoomsInDetail[contractID] = { id: contractID, name, privacyLevel, joined: false }
      }
    }
    return chatRoomsInDetail
  },
  chatRoomMembersInSort (state, getters) {
    return getters.groupMembersSorted
      .map(member => ({ contractID: member.contractID, username: member.username, displayName: member.displayName }))
      .filter(member => !!getters.chatRoomMembers[member.contractID]) || []
  }
}

// mutations
const mutations = {
  setCurrentChatRoomId (state, { groupId, chatRoomId }) {
    const rootState = sbp('state/vuex/state')

    if (groupId && state[groupId] && chatRoomId) { // useful when initialize when syncing in another device
      Vue.set(state.currentChatRoomIDs, groupId, chatRoomId)
    } else if (chatRoomId) { // set chatRoomId as the current chatroomId of current group
      Vue.set(state.currentChatRoomIDs, rootState.currentGroupId, chatRoomId)
    } else if (groupId && rootState[groupId]) { // set defaultChatRoomId as the current chatroomId of current group
      Vue.set(state.currentChatRoomIDs, rootState.currentGroupId, rootState[groupId].generalChatRoomId || null)
    } else { // reset
      Vue.set(state.currentChatRoomIDs, rootState.currentGroupId, null)
    }
  },
  setChatRoomScrollPosition (state, { chatRoomId, messageHash }) {
    Vue.set(state.chatRoomScrollPosition, chatRoomId, messageHash)
  },
  deleteChatRoomScrollPosition (state, { chatRoomId }) {
    Vue.delete(state.chatRoomScrollPosition, chatRoomId)
  },
  setChatRoomReadUntil (state, { chatRoomId, messageHash, createdDate }) {
    Vue.set(state.chatRoomUnread, chatRoomId, {
      readUntil: { messageHash, createdDate, deletedDate: null },
      messages: state.chatRoomUnread[chatRoomId].messages
        ?.filter(m => new Date(m.createdDate).getTime() > new Date(createdDate).getTime()) || []
    })
  },
  deleteChatRoomReadUntil (state, { chatRoomId, deletedDate }) {
    if (state.chatRoomUnread[chatRoomId].readUntil) {
      Vue.set(state.chatRoomUnread[chatRoomId].readUntil, 'deletedDate', deletedDate)
    }
  },
  addChatRoomUnreadMessage (state, { chatRoomId, messageHash, createdDate, type }) {
    state.chatRoomUnread[chatRoomId].messages.push({ messageHash, createdDate, type })
  },
  deleteChatRoomUnreadMessage (state, { chatRoomId, messageHash }) {
    Vue.set(
      state.chatRoomUnread[chatRoomId],
      'messages',
      state.chatRoomUnread[chatRoomId].messages.filter(m => m.messageHash !== messageHash)
    )
  },
  deleteChatRoomUnread (state, { chatRoomId }) {
    Vue.delete(state.chatRoomUnread, chatRoomId)
  },
  setChatroomNotificationSettings (state, { chatRoomId, settings }) {
    if (chatRoomId) {
      if (!state.chatNotificationSettings[chatRoomId]) {
        Vue.set(state.chatNotificationSettings, chatRoomId, {})
      }
      for (const key in settings) {
        Vue.set(state.chatNotificationSettings[chatRoomId], key, settings[key])
      }
    }
  }
}

export default ({
  state: () => cloneDeep(defaultState),
  getters,
  mutations
}: Object)
