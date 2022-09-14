type JSONType = ReturnType<typeof JSON.parse>

type Message = {
  [key: string]: JSONType,
  type: string
}

type SubMessage = {
  contractID: string
  dontBroadcast?: boolean
}

type UnsubMessage = {
  contractID: string
  dontBroadcast?: boolean
}

type PubsubClientEventName = 'close' | 'message'
type PubsubServerEventName = 'close' | 'connection' | 'error' | 'headers' | 'listening'

import {
  acceptWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
} from 'https://deno.land/std@0.92.0/ws/mod.ts'

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

  return (debugID: string): string => String(counter++) + (debugID ? '-' + debugID : '')
})()

const logger = {
  log: console.log.bind(console, tag),
  debug: console.debug.bind(console, tag),
  error: console.error.bind(console, tag)
}

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

export class PubsubClient {
  id: string
  activeSinceLastPing: boolean
  pinged: boolean
  server: PubsubServer
  socket: WebSocket
  subscriptions: Set<string>

  constructor (socket: WebSocket, server: PubsubServer, debugID = '') {
    this.id = generateSocketID(debugID)
    this.activeSinceLastPing = true
    this.pinged = false
    this.server = server
    this.socket = socket
    this.subscriptions = new Set()
  }

  get readyState () {
    return this.socket.readyState
  }

  rejectMessageAndTerminate (request: Message) {
    // TODO: wait for response to be sent before terminating.
    this.socket.send(createErrorResponse({ ...request }))
    this.terminate()
  }

  send (data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    const { socket } = this
    if (socket.readyState === WebSocket.OPEN) {
      this.socket.send(data)
    } else {
      // TODO: enqueue pending data.
    }
  }

  terminate () {
    const { server, socket } = this
    internalClientEventHandlers.close.call(this, 1000, '')
    // Remove listeners for socket events, i.e. events emitted on a socket object.
    ;['close', 'error', 'message', 'ping', 'pong'].forEach((eventName: string) => {
      socket.removeEventListener(eventName, internalClientEventHandlers[eventName as PubsubClientEventName] as EventListener)
      if (typeof server.customClientEventHandlers[eventName] === 'function') {
        socket.removeEventListener(eventName as keyof WebSocketEventMap, server.customClientEventHandlers[eventName] as EventListener)
      }
    })
    socket.close()
  }
}

export class PubsubServer {
  clients: Set<PubsubClient>
  customServerEventHandlers: Record<string, Function>
  customClientEventHandlers: Record<string, Function>
  messageHandlers: Record<string, Function>
  options: any
  pingIntervalID?: number
  queuesByEventName: Map<string, Set<Function>>
  subscribersByContractID: Record<string, Set<PubsubClient>>

  constructor (options: Object = {}) {
    this.clients = new Set()
    this.customServerEventHandlers = Object.create(null)
    this.customClientEventHandlers = Object.create(null)  
    this.messageHandlers = { ...defaultMessageHandlers, ...(options as any).customMessageHandlers }
    this.options = { ...defaultOptions, ...options }
    this.queuesByEventName = new Map()
    this.subscribersByContractID = Object.create(null)
  }

  close () {
    this.clients.forEach(client => client.terminate())
  }

  handleUpgradeableRequest (request: Request): Response {
    const server = this
    const { socket, response } = Deno.upgradeWebSocket(request)
    // Our code
    socket.onopen = () => {
      server.emit('connection', socket, request)
    }
    return response
  }

  emit (name: string, ...args: any[]) {
    const server = this
    const queue = server.queuesByEventName.get(name) ?? emptySet
    try {
      for (const callback of queue) {
        Function.prototype.call.call(callback as Function, server, ...args)
      }
    } catch (error) {
      if (server.queuesByEventName.has('error')) {
        server.emit('error', error)
      } else {
        throw error
      }
    }
  }

  off (name: string, callback: Function) {
    const server = this
    const queue = server.queuesByEventName.get(name) ?? emptySet
    queue.delete(callback)
  }

  on (name: string, callback: Function) {
    const server = this
    if (!server.queuesByEventName.has(name)) {
      server.queuesByEventName.set(name, new Set())
    }
    const queue = server.queuesByEventName.get(name)
    queue?.add(callback)
  }

