import type { Notification } from './types.flow.js'

import './selectors.js'
import { age, isNew, isOlder } from './utils.js'
import * as keys from './mutationKeys.js'

const getters = {
  newNotifications (state, getters) {
    return state.filter(item => isNew(item))
  },

  newNotificationCount (state, getters) {
    return getters.newNotifications.length
  },

  notificationCount (state, getters) {
    return state.length
  },

  olderNotifications (state, getters) {
    return state.filter(item => isOlder(item))
  },

  olderNotificationCount (state, getters) {
    return getters.olderNotifications.length
  },

  unreadNotifications (state, getters) {
    return state.filter(item => !item.read)
  },

  unreadNotificationCount (state, getters) {
    return getters.unreadNotifications.length
  },
  // Used when there are multiple groups. Here only group-level notifications are counted.
  unreadNotificationCountForGroup (state, getters) {
    return (groupID) => state.filter(item => !item.read && item.groupID === groupID).length
  }
}

const mutations = {
  [keys.ADD_NOTIFICATION] (state, notification: Notification) {
    if (state.includes(notification)) {
      throw new Error('This notification is already in the store.')
    }
    if (state[0] && age(notification) > age(state[0])) {
      throw new Error('This notification is older than the latest one in the store.')
    }
    // Using `unshift()` here to insert the new item before older ones.
    state.unshift(notification)
  },

  [keys.MARK_NOTIFICATION_AS_READ] (state, notification: Notification) {
    notification.read = true
  },

  [keys.MARK_ALL_NOTIFICATIONS_AS_READ] (state) {
    state.forEach(item => {
      item.read = true
    })
  },

  [keys.REMOVE_NOTIFICATION] (state, notification: Notification) {
    const index = state.indexOf(notification)

    if (~index) {
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
