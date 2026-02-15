'use strict'

import sbp from '@sbp/sbp'
import { cloneDeep } from 'turtledash'
import getters from './getters.js'
import Vue from 'vue'

const defaultState = {
  currentChatRoomIDs: {}, // { [groupId | 'global-dm']: currentChatRoomId }
  pendingChatRoomIDs: {}, // { [groupId]: currentChatRoomId }
  chatRoomScrollPosition: {}, // [chatRoomID]: messageHash
  unreadMessages: null, // [chatRoomID]: { readUntil: { messageHash, createdHeight, isManuallyMarked?: boolean }, unreadMessages: [{ messageHash, createdHeight }]}
  chatNotificationSettings: {} // { [chatRoomID]: { messageNotification: MESSAGE_NOTIFY_SETTINGS, messageSound: MESSAGE_NOTIFY_SETTINGS } }
}

// mutations
const mutations = {
  setCurrentChatRoomId (state, { groupID, chatRoomID, isForGlobalDM = false }) {
    const rootState = sbp('state/vuex/state')

    if (isForGlobalDM) {
      if (chatRoomID) {
        Vue.set(state.currentChatRoomIDs, 'global-dm', chatRoomID)
      } else {
        Vue.set(state.currentChatRoomIDs, 'global-dm', null)
      }
    } else if (groupID && rootState[groupID]) {
      if (chatRoomID) {
        Vue.set(state.currentChatRoomIDs, groupID, chatRoomID)
      } else {
        Vue.set(state.currentChatRoomIDs, groupID, rootState[groupID].generalChatRoomId || null)
      }
      Vue.delete(state.pendingChatRoomIDs, groupID)
    } else {
      if (chatRoomID) {
        Vue.set(state.currentChatRoomIDs, rootState.currentGroupId, chatRoomID)
      } else {
        Vue.set(state.currentChatRoomIDs, rootState.currentGroupId, null)
      }
      Vue.delete(state.pendingChatRoomIDs, rootState.currentGroupId)
    }
  },
  setPendingChatRoomId (state, { groupID, chatRoomID }) {
    const rootState = sbp('state/vuex/state')
    const rootGetters = sbp('state/vuex/getters')

    if (rootGetters.isJoinedChatRoom(chatRoomID)) {
      mutations.setCurrentChatRoomId(state, { groupID, chatRoomID })
      return
    }

    if (groupID && rootState[groupID]) {
      if (chatRoomID) {
        Vue.set(state.pendingChatRoomIDs, groupID, chatRoomID)
      } else {
        Vue.set(state.pendingChatRoomIDs, groupID, null)
      }
    }
  },
  setUnreadMessages (state, value) {
    Vue.set(state, 'unreadMessages', value)
  },
  setChatRoomScrollPosition (state, { chatRoomID, messageHash }) {
    Vue.set(state.chatRoomScrollPosition, chatRoomID, messageHash)
  },
  deleteChatRoomScrollPosition (state, { chatRoomID }) {
    Vue.delete(state.chatRoomScrollPosition, chatRoomID)
  },
  setChatroomNotificationSettings (state, { chatRoomID, settings }) {
    if (chatRoomID) {
      if (!state.chatNotificationSettings[chatRoomID]) {
        Vue.set(state.chatNotificationSettings, chatRoomID, {})
      }
      for (const key in settings) {
        Vue.set(state.chatNotificationSettings[chatRoomID], key, settings[key])
      }
    }
  }
}

export default ({
  state: () => cloneDeep(defaultState),
  getters,
  mutations
}: Object)
