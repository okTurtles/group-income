const webpush = require('web-push')

// generate VAPID public/private keys
const vapidKeys = webpush.generateVAPIDKeys()
webpush.setVapidDetails(
  'mailto:support@okTurtles.org', // it's an arbitrary email placeholder. should be a company email.
  vapidKeys.publicKey,
  vapidKeys.privateKey
)

// Route handlers for /push/*

// GET /push/vapid_public_key
const getVapidPublicKey = (): string => {
  return vapidKeys.publicKey
}

export {
  getVapidPublicKey
}
