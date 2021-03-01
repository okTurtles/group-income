'use strict'

import type { JSONObject, JSONType } from '~/shared/types.js'

// ====== Types ====== //

export type Message = {
  [key: string]: JSONType,
  +type: string
}

export type PubSubClient = {
  connectionTimeoutID: TimeoutID | void,
  +customHandlers: Object,
  failedAttempts: number,
  isReconnecting: boolean,
  +listeners: Object,
  +messageHandlers: Object,
  +options: Object,
  +pendingSubscriptionSet: Set<string>,
  +pendingUnsubscriptionSet: Set<string>,
  reconnectionDelayID: TimeoutID | void,
  socket: WebSocket | null,
  +subscriptionSet: Set<string>,
  +url: string,
  // Methods
  connect(): void,
  destroy(): void,
  getNextRandomReconnectionDelay(): number,
  pub(contractID: string, data: JSONType): void,
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

// ====== API ====== //

/**
 * Creates a pubsub client instance.
 *
 * @param {string} url - A WebSocket URL to connect to.
 * @param {Object?} options
 * {number?} timeout - Connection timeout duration in milliseconds.
 * {boolean?} debug
 * {object?} handlers - Custom handlers for socket events.
 * {object?} messageHandlers - Custom handlers for different message types.
 * {boolean?} reconnectOnDisconnection - Whether to reconnect after a server-side disconnection.
 * {boolean?} reconnectOnOnline - Whether to reconnect after regaining internet connectivity.
 * {boolean?} reconnectOnTimeout - Whether to reconnect after a timeout.
 * @returns {Object}
 */
export function createClient (url: string, options?: Object = {}): PubSubClient {
  const client = {
    customHandlers: options.handlers || {},
    failedAttempts: 0,
    isReconnecting: false,
    listeners: Object.create(null),
    messageHandlers: { ...defaultMessageHandlers, ...options.messageHandlers },
    options: { ...defaultOptions, ...options },
    pendingSubscriptionSet: new Set(),
    pendingUnsubscriptionSet: new Set(),
    reconnectionDelayID: undefined,
    socket: null,
    subscriptionSet: new Set(),
    connectionTimeoutID: undefined,
    url: url.replace(/^http/, 'ws'),
    // Methods
    ...{ connect, destroy, getNextRandomReconnectionDelay, pub, sub, unsub }
  }
  // Create and save references to reusable event listeners.
  for (const name of [...eventNames, ...globalEventNames]) {
    client.listeners[name] = (event: Event, ...args: any[]) => {
      if (client.options.debug) {
        console.debug('[pubsub] Event:', name, ...args)
      }
      const customHandler = client.customHandlers[name]
      const defaultHandler = defaultHandlers[name]

      if (defaultHandler) {
        defaultHandler.call(client, event)
      }
      if (customHandler) {
        customHandler.call(client, event)
      }
    }
  }
  // Attach global event listeners before the first connection.
  if (typeof window === 'object') {
    globalEventNames.forEach((name) => {
      window.addEventListener(name, client.listeners[name])
    })
  }
  client.connect()
  return client
}

export function createMessage (type: string, data: JSONType): string {
  return JSON.stringify({ type, data })
}

export function createRequest (type: $Values<typeof REQUEST_TYPE>, data: JSONObject): string {
  return JSON.stringify(Object.assign({ type }, data))
}

// ====== Event Handlers ====== //

const defaultHandlers = {
  close (event: CloseEvent) {
    if (this.socket) {
      // Remove event listeners to avoid memory leaks.
      for (const name of eventNames) {
        this.socket.removeEventListener(name, this.listeners[name])
      }
    }
    this.socket = null

    if (this.connectionTimeoutID) {
      clearTimeout(this.connectionTimeoutID)
      this.connectionTimeoutID = undefined
    }
    if (this.isReconnecting) {
      this.failedAttempts++
    }
    if (event.reason === 'timeout' && this.options.reconnectOnTimeout) {
      this.reconnectionDelayID = setTimeout(
        this.connect,
        this.getNextRandomReconnectionDelay()
      )
    }
  },

  // Do not manually close the socket here as it will be done automatically.
  error (event: Event) {
  },

  message (event: MessageEvent) {
    const { data } = event

    if (typeof data !== 'string') {
      return
    }

    let msg: Message = { type: '' }
    try {
      msg = messageParser(data)
    } catch (error) {
      // TODO: place us in unrecoverable state (see state.js error handling TODOs)
      console.error(`[pubsub] Malformed message: ${error.message}`)
      return
    }
    const handler = this.messageHandlers[msg.type]

    if (handler) {
      handler.call(this, msg)
    } else {
      throw new Error(`Unhandled message type: ${msg.type}`)
    }
  },

  open (event) {
    this.pendingSubscriptionSet.forEach(this.sub)
    this.pendingUnsubscriptionSet.forEach(this.unsub)

    if (this.isReconnecting) {
      console.log('[pubsub] Connection re-established')
      this.failedAttempts = 0
      this.isReconnecting = false
    }
    if (this.connectionTimeoutID) {
      clearTimeout(this.connectionTimeoutID)
      this.connectionTimeoutID = undefined
    }
  }
}

// ====== Message Handlers ====== //

const defaultMessageHandlers = {
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

const defaultOptions = {
  debug: false,
  maxReconnectionDelay: Infinity,
  minReconnectionDelay: 500,
  maxRetries: 10,
  reconnectOnDisconnection: false,
  reconnectOnOnline: true,
  reconnectOnTimeout: false,
  reconnectionDelayGrowFactor: 2,
  timeout: 5000
}

const eventNames = ['close', 'error', 'message', 'open']
const globalEventNames = ['offline', 'online']

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

// ====== Client methods ====== //

function connect () {
  if (this.socket !== null) {
    throw new Error('connect() can only be called if there is no current socket.')
  }
  this.socket = new WebSocket(this.url)

  if (this.options.timeout) {
    this.connectionTimeoutID = setTimeout(() => {
      this.connectionTimeoutID = undefined
      if (this.socket) {
        this.socket.close(1000, 'timeout')
      }
    }, this.options.timeout)
  }
  this.reconnectionDelayID = undefined
  // Attach WebSocket event listeners.
  for (const name of eventNames) {
    this.socket.addEventListener(name, this.listeners[name])
  }
}

/**
 * Immediately remove every event listener and free up ressources.
 * This method is used in unit tests.
 *
 * - No 'close' event will be emitted.
 * - Any incoming or outgoing buffered data will be discarded.
 * - Any pending request will be discarded.
 */
function destroy () {
  // Clear all timers.
  clearTimeout(this.connectionTimeoutID)
  clearTimeout(this.reconnectionDelayID)
  // Update property values.
  // Note: do not clear 'this.options'.
  this.connectionTimeoutID = undefined
  this.failedAttempts = 0
  this.isReconnecting = false
  this.pendingSubscriptionSet.clear()
  this.pendingUnsubscriptionSet.clear()
  this.reconnectionDelayID = undefined
  this.subscriptionSet.clear()
  // Remove global event listeners.
  if (typeof window === 'object') {
    for (const name of globalEventNames) {
      window.removeEventListener(name, this.listeners[name])
    }
  }
  // Remove WebSocket event listeners.
  if (this.socket) {
    for (const name of eventNames) {
      this.socket.removeEventListener(name, this.listeners[name])
    }
    this.socket.close()
  }
  this.socket = null
}

function getNextRandomReconnectionDelay (): number {
  const {
    maxReconnectionDelay,
    minReconnectionDelay,
    reconnectionDelayGrowFactor
  } = this.options

  const minDelay = (
    minReconnectionDelay * reconnectionDelayGrowFactor ** this.failedAttempts
  )
  const maxDelay = Math.min(
    minReconnectionDelay * reconnectionDelayGrowFactor ** (this.failedAttempts + 1),
    maxReconnectionDelay
  )
  return minDelay + Math.random() * (maxDelay - minDelay)
}

function pub (contractID: string, data: JSONType) {
  const { socket } = this

  if (socket && socket.readyState === WebSocket.OPEN) {
    const request = createRequest(REQUEST_TYPE.PUB, { contractID, data })
    socket.send(request)
  }
  // Maybe add this request to a pending list.
}

function sub (contractID: string) {
  const { socket } = this

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(createRequest(REQUEST_TYPE.SUB, { contractID }))
  }
  this.pendingSubscriptionSet.add(contractID)
}

function unsub (contractID: string) {
  const { socket } = this

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(createRequest(REQUEST_TYPE.UNSUB, { contractID }))
  }
  this.pendingUnsubscriptionSet.add(contractID)
}

export default {
  NOTIFICATION_TYPE,
  REQUEST_TYPE,
  RESPONSE_TYPE,
  createClient,
  createRequest
}
