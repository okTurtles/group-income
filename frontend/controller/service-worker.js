'use strict'

import sbp from '@sbp/sbp'
import { CAPTURED_LOGS, LOGIN_COMPLETE, NEW_CHATROOM_UNREAD_POSITION, PWA_INSTALLABLE, SET_APP_LOGS_FILTER } from '@utils/events.js'
import { HOURS_MILLIS } from '~/frontend/model/contracts/shared/time.js'
import { deserializer } from '~/shared/serdes/index.js'
import { ONLINE } from '../utils/events.js'

const pwa = {
  deferredInstallPrompt: null,
  installed: false
}

// How to provide your own in-app PWA install experience:
// https://web.dev/articles/customize-install

// PWA related event handlers
// NOTE: Apparently, 'beforeinstallprompt' is not fired either when a PWA from the browser is already installed.
window.addEventListener('beforeinstallprompt', e => {
  // e.preventDefault() - uncomment this if we want to prevent the browser from displaying its own install UI.

  pwa.deferredInstallPrompt = e
  sbp('okTurtles.events/emit', PWA_INSTALLABLE)
})

sbp('sbp/selectors/register', {
  'service-workers/setup': async function () {
    // setup service worker
    // TODO: move ahead with encryption stuff ignoring this service worker stuff for now
    // TODO: improve updating the sw: https://stackoverflow.com/a/49748437
    // NOTE: user should still be able to use app even if all the SW stuff fails
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service worker APIs missing')
    }

    try {
      const swRegistration = await navigator.serviceWorker.register('/assets/js/sw-primary.js', { scope: '/' })

      // if an active service-worker exists, checks for the updates immediately first and then repeats it every 1hr
      await swRegistration.update()
      setInterval(() => sbp('service-worker/update'), HOURS_MILLIS)

      // Keep the service worker alive while the window is open
      // The default idle timeout on Chrome and Firefox is 30 seconds. We send
      // a ping message every 5 seconds to ensure that the worker remains
      // active.
      // The downside of this is that there are messges going back and forth
      // between the service worker and each tab, the number of which is
      // proportional to the number of tabs open.
      // The upside of this is that the service worker remains active while
      // there are open tabs, which makes it faster and smoother to interact
      // with contracts than if the service worker had to be restarted.
      setInterval(() => navigator.serviceWorker.controller?.postMessage({ type: 'ping' }), 5000)

      navigator.serviceWorker.addEventListener('message', event => {
        const data = event.data
        const silentEmit = sbp('sbp/selectors/fn', 'okTurtles.events/emit')

        if (typeof data === 'object' && data.type) {
          switch (data.type) {
            case 'pong':
              break
            case 'event': {
              sbp('okTurtles.events/emit', event.data.subtype, ...deserializer(event.data.data))
              break
            }
            case CAPTURED_LOGS: {
              // Emit silently to avoid flooding logs with event emitted entries
              silentEmit(CAPTURED_LOGS, ...deserializer(event.data.data))
              break
            }
            default:
              console.error('[sw] Received unknown message type from the service worker:', data)
              break
          }
        }
      })
    } catch (e) {
      console.error('error setting up service worker:', e)
    }
  },
  'service-worker/setup-push-subscription': async function (retryCount?: number) {
    await sbp('okTurtles.eventQueue/queueEvent', 'service-worker/setup-push-subscription', async () => {
      // Get the installed service-worker registration
      const registration = await navigator.serviceWorker.ready

      if (!registration) {
        console.error('No service-worker registration found!')
        return
      }

      const permissionState = await registration.pushManager.permissionState({ userVisibleOnly: true })

      const existingSubscription = permissionState === 'granted'
        ? await registration.pushManager.getSubscription().then((subscription) => {
          if (
            !subscription ||
            (subscription.expirationTime != null &&
            subscription.expirationTime <= Date.now())
          ) {
            console.info(
              'Attempting to create a new subscription',
              subscription
            )
            return sbp('push/getSubscriptionOptions').then(function (options) {
              return registration.pushManager.subscribe(options)
            })
          }
          return subscription
        }).catch(e => {
          if (!(retryCount > 3) && e?.message === 'WebSocket connection is not open') {
            sbp('okTurtles.events/once', ONLINE, () => {
              setTimeout(() => sbp('service-worker/setup-push-subscription', (retryCount || 0) + 1), 200)
            })
            return
          }
          console.error('[service-worker/setup-push-subscription] Error setting up push subscription', e)
          alert(e?.message || 'Error')
        })
        : null

      await sbp('push/reportExistingSubscription', existingSubscription?.toJSON()).catch(e => {
        console.error('[service-worker/setup-push-subscription] Error reporting existing subscription', e)
      })
      return true
    })
  },
  'service-worker/update': async function () {
    // This function manually checks for the service worker updates and trigger them if there are.
    // reference-1: https://web.dev/articles/service-worker-lifecycle#manual_updates
    // reference-2: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/update
    if ('serviceWorker' in navigator) {
      try {
        const swRegistration = await navigator.serviceWorker.ready

        if (swRegistration) {
          const newRegistration = await swRegistration.update()
          return newRegistration
        } else {
          console.debug('[sw] No active service-worker was found while checking for the updates.')
          return
        }
      } catch (err) {
        console.error(`[sw] Failed to update the service-worker! - ${err.message}`)
      }
    }
  },
  'service-worker/check-pwa-installability': function () {
    return Boolean(pwa.deferredInstallPrompt)
  },
  'service-worker/trigger-install-prompt': async function () {
    if (!pwa.deferredInstallPrompt) { return false }

    const result = await pwa.deferredInstallPrompt.prompt()
    return result.outcome
  }
});

// Events that need to be relayed to the SW
[LOGIN_COMPLETE, NEW_CHATROOM_UNREAD_POSITION, SET_APP_LOGS_FILTER].forEach((event) =>
  sbp('okTurtles.events/on', event, (...data) => {
    navigator.serviceWorker.controller?.postMessage({ type: 'event', subtype: event, data })
  })
)

// helper method
/*
function urlBase64ToUint8Array (base64String) {
  // reference: https://gist.github.com/Klerith/80abd742d726dd587f4bd5d6a0ab26b6
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
*/
