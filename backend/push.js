const pushInstance = require('web-push')
const pushSubscriptions: Map<string, any> = new Map()

// VAPID public/private keys, generated via 'npx web-push generate-vapid-keys' command.
const VAPID_PUBLIC_KEY = 'BPZrB5emRHd9w36EKEGuyF5rTZNf11qxp4Hr57Td0I3acZWt5jK8xLUhYpzgQ7P8OpH3kUuHSNsNxre4qr1vtiM'
const VAPID_PRIVATE_KEY = 'jza_sGZNhBaT53r9VnQVf17ejZST9zv4nx8WX-nNKks'

pushInstance.setVapidDetails(
  'mailto:support@okTurtles.org', // it's an arbitrary email placeholder. should be a company email.
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

export {
  pushInstance,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  pushSubscriptions
}
