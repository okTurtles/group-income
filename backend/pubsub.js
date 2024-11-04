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
  createKvMessage,
  messageParser
} from '~/shared/pubsub.js'

import type {
  Message, PubMessage, SubMessage, UnsubMessage,
  NotificationTypeEnum
} from '~/shared/pubsub.js'

import type { JSONType, JSONObject } from '~/shared/types.js'
import { postEvent } from './push.js'

const { bold } = require('chalk')
const WebSocket = require('ws')

const { PING, PONG, PUB, SUB, UNSUB } = NOTIFICATION_TYPE
const { ERROR, OK } = RESPONSE_TYPE

const defaultOptions = {
  logPingRounds: process.env.NODE_ENV !== 'production' && !process.env.CI,
  logPongMessages: false,
  maxPayload: 6 * 1024 * 1024,
  pingInterval: 30000
}
// Used to tag console output.
const tag = '[pubsub]'

// ====== Helpers ====== //

const generateSocketID = (() => {
  let counter = 0

  return (debugID) => String(counter++) + (debugID ? '-' + debugID : '')
})()

const log = logger.info.bind(logger, tag)
log.bold = (...args) => logger.debug(bold(tag, ...args))
log.debug = logger.debug.bind(logger, tag)
log.error = (error, ...args) => logger.error(error, bold.red(tag, ...args))

// ====== API ====== //

// Re-export some useful things from the shared module.
export { createClient, createMessage, createKvMessage, NOTIFICATION_TYPE, REQUEST_TYPE, RESPONSE_TYPE }

export function createErrorResponse (data: JSONType): string {
  return JSON.stringify({ type: ERROR, data })
}

export function createPushErrorResponse (data: JSONObject): string {
  return JSON.stringify({
    type: ERROR,
    data: {
      ...data,
      type: REQUEST_TYPE.PUSH_ACTION
    }
  })
}

export function createNotification (type: NotificationTypeEnum, data: JSONType): string {
  return JSON.stringify({ type, data })
}

export function createOkResponse (data: JSONType): string {
  return JSON.stringify({ type: OK, data })
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
  server.channels = new Set()
  server.customServerEventHandlers = { ...options.serverHandlers }
  server.customSocketEventHandlers = { ...options.socketHandlers }
  server.customMessageHandlers = { ...options.messageHandlers }
  server.pingIntervalID = undefined
  server.subscribersByChannelID = Object.create(null)
  server.pushSubscriptions = Object.create(null)

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
      if (server.clients.size && server.options.logPingRounds) {
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
          log.debug(`Event '${eventName}' on socket ${socket.id}`, ...args.map(arg => String(arg)))
        }
        try {
          (defaultSocketEventHandlers: Object)[eventName]?.call(socket, ...args)
          socket.server.customSocketEventHandlers[eventName]?.call(socket, ...args)
        } catch (error) {
          socket.server.emit(error, 'error in socket connection')
          socket.terminate()
        }
      })
    })
  },
  error (error: Error) {
    log.error(error, 'Server error')
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
    const { server } = this

    for (const channelID of socket.subscriptions) {
      // Remove this socket from the channel subscribers.
      server.subscribersByChannelID[channelID].delete(socket)
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
      log.error(error, `Malformed message: ${error.message}`)
      server.rejectMessageAndTerminateSocket(msg, socket)
      return
    }
    // Now that we have successfully parsed the message, we can log it.
    if (msg.type !== 'pong' || server.options.logPongMessages) {
      log.debug(`Received '${msg.type}' on socket ${socket.id}`, text)
    }
    // The socket can be marked as active since it just received a message.
    socket.activeSinceLastPing = true
    const defaultHandler = defaultMessageHandlers[msg.type]
    const customHandler = server.customMessageHandlers[msg.type]

    if (defaultHandler || customHandler) {
      try {
        defaultHandler?.call(socket, msg)
        customHandler?.call(socket, msg)
      } catch (error) {
        // Log the error message and stack trace but do not send it to the client.
        log.error(error, 'onMessage')
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

  [PUB] (msg: PubMessage) {
    const { server } = this
    const subscribers = server.subscribersByChannelID[msg.channelID]
    server.broadcast(msg, { to: subscribers ?? [] })
  },

  [SUB] ({ channelID }: SubMessage) {
    const socket = this
    const { server } = this

    if (!server.channels.has(channelID)) {
      socket.send(createErrorResponse(
        { type: SUB, channelID, reason: `Unknown channel id: ${channelID}` }
      ))
      return
    }
    if (!socket.subscriptions.has(channelID)) {
      // Add the given channel ID to our subscriptions.
      socket.subscriptions.add(channelID)
      if (!server.subscribersByChannelID[channelID]) {
        server.subscribersByChannelID[channelID] = new Set()
      }
      // Add this socket to the channel subscribers.
      server.subscribersByChannelID[channelID].add(socket)
    } else {
      log.debug('Already subscribed to', channelID)
    }
    socket.send(createOkResponse({ type: SUB, channelID }))
  },

  [UNSUB] ({ channelID }: UnsubMessage) {
    const socket = this
    const { server } = this

    if (!server.channels.has(channelID)) {
      socket.send(createErrorResponse(
        { type: UNSUB, channelID, reason: `Unknown channel id: ${channelID}` }
      ))
    }
    if (socket.subscriptions.has(channelID)) {
      // Remove the given channel ID from our subscriptions.
      socket.subscriptions.delete(channelID)
      if (server.subscribersByChannelID[channelID]) {
        // Remove this socket from the channel subscribers.
        server.subscribersByChannelID[channelID].delete(socket)
      }
    }
    socket.send(createOkResponse({ type: UNSUB, channelID }))
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
    message: Message | string,
    { to, except }: { to?: Iterable<Object>, except?: Object }
  ) {
    const server = this

    for (const client of to || server.clients) {
      const msg = typeof message === 'string' ? message : JSON.stringify(message)
      if (client.endpoint) {
        console.error('@@@@POSTING PUSH EVENT')
        postEvent(client, msg).catch(e => {
          console.error(e, 'Error posting push notification')
        })
        continue
      }
      if (client.readyState === WebSocket.OPEN && client !== except) {
        client.send(msg)
      }
    }
  },

  // Enumerates the subscribers of a given channel.
  * enumerateSubscribers (channelID: string): Iterable<Object> {
    const server = this

    if (channelID in server.subscribersByChannelID) {
      yield * server.subscribersByChannelID[channelID]
    }
  },

  rejectMessageAndTerminateSocket (request: Message, socket: Object) {
    socket.send(createErrorResponse({ ...request }), () => socket.terminate())
  }
}
