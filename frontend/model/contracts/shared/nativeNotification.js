'use strict'
import sbp from '@sbp/sbp'

// NOTE: since these functions don't modify contract state, it should
//       be safe to modify them without worrying about version conflicts.

export async function requestNotificationPermission (force: boolean = false): Promise<null | string> {
  if (typeof Notification === 'undefined' ||
    (!force && Notification.permission !== 'default')) {
    return null
  }
  try {
    return await Notification.requestPermission()
  } catch (e) {
    return null
  }
}

export function makeNotification ({ title, body, icon, path }: {
  title: string, body: string, icon?: string, path?: string
}): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
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
