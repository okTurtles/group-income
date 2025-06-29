import { aes128gcm } from '@apeleghq/rfc8188/encodings'
import encrypt from '@apeleghq/rfc8188/encrypt'
import sbp from '@sbp/sbp'
import { Buffer } from 'node:buffer'
import { appendToIndexFactory, removeFromIndexFactory } from './database.js'
import { PUBSUB_INSTANCE } from './instance-keys.js'
import rfc8291Ikm from './rfc8291Ikm.js'
import { getVapidPublicKey, vapidAuthorization } from './vapid.js'
import { getSubscriptionId } from '@chelonia/lib/functions'

// const pushController = require('web-push')
const { PUSH_SERVER_ACTION_TYPE, REQUEST_TYPE, createMessage } = require('@chelonia/lib/pubsub')

const addSubscriptionToIndex = appendToIndexFactory('_private_webpush_index')
const deleteSubscriptionFromIndex = removeFromIndexFactory('_private_webpush_index')

const saveSubscription = (server, subscriptionId) => {
  return sbp('chelonia.db/set', `_private_webpush_${subscriptionId}`, JSON.stringify({
    settings: server.pushSubscriptions[subscriptionId].settings,
    subscriptionInfo: server.pushSubscriptions[subscriptionId],
    channelIDs: [...server.pushSubscriptions[subscriptionId].subscriptions]
  })).catch(e => {
    console.error(e, 'Error saving subscription', subscriptionId)
    throw e // rethrow
  })
}

export const addChannelToSubscription = (server: Object, subscriptionId: string, channelID: string): void => {
  server.pushSubscriptions[subscriptionId].subscriptions.add(channelID)
  return saveSubscription(server, subscriptionId)
}

export const deleteChannelFromSubscription = (server: Object, subscriptionId: string, channelID: string): void => {
  server.pushSubscriptions[subscriptionId].subscriptions.delete(channelID)
  return saveSubscription(server, subscriptionId)
}

const removeSubscription = async (subscriptionId) => {
  try {
    const server = sbp('okTurtles.data/get', PUBSUB_INSTANCE)
    const subscription = server.pushSubscriptions[subscriptionId]
    if (subscription) {
      delete server.pushSubscriptions[subscriptionId]
      if (server.subscribersByChannelID) {
        subscription.subscriptions.forEach((channelID) => {
          server.subscribersByChannelID[channelID]?.delete(subscription)
        })
      }
    } else {
      // this can happen for example when a new subscription is added but then
      // immediately removed because postEvent got a 401 Unauthorized when adding
      // the new subscription. In this case removeSubscription could be later called
      // again by the client but it's already been removed
      // console.warn(`removeSubscription: non-existent subscription '${subscriptionId}'`)
    }
    await sbp('chelonia.db/delete', `_private_webpush_${subscriptionId}`)
    await deleteSubscriptionFromIndex(subscriptionId)
  } catch (e) {
    console.error(e, 'Error removing subscription', subscriptionId)
    // swallow error
  }
}

