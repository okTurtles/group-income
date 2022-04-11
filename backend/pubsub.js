/* globals logger */
'use strict'

/*
 * Pub/Sub server implementation using the `ws` library.
 * See https://github.com/websockets/ws#api-docs
 */

import {
  NOTIFICATION_TYPE,
  REQUEST_TYPE,
  RESPONSE_TYPE,
  createClient,
  createMessage,
  messageParser
} from '~/shared/pubsub.js'

import type {
  Message, SubMessage, UnsubMessage,
  NotificationTypeEnum, ResponseTypeEnum
} from '~/shared/pubsub.js'

import type { JSONType } from '~/shared/types.js'

const { bold } = require('chalk')
const WebSocket = require('ws')

const { PING, PONG, PUB, SUB, UNSUB } = NOTIFICATION_TYPE
const { ERROR, SUCCESS } = RESPONSE_TYPE

// Used to tag console output.
const tag = '[pubsub]'

// ====== Helpers ====== //

const generateSocketID = (() => {
  let counter = 0

  return (debugID) => String(counter++) + (debugID ? '-' + debugID : '')
})()

const log = console.log.bind(console, tag)
log.bold = (...args) => console.log(bold(tag, ...args))
log.debug = console.debug.bind(console, tag)
log.error = (...args) => console.error(bold.red(tag, ...args))

// ====== API ====== //

// Re-export some useful things from the shared module.
export { createClient, createMessage, NOTIFICATION_TYPE, REQUEST_TYPE, RESPONSE_TYPE }

export function createErrorResponse (data: JSONType): string {
  return JSON.stringify({ type: ERROR, data })
}

export function createNotification (type: NotificationTypeEnum, data: JSONType): string {
  return JSON.stringify({ type, data })
}

export function createResponse (type: ResponseTypeEnum, data: JSONType): string {
  return JSON.stringify({ type, data })
}

/**
 * Creates a pubsub server instance.
 *
 * @param {(http.Server|https.Server)} server - A Node.js HTTP/S server to attach to.
 * @param {Object?} options
 * {boolean?} logPingRounds - Whether to log ping rounds.
 * {boolean?} logPongMessages - Whether to log received pong messages.
 * {object?} messageHandlers - Custom handlers for different message types.
 * {object?} serverHandlers - Custom handlers for server events.
 * {object?} socketHandlers - Custom handlers for socket events.
 * {number?} backlog=511 - The maximum length of the queue of pending connections.
 * {Function?} handleProtocols - A function which can be used to handle the WebSocket subprotocols.
 * {number?} maxPayload=6_291_456 - The maximum allowed message size in bytes.
 * {string?} path - Accept only connections matching this path.
 * {(boolean|object)?} perMessageDeflate - Enables/disables per-message deflate.
 * {number?} pingInterval=30_000 - The time to wait between successive pings.
 * @returns {Object}
 */
export function createServer (httpServer: Object, options?: Object = {}): Object {
  const server = new WebSocket.Server({
    ...defaultOptions,
    ...options,
    ...{ clientTracking: true },
    server: httpServer
  })
  server.customServerEventHandlers = { ...options.serverHandlers }
  server.customSocketEventHandlers = { ...options.socketHandlers }
  server.messageHandlers = { ...defaultMessageHandlers, ...options.messageHandlers }
  server.pingIntervalID = undefined
  server.subscribersByContractID = Object.create(null)

  // Add listeners for server events, i.e. events emitted on the server object.
  Object.keys(defaultServerHandlers).forEach((name) => {
    server.on(name, (...args) => {
      try {
        // Always call the default handler first.
        defaultServerHandlers[name]?.call(server, ...args)
        server.customServerEventHandlers[name]?.call(server, ...args)
      } catch (error) {
        server.emit('error', error)
      }
    })
  })
  // Setup a ping interval if required.
  if (server.options.pingInterval > 0) {
    server.pingIntervalID = setInterval(() => {
      if (server.clients.length && server.options.logPingRounds) {
        log.debug('Pinging clients')
      }
      server.clients.forEach((client) => {
        if (client.pinged && !client.activeSinceLastPing) {
          log(`Disconnecting irresponsive client ${client.id}`)
          return client.terminate()
        }
        if (client.readyState === WebSocket.OPEN) {
          client.send(createMessage(PING, Date.now()), () => {
            client.activeSinceLastPing = false
            client.pinged = true
          })
        }
      })
    }, server.options.pingInterval)
  }
  return Object.assign(server, publicMethods)
}

const defaultOptions = {
  logPingRounds: process.env.NODE_ENV === 'development' && !process.env.CI,
  logPongMessages: false,
  maxPayload: 6 * 1024 * 1024,
  pingInterval: 30000
}

