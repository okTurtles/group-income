'use strict'
import sbp from '@sbp/sbp'
import { Buffer } from 'buffer'
import { throttle } from 'turtledash'

// NOTE: since these functions don't modify contract state, it should
//       be safe to modify them without worrying about version conflicts.
// we throttle this because some browsers (Chrome) support change handlers
// for both 'push' and 'notifications' permissions change events
const handler = throttle((status: string) => {
  // For some reason, Safari seems to always return `'prompt'` with
  // `Notification.permission` being correct.
  const granted = status === 'granted' || (status === 'prompt' && Notification.permission === 'granted')

  const { notificationEnabled } = sbp('state/vuex/state').settings
  console.info(`Browser notifications have been: ${granted ? 'enabled' : 'disabled'}, notificationEnabled=${notificationEnabled}`)
  // either report the fact that browser notification permissions have been disabled
  // or report the fact that they've been enabled (when the user wants push notifications)
  if (!granted || notificationEnabled) {
    sbp('service-worker/setup-push-subscription').catch(e => {
      console.error('[handler] Error calling service-worker/setup-push-subscription', e)
    })
  }
}, 250)

const fallbackChangeListener = () => {
  if (!Notification.permission) return
  let oldValue = Notification.permission
  handler(oldValue)
  // This fallback runs when `navigator.permissions.query` isn't available
  // It's meant to run while the tab is open to react to permission changes,
  // and therefore it's not meant to be cleared
  setInterval(() => {
    const newValue = Notification.permission
    if (oldValue !== newValue) {
      handler((oldValue = newValue))
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
  ) {
    console.warn("Notifications aren't available in this browser!")
    return
  }
  const isWebkit = typeof navigator === 'object' && navigator.vendor === 'Apple Computer, Inc.'
  if (
    !isWebkit && // WebKit doesn't work
    typeof navigator.permissions === 'object' &&
    // $FlowFixMe[method-unbinding]
    typeof navigator.permissions.query === 'function'
  ) {
    Promise.all([
      navigator.permissions.query({ name: 'notifications' }),
      navigator.permissions.query({ name: 'push', userVisibleOnly: true })
    ]).then(
      (statuses) => {
        // they're both the same at the start but FF only pays attention to changes in notifications
        handler(statuses[0].state)
        statuses[0].addEventListener('change', () => {
          handler(statuses[0].state)
        }, false)
        statuses[1].addEventListener('change', () => {
          handler(statuses[1].state)
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

export async function requestNotificationPermission (
  { enableIfGranted }: { enableIfGranted: boolean } = { enableIfGranted: false }
): Promise<null | string> {
  if (typeof Notification !== 'function') {
    return null
  }
  try {
    const permission = await Notification.requestPermission()
    if (enableIfGranted && permission === 'granted') {
      sbp('state/vuex/commit', 'setNotificationEnabled', true)
    }
    return permission
  } catch (e) {
    console.error('requestNotificationPermission:', e.message)
    return null
  }
}

// eslint-disable-next-line require-await
export async function makeNotification ({ title, body, icon, path, groupID, sbpInvocation }: {
  title: string, body: string, icon?: string, path?: string, groupID?: string,
  sbpInvocation?: any[]
}): Promise<void> {
  if (typeof Notification !== 'function') return
  if (typeof icon === 'object' && icon.manifestCid) {
    // We only use cached files to render notifications as quickly as possible
    const cachedArrayBuffer = await sbp('gi.db/filesCache/load', icon.manifestCid).catch((e) => {
      console.error('[Avatar.vue] Error loading file from cache', e)
    })
    if (cachedArrayBuffer) {
      // We use `data:` URLs because the SW is unable to create `blob:` URLs
      icon = 'data:;base64,' + encodeURIComponent(Buffer.from(cachedArrayBuffer).toString('base64'))
    }
  }

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
        return registration.showNotification(title, { body, icon, data: { groupID, path, sbpInvocation } })
      }).catch(console.warn)
    }
  } else {
  // If running in a SW
    return self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // If no window is focused, display a native notification
      if (clientList.some(client => client.focused)) {
        return
      }
      return self.registration.showNotification(title,
        { body, icon, data: { groupID, path, sbpInvocation } }
      ).catch(console.warn)
    })
  }
}
