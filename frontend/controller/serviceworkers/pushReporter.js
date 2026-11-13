'use strict'

import { getSubscriptionId as defaultGetSubscriptionId } from '@chelonia/lib/functions'
import { PUSH_SERVER_ACTION_TYPE, REQUEST_TYPE, createMessage } from '@chelonia/lib/pubsub'
import { Buffer } from 'buffer'
import { PUBSUB_NOT_OPEN_ERROR } from '../../utils/constants.js'
import type { Timers } from '../../utils/timers.js'
import { defaultTimers } from '../../utils/timers.js'
import { isSocketOpen } from './socket.js'

// The server's VAPID public key should change very infrequently, if at all
export const VAPID_CACHE_DURATION = 3600e3
export const VAPID_REQUEST_TIMEOUT = 10e3
const PUSH_HEARTBEAT_INTERVAL = 12 * 60 * 60 * 1000

export type PushReporter = {
  getSubscriptionOptions: () => Promise<Object>,
  reportExistingSubscription: (subscriptionInfo?: ?Object, applicationServerKey?: ?ArrayBuffer) => Promise<boolean>,
  onPushAction: (message: { data: Object }) => void,
  onReconnected: (client?: Object) => Promise<void>
}

// The application server (public) key could be either an ArrayBuffer (which is
// what we get from fetching the current subscription), or it could be a
// base64url-encoded string (which is what we usually get from the server)
// This function coerces both of these into a `Uint8Array` instance.
export const strOrBufToBuf = (v: string | Uint8Array | ArrayBuffer): Uint8Array => {
  if (typeof v === 'string') {
    return Buffer.from(
      // Convert from base64url to base64
      v.replace(/_/g, '/').replace(/-/g, '+') + '='.repeat((4 - v.length % 4) % 4),
      'base64'
    )
  }
  return new Uint8Array(v)
}

export const bufferEq = (a?: ?(string | ArrayBuffer | Uint8Array), b?: ?(string | ArrayBuffer | Uint8Array)): boolean => {
  // eslint-disable-next-line eqeqeq
  if (a == null || b == null) return a == b

  const ab = strOrBufToBuf(a)
  const bb = strOrBufToBuf(b)

  if (ab.byteLength !== bb.byteLength) return false

  for (let i = ab.byteLength - 1; i >= 0; i--) {
    if (ab[i] !== bb[i]) return false
  }

  return true
}

const pubsubNotOpenError = (message: string): Error => {
  const e = new Error(message)
  e.name = PUBSUB_NOT_OPEN_ERROR
  return e
}

