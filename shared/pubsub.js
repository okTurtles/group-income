'use strict'

import sbp from '~/shared/sbp.js'
import type { JSONObject, JSONType } from '~/shared/types.js'
import {
  PUBSUB_ERROR,
  PUBSUB_RECONNECTION_ATTEMPT,
  PUBSUB_RECONNECTION_FAILED,
  PUBSUB_RECONNECTION_SCHEDULED,
  PUBSUB_RECONNECTION_SUCCEEDED
} from '~/frontend/utils/events.js'

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
  isNew: boolean,
  +listeners: Object,
  +messageHandlers: Object,
  nextConnectionAttemptDelayID: TimeoutID | void,
  +options: Object,
  +pendingSubscriptionSet: Set<string>,
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
  +contractID: string
}

export type UnsubMessage = {
  [key: string]: JSONType,
  +type: 'unsub',
  +contractID: string
}

// ====== Enums ====== //

export const NOTIFICATION_TYPE = Object.freeze({
  ENTRY: 'entry',
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
 * {boolean?} debug
 * {object?} handlers - Custom handlers for WebSocket events.
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
    // True if this client has never been connected yet.
    isNew: true,
    listeners: Object.create(null),
    messageHandlers: { ...defaultMessageHandlers, ...options.messageHandlers },
    nextConnectionAttemptDelayID: undefined,
    options: { ...defaultOptions, ...options },
    // Requested subscriptions for which we didn't receive a response yet.
    pendingSubscriptionSet: new Set(),
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
      const customHandler = client.customEventHandlers[name]
      const defaultHandler = defaultClientEventHandlers[name]
      // Pass the client as the 'this' binding since we are processing client events.
      try {
        if (defaultHandler) {
          defaultHandler.call(client, event)
        }
        if (customHandler) {
          customHandler.call(client, event)
        }
      } catch (error) {
        // Do not throw any error but emit an `error` event instead.
        sbp('okTurtles.events/emit', PUBSUB_ERROR, client, error.message)
      }
    }
  }
  // Add global event listeners before the first connection.
  if (typeof window === 'object') {
    globalEventNames.forEach((name) => {
      window.addEventListener(name, client.listeners[name])
    })
  }
  if (!client.options.manual) {
    client.connect()
  }
  return client
}

export function createMessage (type: string, data: JSONType): string {
  return JSON.stringify({ type, data })
}

export function createRequest (type: RequestTypeEnum, data: JSONObject): string {
  // Had to use Object.assign() instead of object spreading to make Flow happy.
  return JSON.stringify(Object.assign({ type }, data))
}

// These handlers receive the PubSubClient instance through the `this` binding.
const defaultClientEventHandlers = {
  // Emitted when the connection is closed.
  close (event: CloseEvent) {
    const client = this

    console.log('[pubsub] Event: close', event.code, event.reason)
    client.failedConnectionAttempts++

    if (client.socket) {
      // Remove event listeners to avoid memory leaks.
      for (const name of socketEventNames) {
        client.socket.removeEventListener(name, client.listeners[name])
      }
    }
    client.socket = null
    client.clearAllTimers()

    // See "Status Codes" https://tools.ietf.org/html/rfc6455#section-7.4
    switch (event.code) {
      // TODO: verify that this list of codes is correct.
      case 1000: case 1002: case 1003: case 1007: case 1008: {
        client.shouldReconnect = false
        break
      }
      default: break
    }
    if (client.shouldReconnect && client.options.reconnectOnDisconnection) {
      if (client.failedConnectionAttempts <= client.options.maxRetries) {
        client.scheduleConnectionAttempt()
      } else {
        sbp('okTurtles.events/emit', PUBSUB_RECONNECTION_FAILED, client)
      }
    }
  },

  // Emitted when an error has occured.
  // The socket will be closed automatically by the engine if necessary.
  error (event: Event) {
    const client = this

    console.error('[pubsub] Event: error', event)
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
    console.log('[pubsub] Event: offline')
    const client = this

    clearTimeout(client.pingTimeoutID)
    // Reset the connection attempt counter so that we'll start a new
    // reconnection loop when we are back online.
    client.failedConnectionAttempts = 0
    if (client.socket) {
      client.socket.close()
    }
  },

  online (event: Event) {
    console.log('[pubsub] Event: online')
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
    console.log('[pubsub] Event: open')
    const client = this

    if (!client.isNew) {
      sbp('okTurtles.events/emit', PUBSUB_RECONNECTION_SUCCEEDED, client)
    }
    client.clearAllTimers()
    // Set it to -1 so that it becomes 0 on the next `close` event.
    client.failedConnectionAttempts = -1
    client.isNew = false
    // Setup a ping timeout if required.
    // It will close the connection if we don't get any message from the server.
    if (client.options.pingTimeout > 0 && client.options.pingTimeout < Infinity) {
      client.pingTimeoutID = setTimeout(() => {
        if (client.socket) client.socket.close()
      }, client.options.pingTimeout)
    }
    // Resend any still unacknowledged request.
    client.pendingSubscriptionSet.forEach((contractID) => {
      if (client.socket) {
        client.socket.send(createRequest(REQUEST_TYPE.SUB, { contractID }))
      }
    })
    client.pendingUnsubscriptionSet.forEach((contractID) => {
      if (client.socket) {
        client.socket.send(createRequest(REQUEST_TYPE.UNSUB, { contractID }))
      }
    })
  },

  'reconnection-attempt' (event: CustomEvent) {
    console.log('[pubsub] Trying to reconnect...')
  },

  'reconnection-succeeded' (event: CustomEvent) {
    console.log('[pubsub] Connection re-established')
  },

  'reconnection-failed' (event: CustomEvent) {
    console.log('[pubsub] Reconnection failed')
    const client = this

    client.destroy()
  },

  'reconnection-scheduled' (event: CustomEvent) {
    const { delay, nth } = event.detail
    console.log(`[pubsub] Scheduled connection attempt ${nth} in ~${delay} ms`)
  }
}

