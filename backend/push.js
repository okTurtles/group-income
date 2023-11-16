const pushInstance = require('web-push')
const pushSubscriptions: Map<string, any> = new Map()
const giConfig = require('../giconf.json')

// NOTE: VAPID public/private keys can be generated via 'npx web-push generate-vapid-keys' command.
pushInstance.setVapidDetails(
  process.env.VAPID_EMAIL || giConfig.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY || giConfig.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY || giConfig.VAPID_PRIVATE_KEY
)

export {
  pushInstance,
  pushSubscriptions
}