  get port () {
    return this.options.rawHttpServer?.listener?.addr?.port
  }

  /**
   * Broadcasts a message, ignoring clients which are not open.
   *
   * @param message
   * @param to - The intended recipients of the message. Defaults to every open client socket.
   * @param except - A recipient to exclude. Optional.
   */
  broadcast (
    message: string,
    { to, except }: { to?: Iterable<PubsubClient>, except?: PubsubClient }
  ) {
    const server = this
    for (const client of to || server.clients) {
      if (client.readyState === WebSocket.OPEN && client !== except) {
        client.send(message)
      }
    }
  }

  // Enumerates the subscribers of a given contract.
  * enumerateSubscribers (contractID: string): Iterable<PubsubClient> {
    const server = this
    if (contractID in server.subscribersByContractID) {
      yield * server.subscribersByContractID[contractID]
    }
  }
}

export function createServer(options = {}) {
  const server = new PubsubServer(options)

  // Add listeners for server events, i.e. events emitted on the server object.
  Object.keys(internalServerHandlers).forEach((name: string) => {
    server.on(name, (...args: any[]) => {
      try {
        // Always call the default handler first.
        // @ts-ignore TS2556 [ERROR]: A spread argument must either have a tuple type or be passed to a rest parameter.
        internalServerHandlers[name as PubsubServerEventName]?.call(server, ...args)
        server.customServerEventHandlers[name as PubsubServerEventName]?.call(server, ...args)
      } catch (error) {
        server.emit('error', error)
      }
    })
  })
  // Setup a ping interval if required.
  if (server.options.pingInterval > 0) {
    server.pingIntervalID = setInterval(() => {
      if (server.clients.size && server.options.logPingRounds) {
        logger.debug('Pinging clients')
      }
      server.clients.forEach((client: PubsubClient) => {
        if (client.pinged && !client.activeSinceLastPing) {
          logger.log(`Disconnecting irresponsive client ${client.id}`)
          return client.terminate()
        }
        if (client.readyState === WebSocket.OPEN) {
          client.send(createMessage(PING, Date.now()))
          // TODO: wait for the message to be sent.
          client.activeSinceLastPing = false
          client.pinged = true
        }
      })
    }, server.options.pingInterval)
  }
  return server
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
const internalServerHandlers = Object.freeze({
  close () {
    logger.log('Server closed')
  },
  /**
   * Emitted when a connection handshake completes.
   *
   * @see https://github.com/websockets/ws/blob/master/doc/ws.md#event-connection
   * @param {WebSocket} socket - The client socket that connected.
   * @param {Request} request - The incoming http GET request.
   */
  connection (this: PubsubServer, socket: WebSocket, request: Request) {
    logger.log('connection:', request.url)
    const server = this
    const url = request.url
    const urlSearch = url.includes('?') ? url.slice(url.lastIndexOf('?')) : ''
    const debugID = new URLSearchParams(urlSearch).get('debugID') || ''
    
    const client = new PubsubClient(socket, server)
    client.id = generateSocketID(debugID)
    client.activeSinceLastPing = true
    server.clients.add(client)

    logger.log(`Client ${client.id} connected. Total: ${this.clients.size}`)

    // Add listeners for socket events, i.e. events emitted on a socket object.
    ;['close', 'error', 'message', 'ping', 'pong'].forEach((eventName: string) => {
      socket.addEventListener(eventName, (...args) => {
        // Logging of 'message' events is handled in the default 'message' event handler.
        if (eventName !== 'message') {
          logger.log(`Event '${eventName}' on client ${client.id}`, ...args.map(arg => String(arg)))
        }
        try {
          // @ts-ignore TS2554 [ERROR]: Expected 3 arguments, but got 2.
          (internalClientEventHandlers)[eventName as PubsubClientEventName]?.call(client, ...args)
          server.customClientEventHandlers[eventName]?.call(client, ...args)
        } catch (error) {
          server.emit('error', error)
          client.terminate()
        }
      })
    })
  },
  error (error: Error) {
    logger.error('Server error:', error)
  },
  headers () {
  },
  listening () {
    logger.log('Server listening')
  }
})

// Default handlers for server-side client socket events.
// The `this` binding refers to the connected `ws` socket object.
const internalClientEventHandlers = Object.freeze({
  close (this: PubsubClient, code: number, reason: string) {
    const client = this
    const { server, socket, id: socketID } = this

    // Notify other clients that this one has left any room they shared.
    for (const contractID of client.subscriptions) {
      const subscribers = server.subscribersByContractID[contractID]
      // Remove this socket from the subscribers of the given contract.
      subscribers.delete(client)
      const notification = createNotification(UNSUB, { contractID, socketID })
      server.broadcast(notification, { to: subscribers })
    }
    client.subscriptions.clear()
    // Additional code.
    server.clients.delete(client)
  },

  message (this: PubsubClient, event: MessageEvent) {
    const client = this
    const { server, socket } = this
    const { type, data } = event
    const text = data
    let msg: Message = { type: '' }

    try {
      msg = messageParser(data)
    } catch (error) {
      logger.error(`Malformed message: ${error.message}`)
      client.rejectMessageAndTerminate(msg)
      return
    }
    // Now that we have successfully parsed the message, we can log it.
    if (msg.type !== 'pong' || server.options.logPongMessages) {
      logger.log(`Received '${msg.type}' on client ${client.id}`, text)
    }
    // The socket can be marked as active since it just received a message.
    client.activeSinceLastPing = true
    const handler = server.messageHandlers[msg.type]

    if (handler) {
      try {
        handler.call(client, msg)
      } catch (error) {
        // Log the error message and stack trace but do not send it to the client.
        logger.error(error)
        client.rejectMessageAndTerminate(msg)
      }
    } else {
      logger.error(`Unhandled message type: ${msg.type}`)
      client.rejectMessageAndTerminate(msg)
    }
  }
})

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

// These handlers receive the connected PubsubClient instance through the `this` binding.
const defaultMessageHandlers = {
  [PONG] (this: PubsubClient, msg: Message) {
    const client = this
    // const timestamp = Number(msg.data)
    // const latency = Date.now() - timestamp
    client.activeSinceLastPing = true
  },

  [PUB] (this: PubsubClient, msg: Message) {
    // Currently unused.
  },

  [SUB] (this: PubsubClient, { contractID, dontBroadcast }: SubMessage) {
    const client = this
    const { server, socket, id: socketID } = this

    if (!client.subscriptions.has(contractID)) {
      // Add the given contract ID to our subscriptions.
      client.subscriptions.add(contractID)
      if (!server.subscribersByContractID[contractID]) {
        server.subscribersByContractID[contractID] = new Set()
      }
      const subscribers = server.subscribersByContractID[contractID]
      // Add this client to the subscribers of the given contract.
      subscribers.add(client)
      if (!dontBroadcast) {
        // Broadcast a notification to every other open subscriber.
        const notification = createNotification(SUB, { contractID, socketID })
        server.broadcast(notification, { to: subscribers, except: client })
      }
    } else {
      logger.log('Already subscribed to', contractID)
    }
    socket.send(createResponse(SUCCESS, { type: SUB, contractID }))
  },

  [UNSUB] (this: PubsubClient, { contractID, dontBroadcast }: UnsubMessage) {
    const client = this
    const { server, socket, id: socketID } = this

    if (client.subscriptions.has(contractID)) {
      // Remove the given contract ID from our subscriptions.
      client.subscriptions.delete(contractID)
      if (server.subscribersByContractID[contractID]) {
        const subscribers = server.subscribersByContractID[contractID]
        // Remove this socket from the subscribers of the given contract.
        subscribers.delete(client)
        if (!dontBroadcast) {
          const notification = createNotification(UNSUB, { contractID, socketID })
          // Broadcast a notification to every other open subscriber.
          server.broadcast(notification, { to: subscribers, except: client })
        }
      }
    } else {
      logger.log('Was not subscribed to', contractID)
    }
    socket.send(createResponse(SUCCESS, { type: UNSUB, contractID }))
  }
}

