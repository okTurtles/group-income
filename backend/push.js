import { aes128gcm } from '@apeleghq/rfc8188/encodings'
import encrypt from '@apeleghq/rfc8188/encrypt'
import sbp from '@sbp/sbp'
import { PUBSUB_INSTANCE } from './instance-keys.js'
import rfc8291Ikm from './rfc8291Ikm.js'
import { getVapidPublicKey, vapidAuthorization } from './vapid.js'

// const pushController = require('web-push')
const { PUSH_SERVER_ACTION_TYPE, REQUEST_TYPE, createMessage } = require('../shared/pubsub.js')

const addSubscriptionToIndex = async (subcriptionId: string) => {
  await sbp('okTurtles.eventQueue/queueEvent', 'update-webpush-indices', async () => {
    const currentIndex = await sbp('chelonia/db/get', '_private_webpush_index')
    // Add the current subscriptionId to the subscription index. Entries in the
    // index are separated by \x00 (NUL). The index itself is used to know
    // which entries to load.
    const updatedIndex = `${currentIndex ? `${currentIndex}\x00` : ''}${subcriptionId}`
    await sbp('chelonia/db/set', '_private_webpush_index', updatedIndex)
  })
}

const deleteSubscriptionFromIndex = async (subcriptionId: string) => {
  await sbp('okTurtles.eventQueue/queueEvent', 'update-webpush-indices', async () => {
    const currentIndex = await sbp('chelonia/db/get', '_private_webpush_index')
    const index = currentIndex.indexOf(subcriptionId)
    if (index === -1) return
    const updatedIndex = currentIndex.slice(0, index > 1 ? index - 1 : 0) + currentIndex.slice(index + subcriptionId.length)
    await sbp('chelonia/db/set', '_private_webpush_index', updatedIndex)
  })
}

const saveSubscription = (server, subscriptionId) => {
  sbp('chelonia/db/set', `_private_webpush_${subscriptionId}`, JSON.stringify({
    subscription: server.pushSubscriptions[subscriptionId],
    channelIDs: [...server.pushSubscriptions[subscriptionId].subscriptions]
  })).catch(e => {
    console.error(e, 'Error saving subscription', subscriptionId)
  })
}

export const addChannelToSubscription = (server: Object, subscriptionId: string, channelID: string): void => {
  server.pushSubscriptions[subscriptionId].subscriptions.add(channelID)
  saveSubscription(server, subscriptionId)
}

export const deleteChannelFromSubscription = (server: Object, subscriptionId: string, channelID: string): void => {
  server.pushSubscriptions[subscriptionId].subscriptions.delete(channelID)
  saveSubscription(server, subscriptionId)
}

// Generate an UUID from a `PushSubscription'
export const getSubscriptionId = async (subscriptionInfo: Object): Promise<string> => {
  const textEncoder = new TextEncoder()
  // <https://w3c.github.io/push-api/#pushsubscription-interface>
  const endpoint = textEncoder.encode(subscriptionInfo.endpoint)
  // <https://w3c.github.io/push-api/#pushencryptionkeyname-enumeration>
  const p256dh = textEncoder.encode(subscriptionInfo.keys.p256dh)
  const auth = textEncoder.encode(subscriptionInfo.keys.auth)

  const canonicalForm = new ArrayBuffer(
    8 +
      (4 + endpoint.byteLength) + (2 + p256dh.byteLength) +
      (2 + auth.byteLength)
  )
  const canonicalFormU8 = new Uint8Array(canonicalForm)
  const canonicalFormDV = new DataView(canonicalForm)
  let offset = 0
  canonicalFormDV.setFloat64(
    offset,
    subscriptionInfo.expirationTime == null
      ? NaN
      : subscriptionInfo.expirationTime,
    false
  )
  offset += 8
  canonicalFormDV.setUint32(offset, endpoint.byteLength, false)
  offset += 4
  canonicalFormU8.set(endpoint, offset)
  offset += endpoint.byteLength
  canonicalFormDV.setUint16(offset, p256dh.byteLength, false)
  offset += 2
  canonicalFormU8.set(p256dh, offset)
  offset += p256dh.byteLength
  canonicalFormDV.setUint16(offset, auth.byteLength, false)
  offset += 2
  canonicalFormU8.set(auth, offset)

  const digest = await crypto.subtle.digest('SHA-384', canonicalForm)
  const id = Buffer.from(digest.slice(0, 16))
  id[6] = 0x80 | (id[6] & 0x0F)
  id[8] = 0x80 | (id[8] & 0x3F)

  return [
    id.slice(0, 4),
    id.slice(4, 6),
    id.slice(6, 8),
    id.slice(8, 10),
    id.slice(10, 16)
  ].map((p) => p.toString('hex')).join('-')
}

