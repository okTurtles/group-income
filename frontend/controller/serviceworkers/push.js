import { L } from '@common/common.js'
import { PUBSUB_INSTANCE } from '@controller/instance-keys.js'
import { makeNotification } from '@model/notifications/nativeNotification.js'
import sbp from '@sbp/sbp'
import setupChelonia from '~/frontend/setupChelonia.js'
import { NOTIFICATION_TYPE, PUBSUB_RECONNECTION_SUCCEEDED, REQUEST_TYPE } from '@chelonia/lib/pubsub'
import { DEVICE_SETTINGS } from '@utils/constants.js'
import { createPushReporter } from './pushReporter.js'

const pushManager = self.registration?.pushManager

const pushReporter = createPushReporter({
  getPubsub: () => sbp('okTurtles.data/get', PUBSUB_INSTANCE),
  pushManager,
  isLoggedIn: () => !!sbp('chelonia/rootState').loggedIn,
  notificationsDisabled: () => !!sbp('sw/deviceSettings/get', DEVICE_SETTINGS.DISABLE_NOTIFICATIONS)
})

sbp('okTurtles.events/on', REQUEST_TYPE.PUSH_ACTION, pushReporter.onPushAction)

export default (sbp('sbp/selectors/register', {
  'push/getSubscriptionOptions': () => pushReporter.getSubscriptionOptions(),
  // Resolves to `false` if the SW isn't connected to the server. The
  // reconnection then reports the subscription the browser holds. See
  // `createPushReporter` for when this is called.
  'push/reportExistingSubscription': (subscriptionInfo?: Object, applicationServerKey?: ArrayBuffer) => {
    return pushReporter.reportExistingSubscription(subscriptionInfo, applicationServerKey)
  }
}): string[])

if (pushManager) {
  sbp('okTurtles.events/on', PUBSUB_RECONNECTION_SUCCEEDED, pushReporter.onReconnected)
}

self.addEventListener('push', function (event) {
  // PushEvent reference: https://developer.mozilla.org/en-US/docs/Web/API/PushEvent
  if (!event.data) return
  let data
  try {
    data = event.data.json()
  } catch (e) {
    console.error('[push event] Invalid JSON:', e)
    return
  }
  if (data.type === NOTIFICATION_TYPE.ENTRY) {
    event.waitUntil(setupChelonia().then(() => {
      // We have event data, so we process it
      if (data.data) return sbp('chelonia/handleEvent', data.data)
      // We just sync the contract if there's no event data. Sync could fail if
      // there are no references, hence the catch
      return sbp('chelonia/contract/sync', data.contractID).catch(e => {
        console.error('[push event] Error syncing', data.contractID, e)
      })
    }).catch((e) => {
      console.error('Error processing push event', e)
      if (data.contractType === 'gi.contracts/chatroom') {
        return makeNotification({
          title: L('Chatroom activity'),
          body: L('New chatroom message. An iOS bug prevents us from saying what it is.')
        })
      } else if (data.contractType === 'gi.contracts/group') {
        return makeNotification({
          title: L('Group activity'),
          body: L('New group activity. An iOS bug prevents us from saying what it is.')
        })
      }
    }))
  } else if (data.type === 'recurring') {
    event.waitUntil(
      sbp('gi.periodicNotifications/init')
    )
  }
}, false)

self.addEventListener('pushsubscriptionchange', function (event) {
  // NOTE: Currently there is no specific way to validate if a push-subscription is valid. So it has to be handled in the front-end.
  // (reference: https://pushpad.xyz/blog/web-push-how-to-check-if-a-push-endpoint-is-still-valid)
  event.waitUntil((async () => {
    try {
      let subscription = null
      if (event.oldSubscription) {
        subscription = await self.registration.pushManager.subscribe(event.oldSubscription.options)
      }
      await sbp('push/reportExistingSubscription', subscription?.toJSON(), subscription?.options.applicationServerKey)
    } catch (e) {
      console.error('[pushsubscriptionchange] Error resubscribing:', e)
    }
  })())
}, false)

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'periodic-notifications') {
    event.waitUntil(
      sbp('gi.periodicNotifications/init')
    )
  }
})
