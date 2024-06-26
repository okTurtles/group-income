'use strict'
import sbp from '@sbp/sbp'

// NOTE: since these functions don't modify contract state, it should
//       be safe to modify them without worrying about version conflicts.

export async function requestNotificationPermission (force: boolean = false): Promise<null | string> {
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

  if (Notification.permission === 'granted') {
    await sbp('service-worker/setup-push-subscription').catch((e) => {
      console.error('Error setting up service worker', e)
    })
  }

  return Notification.permission
}

export function makeNotification ({ title, body, icon, path }: {
  title: string, body: string, icon?: string, path?: string
}): void {
  if (Notification?.permission === 'granted' && sbp('state/vuex/settings').notificationEnabled) {
    try {
      const notification = new Notification(title, { body, icon })
      if (path) {
        notification.onclick = (event) => {
          sbp('controller/router').push({ path }).catch(console.warn)
        }
      }
    } catch {
      try {
        // FIXME: find a cross-browser way to pass the 'path' parameter when the notification is clicked.
        navigator.serviceWorker?.ready.then(registration => {
          // $FlowFixMe
          registration.showNotification(title, { body, icon })
        }).catch(console.warn)
      } catch (error) {
        console.error('makeNotification: ', error.message)
      }
    }
  }
}
