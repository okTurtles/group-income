'use strict'

import type { Notification, NotificationData } from './types.flow.js'

import sbp from '@sbp/sbp'
import * as keys from './mutationKeys.js'
import templates from './templates.js'

/*
 * NOTE: do not refactor occurences of `sbp('state/vuex/state')` by defining a shared constant in the
 *   outer scope, because login actions might invalidate it by calling `replaceState()`.
 */
sbp('sbp/selectors/register', {
  // Creates and dispatches a new notification.
  'gi.notifications/emit' (type: string, data: NotificationData) {
    const template = templates[type](data)

    if (template.scope === 'group' && !data.groupID) {
      throw new TypeError('Incomplete notification data: `data.groupID` is required.')
    }

    // Creates the notification object in a single step.
    const notification = {
      ...template,
      avatarUserID: template.avatarUserID || sbp('state/vuex/getters').ourIdentityContractId,
      // Sets 'groupID' if this notification only pertains to a certain group.
      ...(template.scope === 'group' ? { groupID: data.groupID } : {}),
      read: false,
      // Store integer timestamps rather than ISO strings here to make age comparisons easier.
      timestamp: data.createdDate ? new Date(data.createdDate).getTime() : Date.now(),
      type
    }
    sbp('state/vuex/commit', keys.ADD_NOTIFICATION, notification)
  },

  'gi.notifications/markAsRead' (notification: Notification) {
    sbp('state/vuex/commit', keys.MARK_NOTIFICATION_AS_READ, notification)
  },

  'gi.notifications/markAllAsRead' (groupID: string) {
    sbp('state/vuex/commit', keys.MARK_ALL_NOTIFICATIONS_AS_READ, groupID)
  }
})
