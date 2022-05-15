'use strict'

import sbp from '@sbp/sbp'
import '@sbp/okturtles.events'
import type { JSONObject, JSONType } from '~/shared/types.js'

// ====== Event name constants ====== //

export const PUBSUB_ERROR = 'pubsub-error'
export const PUBSUB_RECONNECTION_ATTEMPT = 'pubsub-reconnection-attempt'
export const PUBSUB_RECONNECTION_FAILED = 'pubsub-reconnection-failed'
export const PUBSUB_RECONNECTION_SCHEDULED = 'pubsub-reconnection-scheduled'
export const PUBSUB_RECONNECTION_SUCCEEDED = 'pubsub-reconnection-succeeded'

// ====== Types ====== //

/*
 * Flowtype usage notes:
 *
 * - The '+' prefix indicates properties that should not be re-assigned or
 *   deleted after their initialization.
 *
 * - 'TimeoutID' is an opaque type declared in Flow's core definition file,
 *   used as the return type of the core setTimeout() function.
 */

export type Message = {
  [key: string]: JSONType,
  +type: string
}

export type PubSubClient = {
  connectionTimeoutID: TimeoutID | void,
  +customEventHandlers: Object,
  failedConnectionAttempts: number,
  +isLocal: boolean,
  isNew: boolean,
  +listeners: Object,
  +messageHandlers: Object,
  nextConnectionAttemptDelayID: TimeoutID | void,
  +options: Object,
  +pendingSubscriptionSet: Set<string>,
  pendingSyncSet: Set<string>,
  +pendingUnsubscriptionSet: Set<string>,
  pingTimeoutID: TimeoutID | void,
  shouldReconnect: boolean,
  socket: WebSocket | null,
  +subscriptionSet: Set<string>,
  +url: string,
  // Methods
  clearAllTimers(): void,
  connect(): void,
  destroy(): void,
  pub(contractID: string, data: JSONType): void,
  scheduleConnectionAttempt(): void,
  sub(contractID: string): void,
  unsub(contractID: string): void
}

export type SubMessage = {
  [key: string]: JSONType,
  +type: 'sub',
  +contractID: string,
  +dontBroadcast: boolean
}

export type UnsubMessage = {
  [key: string]: JSONType,
  +type: 'unsub',
  +contractID: string,
  +dontBroadcast: boolean
}

// ====== Enums ====== //

export const NOTIFICATION_TYPE = Object.freeze({
  ENTRY: 'entry',
  APP_VERSION: 'app_version',
  PING: 'ping',
  PONG: 'pong',
  PUB: 'pub',
  SUB: 'sub',
  UNSUB: 'unsub'
})

export const REQUEST_TYPE = Object.freeze({
  PUB: 'pub',
  SUB: 'sub',
  UNSUB: 'unsub'
})

export const RESPONSE_TYPE = Object.freeze({
  ERROR: 'error',
  SUCCESS: 'success'
})

export type NotificationTypeEnum = $Values<typeof NOTIFICATION_TYPE>
export type RequestTypeEnum = $Values<typeof REQUEST_TYPE>
export type ResponseTypeEnum = $Values<typeof RESPONSE_TYPE>

// ====== API ====== //

/**
 * Creates a pubsub client instance.
 *
 * @param {string} url - A WebSocket URL to connect to.
 * @param {Object?} options
 * {object?} handlers - Custom handlers for WebSocket events.
 * {boolean?} logPingMessages - Whether to log received pings.
 * {boolean?} manual - Whether the factory should call 'connect()' automatically.
 *   Also named 'autoConnect' or 'startClosed' in other libraries.
 * {object?} messageHandlers - Custom handlers for different message types.
 * {number?} pingTimeout=45_000 - How long to wait for the server to send a ping, in milliseconds.
 * {boolean?} reconnectOnDisconnection=true - Whether to reconnect after a server-side disconnection.
 * {boolean?} reconnectOnOnline=true - Whether to reconnect after coming back online.
 * {boolean?} reconnectOnTimeout=false - Whether to reconnect after a connection timeout.
 * {number?} timeout=5_000 - Connection timeout duration in milliseconds.
 * @returns {PubSubClient}
 */
