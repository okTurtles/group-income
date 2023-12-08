'use strict'

import sbp from '@sbp/sbp'
import { PUBSUB_INSTANCE } from '@controller/instance-keys.js'
import { NOTIFICATION_TYPE, PUSH_SERVER_ACTION_TYPE, createMessage } from '~/shared/pubsub.js'

// NOTE: this file is currently unused. I messed around with it just enough
// to get it working at the most primitive level and decide that I need to
// move on before returning to it. Once it's ready to be added to the app,
// we'll import this file in main.js and call the setup selector there.

sbp('sbp/selectors/register', {
  'service-workers/setup': async function () {
    // setup service worker
    // TODO: move ahead with encryption stuff ignoring this service worker stuff for now
    // TODO: improve updating the sw: https://stackoverflow.com/a/49748437
    // NOTE: user should still be able to use app even if all the SW stuff fails
    if (!('serviceWorker' in navigator)) { return }

    try {
      const swRegistration = await navigator.serviceWorker.register('/assets/js/sw-primary.js', { scope: '/' })

      if (swRegistration) {
        swRegistration.active?.postMessage({ type: 'store-client-id' })
      }

      navigator.serviceWorker.addEventListener('message', event => {
        console.debug('[sw] Received a message from the service worker :', event)
        const data = event.data

        if (typeof data === 'object' && data.type) {
          switch (data.type) {
            case 'pushsubscriptionchange': {
              sbp('service-worker/resubscribe-push', data.subscription)
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
  'service-worker/setup-push-subscription': async function (followingNotification = null) {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) { return }

    // Get the installed service-worker registration
    const registration = await navigator.serviceWorker.ready

    if (!registration) {
      console.error('No service-worker registration found!')
      return
    }

    const pubsub = sbp('okTurtles.data/get', PUBSUB_INSTANCE)
    const existingSubscription = await registration.pushManager.getSubscription()

    if (existingSubscription) {
      // If there is an existing subscription, no need to create a new one.
      // But make sure server knows the subscription details too.
      pubsub.socket.send(createMessage(
        NOTIFICATION_TYPE.PUSH_ACTION,
        {
          action: PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION,
          payload: JSON.stringify(existingSubscription.toJSON())
        }
      ))

      if (followingNotification) {
        sbp('service-worker/send-push', followingNotification)
      }
    } else {
      return new Promise((resolve) => {
        try {
          // Generate a new push subscription
          sbp('okTurtles.events/once', NOTIFICATION_TYPE.PUSH_ACTION, async ({ data }) => {
            const PUBLIC_VAPID_KEY = data

            // 1. Add a new subscription to pushManager using it.
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
            })

            // 2. Store the subscription details to the server. (server needs it to send the push notification)
            pubsub.socket.send(createMessage(
              NOTIFICATION_TYPE.PUSH_ACTION,
              {
                action: PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION,
                payload: JSON.stringify(subscription.toJSON())
              }
            ))

            // 3. Send a following notifciation if it's passed
            if (followingNotification) {
              sbp('service-worker/send-push', followingNotification)
            }

            resolve()
          })

          pubsub.socket.send(createMessage(
            NOTIFICATION_TYPE.PUSH_ACTION,
            { action: PUSH_SERVER_ACTION_TYPE.SEND_PUBLIC_KEY }
          ))
        } catch (err) {
          console.error('[sw] service-worker/setup-push-subscription failed with the following error: ', err)
          resolve()
        }
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
        NOTIFICATION_TYPE.PUSH_ACTION,
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
      NOTIFICATION_TYPE.PUSH_ACTION,
      {
        action: PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION,
        payload: JSON.stringify(subscription.toJSON())
      }
    ))
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
