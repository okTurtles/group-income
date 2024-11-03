import { PUBSUB_INSTANCE } from '@controller/instance-keys.js'
import sbp from '@sbp/sbp'
import { PUSH_SERVER_ACTION_TYPE, REQUEST_TYPE, createMessage } from '~/shared/pubsub.js'

export default (sbp('sbp/selectors/register', {
  'push/getSubscriptionOptions': (() => {
    let cachedVapidInformation
    return () => {
      if (
        cachedVapidInformation &&
        (performance.now() - cachedVapidInformation[0]) < 3600
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
        const timeoutId = setTimeout(() => {
          sbp('okTurtles.events/off', REQUEST_TYPE.PUSH_ACTION, handler)
          reject(new Error('Timed out requesting VAPID key'))
        }, 10e3)

        const pubsub = sbp('okTurtles.data/get', PUBSUB_INSTANCE)
        if (!pubsub) reject(new Error('Missing pubsub instance'))

        const readyState = pubsub.socket.readyState
        if (readyState !== WebSocket.OPEN) {
          reject(new Error('WebSocket connection is not open'))
        }

        sbp('okTurtles.events/on', REQUEST_TYPE.PUSH_ACTION, handler)
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
  'push/reportExistingSubscription': async (subscriptionInfo) => {
    const pubsub = sbp('okTurtles.data/get', PUBSUB_INSTANCE)
    if (!pubsub) throw new Error('Missing pubsub instance')

    const readyState = pubsub.socket.readyState
    if (readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket connection is not open')
    }

    await pubsub.socket.send(createMessage(
      REQUEST_TYPE.PUSH_ACTION,
      { action: PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION, payload: subscriptionInfo }
    ))
  }
}): string[])

self.addEventListener('push', function (event) {
  // PushEvent reference: https://developer.mozilla.org/en-US/docs/Web/API/PushEvent
  const data = event.data.text()
  event.waitUntil(sbp('chelonia/handleEvent', data))
})

self.addEventListener('pushsubscriptionchange', async function (event) {
  // NOTE: Currently there is no specific way to validate if a push-subscription is valid. So it has to be handled in the front-end.
  // (reference:https://pushpad.xyz/blog/web-push-how-to-check-if-a-push-endpoint-is-still-valid)
  const subscription = await self.registration.pushManger.subscribe(
    event.oldSubscription.options
  )

  sbp('push/reportExistingSubscription', subscription?.toJSON()).catch(e => {
    console.error('[pushsubscriptionchange] Error reporting subscription', e)
  })
  // Sending the client a message letting it know of the subscription change.
  /* await sendMessageToClient({
    type: 'pushsubscriptionchange',
    subscription
  }) */
})