// Wrap a SubscriptionInfo object to include a subscription ID and encryption
// keys
export const subscriptionInfoWrapper = (subscriptionId: string, subscriptionInfo: Object, extra: { channelIDs?: string[], settings?: Object }): Object => {
  subscriptionInfo.endpoint = new URL(subscriptionInfo.endpoint)

  Object.defineProperties(subscriptionInfo, {
    'id': {
      get () {
        return subscriptionId
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
    'settings': {
      value: extra.settings || {}
    },
    'sockets': {
      value: new Set()
    },
    'subscriptions': {
      value: new Set(extra.channelIDs)
    }
  })

  Object.freeze(subscriptionInfo)

  return subscriptionInfo
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
const encryptPayload = async (subscription: Object, data: string) => {
  const readableStream = new Response(data).body
  const [asPublic, IKM] = await subscription.encryptionKeys

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
  // console.debug(`postEvent to ${subscription.id}:`, event)
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
    const endpointHost = new URL(subscription.endpoint).host
    console.info(
      await req.text().then(response => ({ response })).catch(e => `ERR: ${e?.message}`),
      `Error ${req.status} sending push notification to '${subscription.id}' via ${endpointHost}`
    )
    // If the response was 401 (Unauthorized), 404 (Not found) or 410 (Gone),
    // it likely means that the subscription no longer exists.
    if ([401, 404, 410].includes(req.status)) {
      removeSubscription(subscription.id)
      throw new Error(`Error sending push: ${req.status}`)
    }
    if (req.status === 413) {
      throw new Error('Payload too large')
    }
    // ignore other errors as they might be temporary server configuration errors
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
    const { applicationServerKey, settings, subscriptionInfo } = payload
    if (applicationServerKey) {
      const ourVapidPublicKey = getVapidPublicKey()
      // $FlowFixMe[incompatible-call]
      const theirVapidPublicKey = Buffer.from(applicationServerKey, 'base64').toString('base64url')
      // If the applicationServerKey (VAPID) key doesn't match ours, something
      // went wrong, possibly in the client. We don't proceed because we know in
      // advance that we won't be able to use such a subscription (since the
      // push endpoint will fail authentication and we'll receive a 401). So, we
      // let the client know our key so that they can retry.
      // NOTE: The VAPID key is different from the subscription information,
      // which is different for each client. This is exclusively a check on the
      // VAPID public key, which is a static value derived from
      // `_private_immutable_vapid_key`, shared by all clients and used by the
      // server to authenticate itself when connecting to push endpoints.
      if (ourVapidPublicKey !== theirVapidPublicKey) {
        socket.send(createMessage(REQUEST_TYPE.PUSH_ACTION, { type: PUSH_SERVER_ACTION_TYPE.SEND_PUBLIC_KEY, data: getVapidPublicKey() }))
        console.warn({ ourVapidPublicKey, theirVapidPublicKey }, 'Refusing to store subscription because the associated public VAPID key does not match ours')
        return
      }
    }
    let subscriptionId = null
    let host = ''
    let subscriptionWrapper = null
    try {
      subscriptionId = await getSubscriptionId(subscriptionInfo)
      subscriptionWrapper = server.pushSubscriptions[subscriptionId]

      if (!subscriptionWrapper) {
        console.debug(`saving new push subscription '${subscriptionId}':`, subscriptionInfo)
        // If this is a new subscription, we call `subscriptionInfoWrapper` and store it in memory.
        server.pushSubscriptions[subscriptionId] = subscriptionInfoWrapper(subscriptionId, subscriptionInfo, { settings })
        subscriptionWrapper = server.pushSubscriptions[subscriptionId]
        host = subscriptionWrapper.endpoint.host
        await addSubscriptionToIndex(subscriptionId)
        await saveSubscription(server, subscriptionId)
        // Send an initial push notification to verify that the endpoint works
        // This is mostly for testing to be able to auto-remove invalid or expired
        // endpoints. This doesn't need more error handling than any other failed
        // call to `postEvent`.
        await postEvent(subscriptionWrapper, JSON.stringify({ type: 'initial' }))
      } else {
        // Otherwise, if this is an _existing_ push subscription, we don't need
        // to call `subscriptionInfoWrapper` but we need to stop sending messages
        // over the push subscription (since we now have a WS to use, the one
        // over which the message came).
        // We expect `server.pushSubscriptions[subscriptionId].sockets.size` to
        // be `0` when the WS connection has been closed and has since reconnected
        // If it's not 0, we've already run this code at least once and we don't
        // need to run it again.
        host = subscriptionWrapper.endpoint.host // seems like a DRY violation but is actually necessary
        if (subscriptionWrapper.sockets.size === 0) {
          subscriptionWrapper.subscriptions.forEach((channelID) => {
            if (!server.subscribersByChannelID[channelID]) return
            server.subscribersByChannelID[channelID].delete(subscriptionWrapper)
          })
        }
      }
      // If the WS has an associated push subscription that's different from the
      // one we've received, we need to 'switch' the WS to be associated  with the
      // new push subscription instead.
      if (socket.pushSubscriptionId) {
        if (socket.pushSubscriptionId === subscriptionId) return
        // Since the subscription has been updated, remove the old one on the
        // assumption that it's no longer valid
        await removeSubscription(socket.pushSubscriptionId)
        /*
        // The code below is an alternative to removing the subscription, which is
        // safer but can result in accumulating old subscriptions forever. What it
        // does is treat it as a closed WS, meaning that the current WS will be
        // associated with the subscription info we've just received, but we'll
        // start sending messages to the old subscription as if it had been closed.
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
        */
      }
      // Now, we're almost done setting things up. We'll link together the push
      // subscription and the WS and add all existing channel subscriptions to the
      // web push subscription (so that we can easily switch over if / when the
      // WS is closed, see the `close` () function in socketHandlers in server.js)
      socket.pushSubscriptionId = subscriptionId
      subscriptionWrapper.subscriptions.forEach((channelID) => {
        server.subscribersByChannelID[channelID]?.delete(subscriptionWrapper)
      })
      subscriptionWrapper.sockets.add(socket)
      socket.subscriptions?.forEach(channelID => {
        // $FlowFixMe[incompatible-use]
        subscriptionWrapper.subscriptions.add(channelID)
      })
      await saveSubscription(server, subscriptionId)
    } catch (e) {
      console.error(e, `[${socket.ip}] Failed to store subscription '${subscriptionId || '??'}' (${host}), removing it!`)
      subscriptionId && removeSubscription(subscriptionId)
      throw e // rethrow
    }
  },
  [PUSH_SERVER_ACTION_TYPE.DELETE_SUBSCRIPTION] () {
    const socket = this
    const { pushSubscriptionId: subscriptionId } = socket

    if (subscriptionId) {
      return removeSubscription(subscriptionId)
    }
  }
}
