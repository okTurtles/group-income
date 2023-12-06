'use strict'
import sbp from '@sbp/sbp'

// NOTE: since these functions don't modify contract state, it should
//       be safe to modify them without worrying about version conflicts.

export async function requestNotificationPermission ({
  force = false,
  notificationPayload = null
}: any = {}): Promise<null | string> {
  if (typeof Notification === 'undefined') {
    return null
  }

  if (force || Notification.permission === 'default') {
    try {
      sbp('state/vuex/commit', 'setNotificationEnabled', await Notification.requestPermission() === 'granted')
    } catch (e) {
      console.error('requestNotificationPermission:', e.message)
      return null
    }
  }

  if (Notification.permission === 'granted' && notificationPayload) {
    const isPushReady = await sbp('service-worker/check-push-subscription-ready')

    if (isPushReady) {
      sbp('service-worker/send-push', notificationPayload)
    } else {
      sbp('service-worker/setup-push-subscription', notificationPayload)
    }
  }

  return Notification.permission
}

export function makeNotification ({ title, body, icon, path }: {
  title: string, body: string, icon?: string, path?: string
}): void {
  if (Notification?.permission === 'granted' && sbp('state/vuex/settings').notificationEnabled) {
    const notification = new Notification(title, { body, icon })
    if (path) {
      notification.onclick = function (event) {
        sbp('controller/router').push({ path }).catch(console.warn)
      }
    }
  }
}
