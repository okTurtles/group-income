const pushInstance = require('web-push')
const pushSubscriptions: Map<string, any> = new Map()
const giConfig = require('../giconf.json')
const { PUSH_SERVER_ACTION_TYPE } = require('../shared/pubsub.js')

// NOTE: VAPID public/private keys can be generated via 'npx web-push generate-vapid-keys' command.
pushInstance.setVapidDetails(
  process.env.VAPID_EMAIL || giConfig.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY || giConfig.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY || giConfig.VAPID_PRIVATE_KEY
)

const pushActionhandlers: any = {
  [PUSH_SERVER_ACTION_TYPE.SEND_PUBLIC_KEY] () {
    console.log('@@@ push action handler for ', PUSH_SERVER_ACTION_TYPE.SEND_PUBLIC_KEY)
  },
  [PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION] () {
    console.log('@@@ push action handler for ', PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION)
  },
  [PUSH_SERVER_ACTION_TYPE.DELETE_SUBSCRIPTION] () {
    console.log('@@@ push action handler for ', PUSH_SERVER_ACTION_TYPE.DELETE_SUBSCRIPTION)
  },
  [PUSH_SERVER_ACTION_TYPE.SEND_PUSH_NOTIFICATION] () {
    console.log('@@@ push action handler for ', PUSH_SERVER_ACTION_TYPE.SEND_PUSH_NOTIFICATION)
  }
}

export {
  pushInstance,
  pushSubscriptions,
  pushActionhandlers
}
