'use strict'

import type { Notification } from './types.flow.js'

import sbp from '@sbp/sbp'

import './selectors.js'
import { compareOnTimestamp, isNew, isOlder } from './utils.js'
import * as keys from './mutationKeys.js'

const getters = {
  // Notifications relevant to the current group only.
  currentGroupNotifications (state, getters, rootState) {
    return state.filter(item => item.groupID === rootState.currentGroupId)
  },

  // Notifications relevant to a specific group.
  notificationsByGroup (state) {
    return groupID => state.filter(item => item.groupID === groupID)
  },

  currentGroupUnreadNotificationCount (state, getters) {
    return getters.currentGroupUnreadNotifications.length
  },

  // Unread notifications relevant to the current group only.
  currentGroupUnreadNotifications (state, getters, rootState) {
    return getters.currentGroupNotifications.filter(item => !item.read)
  },

  currentNewNotifications (state, getters) {
    return getters.currentNotifications.filter(isNew)
  },

  currentNotificationCount (state, getters) {
    return getters.currentNotifications.length
  },

  // Notifications relevant to the current group, plus notifications that don't belong to any group in particular.
  currentNotifications (state, getters, rootState) {
    return state.filter(item => !item.groupID || item.groupID === rootState.currentGroupId)
  },

  currentOlderNotifications (state, getters) {
    return getters.currentNotifications.filter(isOlder)
  },

  currentUnreadNotificationCount (state, getters) {
    return getters.currentNotifications.filter(item => !item.read).length
  },

  currentUnreadNotifications (state, getters) {
    return getters.currentNotifications.filter(item => !item.read)
  },

  totalUnreadNotificationCount (state, getters) {
    return state.filter(item => !item.read).length
  },

  // Finds what number to display on a group's avatar badge in the sidebar. Used in GroupsList.vue.
  unreadGroupNotificationCountFor (state, getters) {
    return (groupID) => getters.unreadGroupNotificationsFor(groupID).length
  },

  unreadGroupNotificationsFor (state, getters, rootState) {
    return (groupID) => (
      groupID === rootState.currentGroupId
        ? getters.currentGroupUnreadNotifications
        : state.filter(item => !item.read && item.groupID === groupID)
    )
  }
}

const mutations = {
  // Seems necessary because the red badge would not clear upon signing up a new user in Cypress via the bypassUI mechanism.
  logout (state) {
    state.splice(0, state.length)
  },

  [keys.ADD_NOTIFICATION] (state, notification: Notification) {
    if (state.includes(notification)) {
      // We cannot throw here, as this code might be called from within a contract side effect.
      return console.error('This notification is already in the store.')
    }
    state.push(notification)
    // Sort items in chronological order, newest items first.
    state.sort(compareOnTimestamp)
  },

  [keys.MARK_NOTIFICATION_AS_READ] (state, notification: Notification) {
    notification.read = true
  },

  // Clears the bell icon's badge, as well as the current group avatar's badge in the sidebar if visible.
  [keys.MARK_ALL_NOTIFICATIONS_AS_READ] (state, groupID = '') {
    const markItemRead = item => { item.read = true }
    if (groupID) {
      sbp('state/vuex/getters').unreadGroupNotificationsFor(groupID).forEach(markItemRead)
    } else {
      sbp('state/vuex/getters').currentUnreadNotifications.forEach(markItemRead)
    }
  },

  [keys.REMOVE_NOTIFICATION] (state, notification: Notification) {
    const index = state.indexOf(notification)

    if (index > -1) {
      state.splice(index, 1)
    }
  },

  [keys.REMOVE_ALL_NOTIFICATIONS] (state) {
    // Just setting the length to zero wouldn't update the view immediately.
    state.splice(0, state.length)
  },

  // Used upon successful login, with notifications from local storage.
  [keys.SET_NOTIFICATIONS] (state, notifications: Notification[]) {
    state.splice(0, state.length, ...notifications)
  }
}

export default ({
  state: () => [],
  getters,
  mutations
}: Object)