// Wrap a SubscriptionInfo object to include a subscription ID and encryption
// keys
export const subscriptionInfoWrapper = (subcriptionId: string, subscriptionInfo: Object, channelIDs: ?string[]): Object => {
  subscriptionInfo.endpoint = new URL(subscriptionInfo.endpoint)

  Object.defineProperties(subscriptionInfo, {
    'id': {
      get () {
        return subcriptionId
      }
    },
    // These encryption keys are used for encrypting push notification bodies
    // and are unrelated to VAPID, which is used for provenance.
    'encryptionKeys': {
      get: (() => {
        let count = 0
        let resultPromise
        let salt
        let uaPublic

        return function (this: Object) {
          // Rotate encryption keys every 2**32 messages
          // This is just a precaution for a birthday attack, which reduces the
          // odds of a collision due to salt reuse to under 10**-18.
          if ((count | 0) === 0) {
            if (!salt) {
              // `this.keys.auth` is a salt value that comes from the browser
              // $FlowFixMe[incompatible-call]
              salt = Buffer.from(this.keys.auth, 'base64url')
            }
            if (!uaPublic) {
              // `this.keys.p256dh` is a public key that is browser-generated
              // $FlowFixMe[incompatible-call]
              uaPublic = Buffer.from(this.keys.p256dh, 'base64url')
            }

            // When we send web push notications, they must be encrypted. The
            // `rfc8291Ikm` function will derive encryption keys based on
            // information orginating from the web push client (i.e., the
            // browser, which is the `uaPublic` and `salt` parameters), and a
            // server encryption key.
            resultPromise = rfc8291Ikm(uaPublic, salt)
            count = 1
          } else {
            count++
          }

          return resultPromise
        }
      })()
    },
    'sockets': {
      value: new Set()
    },
    'subscriptions': {
      value: new Set(channelIDs)
    }
  })

  Object.freeze(subscriptionInfo)

  return subscriptionInfo
}

const removeSubscription = (server, subscriptionId) => {
  const subscription = server.pushSubscriptions[subscriptionId]
  delete server.pushSubscriptions[subscriptionId]
  if (server.subscribersByChannelID) {
    subscription.subscriptions.forEach((channelID) => {
      server.subscribersByChannelID[channelID].delete(subscription)
    })
  }
  deleteSubscriptionFromIndex(subscriptionId).then(() => {
    return sbp('chelonia/db/delete', `_private_webpush_${subscriptionId}`)
  }).catch((e) => console.error(e, 'Error removing subscription', subscriptionId))
}

const deleteClient = (subscriptionId) => {
  const server = sbp('okTurtles.data/get', PUBSUB_INSTANCE)
  removeSubscription(server, subscriptionId)
}

// Web push subscriptions (that contain a body) are mandatorily encrypted. The
// encryption method and keys used are described by RFC 8188 and RFC 8291.
// The encryption keys used are derived from a EC key pair (browser-generated),
// a salt (browser-generated) and a second EC key pair (server-generated).
// The browser generated parameters are sent over to us via the WebSocket.
// Although they should be protected, their compromise doesn't mean that
// confidentiality of past or future messages is affected, since only the EC
// public component is sent over the network.
// The encryption keys used correspond to a specific client. Although they are
// supposed to identify a particular client, there is no way to make sure that
// there isn't a MitM. However, we don't really send information as push
// push notifications that isn't already public or could be derived from other
// public sources. The main concern if the encryption is compromised would be
// the ability to infer which channels a client is subscribed to.
const encryptPayload = async (subcription: Object, data: string) => {
  const readableStream = new Response(data).body
  const [asPublic, IKM] = await subcription.encryptionKeys

  return encrypt(aes128gcm, readableStream, 32768, asPublic, IKM).then(async (bodyStream) => {
    const chunks = []
    const reader = bodyStream.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(new Uint8Array(value))
    }
    return Buffer.concat(chunks)
  })
}

