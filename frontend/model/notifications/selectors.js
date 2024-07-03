'use strict'

import sbp from '@sbp/sbp'
import type { Notification, NotificationData, NotificationTemplate } from './types.flow.js'
import * as keys from './mutationKeys.js'
import templates from './templates.js'
import { makeNotificationHash } from './utils.js'

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
    sbp('gi.actions/identity/kv/addNotificationStatus', notification)
    sbp('state/vuex/commit', keys.ADD_NOTIFICATION, notification)
  },
  'gi.notifications/markAsRead' (notification: Notification) {
    sbp('gi.actions/identity/kv/markNotificationStatusRead', notification.hash)
  },
  'gi.notifications/markAllAsRead' (groupID: string) {
    const notifications = groupID
      ? sbp('state/vuex/getters').unreadGroupNotificationsFor(groupID)
      : sbp('state/vuex/getters').currentUnreadNotifications
    const hashes = notifications.map(item => item.hash)
    sbp('gi.actions/identity/kv/markNotificationStatusRead', hashes)
  }
})
