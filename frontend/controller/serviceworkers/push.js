import { L } from '@common/common.js'
import { PUBSUB_INSTANCE } from '@controller/instance-keys.js'
import { makeNotification } from '@model/notifications/nativeNotification.js'
import sbp from '@sbp/sbp'
import setupChelonia from '~/frontend/setupChelonia.js'
import { NOTIFICATION_TYPE, PUBSUB_RECONNECTION_SUCCEEDED, PUSH_SERVER_ACTION_TYPE, REQUEST_TYPE, createMessage } from '~/shared/pubsub.js'
import { getSubscriptionId } from '~/shared/functions.js'
import { DEVICE_SETTINGS } from '@utils/constants.js'

export default (sbp('sbp/selectors/register', {
  'push/getSubscriptionOptions': (() => {
    let cachedVapidInformation
    return () => {
      if (
        cachedVapidInformation &&
        // Cache the VAPID information for one hour. The server public
        // information should change very infrequently, if it changes at all.
        (performance.now() - cachedVapidInformation[0]) < 3600e3
      ) {
        return cachedVapidInformation[1]
      }

      const result = new Promise((resolve, reject) => {
        const handler = ({ data }) => {
          if (data.type !== PUSH_SERVER_ACTION_TYPE.SEND_PUBLIC_KEY) return
          sbp('okTurtles.events/off', REQUEST_TYPE.PUSH_ACTION, handler)
          clearTimeout(timeoutId)
          resolve({
            userVisibleOnly: true,
            applicationServerKey: data.data
          })
        }
        const pubsub = sbp('okTurtles.data/get', PUBSUB_INSTANCE)
        if (!pubsub) reject(new Error('Missing pubsub instance'))

        const readyState = pubsub.socket?.readyState
        if (readyState !== WebSocket.OPEN) {
          reject(new Error('WebSocket connection is not open'))
        }

        sbp('okTurtles.events/on', REQUEST_TYPE.PUSH_ACTION, handler)
        const timeoutId = setTimeout(() => {
          sbp('okTurtles.events/off', REQUEST_TYPE.PUSH_ACTION, handler)
          reject(new Error('Timed out requesting VAPID key'))
        }, 10e3)

        pubsub.socket.send(createMessage(
          REQUEST_TYPE.PUSH_ACTION,
          { action: PUSH_SERVER_ACTION_TYPE.SEND_PUBLIC_KEY }
        ))
      })
      result.then((options) => {
        cachedVapidInformation = [performance.now(), Promise.resolve(options)]
      })
      return result
    }
  })(),
  // This function reports the existing push subscription to the server
  // It is called in three scenarios:
  //   1. When a push subscription is created (usually right after granting the
  //      notification permission). This is done from outside of the SW, because
  //      requesting permissions can't be done from the SW itself and typically
  //      requires user interaction.
  //   2. When re-connecting (or connecting) to the server via WebSocket. This
  //      keeps push subscriptions paired to WS connections, so that we can
  //      seamlessly switch from WS to Web Push notifications on disconnection.
  //   3. On the 'pushsubscriptionchange' event. This is to let the server know
  //      to update the existing push subscription and replace it with a new
  //      one.
  'push/reportExistingSubscription': (() => {
    const map = new WeakMap()
    async function getSubID (subscription) {
      try {
        return await getSubscriptionId(subscription)
      } catch (e) {
        return `ERR: ${e.message}`
      }
    }

    return async (subscriptionInfo?: Object) => {
      const pubsub = sbp('okTurtles.data/get', PUBSUB_INSTANCE)
      if (!pubsub) throw new Error('Missing pubsub instance')

      const readyState = pubsub.socket?.readyState
      if (readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket connection is not open')
      }

      const socket = pubsub.socket
      const reported = map.get(socket)
      map.set(socket, subscriptionInfo)
      if (subscriptionInfo?.endpoint) {
        if (!reported || subscriptionInfo.endpoint !== reported.endpoint) {
          const subID = await getSubID(subscriptionInfo)
          const host = new URL(subscriptionInfo.endpoint).host
          console.info(`[reportExistingSubscription] reporting '${subID}':`, host)
          // If the subscription has changed, report it to the server
          pubsub.socket.send(createMessage(
            REQUEST_TYPE.PUSH_ACTION,
            { action: PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION, payload: subscriptionInfo }
          ))
        }
      } else if (reported) {
        const subID = await getSubID(reported)
        const host = new URL(reported.endpoint).host
        console.info(`[reportExistingSubscription] removing subscription '${subID}':`, host)
        // If the subscription has been removed, also report it to the server
        pubsub.socket.send(createMessage(
          REQUEST_TYPE.PUSH_ACTION,
          { action: PUSH_SERVER_ACTION_TYPE.DELETE_SUBSCRIPTION, payload: null }
        ))
      }
    }
  })()
}): string[])

if (self.registration?.pushManager) {
  (() => {
    let inProgress = false
    sbp('okTurtles.events/on', PUBSUB_RECONNECTION_SUCCEEDED, async () => {
      if (inProgress) return
      if (!sbp('chelonia/rootState').loggedIn) return // return b/c device settings not loaded
      inProgress = true
      const disableNotifications = sbp('sw/deviceSettings/get', DEVICE_SETTINGS.DISABLE_NOTIFICATIONS)
      console.info('pubsub reconnected. disableNotifications=', disableNotifications)
      if (!disableNotifications) {
        try {
          const subscription = await self.registration.pushManager.getSubscription()
          await sbp('push/reportExistingSubscription', subscription?.toJSON())
        } catch (e) {
          console.error('Error reporting subscription on reconnection', e)
        }
      }
      inProgress = false
    })
  })()
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
      await sbp('push/reportExistingSubscription', subscription?.toJSON())
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
