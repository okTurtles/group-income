'use strict'
import sbp from '@sbp/sbp'

// NOTE: since these functions don't modify contract state, it should
//       be safe to modify them without worrying about version conflicts.

const handler = (statuses: string[]) => {
  // For some reason, Safari seems to always return `'prompt'` with
  // `Notification.permission` being correct.
  const granted = statuses.every(status => status === 'granted') || (statuses.every(status => status === 'prompt') && Notification.permission === 'granted')
  sbp('state/vuex/commit', 'setNotificationEnabled', granted)
}

const fallbackChangeListener = () => {
  if (!Notification.permission) return
  let oldValue = Notification.permission
  handler([oldValue])
  // This fallback runs when `navigator.permissions.query` isn't available
  // It's meant to run while the tab is open to react to permission changes,
  // and therefore it's not meant to be cleared
  setInterval(() => {
    const newValue = Notification.permission
    if (oldValue !== newValue) {
      oldValue = newValue
      handler([oldValue])
    }
  }, 1000)
}

export const setupNativeNotificationsListeners = () => {
  // If the required APIs for native notifications aren't available, skip setup
  if (
    typeof navigator !== 'object' ||
    typeof Notification !== 'function' ||
    typeof PushManager !== 'function' ||
    typeof ServiceWorker !== 'function' ||
    typeof navigator.serviceWorker !== 'object'
  ) return

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

export async function requestNotificationPermission (): Promise<null | string> {
  if (typeof Notification !== 'function') {
    return null
  }

  try {
    const result = await Notification.requestPermission()
    sbp('state/vuex/commit', 'setNotificationEnabled', result === 'granted')
    return result
  } catch (e) {
    console.error('requestNotificationPermission:', e.message)
    return null
  }
}

export function makeNotification ({ title, body, icon, path }: {
  title: string, body: string, icon?: string, path?: string
}): void | Promise<void> {
  if (typeof Notification !== 'function') return
  // If not running on a SW
  if (typeof WorkerGlobalScope !== 'function') {
    try {
      // $FlowFixMe[incompatible-type]
      if (navigator.vendor === 'Apple Computer, Inc.') {
        throw new Error('Safari requires a service worker for the notification to be displayed')
      }
      const notification = new Notification(title, { body, icon })
      if (path) {
        notification.onclick = (event) => {
          sbp('controller/router').push({ path }).catch(console.warn)
        }
      }
    } catch (e) {
      return navigator.serviceWorker?.ready.then(registration => {
        // $FlowFixMe
        return registration.showNotification(title, { body, icon, data: { path } })
      }).catch(console.warn)
    }
  } else {
  // If running in a SW
    return self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // If the no window is focused, display a native notification
      if (clientList.some(client => client.focused)) {
        return
      }
      return self.registration.showNotification(title, { body, icon, data: { path } }).catch(console.warn)
    })
  }
}