// These handlers receive the PubSubClient instance through the `this` binding.
const defaultMessageHandlers = {
  [NOTIFICATION_TYPE.PING] ({ data }) {
    console.debug(`[pubsub] Ping received in ${Date.now() - Number(data)} ms`)
    const client = this

    // Reply with a pong message using the same data.
    if (client.socket) {
      client.socket.send(createMessage(NOTIFICATION_TYPE.PONG, data))
    }
    // Refresh the ping timer, waiting for the next ping.
    clearTimeout(client.pingTimeoutID)
    client.pingTimeoutID = setTimeout(() => {
      if (client.socket) {
        client.socket.close()
      }
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
    console.log(`[pubsub] Received ERROR response for ${type} request to ${contractID}`)
  },

  [RESPONSE_TYPE.SUCCESS] ({ data: { type, contractID } }) {
    const client = this

    switch (type) {
      case REQUEST_TYPE.SUB: {
        console.log(`[pubsub] Subscribed to ${contractID}`)
        client.pendingSubscriptionSet.delete(contractID)
        client.subscriptionSet.add(contractID)
        break
      }
      case REQUEST_TYPE.UNSUB: {
        console.log(`[pubsub] Unsubscribed from ${contractID}`)
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
  debug: process.env.NODE_ENV === 'development',
  pingTimeout: 45_000,
  maxReconnectionDelay: 60_000,
  maxRetries: 10,
  minReconnectionDelay: 500,
  reconnectOnDisconnection: true,
  reconnectOnOnline: true,
  // Defaults to false to avoid reconnection attempts in case the server doesn't
  // respond because of a failed authentication.
  reconnectOnTimeout: false,
  reconnectionDelayGrowFactor: 2,
  timeout: 5_000
}

const globalEventNames = ['offline', 'online']
const socketEventNames = ['close', 'error', 'message', 'open']

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
        if (client.socket) {
          client.socket.close(4000, 'timeout')
        }
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
  pub (contractID: string, data: JSONType) {
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
  sub (contractID: string) {
    const client = this
    const { socket } = this

    if (!client.pendingSubscriptionSet.has(contractID)) {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(createRequest(REQUEST_TYPE.SUB, { contractID }))
      }
    }
    client.pendingSubscriptionSet.add(contractID)
    client.pendingUnsubscriptionSet.delete(contractID)
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
  unsub (contractID: string) {
    const client = this
    const { socket } = this

    if (!client.pendingUnsubscriptionSet.has(contractID)) {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(createRequest(REQUEST_TYPE.UNSUB, { contractID }))
      }
    }
    client.pendingSubscriptionSet.delete(contractID)
    client.pendingUnsubscriptionSet.add(contractID)
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
