'use strict'

import Vue from 'vue'
import { cloneDeep } from '~/frontend/model/contracts/shared/giLodash.js'
import * as keys from './mutationKeys.js'
import './selectors.js'
import { MAX_AGE_READ, MAX_AGE_UNREAD } from './storageConstants.js'
import type { Notification } from './types.flow.js'
import { age, compareOnTimestamp, isNew, isOlder } from './utils.js'

const defaultState = {
  items: [], status: {}
}

const getters = {
  notifications (state, getters, rootState) {
    return state.items.map(item => {
      const notification = { ...item, ...state.status[item.hash] }
      // Notifications older than MAX_AGE_UNREAD are discarded
      if (age(notification) > MAX_AGE_UNREAD) {
        return null
      } else if (!notification.read && age(notification) > MAX_AGE_READ) {
        // Unread notifications older than MAX_AGE_READ are automatically
        // marked as read
        notification.read = true
      }
      return notification
    }).filter(Boolean)
  },
  // Notifications relevant to the current group only.
  currentGroupNotifications (state, getters, rootState) {
    return getters.notifications.filter(item => item.groupID === rootState.currentGroupId)
  },

  // Notifications relevant to a specific group.
  notificationsByGroup (state, getters) {
    return groupID => getters.notifications.filter(item => item.groupID === groupID)
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
    return getters.notifications.filter(item => !item.groupID || item.groupID === rootState.currentGroupId)
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
    return getters.notifications.filter(item => !item.read).length
  },

  // Finds what number to display on a group's avatar badge in the sidebar. Used in GroupsList.vue.
  unreadGroupNotificationCountFor (state, getters) {
    return (groupID) => getters.unreadGroupNotificationsFor(groupID).length
  },

  unreadGroupNotificationsFor (state, getters, rootState) {
    return (groupID) => (
      groupID === rootState.currentGroupId
        ? getters.currentGroupUnreadNotifications
        : getters.notifications.filter(item => !item.read && item.groupID === groupID)
    )
  }
}

const mutations = {
  // Seems necessary because the red badge would not clear upon signing up a new user in Cypress via the bypassUI mechanism.
  logout (state) {
    Object.keys(state).forEach(key => {
      Vue.delete(state, key)
    })
    Object.assign(state, cloneDeep(defaultState))
  },

  [keys.ADD_NOTIFICATION] (state, notification: Notification) {
    if (state.items.some(item => item.hash === notification.hash)) {
      // We cannot throw here, as this code might be called from within a contract side effect.
      return console.error('This notification is already in the store.')
    }
    state.items.push(notification)
    // Sort items in chronological order, newest items first.
    state.items.sort(compareOnTimestamp)
  },

  [keys.REMOVE_NOTIFICATION] (state, hash: string) {
    const index = state.items.findIndex(item => item.hash === hash)

    if (index > -1) {
      state.items.splice(index, 1)
    }
  },

  [keys.REMOVE_ALL_NOTIFICATIONS] (state) {
    // Just setting the length to zero wouldn't update the view immediately.
    state.items.splice(0, state.items.length)
  },

  // Used upon successful login, with notifications from local storage.
  [keys.SET_NOTIFICATIONS] (state, notifications: Notification[]) {
    state.items.splice(0, state.items.length, ...notifications)
  },

  setNotificationStatus (state, status) {
    state.status = status
  }
}

export default ({
  state: () => cloneDeep(defaultState),
  getters,
  mutations
}: Object)
