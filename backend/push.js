const pushController = require('web-push')
const giConfig = require('../giconf.json')
const { PUSH_SERVER_ACTION_TYPE, NOTIFICATION_TYPE, createMessage } = require('../shared/pubsub.js')

// NOTE: VAPID public/private keys can be generated via 'npx web-push generate-vapid-keys' command.
const publicKey = process.env.VAPID_PUBLIC_KEY || giConfig.VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY || giConfig.VAPID_PRIVATE_KEY
pushController.setVapidDetails(
  process.env.VAPID_EMAIL || giConfig.VAPID_EMAIL,
  publicKey,
  privateKey
)

export const pushServerActionhandlers: any = {
  [PUSH_SERVER_ACTION_TYPE.SEND_PUBLIC_KEY] () {
    const socket = this
    socket.send(createMessage(NOTIFICATION_TYPE.PUSH_ACTION, publicKey))
  },
  [PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION] (payload) {
    const socket = this
    const subscription = JSON.parse(payload)

    // Reference: is it safe to use 'endpoint' as a unique identifier of a push subscription
    // (https://stackoverflow.com/questions/63767889/is-it-safe-to-use-the-p256dh-or-endpoint-keys-values-of-the-push-notificatio)
    socket.server.pushSubscriptions[subscription.endpoint] = subscription
  },
  [PUSH_SERVER_ACTION_TYPE.DELETE_SUBSCRIPTION] (payload) {
    const socket = this
    const subscriptionId = JSON.parse(payload)

    delete socket.server.pushSubscriptions[subscriptionId]
  },
  [PUSH_SERVER_ACTION_TYPE.SEND_PUSH_NOTIFICATION]: async function (payload) {
    const pushSubscriptions = this.server.pushSubscriptions
    const data = JSON.parse(payload)
    const sendPush = (sub) => pushController.sendNotification(
      sub, JSON.stringify({ title: data.title, body: data.body })
    )

    // NOTE: if the payload contains 'endpoint' field, send push-notification to that particular subscription.
    //       otherwise, iterate all existing subscriptions and broadcast the push-notification to all.

    if (data.endpoint) {
      const subscription = pushSubscriptions[data.endpoint]
      await sendPush(subscription)
    } else {
      for (const subscription of Object.values(pushSubscriptions)) {
        await sendPush(subscription)
      }
    }
  }
}