export function createClient (url: string, options?: Object = {}): PubSubClient {
  const client: PubSubClient = {
    customEventHandlers: options.handlers || {},
    // The current number of connection attempts that failed.
    // Reset to 0 upon successful connection.
    // Used to compute how long to wait before the next reconnection attempt.
    failedConnectionAttempts: 0,
    isLocal: /\/\/(localhost|127\.0\.0\.1)([:?/]|$)/.test(url),
    // True if this client has never been connected yet.
    isNew: true,
    listeners: Object.create(null),
    messageHandlers: { ...defaultMessageHandlers, ...options.messageHandlers },
    nextConnectionAttemptDelayID: undefined,
    options: { ...defaultOptions, ...options },
    // Requested subscriptions for which we didn't receive a response yet.
    pendingSubscriptionSet: new Set(),
    pendingSyncSet: new Set(),
    pendingUnsubscriptionSet: new Set(),
    pingTimeoutID: undefined,
    shouldReconnect: true,
    // The underlying WebSocket object.
    // A new one is necessary for every connection or reconnection attempt.
    socket: null,
    subscriptionSet: new Set(),
    connectionTimeoutID: undefined,
    url: url.replace(/^http/, 'ws'),
    ...publicMethods
  }
  // Create and save references to reusable event listeners.
  // Every time a new underlying WebSocket object will be created for this
  // client instance, these event listeners will be detached from the older
  // socket then attached to the new one, hereby avoiding both unnecessary
  // allocations and garbage collections of a bunch of functions every time.
  // Another benefit is the ability to patch the client protocol at runtime by
  // updating the client's custom event handler map.
  for (const name of Object.keys(defaultClientEventHandlers)) {
    client.listeners[name] = (event) => {
      try {
        // Use `.call()` to pass the client via the 'this' binding.
        defaultClientEventHandlers[name]?.call(client, event)
        client.customEventHandlers[name]?.call(client, event)
      } catch (error) {
        // Do not throw any error but emit an `error` event instead.
        sbp('okTurtles.events/emit', PUBSUB_ERROR, client, error.message)
      }
    }
  }
  // Add global event listeners before the first connection.
  if (typeof window === 'object') {
    for (const name of globalEventNames) {
      window.addEventListener(name, client.listeners[name])
    }
  }
  if (!client.options.manual) {
    client.connect()
  }
  return client
}

export function createMessage (type: string, data: JSONType): string {
  return JSON.stringify({ type, data })
}

export function createRequest (type: RequestTypeEnum, data: JSONObject, dontBroadcast: boolean = false): string {
  // Had to use Object.assign() instead of object spreading to make Flow happy.
  return JSON.stringify(Object.assign({ type, dontBroadcast }, data))
}