// Reports this device's Web Push subscription to the server, over the service
// worker's pubsub connection. The server pairs push subscriptions with
// WebSocket connections, so that it can switch from WebSocket to Web Push
// notifications when the connection goes away. The subscription is reported:
//   1. when it is created (usually right after the notification permission
//      is granted). This is done from a tab, because requesting permissions
//      can't be done from the SW and typically requires user interaction;
//   2. on every (re)connection (`onReconnected`), since the pairing is per
//      connection;
//   3. on the 'pushsubscriptionchange' event, so that the server replaces
//      the old subscription;
//   4. when the server's VAPID key changes (`onPushAction`).
// Not being connected is not an error: `reportExistingSubscription` resolves
// to `false`, and the reconnection that follows reports the subscription the
// browser holds then (nothing if notifications are disabled), not the earlier
// report.
//   - `getPubsub()`: the current pubsub client, if any.
//   - `pushManager`: the SW registration's `PushManager`, if any.
//   - `isLoggedIn()`, `notificationsDisabled()`: checked on reconnection and
//     on a VAPID key change, before (re)subscribing.
export function createPushReporter ({
  getPubsub,
  pushManager,
  isLoggedIn,
  notificationsDisabled,
  getSubscriptionId = defaultGetSubscriptionId,
  now = () => performance.now(),
  timers = defaultTimers
}: {
  getPubsub: () => ?Object,
  pushManager: ?Object,
  isLoggedIn: () => boolean,
  notificationsDisabled: () => boolean,
  getSubscriptionId?: (subscriptionInfo: Object) => Promise<string>,
  now?: () => number,
  timers?: Timers
}): PushReporter {
  let cachedVapidInformation: ?[number, Object]
  const vapidWaiters: Set<(options: Object) => void> = new Set()

  // Whether `socket` is still the open socket of the current client
  const isCurrentOpenSocket = (pubsub: Object, socket: Object): boolean =>
    getPubsub() === pubsub && pubsub.socket === socket && isSocketOpen(socket)

  const requestVapidKey = (): Promise<Object> => {
    return new Promise((resolve, reject) => {
      const pubsub = getPubsub()
      if (!pubsub) return reject(pubsubNotOpenError('Missing pubsub instance'))
      const socket = pubsub.socket
      if (!isSocketOpen(socket)) return reject(pubsubNotOpenError('WebSocket connection is not open'))

      const waiter = (options) => {
        vapidWaiters.delete(waiter)
        timers.clearTimeout(timeoutID)
        resolve(options)
      }
      // Either the socket died without being closed yet (a connection
      // problem: retried on reconnection), or the server is slow or answered
      // with an error, which the 2.0.0 client only logs (the tab retries)
      const timeoutID = timers.setTimeout(() => {
        vapidWaiters.delete(waiter)
        const message = 'Timed out requesting VAPID key'
        reject(isCurrentOpenSocket(pubsub, socket) ? new Error(message) : pubsubNotOpenError(message))
      }, VAPID_REQUEST_TIMEOUT)
      vapidWaiters.add(waiter)

      try {
        socket.send(createMessage(
          REQUEST_TYPE.PUSH_ACTION,
          { action: PUSH_SERVER_ACTION_TYPE.SEND_PUBLIC_KEY }
        ))
      } catch (e) {
        vapidWaiters.delete(waiter)
        timers.clearTimeout(timeoutID)
        reject(e)
      }
    })
  }

  // The request in flight, shared by later callers while its socket is the
  // current one and open. One made on a socket that has been replaced or is
  // closing may never be answered: a later caller doesn't wait for it, but
  // sends its own request, or is rejected at once if the socket isn't open.
  let vapidRequest: ?{ socket: Object, promise: Promise<Object> } = null

  const getSubscriptionOptions = (): Promise<Object> => {
    if (cachedVapidInformation && (now() - cachedVapidInformation[0]) < VAPID_CACHE_DURATION) {
      return Promise.resolve(cachedVapidInformation[1])
    }
    const socket = getPubsub()?.socket
    if (vapidRequest && vapidRequest.socket === socket && isSocketOpen(socket)) return vapidRequest.promise
    const promise = requestVapidKey()
    if (socket) {
      const request = { socket, promise }
      vapidRequest = request
      const clear = () => { if (vapidRequest === request) vapidRequest = null }
      promise.then(clear, clear)
    }
    return promise
  }

  // The subscription the server should have for this device;
  // `subscriptionInfo` is `undefined` or `null` for none. Until the first
  // report, that's also what is assumed, so nothing is sent
  let wanted: { subscriptionInfo: ?Object, applicationServerKey: ?ArrayBuffer } = { subscriptionInfo: null, applicationServerKey: null }
  // Incremented by every report (from a tab, or after a subscription change),
  // so that a reconnection doesn't replace a report made while it read the
  // browser's subscription
  let reportGeneration = 0
  const reportedSubscriptionBySocket: WeakMap<Object, ?Object> = new WeakMap()

  const getSubID = async (subscription: Object): Promise<string> => {
    try {
      return await getSubscriptionId(subscription)
    } catch (e) {
      return `ERR: ${e?.message}`
    }
  }

  // Sends `wanted` on the current socket, if it is open and doesn't have it
  // yet. Resolves to `false` when there is no open socket.
  const flushOnce = async (): Promise<boolean> => {
    const pubsub = getPubsub()
    const socket = pubsub?.socket
    if (!pubsub || !socket || !isSocketOpen(socket)) return false

    const { subscriptionInfo, applicationServerKey } = wanted
    const reported = reportedSubscriptionBySocket.get(socket)
    let message = null
    let description = ''
    if (subscriptionInfo?.endpoint) {
      if (!reported || subscriptionInfo.endpoint !== reported.endpoint) {
        const subID = await getSubID(subscriptionInfo)
        description = `reporting '${subID}': ${new URL(subscriptionInfo.endpoint).host}`
        message = createMessage(
          REQUEST_TYPE.PUSH_ACTION,
          {
            action: PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION,
            payload: {
              applicationServerKey: applicationServerKey
                ? Buffer.from(applicationServerKey).toString('base64')
                : null,
              settings: {
                heartbeatInterval: PUSH_HEARTBEAT_INTERVAL
              },
              subscriptionInfo
            }
          }
        )
      }
    } else if (reported?.endpoint) {
      const subID = await getSubID(reported)
      description = `removing subscription '${subID}': ${new URL(reported.endpoint).host}`
      message = createMessage(
        REQUEST_TYPE.PUSH_ACTION,
        { action: PUSH_SERVER_ACTION_TYPE.DELETE_SUBSCRIPTION, payload: null }
      )
    }

    // The connection may have been replaced or closed meanwhile. Then nothing
    // is recorded, and the reconnection reports on the new socket.
    if (!isCurrentOpenSocket(pubsub, socket)) return false
    if (message) {
      console.info(`[reportExistingSubscription] ${description}`)
      socket.send(message)
    }
    reportedSubscriptionBySocket.set(socket, subscriptionInfo)
    return true
  }

  // One flush at a time, so that concurrent reports can't send the same
  // subscription twice on a socket, or reorder a storage and a removal
  let flushQueue: Promise<mixed> = Promise.resolve()
  const flush = (): Promise<boolean> => {
    const result = flushQueue.then(flushOnce)
    flushQueue = result.catch(() => {})
    return result
  }

  const reportExistingSubscription = async (subscriptionInfo?: ?Object, applicationServerKey?: ?ArrayBuffer): Promise<boolean> => {
    reportGeneration++
    wanted = { subscriptionInfo, applicationServerKey }
    const sent = await flush()
    if (!sent) {
      console.info("[reportExistingSubscription] not connected to the server; the browser's subscription will be reported once reconnected")
    }
    return sent
  }

  const onServerKeyChanged = async (options: Object) => {
    if (!pushManager) return
    const subscription = await pushManager.getSubscription()
    if (!subscription) return
    if (bufferEq(subscription.options.applicationServerKey, options.applicationServerKey)) return
    console.warn('VAPID server key changed; removing existing subscription and setting up a new one', {
      oldApplicationServerPublicKey: subscription.options.applicationServerKey && Buffer.from(subscription.options.applicationServerKey).toString('base64'),
      newApplicationServerPublicKey: options.applicationServerKey
    })
    // If unsubscribe fails, it doesn't make much sense to proceed, as we
    // can't really create new subscription
    await subscription.unsubscribe()
    // return b/c device settings not loaded
    if (!isLoggedIn() || notificationsDisabled()) return
    const newSubscription = await pushManager.subscribe(options)
    await reportExistingSubscription(newSubscription?.toJSON(), newSubscription?.options.applicationServerKey)
  }

  // Called with every `REQUEST_TYPE.PUSH_ACTION` message from the server.
  // Doesn't throw: it runs inside the pubsub message handler.
  const onPushAction = ({ data }: { data: Object }) => {
    try {
      if (data?.type !== PUSH_SERVER_ACTION_TYPE.SEND_PUBLIC_KEY) return
      const oldKey = cachedVapidInformation?.[1].applicationServerKey
      const options = {
        userVisibleOnly: true,
        applicationServerKey: data.data
      }
      cachedVapidInformation = [now(), options]
      Array.from(vapidWaiters).forEach(waiter => waiter(options))
      if (oldKey === data.data) return
      onServerKeyChanged(options).catch(e => {
        console.error('[push] Error re-subscribing after a VAPID key change', e)
      })
    } catch (e) {
      console.error('[push] Error handling a push action', e)
    }
  }

  // Reconnections that happen while a report is in progress (e.g. during a
  // slow `getSubscription()`) aren't skipped: the report runs again.
  let running = false
  let again = false
  const onReconnected = async (client?: Object): Promise<void> => {
    try {
      if (!pushManager) return
      if (client && client !== getPubsub()) return
      if (running) {
        again = true
        return
      }
      running = true
      try {
        do {
          again = false
          if (!isLoggedIn()) return // return b/c device settings not loaded
          const disableNotifications = notificationsDisabled()
          console.info('pubsub reconnected. disableNotifications=', disableNotifications)
          if (disableNotifications) continue
          try {
            const generation = reportGeneration
            const subscription = await pushManager.getSubscription()
            // Disabled during the read: nothing is sent (the tab reports the
            // removal)
            if (notificationsDisabled()) continue
            if (generation === reportGeneration) {
              wanted = {
                subscriptionInfo: subscription?.toJSON(),
                applicationServerKey: subscription?.options.applicationServerKey
              }
            }
            await flush()
          } catch (e) {
            console.error('Error reporting subscription on reconnection', e)
          }
        } while (again)
      } finally {
        running = false
      }
    } catch (e) {
      console.error('Error reporting subscription on reconnection', e)
    }
  }

  return {
    getSubscriptionOptions,
    reportExistingSubscription,
    onPushAction,
    onReconnected
  }
}
