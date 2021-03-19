/* globals logger */
'use strict'

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

// ====== API ====== //

const { PUB, SUB, UNSUB } = NOTIFICATION_TYPE
const { ERROR, SUCCESS } = RESPONSE_TYPE

// Re-export some useful things from the shared module.
export { createClient, createMessage, NOTIFICATION_TYPE, REQUEST_TYPE, RESPONSE_TYPE }

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
 * {object?} clientHandlers - Custom handlers for socket events.
 * {object?} messageHandlers - Custom handlers for different message types.
 * {object?} serverHandlers - Custom handlers for server events.
 * {number} backlog - The maximum length of the queue of pending connections.
 * {boolean} clientTracking - Specifies whether or not to track clients.
 * {Function} handleProtocols - A function which can be used to handle the WebSocket subprotocols.
 * {number} maxPayload - The maximum allowed message size in bytes.
 * {string} path - Accept only connections matching this path.
 * {(boolean|object)} perMessageDeflate - Enables/disables per-message deflate.
 * @returns {Object}
 */
export function createServer (httpServer: Object, options?: Object = {}): Object {
  const server = new WebSocket.Server({
    ...defaultOptions,
    ...options,
    server: httpServer
  })
  server.customServerEventHandlers = options.serverHandlers || {}
  server.customSocketEventHandlers = options.clientHandlers || {}
  server.messageHandlers = { ...defaultMessageHandlers, ...options.messageHandlers }
  server.pingInterval = undefined
  server.subscribersByContractID = Object.create(null)

  // Add listeners for server events, i.e. events emitted on the server object.
  ;['close', 'connection', 'error', 'headers', 'listening'].forEach((name) => {
    server.on(name, (...args) => {
      console.log('[pubsub] Server event:', name)
      try {
        const customHandler = server.customServerEventHandlers[name]
        const defaultHandler = (defaultServerHandlers: Object)[name]
        // Always call the default handler first.
        if (defaultHandler) {
          defaultHandler.call(server, ...args)
        }
        if (customHandler) {
          customHandler.call(server, ...args)
        }
      } catch (error) {
        logger(error)
      }
    })
  })
  // Setup a ping interval if required.
  if (server.options.pingInterval > 0) {
    server.pingInterval = setInterval(() => {
      console.debug('[pubsub] Pinging clients')
      server.clients.forEach((client) => {
        if (client.pinged && !client.activeSinceLastPing) {
          console.log(`[pubsub] Closing irresponsive client ${client.id}`)
          return client.terminate()
        }
        if (client.readyState === WebSocket.OPEN) {
          client.send(createMessage('ping', Date.now()), () => {
            client.activeSinceLastPing = false
            client.pinged = true
          })
        }
      })
    }, server.options.pingInterval)
  }
  return Object.assign(server, serverMethods)
}

const defaultOptions = {
  clientTracking: true,
  maxPayload: 6 * 1024 * 1024,
  pingInterval: 30_000
}

const generateSocketID = (() => {
  let counter = 0

  return (debugID) => String(counter++) + (debugID ? '-' + debugID : '')
})()

// Default handlers for server events.
// The `this` binding refers to the server object.
const defaultServerHandlers = {
  /**
   * Emitted when a connection handshake completes.
   *
   * @see https://github.com/websockets/ws/blob/master/doc/ws.md#event-connection
   * @param {ws.WebSocket} socket - The client socket that connected.
   * @param {http.IncomingMessage} request - The underlying Node http GET request.
   */
  connection (socket: Object, request: Object) {
    const url = request.url
    const urlSearch = url.includes('?') ? url.slice(url.lastIndexOf('?')) : ''
    const debugID = new URLSearchParams(urlSearch).get('debugID') || ''
    socket.id = generateSocketID(debugID)
    socket.activeSinceLastPing = true
    socket.pinged = false
    socket.server = this
    socket.subscriptions = new Set()

    console.log(bold(`[pubsub] Socket ${socket.id} connected`))

    // Add listeners for socket events, i.e. events emitted on a socket object.
    ;['close', 'error', 'message', 'ping', 'pong'].forEach((eventName) => {
      socket.on(eventName, (...args) => {
        console.debug(`[pubsub] Event '${eventName}' on socket ${socket.id}`, ...args)
        const customHandler = socket.server.customSocketEventHandlers[eventName]
        const defaultHandler = (defaultSocketEventHandlers: Object)[eventName]

        try {
          if (defaultHandler) {
            defaultHandler.call(socket, ...args)
          }
          if (customHandler) {
            customHandler.call(socket, ...args)
          }
        } catch (error) {
          logger(error)
        }
      })
    })
  }
}