export const postEvent = async (subscription: Object, event: ?string): Promise<void> => {
  const authorization = await vapidAuthorization(subscription.endpoint)
  // Note: web push notifications can be 'bodyless' or they can contain a body
  // If there's no body, there isn't anything to encrypt, so we skip both the
  // encryption and the encryption headers.
  const body = event
    ? await encryptPayload(subscription, event)
    : undefined

  const req = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: [
      ['authorization', authorization],
      ...(body
        ? [['content-encoding', 'aes128gcm'],
            [
              'content-type',
              'application/octet-stream'
            ]
          ]
        : []),
      // ['push-receipt', ''],
      ['ttl', '60']
    ],
    body
  })

  if (!req.ok) {
    // If the response was 401 (Unauthorized), 404 (Not found) or 410 (Gone),
    // it likely means that the subscription no longer exists.
    if ([401, 404, 410].includes(req.status)) {
      console.warn(
        new Date().toISOString(),
        'Removing subscription',
        subscription.id
      )
      deleteClient(subscription.id)
      return
    }
    if (req.status === 413) {
      throw new Error('Payload too large')
    }
  }
}

export const pushServerActionhandlers: any = {
  [PUSH_SERVER_ACTION_TYPE.SEND_PUBLIC_KEY] () {
    const socket = this
    socket.send(createMessage(REQUEST_TYPE.PUSH_ACTION, { type: PUSH_SERVER_ACTION_TYPE.SEND_PUBLIC_KEY, data: getVapidPublicKey() }))
  },
  async [PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION] (payload) {
    const socket = this
    const { server } = socket
    const subscription = payload
    const subscriptionId = await getSubscriptionId(subscription)

    if (!server.pushSubscriptions[subscriptionId]) {
      // If this is a new subscription, we call `subscriptionInfoWrapper` and
      // store it in memory.
      server.pushSubscriptions[subscriptionId] = subscriptionInfoWrapper(subscriptionId, subscription)
      addSubscriptionToIndex(subscriptionId).then(() => {
        return sbp('chelonia/db/set', `_private_webpush_${subscriptionId}`, JSON.stringify({ subscription: subscription, channelIDs: [] }))
      }).catch((e) => console.error(e, 'Error saving subscription', subscriptionId))
      // Send an initial push notification to verify that the endpoint works
      // This is mostly for testing to be able to auto-remove invalid or expired
      // endpoints. This doesn't need more error handling than any other failed
      // call to `postEvent`.
      postEvent(server.pushSubscriptions[subscriptionId], JSON.stringify({ type: 'initial' })).catch(e => console.warn(e, 'Error sending initial push notification'))
    } else {
      // Otherwise, if this is an _existing_ push subscription, we don't need
      // to all `subscriptionInfoWrapper` but we need to stop sending messages
      // over the push subscription (since we now have a WS to use, the one
      // over which the message came).
      if (server.pushSubscriptions[subscriptionId].sockets.size === 0) {
        server.pushSubscriptions[subscriptionId].subscriptions.forEach((channelID) => {
          if (!server.subscribersByChannelID[channelID]) return
          server.subscribersByChannelID[channelID].delete(server.pushSubscriptions[subscriptionId])
        })
      }
    }
    // If the WS has an associated push subscription that's different from the
    // one we've received, we need to 'switch' the WS to be associated  with the
    // new push subscription instead.
    if (socket.pushSubscriptionId) {
      if (socket.pushSubscriptionId === subscriptionId) return
      const oldSubscriptionId = socket.pushSubscriptionId
      server.pushSubscriptions[oldSubscriptionId].sockets.delete(socket)
      if (server.pushSubscriptions[oldSubscriptionId].sockets.size === 0) {
        server.pushSubscriptions[oldSubscriptionId].subscriptions.forEach((channelID) => {
          if (!server.subscribersByChannelID[channelID]) {
            server.subscribersByChannelID[channelID] = new Set()
          }
          server.subscribersByChannelID[channelID].add(server.pushSubscriptions[oldSubscriptionId])
        })
      }
    }
    // Now, we're almost done setting things up. We'll link together the push
    // subscription and the WS and add all existing channel subscriptions to the
    // web push subscription (so that we can easily switch over if / when the
    // WS is closed)
    socket.pushSubscriptionId = subscriptionId
    server.pushSubscriptions[subscriptionId].subscriptions.forEach((channelID) => {
      server.subscribersByChannelID?.[channelID].delete(server.pushSubscriptions[subscriptionId])
    })
    server.pushSubscriptions[subscriptionId].sockets.add(socket)
    socket.subscriptions?.forEach(channelID => {
      server.pushSubscriptions[subscriptionId].subscriptions.add(channelID)
    })
    saveSubscription(server, subscriptionId)
  },
  [PUSH_SERVER_ACTION_TYPE.DELETE_SUBSCRIPTION] () {
    const socket = this
    const { server, pushSubscriptionId: subscriptionId } = socket

    if (subscriptionId) {
      removeSubscription(server, subscriptionId)
    }
  }
}
