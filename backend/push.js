const pushInstance = require('web-push')
const pushSubscriptions: Map<string, any> = new Map()
const giConfig = require('../giconf.json')
const { PUSH_SERVER_ACTION_TYPE, PUSH_NOTIFICATION_TYPE, createMessage } = require('../shared/pubsub.js')

// NOTE: VAPID public/private keys can be generated via 'npx web-push generate-vapid-keys' command.
const publicKey = process.env.VAPID_PUBLIC_KEY || giConfig.VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY || giConfig.VAPID_PRIVATE_KEY
pushInstance.setVapidDetails(
  process.env.VAPID_EMAIL || giConfig.VAPID_EMAIL,
  publicKey,
  privateKey
)

const pushActionhandlers: any = {
  [PUSH_SERVER_ACTION_TYPE.SEND_PUBLIC_KEY] () {
    const socket = this

    socket.send(createMessage(PUSH_NOTIFICATION_TYPE.FROM_SERVER, publicKey))
  },
  [PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION] (payload) {
    const subscription = JSON.parse(payload)

    // Reference: is it safe to use 'endpoint' as a unique identifier of a push subscription
    // (https://stackoverflow.com/questions/63767889/is-it-safe-to-use-the-p256dh-or-endpoint-keys-values-of-the-push-notificatio)
    pushSubscriptions.set(subscription.endpoint, subscription)
  },
  [PUSH_SERVER_ACTION_TYPE.DELETE_SUBSCRIPTION] (payload) {
    const subscriptionId = JSON.parse(payload)

    pushSubscriptions.delete(subscriptionId)
  },
  [PUSH_SERVER_ACTION_TYPE.SEND_PUSH_NOTIFICATION]: async function (payload) {
    const data = JSON.parse(payload)
    const sendPush = (sub) => pushInstance.sendNotification(
      sub, JSON.stringify({ title: data.title, body: data.body })
    )

    // NOTE: if the payload contains 'endpoint' field, send push-notification to that particular subscription.
    //       otherwise, iterate all existing subscriptions and broadcast the push-notification to all.

    if (data.endpoint) {
      const subscription = pushSubscriptions.get(data.endpoint)
      await sendPush(subscription)
    } else {
      for (const subscription of pushSubscriptions.values()) {
        await sendPush(subscription)
      }
    }
  }
}

export {
  pushInstance,
  pushSubscriptions,
  pushActionhandlers
}