// Default handlers for server-side client socket events.
// The `this` binding refers to the connected `ws` socket object.
const defaultSocketEventHandlers = {
  close (code: string, reason: string) {
    // Notify other client sockets that this one has left any room they shared.
    for (const contractID of this.subscriptions) {
      const notification = createNotification(UNSUB, { contractID, socketID: this.id })
      for (const client of this.server.clients) {
        // This should exclude this client.
        if (client.readyState === WebSocket.OPEN && client.subscriptions.has(contractID)) {
          client.send(notification)
        }
      }
    }
    this.activeSinceLastPing = false
    this.subscriptions.clear()
  },

  message (data: string) {
    let msg: Message = { type: '' }
    try {
      msg = messageParser(data)
    } catch (error) {
      console.error(bold.red(`[pubsub] Malformed message: ${error.message}`))
      return this.terminate()
    }
    this.activeSinceLastPing = true
    const handler = this.server.messageHandlers[msg.type]

    if (handler) {
      try {
        handler.call(this, msg)
      } catch (error) {
        // Log the error message and stack trace but do not send it to the client.
        logger(error)
        const failure = createResponse(ERROR, { ...msg })
        // Should we call 'this.terminate()' instead?
        this.send(failure, () => this.close())
      }
    } else {
      console.error(`[pubsub] Unhandled message type: ${msg.type}`)
      this.terminate()
    }
  }
}

// These handlers receive the connected `ws` socket through the `this` binding.
const defaultMessageHandlers = {
  pong (msg: Message) {
    // const timestamp = Number(msg.data)
    // const latency = Date.now() - timestamp
    this.activeSinceLastPing = true
  },

  [PUB] (msg: Message) {
    // Currently unused.
  },

  [SUB] ({ contractID, type }: SubMessage) {
    const socket = this
    const socketID = this.id
    const { server } = this

    if (!socket.subscriptions.has(contractID)) {
      // Add the given contract ID to our subscriptions.
      socket.subscriptions.add(contractID)
      if (!server.subscribersByContractID[contractID]) {
        server.subscribersByContractID[contractID] = new Set()
      }
      const subscribers = server.subscribersByContractID[contractID]
      // Add this socket to the subscribers of the given contract.
      subscribers.add(this)
      // Broadcast a notification to every other open subscriber.
      const notification = createNotification(type, { contractID, socketID })
      for (const subscriber of subscribers) {
        if (subscriber.readyState === WebSocket.OPEN) {
          subscriber.send(notification)
        }
      }
    }
    this.send(createResponse(SUCCESS, { type, contractID }))
  },

  [UNSUB] ({ contractID, type }: UnsubMessage) {
    const socket = this
    const socketID = this.id
    const { server } = this

    if (socket.subscriptions.has(contractID)) {
      // Remove the given contract ID from our subscriptions.
      socket.subscriptions.delete(contractID)
      if (server.subscribersByContractID[contractID]) {
        const subscribers = server.subscribersByContractID[contractID]
        // Remove this socket from the subscribers of the given contract.
        subscribers.delete(this)
        // Broadcast a notification to every other open subscriber.
        const notification = createNotification(type, { contractID, socketID })
        for (const subscriber of subscribers) {
          if (subscriber.readyState === WebSocket.OPEN) {
            subscriber.send(notification)
          }
        }
      }
    }
    this.send(createResponse(SUCCESS, { type, contractID }))
  }
}

const serverMethods = {
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
    for (const client of to || this.clients) {
      if (client.readyState === WebSocket.OPEN && client !== except) {
        client.send(message)
      }
    }
  },
  // Enumerates the subscribers of a given contract.
  * enumerateSubscribers (contractID: string): Iterable<Object> {
    if (contractID in this.subscribersByContractID) {
      yield * this.subscribersByContractID[contractID]
    }
  }
}
