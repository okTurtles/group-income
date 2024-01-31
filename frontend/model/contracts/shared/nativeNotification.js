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

  // TODO FIXME: TEMPORARILY DISABLED AS IT CAUSES AN ERROR DURING THE TESTS
  if (isNaN(1) && Notification.permission === 'granted') {
    await sbp('service-worker/setup-push-subscription').catch((e) => {
      // TODO: Temporary until this is better addressed. When running tests,
      // it results in an AbortError.
      console.error('Error setting up service worker', e)
    })
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