// These handlers receive the PubSubClient instance through the `this` binding.
const defaultClientEventHandlers = {
  // Emitted when the connection is closed.
  close (event: CloseEvent) {
    const client = this

    console.debug('[pubsub] Event: close', event.code, event.reason)
    client.failedConnectionAttempts++

    if (client.socket) {
      // Remove event listeners to avoid memory leaks.
      for (const name of socketEventNames) {
        client.socket.removeEventListener(name, client.listeners[name])
      }
    }
    client.socket = null
    client.clearAllTimers()

    // This has been commented out to make the client always try to reconnect.
    // See https://github.com/okTurtles/group-income/issues/1246
    /*
    // See "Status Codes" https://tools.ietf.org/html/rfc6455#section-7.4
    switch (event.code) {
      // TODO: verify that this list of codes is correct.
      case 1000: case 1002: case 1003: case 1007: case 1008: {
        client.shouldReconnect = false
        break
      }
      default: break
    }
    */
    // If we should reconnect then consider our current subscriptions as pending again,
    // waiting to be restored upon reconnection.
    if (client.shouldReconnect) {
      client.subscriptionSet.forEach((contractID) => {
        // Skip contracts from which we had to unsubscribe anyway.
        if (!client.pendingUnsubscriptionSet.has(contractID)) {
          client.pendingSubscriptionSet.add(contractID)
        }
      })
    }
    // We are no longer subscribed to any contracts since we are now disconnected.
    client.subscriptionSet.clear()
    client.pendingUnsubscriptionSet.clear()

    if (client.shouldReconnect && client.options.reconnectOnDisconnection) {
      if (client.failedConnectionAttempts > client.options.maxRetries) {
        sbp('okTurtles.events/emit', PUBSUB_RECONNECTION_FAILED, client)
      } else {
        // If we are definetely offline then do not try to reconnect now,
        // unless the server is local.
        if (!isDefinetelyOffline() || client.isLocal) {
          client.scheduleConnectionAttempt()
        }
      }
    }
  },

  // Emitted when an error has occured.
  // The socket will be closed automatically by the engine if necessary.
  error (event: Event) {
    const client = this
    // Not all error events should be logged with console.error, for example every
    // failed connection attempt generates one such event.
    console.warn('[pubsub] Event: error', event)
    clearTimeout(client.pingTimeoutID)
  },

  // Emitted when a message is received.
  // The connection will be terminated if the message is malformed or has an
  // unexpected data type (e.g. binary instead of text).
  message (event: MessageEvent) {
    const client = this
    const { data } = event

    if (typeof data !== 'string') {
      sbp('okTurtles.events/emit', PUBSUB_ERROR, client, {
        message: `Wrong data type: ${typeof data}`
      })
      return client.destroy()
    }
    let msg: Message = { type: '' }

    try {
      msg = messageParser(data)
    } catch (error) {
      sbp('okTurtles.events/emit', PUBSUB_ERROR, client, {
        message: `Malformed message: ${error.message}`
      })
      return client.destroy()
    }
    const handler = client.messageHandlers[msg.type]

    if (handler) {
      handler.call(client, msg)
    } else {
      throw new Error(`Unhandled message type: ${msg.type}`)
    }
  },

  offline (event: Event) {
    console.info('[pubsub] Event: offline')
    const client = this

    client.clearAllTimers()
    // Reset the connection attempt counter so that we'll start a new
    // reconnection loop when we are back online.
    client.failedConnectionAttempts = 0
    client.socket?.close()
  },

  online (event: Event) {
    console.info('[pubsub] Event: online')
    const client = this

    if (client.options.reconnectOnOnline && client.shouldReconnect) {
      if (!client.socket) {
        client.failedConnectionAttempts = 0
        client.scheduleConnectionAttempt()
      }
    }
  },

  // Emitted when the connection is established.
  open (event: Event) {
    console.debug('[pubsub] Event: open')
    const client = this
    const { options } = this

    client.clearAllTimers()
    sbp('okTurtles.events/emit', PUBSUB_RECONNECTION_SUCCEEDED, client)

    // Set it to -1 so that it becomes 0 on the next `close` event.
    client.failedConnectionAttempts = -1
    client.isNew = false
    // Setup a ping timeout if required.
    // It will close the connection if we don't get any message from the server.
    if (options.pingTimeout > 0 && options.pingTimeout < Infinity) {
      client.pingTimeoutID = setTimeout(() => {
        client.socket?.close()
      }, options.pingTimeout)
    }
    // We only need to handle contract resynchronization here when reconnecting.
    // Not on initial connection, since the login code already does it.
    if (!client.isNew) {
      client.pendingSyncSet = new Set(client.pendingSubscriptionSet)
    }
    // Send any pending subscription request.
    client.pendingSubscriptionSet.forEach((contractID) => {
      client.socket?.send(createRequest(REQUEST_TYPE.SUB, { contractID }, true))
    })
    // There should be no pending unsubscription since we just got connected.
  },

  'reconnection-attempt' (event: CustomEvent) {
    console.info('[pubsub] Trying to reconnect...')
  },

  'reconnection-succeeded' (event: CustomEvent) {
    console.info('[pubsub] Connection re-established')
  },

  'reconnection-failed' (event: CustomEvent) {
    console.warn('[pubsub] Reconnection failed')
    const client = this

    client.destroy()
  },

  'reconnection-scheduled' (event: CustomEvent) {
    const { delay, nth } = event.detail
    console.info(`[pubsub] Scheduled connection attempt ${nth} in ~${delay} ms`)
  }
}

