import type { Notification } from './types.flow.js'

import sbp from '~/shared/sbp.js'

import { applyStorageRules } from './utils.js'
import * as keys from './mutationKeys.js'
import templates from './templates.js'

/*
 * NOTE: do not refactor occurences of `sbp('state/vuex/state')` by defining a shared constant in the
 *   outer scope, because login actions might invalidate it by calling `replaceState()`.
 */
sbp('sbp/selectors/register', {
  // Creates and dispatches a new notification.
  'gi.notifications/emit' (type: string, data: Notification) {
    const template = templates[type]

    // Creates the notification object in a single step.
    const notification = {
      ...template(data),
      read: false,
      timestamp: Date.now(),
      type,
      username: data.username
    }
    sbp('state/vuex/commit', keys.ADD_NOTIFICATION, notification)
  },

  'gi.notifications/markAsRead' (notification: Notification) {
    sbp('state/vuex/commit', keys.MARK_NOTIFICATION_AS_READ, notification)
  },

  'gi.notifications/markAllAsRead' (notification: Notification) {
    sbp('state/vuex/commit', keys.MARK_ALL_NOTIFICATIONS_AS_READ, notification)
  },

  /*
   * Persists in-memory notifications to local offline storage,
   * possibly discarding some of them according to predefined storage rules.
   */
  async 'gi.notifications/save' () {
    const rootState = sbp('state/vuex/state')

    if (!rootState.loggedIn) throw new Error('Must be logged in to use this selector.')
    if (!rootState.loggedIn.username) throw new Error('Invalid or missing username.')

    const notificationsToSave = applyStorageRules(rootState.notifications)

    // TODO: encrypt this?
    await sbp('gi.db/notifications/save', rootState.loggedIn.username, notificationsToSave)
  }
})
