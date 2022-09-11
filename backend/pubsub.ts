import {
  acceptWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
} from "https://deno.land/std@0.92.0/ws/mod.ts";

import { messageParser } from '~/shared/pubsub.ts'

const CI = Deno.env.get('CI')
const NODE_ENV = Deno.env.get('NODE_ENV') ?? 'development'

const emptySet = Object.freeze(new Set())
// Used to tag console output.
const tag = '[pubsub]'

// ====== Helpers ====== //

// Only necessary when using the `ws` module in Deno.

const generateSocketID = (() => {
  let counter = 0

  return (debugID: string) => String(counter++) + (debugID ? '-' + debugID : '')
})()

const log: Function = console.log.bind(console, tag)
log.debug = console.debug.bind(console, tag)
log.error = console.error.bind(console, tag)

// ====== API ====== //

export function createErrorResponse (data: Object): string {
  return JSON.stringify({ type: 'error', data })
}

export function createMessage (type: string, data: JSONType): string {
  return JSON.stringify({ type, data })
}

export function createNotification (type: string, data: Object): string {
  return JSON.stringify({ type, data })
}

export function createResponse (type: string, data: Object): string {
  return JSON.stringify({ type, data })
}

export function createServer(options?: Object = {}) {
  const server = {
    clients: new Set(),
    customServerEventHandlers: Object.create(null),
    customSocketEventHandlers: Object.create(null),
    handleUpgradeableRequest,
    messageHandlers: { ...defaultMessageHandlers, ...options.customMessageHandlers },
    options: { ...defaultOptions, ...options },
    get port () { return rawHttpServer.listener?.addr.port },
    queuesByEventName: new Map(),
    subscribersByContractID: Object.create(null),
  };

  function handleUpgradeableRequest(request: Request): Response {
    const { socket, response } = Deno.upgradeWebSocket(request)
    // Our code
    socket.onopen = () => {
      server.clients.add(socket);
      server.emit('connection', socket, request)
    };
    return response;
  }

  server.emit = (name, ...args) => {
    const queue = server.queuesByEventName.get(name) ?? emptySet;
    try {
      for(const callback of queue) {
        Function.prototype.call.call(callback, server, ...args)
      }
    } catch (error) {
      if(server.queuesByEventName.has('error')) {
        server.emit('error', error);
      } else {
        throw error;
      }
    }
  };

  server.off = (name, callback) => {
    const queue = server.queuesByEventName.get(name) ?? emptySet;
    queue.delete(callback);
  };

  server.on = (name, callback) => {
    if(!server.queuesByEventName.has(name)) {
      server.queuesByEventName.set(name, new Set());
    }
    const queue = server.queuesByEventName.get(name);
    queue.add(callback);
  };

  // Add listeners for server events, i.e. events emitted on the server object.
  Object.keys(internalServerHandlers).forEach((name) => {
    server.on(name, (...args) => {
      try {
        // Always call the default handler first.
        internalServerHandlers[name]?.call(server, ...args)
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

export function isUpgradeableRequest (request: Request): boolean {
  const upgrade = request.headers.get('upgrade')
  if (upgrade?.toLowerCase() === "websocket") return true
  return false
}

const defaultOptions = {
  logPingRounds: true,
  logPongMessages: true,
  maxPayload: 6 * 1024 * 1024,
  pingInterval: 30000
}

// Internal default handlers for server events.
// The `this` binding refers to the server object.
const internalServerHandlers = {
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
    console.log('connection:', request.url)
    const server = this
    const url = request.url
    const urlSearch = url.includes('?') ? url.slice(url.lastIndexOf('?')) : ''
    const debugID = new URLSearchParams(urlSearch).get('debugID') || ''
    socket.id = generateSocketID(debugID)
    socket.activeSinceLastPing = true
    socket.pinged = false
    socket.server = server
    socket.subscriptions = new Set()

    log(`Socket ${socket.id} connected. Total: ${this.clients.size}`)

    // Add listeners for socket events, i.e. events emitted on a socket object.
    if (!server.usingLegacyDenoWS) {
      ['close', 'error', 'message', 'ping', 'pong'].forEach((eventName) => {
        socket.addEventListener(eventName, (...args) => {
          // Logging of 'message' events is handled in the default 'message' event handler.
          if (eventName !== 'message') {
            log(`Event '${eventName}' on socket ${socket.id}`, ...args.map(arg => String(arg)))
          }
          try {
            (internalSocketEventHandlers)[eventName]?.call(socket, ...args)
            server.customSocketEventHandlers[eventName]?.call(socket, ...args)
          } catch (error) {
            server.emit('error', error)
            server.terminateSocket(socket)
          }
        })
      })
    }
  },
  error (error: Error) {
    log.error('Server error:', error)
  },
  headers () {
  },
  listening () {
    log('Server listening')
  }
}

// Default handlers for server-side client socket events.
// The `this` binding refers to the connected `ws` socket object.
const internalSocketEventHandlers = {
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
    // Additional code.
    socket.server.clients.delete(socket)
  },

  message (event: MessageEvent) {
    const socket = this
    const { server } = this
    const { type, data } = server.usingLegacyDenoWS ? { type: 'message', data: event } : event
    const text = data
    let msg: Message = { type: '' }

    try {
      msg = messageParser(data)
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
        log.error(error)
        server.rejectMessageAndTerminateSocket(msg, socket)
      }
    } else {
      log.error(`Unhandled message type: ${msg.type}`)
      server.rejectMessageAndTerminateSocket(msg, socket)
    }
  }
}

export const NOTIFICATION_TYPE = {
  APP_VERSION: 'app-version',
  ENTRY: 'entry'
}

const PING = 'ping'
const PONG = 'pong'
const PUB = 'pub'
const SUB = 'sub'
const UNSUB = 'unsub'
const SUCCESS = 'success'

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
    } else {
      log('Already subscribed to', contractID)
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
    } else {
      log('Was not subscribed to', contractID)
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
    socket.send(createErrorResponse({ ...request }), () => this.terminateSocket(socket))
  },

  terminateSocket (socket: Object) {
    const server = this
    internalSocketEventHandlers.close.call(socket)

    // Remove listeners for socket events, i.e. events emitted on a socket object.
    ;['close', 'error', 'message', 'ping', 'pong'].forEach((eventName) => {
      socket.removeEventListener(eventName, (internalSocketEventHandlers)[eventName])
      socket.removeEventListener(eventName, server.customSocketEventHandlers[eventName])
    })
    socket.close()
  },
}
