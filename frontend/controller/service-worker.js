'use strict'

import { PUBSUB_INSTANCE } from '@controller/instance-keys.js'
import sbp from '@sbp/sbp'
import { PWA_INSTALLABLE } from '@utils/events.js'
import { HOURS_MILLIS } from '~/frontend/model/contracts/shared/time.js'
import { PUBSUB_RECONNECTION_SUCCEEDED, PUSH_SERVER_ACTION_TYPE, REQUEST_TYPE, createMessage } from '~/shared/pubsub.js'
import { deserializer } from '~/shared/serdes/index.js'

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
    console.error('@@@SW SETUP')
    // setup service worker
    // TODO: move ahead with encryption stuff ignoring this service worker stuff for now
    // TODO: improve updating the sw: https://stackoverflow.com/a/49748437
    // NOTE: user should still be able to use app even if all the SW stuff fails
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service worker APIs missing')
    }

    try {
      const swRegistration = await navigator.serviceWorker.register('/assets/js/sw-primary.js', { scope: '/' })

      // This ensures that the 'store-client-id' message is always sent to the
      // service worker, even if it's not immediately available. Calling `removeEventListener` is fine because presumably the page performing an
      // update is sending this message. However, the real question is whether
      // we _need_ to store a client ID (broadcasting should be preferred) and
      // for instances where a single client ID is needed, this should be
      // done periodically (e.g., to identify an active window).
      // TODO: Clarify the use and need for 'store-client-id'. This will become
      // clearer once implementing notifications.
      if (swRegistration.active) {
        swRegistration.active?.postMessage({ type: 'store-client-id' })
      } else {
        const handler = () => {
          navigator.serviceWorker.removeEventListener('controllerchange', handler, false)
          navigator.serviceWorker.controller.postMessage({ type: 'store-client-id' })
        }
        navigator.serviceWorker.addEventListener('controllerchange', handler, false)
      }

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

        if (typeof data === 'object' && data.type) {
          switch (data.type) {
            case 'pong':
              break
            case 'pushsubscriptionchange': {
              console.debug('[sw] Received pushsubscriptionchange:', data)
              sbp('service-worker/resubscribe-push', data.subscription)
              break
            }
            case 'event': {
              console.error('@@@EVENT RECEIVED', event.data.subtype, ...deserializer(event.data.data))
              sbp('okTurtles.events/emit', event.data.subtype, ...deserializer(event.data.data))
              break
            }
            default:
              console.error('[sw] Received unknown message type from the service worker:', data)
              break
          }
        }
      })

      console.error('@@@SW DONE, returning')
    } catch (e) {
      console.error('error setting up service worker:', e)
    }
  },
  'service-worker/setup-push-subscription': async function () {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) { return }

    // Get the installed service-worker registration
    const registration = await navigator.serviceWorker.ready

    if (!registration) {
      console.error('No service-worker registration found!')
      return
    }

    const pubsub = sbp('okTurtles.data/get', PUBSUB_INSTANCE)
    if (!pubsub) return // TODO: This needs to be moved into the service worker
    // proper. pubsub will be undefined in this context.
    const existingSubscription = await registration.pushManager.getSubscription()
    const messageToPushServerIfSocketConnected = (msgPayload) => {
      // make sure the websocket client is not in the state of CLOSING, CLOSED before sending a message.
      // if it is, attach a event listener to PUBSUB_RECONNECTION_SUCCEEDED sbp event.
      // (context: https://github.com/okTurtles/group-income/pull/1770#discussion_r1439005731)

      const readyState = pubsub.socket.readyState
      const sendMsg = () => {
        pubsub.socket.send(createMessage(
          REQUEST_TYPE.PUSH_ACTION,
          msgPayload
        ))
      }

      if (readyState === WebSocket.CLOSED || readyState === WebSocket.CLOSING) {
        sbp('okTurtles.events/once', PUBSUB_RECONNECTION_SUCCEEDED, sendMsg)
      } else {
        sendMsg()
      }
    }

    if (existingSubscription) {
      // If there is an existing subscription, no need to create a new one.
      // But make sure server knows the subscription details too.
      messageToPushServerIfSocketConnected({
        action: PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION,
        payload: JSON.stringify(existingSubscription.toJSON())
      })
    } else {
      return new Promise((resolve) => {
        // Generate a new push subscription
        sbp('okTurtles.events/once', REQUEST_TYPE.PUSH_ACTION, async ({ data }) => {
          const PUBLIC_VAPID_KEY = data

          try {
            // 1. Add a new subscription to pushManager using it.
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
            })

            // 2. Store the subscription details to the server. (server needs it to send the push notification)
            messageToPushServerIfSocketConnected({
              action: PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION,
              payload: JSON.stringify(subscription.toJSON())
            })

            resolve()
          } catch (err) {
            console.error('[sw] service-worker/setup-push-subscription failed with the following error: ', err)
            resolve()
          }
        })

        messageToPushServerIfSocketConnected({ action: PUSH_SERVER_ACTION_TYPE.SEND_PUBLIC_KEY })
      })
    }
  },
  'service-worker/send-push': async function (payload) {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) { return }

    if (Notification.permission !== 'granted') {
      console.debug('[sw] stopped sending a push-notification data to the server because of the permission not granted.')
      return
    }

    const swRegistration = await navigator.serviceWorker.ready

    if (!swRegistration) {
      console.error('No service-worker registration found!')
      return
    }

    const pushSubscription = await swRegistration.pushManager.getSubscription()
    const pubsub = sbp('okTurtles.data/get', PUBSUB_INSTANCE)

    if (pushSubscription) {
      pubsub.socket.send(createMessage(
        REQUEST_TYPE.PUSH_ACTION,
        {
          action: PUSH_SERVER_ACTION_TYPE.SEND_PUSH_NOTIFICATION,
          payload: JSON.stringify({ ...payload, endpoint: pushSubscription.endpoint })
        }
      ))
    } else {
      console.error('No existing push subscription found!')
    }
  },
  'service-worker/check-push-subscription-ready': async function () {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) { return false }

    const swRegistration = await navigator.serviceWorker.ready
    if (swRegistration) {
      const pushSubscription = await swRegistration.pushManager.getSubscription()

      return !!pushSubscription
    } else { return false }
  },
  'service-worker/resubscribe-push': function (subscription) {
    const pubsub = sbp('okTurtles.data/get', PUBSUB_INSTANCE)

    pubsub.socket.send(createMessage(
      REQUEST_TYPE.PUSH_ACTION,
      {
        action: PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION,
        payload: JSON.stringify(subscription.toJSON())
      }
    ))
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
})

// helper method

function urlBase64ToUint8Array (base64String) {
  // reference: https://gist.github.com/Klerith/80abd742d726dd587f4bd5d6a0ab26b6
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
