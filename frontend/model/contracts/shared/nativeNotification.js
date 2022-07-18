'use strict'

// NOTE: since these functions don't modify contract state, it should
//       be safe to modify them without worrying about version conflicts.

export async function requestNotificationPermission (force: boolean = false): Promise<null | string> {
  if (typeof Notification === 'undefined' ||
    (!force && Notification.permission !== 'default') ||
    (force && Notification.permission === 'granted')) {
    return null
  }

  try {
    return await Notification.requestPermission()
  } catch (e) {
    return null
  }
}

export function makeNotification ({ title, body, icon, url }: {
  title: string, body: string, icon: string, url?: string
}): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return
  }

  const notification = new Notification(title, { body, icon })
  if (url) {
    notification.onclick = function (event) {
      event.preventDefault()
      open(url, '_blank')
    }
  }
}