// Default handlers for server events.
// The `this` binding refers to the server object.
const defaultServerHandlers = {
  close () {
    log('Server closed')
  },
  /**
   * Emitted when a connection handshake completes.
   *
   * @see https://github.com/websockets/ws/blob/master/doc/ws.md#event-connection
   * @param {ws.WebSocket} socket - The client socket that connected.
   * @param {http.IncomingMessage} request - The underlying Node http GET request.
   */
  connection (socket: Object, request: Object) {
    const server = this
    const url = request.url
    const urlSearch = url.includes('?') ? url.slice(url.lastIndexOf('?')) : ''
    const debugID = new URLSearchParams(urlSearch).get('debugID') || ''
    socket.id = generateSocketID(debugID)
    socket.activeSinceLastPing = true
    socket.pinged = false
    socket.server = server
    socket.subscriptions = new Set()

    log.bold(`Socket ${socket.id} connected. Total: ${this.clients.size}`)

    // Add listeners for socket events, i.e. events emitted on a socket object.
    ;['close', 'error', 'message', 'ping', 'pong'].forEach((eventName) => {
      socket.on(eventName, (...args) => {
        // Logging of 'message' events is handled in the default 'message' event handler.
        if (eventName !== 'message') {
          log(`Event '${eventName}' on socket ${socket.id}`, ...args.map(arg => String(arg)))
        }
        try {
          (defaultSocketEventHandlers: Object)[eventName]?.call(socket, ...args)
          socket.server.customSocketEventHandlers[eventName]?.call(socket, ...args)
        } catch (error) {
          socket.server.emit('error', error)
          socket.terminate()
        }
      })
    })
  },
  error (error: Error) {
    log.error('Server error:', error)
    logger(error)
  },
  headers () {
  },
  listening () {
    log('Server listening')
  }
}

// Default handlers for server-side client socket events.
// The `this` binding refers to the connected `ws` socket object.
const defaultSocketEventHandlers = {
  close (code: string, reason: string) {
    const socket = this
    const { server, id: socketID } = this

    // Notify other client sockets that this one has left any room they shared.
    for (const contractID of socket.subscriptions) {
      const subscribers = server.subscribersByContractID[contractID]
      // Remove this socket from the subscribers of the given contract.
      subscribers.delete(socket)
      const notification = createNotification(UNSUB, { contractID, socketID })
      server.broadcast(notification, { to: subscribers })
    }
    socket.subscriptions.clear()
  },

  message (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) {
    const socket = this
    const { server } = this
    const text = data.toString()
    let msg: Message = { type: '' }

    try {
      msg = messageParser(text)
    } catch (error) {
      log.error(`Malformed message: ${error.message}`)
      server.rejectMessageAndTerminateSocket(msg, socket)
      return
    }
    // Now that we have successfully parsed the message, we can log it.
    if (msg.type !== 'pong' || server.options.logPongMessages) {
      log(`Received '${msg.type}' on socket ${socket.id}`, text)
    }
    // The socket can be marked as active since it just received a message.
    socket.activeSinceLastPing = true
    const handler = server.messageHandlers[msg.type]

    if (handler) {
      try {
        handler.call(socket, msg)
      } catch (error) {
        // Log the error message and stack trace but do not send it to the client.
        logger(error)
        server.rejectMessageAndTerminateSocket(msg, socket)
      }
    } else {
      log.error(`Unhandled message type: ${msg.type}`)
      server.rejectMessageAndTerminateSocket(msg, socket)
    }
  }
}

// These handlers receive the connected `ws` socket through the `this` binding.
const defaultMessageHandlers = {
  [PONG] (msg: Message) {
    const socket = this
    // const timestamp = Number(msg.data)
    // const latency = Date.now() - timestamp
    socket.activeSinceLastPing = true
  },

  [PUB] (msg: Message) {
    // Currently unused.
  },

  [SUB] ({ contractID, dontBroadcast }: SubMessage) {
    const socket = this
    const { server, id: socketID } = this

    if (!socket.subscriptions.has(contractID)) {
      log('Already subscribed to', contractID)
      // Add the given contract ID to our subscriptions.
      socket.subscriptions.add(contractID)
      if (!server.subscribersByContractID[contractID]) {
        server.subscribersByContractID[contractID] = new Set()
      }
      const subscribers = server.subscribersByContractID[contractID]
      // Add this socket to the subscribers of the given contract.
      subscribers.add(socket)
      if (!dontBroadcast) {
        // Broadcast a notification to every other open subscriber.
        const notification = createNotification(SUB, { contractID, socketID })
        server.broadcast(notification, { to: subscribers, except: socket })
      }
    }
    socket.send(createResponse(SUCCESS, { type: SUB, contractID }))
  },

  [UNSUB] ({ contractID, dontBroadcast }: UnsubMessage) {
    const socket = this
    const { server, id: socketID } = this

    if (socket.subscriptions.has(contractID)) {
      // Remove the given contract ID from our subscriptions.
      socket.subscriptions.delete(contractID)
      if (server.subscribersByContractID[contractID]) {
        const subscribers = server.subscribersByContractID[contractID]
        // Remove this socket from the subscribers of the given contract.
        subscribers.delete(socket)
        if (!dontBroadcast) {
          const notification = createNotification(UNSUB, { contractID, socketID })
          // Broadcast a notification to every other open subscriber.
          server.broadcast(notification, { to: subscribers, except: socket })
        }
      }
    }
    socket.send(createResponse(SUCCESS, { type: UNSUB, contractID }))
  }
}

const publicMethods = {
  /**
   * Broadcasts a message, ignoring clients which are not open.
   *
   * @param message
   * @param to - The intended recipients of the message. Defaults to every open client socket.
   * @param except - A recipient to exclude. Optional.
   */
  broadcast (
    message: Message,
    { to, except }: { to?: Iterable<Object>, except?: Object }
  ) {
    const server = this

    for (const client of to || server.clients) {
      if (client.readyState === WebSocket.OPEN && client !== except) {
        client.send(message)
      }
    }
  },

  // Enumerates the subscribers of a given contract.
  * enumerateSubscribers (contractID: string): Iterable<Object> {
    const server = this

    if (contractID in server.subscribersByContractID) {
      yield * server.subscribersByContractID[contractID]
    }
  },

  rejectMessageAndTerminateSocket (request: Message, socket: Object) {
    socket.send(createErrorResponse({ ...request }), () => socket.terminate())
  }
}