// These handlers receive the PubSubClient instance through the `this` binding.
const defaultMessageHandlers = {
  [NOTIFICATION_TYPE.ENTRY] (msg) {
    console.debug('[pubsub] Received ENTRY:', msg)
  },

  [NOTIFICATION_TYPE.PING] ({ data }) {
    const client = this

    if (client.options.logPingMessages) {
      console.debug(`[pubsub] Ping received in ${Date.now() - Number(data)} ms`)
    }
    // Reply with a pong message using the same data.
    client.socket?.send(createMessage(NOTIFICATION_TYPE.PONG, data))
    // Refresh the ping timer, waiting for the next ping.
    clearTimeout(client.pingTimeoutID)
    client.pingTimeoutID = setTimeout(() => {
      client.socket?.close()
    }, client.options.pingTimeout)
  },

  // PUB can be used to send ephemeral messages outside of any contract log.
  [NOTIFICATION_TYPE.PUB] (msg) {
    console.debug(`[pubsub] Ignoring ${msg.type} message:`, msg.data)
  },

  [NOTIFICATION_TYPE.SUB] (msg) {
    console.debug(`[pubsub] Ignoring ${msg.type} message:`, msg.data)
  },

  [NOTIFICATION_TYPE.UNSUB] (msg) {
    console.debug(`[pubsub] Ignoring ${msg.type} message:`, msg.data)
  },

  [RESPONSE_TYPE.ERROR] ({ data: { type, contractID } }) {
    console.warn(`[pubsub] Received ERROR response for ${type} request to ${contractID}`)
    const client = this

    switch (type) {
      case REQUEST_TYPE.SUB: {
        console.warn(`[pubsub] Could not subscribe to ${contractID}`)
        client.pendingSubscriptionSet.delete(contractID)
        client.pendingSyncSet.delete(contractID)
        break
      }
      case REQUEST_TYPE.UNSUB: {
        console.warn(`[pubsub] Could not unsubscribe from ${contractID}`)
        client.pendingUnsubscriptionSet.delete(contractID)
        break
      }
      default: {
        console.error(`[pubsub] Malformed response: invalid request type ${type}`)
      }
    }
  },

  [RESPONSE_TYPE.SUCCESS] ({ data: { type, contractID } }) {
    const client = this

    switch (type) {
      case REQUEST_TYPE.SUB: {
        console.debug(`[pubsub] Subscribed to ${contractID}`)
        client.pendingSubscriptionSet.delete(contractID)
        client.subscriptionSet.add(contractID)
        if (client.pendingSyncSet.has(contractID)) {
          sbp('chelonia/contract/sync', contractID)
          client.pendingSyncSet.delete(contractID)
        }
        break
      }
      case REQUEST_TYPE.UNSUB: {
        console.debug(`[pubsub] Unsubscribed from ${contractID}`)
        client.pendingUnsubscriptionSet.delete(contractID)
        client.subscriptionSet.delete(contractID)
        break
      }
      default: {
        console.error(`[pubsub] Malformed response: invalid request type ${type}`)
      }
    }
  }
}

// TODO: verify these are good defaults
const defaultOptions = {
  logPingMessages: process.env.NODE_ENV === 'development' && !process.env.CI,
  pingTimeout: 45000,
  maxReconnectionDelay: 60000,
  maxRetries: 10,
  minReconnectionDelay: 500,
  reconnectOnDisconnection: true,
  reconnectOnOnline: true,
  // Defaults to false to avoid reconnection attempts in case the server doesn't
  // respond because of a failed authentication.
  reconnectOnTimeout: false,
  reconnectionDelayGrowFactor: 2,
  timeout: 5000
}

const globalEventNames = ['offline', 'online']
const socketEventNames = ['close', 'error', 'message', 'open']

// `navigator.onLine` can give confusing false positives when `true`,
// so we'll define `isDefinetelyOffline()` rather than `isOnline()` or `isOffline()`.
// See https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine
const isDefinetelyOffline = () => typeof navigator === 'object' && navigator.onLine === false

// Parses and validates a received message.
export const messageParser = (data: string): Message => {
  const msg = JSON.parse(data)

  if (typeof msg !== 'object' || msg === null) {
    throw new TypeError('Message is null or not an object')
  }
  const { type } = msg

  if (typeof type !== 'string' || type === '') {
    throw new TypeError('Message type must be a non-empty string')
  }
  return msg
}

