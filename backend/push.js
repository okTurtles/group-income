import { aes128gcm } from '@exact-realty/rfc8188/encodings'
import encrypt from '@exact-realty/rfc8188/encrypt'
// $FlowFixMe[missing-export]
import { webcrypto as crypto } from 'crypto' // Needed for Node 18 and under
import rfc8291Ikm from './rfc8291Ikm.js'
import { getVapidPublicKey, vapidAuthorization } from './vapid.js'

// const pushController = require('web-push')
const { PUSH_SERVER_ACTION_TYPE, REQUEST_TYPE, createMessage } = require('../shared/pubsub.js')

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
export const subscriptionInfoWrapper = (subcriptionId: string, subscriptionInfo: Object): Object => {
  subscriptionInfo.endpoint = new URL(subscriptionInfo.endpoint)

  Object.defineProperties(subscriptionInfo, {
    'id': {
      get () {
        return subcriptionId
      }
    },
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
              // $FlowFixMe[incompatible-call]
              salt = Buffer.from(this.keys.auth, 'base64url')
            }
            if (!uaPublic) {
              // $FlowFixMe[incompatible-call]
              uaPublic = Buffer.from(this.keys.p256dh, 'base64url')
            }

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
      value: new Set()
    }
  })

  Object.freeze(subscriptionInfo)

  return subscriptionInfo
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
      server.pushSubscriptions[subscriptionId] = subscriptionInfoWrapper(subscriptionId, subscription)
    } else {
      if (server.pushSubscriptions[subscriptionId].sockets.size === 0) {
        server.pushSubscriptions[subscriptionId].subscriptions.forEach((channelID) => {
          if (!server.subscribersByChannelID[channelID]) return
          server.subscribersByChannelID[channelID].delete(server.pushSubscriptions[subscriptionId])
        })
      }
    }
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
    socket.pushSubscriptionId = subscriptionId
    server.pushSubscriptions[subscriptionId].subscriptions.forEach((channelID) => {
      server.subscribersByChannelID?.[channelID].delete(server.pushSubscriptions[subscriptionId])
    })
    server.pushSubscriptions[subscriptionId].sockets.add(socket)
    socket.subscriptions?.forEach(channelID => {
      server.pushSubscriptions[subscriptionId].subscriptions.add(channelID)
    })
  },
  [PUSH_SERVER_ACTION_TYPE.DELETE_SUBSCRIPTION] (payload) {
    const socket = this
    const subscriptionId = JSON.parse(payload)

    // TODO
    delete socket.server.pushSubscriptions[subscriptionId]
  }
}

// TODO: Implement
const deleteClient = (_) => {}

const encryptPayload = async (subcription: Object, data: any) => {
  const readableStream = new Response(data).body
  const [asPublic, IKM] = await subcription.encryptionKeys

  return encrypt(aes128gcm, readableStream, 32768, asPublic, IKM)
}

export const postEvent = async (subscription: Object, event: any): Promise<void> => {
  const authorization = await vapidAuthorization(subscription.endpoint)
  const body = await encryptPayload(subscription, JSON.stringify(event)).then(async (bodyStream) => {
    const chunks = []
    const reader = bodyStream.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(new Uint8Array(value))
    }
    return Buffer.concat(chunks)
  })

  const req = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: [
      ['authorization', authorization],
      ['content-encoding', 'aes128gcm'],
      [
        'content-type',
        'application/octet-stream'
      ],
      // ["push-receipt", ""],
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
    }
  }
}
