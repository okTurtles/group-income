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
  return Notification.permission
}

export function makeNotification ({ title, body, icon, path }: {
  title: string, body: string, icon?: string, path?: string
}): void {
  const notificationEnabled = sbp('state/vuex/state').notificationEnabled
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !notificationEnabled) {
    return
  }

  const notification = new Notification(title, { body, icon })
  if (path) {
    notification.onclick = function (event) {
      event.preventDefault()
      sbp('controller/router').push({ path }).catch(console.warn)
    }
  }
}
