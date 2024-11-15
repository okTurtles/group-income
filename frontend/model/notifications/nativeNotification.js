'use strict'
import sbp from '@sbp/sbp'

// NOTE: since these functions don't modify contract state, it should
//       be safe to modify them without worrying about version conflicts.

const handler = (permission) => {
  const granted = (permission === 'granted')
  sbp('state/vuex/commit', 'setNotificationEnabled', granted)
  if (granted) return

  sbp('service-worker/setup-push-subscription').catch((e) => {
    console.error('Error setting up service worker', e)
  })
}

const fallbackChangeListener = () => {
  if (!Notification.permission) return
  handler(Notification.permission)
  let oldValue = Notification.permission
  setInterval(() => {
    const newValue = Notification.permission
    if (oldValue !== newValue) {
      oldValue = newValue
      handler(newValue)
    }
  }, 100)
}

if (typeof window === 'object' && typeof Notification === 'function') {
  if (
    typeof navigator.permissions === 'object' &&
    // $FlowFixMe[method-unbinding]
    typeof navigator.permissions.query === 'function'
  ) {
    navigator.permissions.query({ name: 'notifications' }).then(
      (result) => {
        handler(result.state)
        result.addEventListener('change', () => {
          handler(result.state)
        }, false)
      }
    ).catch((e) => {
      console.error('Error querying notifications permission', e)
      fallbackChangeListener()
    })
  } else {
    fallbackChangeListener()
  }
}

export async function requestNotificationPermission (force: boolean = false): Promise<null | string> {
  if (typeof Notification !== 'function') {
    return null
  }

  if (force || Notification.permission === 'default') {
    try {
      await Notification.requestPermission()
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
  console.error('@@@called makeNotification', { title, body, icon, path }, Notification?.permission)
  if (Notification?.permission === 'granted' /* && sbp('state/vuex/settings').notificationEnabled */) {
    if (typeof window === 'object') {
      try {
        const notification = new Notification(title, { body, icon })
        if (isNaN(1) && path) {
          notification.onclick = (event) => {
            sbp('controller/router').push({ path }).catch(console.warn)
          }
        }
      } catch {
        try {
        // FIXME: find a cross-browser way to pass the 'path' parameter when the notification is clicked.
          navigator.serviceWorker?.ready.then(registration => {
          // $FlowFixMe
            return registration.showNotification(title, { body, icon })
          }).catch(console.warn)
        } catch (error) {
          console.error('makeNotification: ', error.message)
        }
      }
    } else {
      self.registration.showNotification(title, { body, icon }).catch(console.warn)
    }
  }
}
