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
      await navigator.serviceWorker.register('/assets/js/sw-primary.js', { scope: '/' })
    } catch (e) {
      console.error('error setting up service worker:', e)
    }
  },
  'service-worker/setup-push-subscription': async function (testNotification: Object) {
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
    } else {
      // Generate a new push subscription
      sbp('okTurtles.events/once', NOTIFICATION_TYPE.PUSH_ACTION, async ({ data }) => {
        const PUBLIC_VAPID_KEY = data

        // 1. Add a new subscription to pushManager using it.
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
        })

        // 2. Send the subscription details to the server. (server needs it to send the push notification)
        pubsub.socket.send(createMessage(
          NOTIFICATION_TYPE.PUSH_ACTION,
          {
            action: PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION,
            payload: JSON.stringify(subscription.toJSON())
          }
        ))

        // 3. Send the test notification to confirm it works as expected. (Just a demo for now, but can be removed after development)
        const notificationPayload = {
          ...(testNotification || {
            title: 'Service worker installed.',
            body: 'You can now receive various push notifications from the Group Income app!'
          }),
          endpoint: subscription.endpoint
        }

        pubsub.socket.send(createMessage(
          NOTIFICATION_TYPE.PUSH_ACTION,
          {
            action: PUSH_SERVER_ACTION_TYPE.SEND_PUSH_NOTIFICATION,
            payload: JSON.stringify(notificationPayload)
          }
        ))
      })

      pubsub.socket.send(createMessage(
        NOTIFICATION_TYPE.PUSH_ACTION,
        { action: PUSH_SERVER_ACTION_TYPE.SEND_PUBLIC_KEY }
      ))
    }
  },
  'service-worker/send-push': async function (payload) {
    if (!('serviceWorker' in navigator)) { return }

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