const publicMethods = {
  clearAllTimers () {
    const client = this

    clearTimeout(client.connectionTimeoutID)
    clearTimeout(client.nextConnectionAttemptDelayID)
    clearTimeout(client.pingTimeoutID)
    client.connectionTimeoutID = undefined
    client.nextConnectionAttemptDelayID = undefined
    client.pingTimeoutID = undefined
  },

  // Performs a connection or reconnection attempt.
  connect () {
    const client = this

    if (client.socket !== null) {
      throw new Error('connect() can only be called if there is no current socket.')
    }
    if (client.nextConnectionAttemptDelayID) {
      throw new Error('connect() must not be called during a reconnection delay.')
    }
    if (!client.shouldReconnect) {
      throw new Error('connect() should no longer be called on this instance.')
    }
    client.socket = new WebSocket(client.url)

    if (client.options.timeout) {
      client.connectionTimeoutID = setTimeout(() => {
        client.connectionTimeoutID = undefined
        client.socket?.close(4000, 'timeout')
      }, client.options.timeout)
    }
    // Attach WebSocket event listeners.
    for (const name of socketEventNames) {
      client.socket.addEventListener(name, client.listeners[name])
    }
  },

  /**
   * Immediately close the socket, stop listening for events and clear any cache.
   *
   * This method is used in unit tests.
   * - In particular, no 'close' event handler will be called.
   * - Any incoming or outgoing buffered data will be discarded.
   * - Any pending messages will be discarded.
   */
  destroy () {
    const client = this

    client.clearAllTimers()
    // Update property values.
    // Note: do not clear 'client.options'.
    client.pendingSubscriptionSet.clear()
    client.pendingUnsubscriptionSet.clear()
    client.subscriptionSet.clear()
    // Remove global event listeners.
    if (typeof window === 'object') {
      for (const name of globalEventNames) {
        window.removeEventListener(name, client.listeners[name])
      }
    }
    // Remove WebSocket event listeners.
    if (client.socket) {
      for (const name of socketEventNames) {
        client.socket.removeEventListener(name, client.listeners[name])
      }
      client.socket.close()
    }
    client.listeners = {}
    client.socket = null
    client.shouldReconnect = false
  },

  getNextRandomDelay (): number {
    const client = this

    const {
      maxReconnectionDelay,
      minReconnectionDelay,
      reconnectionDelayGrowFactor
    } = client.options

    const minDelay = minReconnectionDelay * reconnectionDelayGrowFactor ** client.failedConnectionAttempts
    const maxDelay = minDelay * reconnectionDelayGrowFactor

    return Math.min(maxReconnectionDelay, Math.round(minDelay + Math.random() * (maxDelay - minDelay)))
  },

  // Schedules a connection attempt to happen after a delay computed according to
  // a randomized exponential backoff algorithm variant.
  scheduleConnectionAttempt () {
    const client = this

    if (!client.shouldReconnect) {
      throw new Error('Cannot call `scheduleConnectionAttempt()` when `shouldReconnect` is false.')
    }
    if (client.nextConnectionAttemptDelayID) {
      return console.warn('[pubsub] A reconnection attempt is already scheduled.')
    }
    const delay = client.getNextRandomDelay()
    const nth = client.failedConnectionAttempts + 1

    client.nextConnectionAttemptDelayID = setTimeout(() => {
      sbp('okTurtles.events/emit', PUBSUB_RECONNECTION_ATTEMPT, client)
      client.nextConnectionAttemptDelayID = undefined
      client.connect()
    }, delay)
    sbp('okTurtles.events/emit', PUBSUB_RECONNECTION_SCHEDULED, client, { delay, nth })
  },

  // Unused for now.
  pub (contractID: string, data: JSONType, dontBroadcast = false) {
  },

  /**
   * Sends a SUB request to the server as soon as possible.
   *
   * - The given contract ID will be cached until we get a relevant server
   * response, allowing us to resend the same request if necessary.
   * - Any identical UNSUB request that has not been sent yet will be cancelled.
   * - Calling this method again before the server has responded has no effect.
   * @param contractID - The ID of the contract whose updates we want to subscribe to.
   */
  sub (contractID: string, dontBroadcast = false) {
    const client = this
    const { socket } = this

    if (!client.pendingSubscriptionSet.has(contractID)) {
      client.pendingSubscriptionSet.add(contractID)
      client.pendingUnsubscriptionSet.delete(contractID)

      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(createRequest(REQUEST_TYPE.SUB, { contractID }, dontBroadcast))
      }
    }
  },

  /**
   * Sends an UNSUB request to the server as soon as possible.
   *
   * - The given contract ID will be cached until we get a relevant server
   * response, allowing us to resend the same request if necessary.
   * - Any identical SUB request that has not been sent yet will be cancelled.
   * - Calling this method again before the server has responded has no effect.
   * @param contractID - The ID of the contract whose updates we want to unsubscribe from.
   */
  unsub (contractID: string, dontBroadcast = false) {
    const client = this
    const { socket } = this

    if (!client.pendingUnsubscriptionSet.has(contractID)) {
      client.pendingSubscriptionSet.delete(contractID)
      client.pendingUnsubscriptionSet.add(contractID)

      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(createRequest(REQUEST_TYPE.UNSUB, { contractID }, dontBroadcast))
      }
    }
  }
}

// Register custom SBP event listeners before the first connection.
for (const name of Object.keys(defaultClientEventHandlers)) {
  if (name === 'error' || !socketEventNames.includes(name)) {
    sbp('okTurtles.events/on', `pubsub-${name}`, (target, detail?: Object) => {
      target.listeners[name]({ type: name, target, detail })
    })
  }
}

export default {
  NOTIFICATION_TYPE,
  REQUEST_TYPE,
  RESPONSE_TYPE,
  createClient,
  createMessage,
  createRequest
}
