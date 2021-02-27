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

import type { Message, SubMessage, UnsubMessage } from '~/shared/pubsub.js'
import type { JSONType } from '~/shared/types.js'

const { bold } = require('chalk')
const WebSocket = require('ws')

// ====== API ====== //

const { PUB, SUB, UNSUB } = NOTIFICATION_TYPE
const { ERROR, SUCCESS } = RESPONSE_TYPE

// Re-export some useful things from the shared module.
export { createClient, createMessage, NOTIFICATION_TYPE, REQUEST_TYPE, RESPONSE_TYPE }

export function createNotification (
  type: string,
  data: {| contractID: string, socketID: number |}
): string {
  return JSON.stringify({ type, ...data })
}

export function createResponse (type: string, data: JSONType): string {
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
 *
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
  server.customClientHandlers = { ...options.clientHandlers }
  server.customServerHandlers = { ...options.serverHandlers }
  server.messageHandlers = { ...defaultMessageHandlers, ...options.messageHandlers }
  server.pingInterval = undefined
  server.subscribersByContractID = Object.create(null)

  // Create and attach server-side WebSocket event listeners.
  ;['close', 'connection', 'error', 'headers', 'listening'].forEach((name) => {
    server.on(name, (...args) => {
      console.log('[pubsub] Server event:', name)
      try {
        const customHandler = server.customServerHandlers['on' + name]
        const defaultHandler = defaultServerHandlers['on' + name]
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
      server.clients.forEach((client) => {
        if (!client.isAlive) {
          return client.terminate()
        }
        client.isAlive = false
        client.ping()
      })
    }, server.options.pingInterval)
  }
  return server
}

const defaultOptions = {
  clientTracking: true,
  maxPayload: 6 * 1024 * 1024,
  pingInterval: undefined
}

const generateSocketID = (() => {
  let counter = 0

  return () => counter++
})()

// ====== Server socket event handlers ====== //

const defaultServerHandlers = Object.create(null)

/**
 * Emitted when a connection handshake completes.
 *
 * @param socket - The client socket that connected.
 * @param request - The http GET request sent by the socket.
 */
defaultServerHandlers.onconnection = function onconnection (socket, request) {
  socket.id = generateSocketID()
  socket.isAlive = true
  socket.server = this
  socket.subscriptions = new Set()

  const xForwardedFor = request.headers['x-forwarded-for']

  const remoteAddress = (
    typeof xForwardedFor === 'string' && xForwardedFor !== ''
      ? xForwardedFor.split(/\s*,\s*/)[0]
      : request.socket.remoteAddress
  )
  console.log(bold(`[pubsub] Socket ${socket.id} connected from ${remoteAddress}`))

  // Create and attach socket event listeners.
  ;['close', 'error', 'message', 'ping', 'pong'].forEach((eventName) => {
    socket.on(eventName, (...args) => {
      console.log(`[pubsub] Event '${eventName}' on socket ${socket.id}`, ...args)
      const customHandler = socket.server.customClientHandlers['on' + eventName]
      const defaultHandler = defaultClientHandlers['on' + eventName]

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

// ====== Client socket event handlers ====== //

const defaultClientHandlers = {
  onclose (code: string, reason: string) {
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
    this.alive = false
    this.subscriptions.clear()
  },

  onmessage (data: string) {
    let msg: Message = { type: '' }
    try {
      msg = messageParser(data)
    } catch (error) {
      console.log(bold.red(`[pubsub] Malformed message: ${error.message}`))
      return this.terminate()
    }
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
  },

  onpong () {
    this.isAlive = true
  }
}

// ====== Server-side message handlers ====== //

const defaultMessageHandlers = {
  [PUB] (msg: Object) {
    // Currently unused.
  },

  [SUB] ({ contractID, type }: SubMessage) {
    const socketID = this.id
    const { server, subscriptions } = this
    const { subscribersByContractID } = this.server

    if (!subscriptions.has(contractID)) {
      // Add the given contract ID to our subscriptions.
      subscriptions.add(contractID)
      if (!subscribersByContractID[contractID]) {
        subscribersByContractID[contractID] = new Set()
      }
      subscribersByContractID[contractID].add(this)
      // Notify other subscribers of this contract that we have joined them.
      server.clients.forEach((client) => {
        if (client !== this && client.subscriptions.has(contractID)) {
          if (client.readyState === WebSocket.OPEN) {
            client.send({ type, contractID, socketID })
          }
        }
      })
    }
    this.send(createResponse(SUCCESS, { type, contractID }))
  },

  [UNSUB] ({ contractID, type }: UnsubMessage) {
    const socketID = this.id
    const { server, subscriptions } = this
    const { subscribersByContractID } = this.server

    if (subscriptions.has(contractID)) {
      // Remove the given contract ID from our subscriptions.
      subscriptions.delete(contractID)
      if (subscribersByContractID[contractID]) {
        subscribersByContractID[contractID].delete(this)
      }
      // Notify other subscribers of this contract that we have left them.
      server.clients.forEach((client) => {
        if (client !== this && client.subscriptions.has(contractID)) {
          if (client.readyState === WebSocket.OPEN) {
            client.send({ type, contractID, socketID })
          }
        }
      })
    }
    this.send(createResponse(SUCCESS, { type, contractID }))
  }
}
