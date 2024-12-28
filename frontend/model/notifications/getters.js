import { MAX_AGE_READ, MAX_AGE_UNREAD } from './storageConstants.js'
import { age, isNew, isOlder } from './utils.js'

const getters: { [x: string]: (state: Object, getters: { [x: string]: any }) => any } = {
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

export default getters
