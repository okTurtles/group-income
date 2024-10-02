'use strict'

import sbp from '@sbp/sbp'
import type { Notification, NotificationData, NotificationTemplate } from './types.flow.js'
import templates from './templates.js'
import { makeNotificationHash } from './utils.js'
import { CHELONIA_STATE_MODIFIED, NOTIFICATION_EMITTED, NOTIFICATION_REMOVED, NOTIFICATION_STATUS_LOADED } from '~/frontend/utils/events.js'

/*
 * NOTE: do not refactor occurences of `sbp('state/vuex/state')` by defining a shared constant in the
 *   outer scope, because login actions might invalidate it by calling `replaceState()`.
 */
sbp('sbp/selectors/register', {
  /*
   * Creates and dispatches a new notification.
   * NOTE: two arguments (type, data) need to be minimal to be identifiable
   *       for each notification in order to avoid the following two problems
   *       Problem 1 - same hash for different notifications
   *       Problem 2 - different hash for the same notifications
   *       for example, adding needless 'createdDate' inside the data could cause the Problem 2
   *                    removing necessary 'createdDate' from the data could cause the Problem 1
   * https://github.com/okTurtles/group-income/pull/2129#discussion_r1659219172
   */
  'gi.notifications/emit' (type: string, data: NotificationData) {
    const template: NotificationTemplate = templates[type](data)

    if (template.scope === 'group' && !data.groupID) {
      throw new TypeError('Incomplete notification data: `data.groupID` is required.')
    }

    // Creates the notification object in a single step.
    const notification = {
      ...template,
      hash: makeNotificationHash({ ...data, type }),
      avatarUserID: template.avatarUserID || sbp('state/vuex/getters').ourIdentityContractId,
      // Sets 'groupID' if this notification only pertains to a certain group.
      ...(template.scope === 'group' ? { groupID: data.groupID } : {}),
      // Store integer timestamps rather than ISO strings here to make age comparisons easier.
      timestamp: data.createdDate ? new Date(data.createdDate).getTime() : Date.now(),
      type
    }
    const rootState = sbp('chelonia/rootState')
    if (!rootState.notifications) {
      rootState.notifications = { items: [], status: {} }
    }
    if (rootState.notifications.items.some(item => item.hash === notification.hash)) {
      // We cannot throw here, as this code might be called from within a contract side effect.
      return console.error('This notification is already in the store.')
    }
    const index = rootState.notifications.items.findLastIndex(item => item.timestamp < notification.timestamp)
    rootState.notifications.items.splice(Math.max(0, index), 0, notification)
    sbp('okTurtles.events/emit', CHELONIA_STATE_MODIFIED)
    sbp('gi.actions/identity/kv/addNotificationStatus', notification)
    sbp('okTurtles.events/emit', NOTIFICATION_EMITTED, notification)
  },
  'gi.notifications/markAsRead' (notification: Notification) {
    sbp('gi.actions/identity/kv/markNotificationStatusRead', notification.hash)
  },
  'gi.notifications/markAllAsRead' (groupID: string) {
    const rootState = sbp('chelonia/rootState')
    if (!rootState.notifications) return
    const hashes = rootState.notifications.items.filter(item => {
      return !item.read && (!groupID || !item.groupID || item.groupID === groupID)
    }).map(item => item.hash)
    sbp('gi.actions/identity/kv/markNotificationStatusRead', hashes)
  },
  'gi.notifications/remove' (hashes: string | string[]) {
    if (!Array.isArray(hashes)) hashes = [hashes]
    const rootState = sbp('chelonia/rootState')
    if (!rootState.notifications) return
    const hashesSet = new Set(hashes)
    const indices = rootState.notifications.items.map((item, index) => {
      if (hashesSet.has(item.hash)) {
        hashesSet.delete(item.hash)
        return index
      }
      return false
    }).filter(Boolean).sort().map((v, i) => v - i)
    indices.forEach((index) => rootState.notifications.items.splice(index, 1))
    sbp('okTurtles.events/emit', NOTIFICATION_REMOVED, hashes)
  },
  'gi.notifications/setNotificationStatus' (status) {
    const rootState = sbp('chelonia/rootState')
    if (!rootState.notifications) {
      rootState.notifications = { items: [], status: {} }
    }
    rootState.notifications.status = status
    sbp('okTurtles.events/emit', CHELONIA_STATE_MODIFIED)
    sbp('okTurtles.events/emit', NOTIFICATION_STATUS_LOADED, status)
  }
})
