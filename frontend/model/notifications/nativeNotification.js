'use strict'
import sbp from '@sbp/sbp'

// NOTE: since these functions don't modify contract state, it should
//       be safe to modify them without worrying about version conflicts.

const handler = (statuses: string[]) => {
  const granted = statuses.every(status => status === 'granted')
  sbp('state/vuex/commit', 'setNotificationEnabled', granted)

  sbp('service-worker/setup-push-subscription').catch((e) => {
    console.error('Error setting up push subscription in service worker', e)
  })
}

const fallbackChangeListener = () => {
  if (!Notification.permission) return
  let oldValue = Notification.permission
  handler([oldValue])
  setInterval(() => {
    const newValue = Notification.permission
    if (oldValue !== newValue) {
      oldValue = newValue
      handler([oldValue])
    }
  }, 100)
}

export const setupNativeNotificationsListeners = () => {
  if (typeof navigator !== 'object' || typeof Notification !== 'function' || typeof PushManager !== 'function' || typeof ServiceWorker !== 'function' || typeof navigator.serviceWorker !== 'object') return

  if (
    typeof navigator.permissions === 'object' &&
    // $FlowFixMe[method-unbinding]
    typeof navigator.permissions.query === 'function'
  ) {
    Promise.all([
      navigator.permissions.query({ name: 'notifications' }),
      navigator.permissions.query({ name: 'push', userVisibleOnly: true })
    ]).then(
      (statuses) => {
        const states = statuses.map(status => status.state)
        handler(states)
        statuses[0].addEventListener('change', () => {
          states[0] = statuses[0].state
          handler(states)
        }, false)
        statuses[1].addEventListener('change', () => {
          states[1] = statuses[1].state
          handler(states)
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
    // If not running on a SW
    if (typeof window === 'object') {
      try {
        const notification = new Notification(title, { body, icon })
        if (path) {
          notification.onclick = (event) => {
            sbp('controller/router').push({ path }).catch(console.warn)
          }
        }
      } catch {
        try {
          navigator.serviceWorker?.ready.then(registration => {
            // $FlowFixMe
            return registration.showNotification(title, { body, icon, data: { path } })
          }).catch(console.warn)
        } catch (error) {
          console.error('makeNotification: ', error.message)
        }
      }
    } else {
    // If running in a SW
      self.registration.showNotification(title, { body, icon, data: { path } }).catch(console.warn)
    }
  }
}
