import { messageParser } from '~/shared/pubsub.ts'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Callback = (...args: any[]) => void

type JSONType = ReturnType<typeof JSON.parse>

interface Message {
  [key: string]: JSONType
  type: string
}

type MessageHandler = (this: PubsubServer, msg: Message) => void

type PubsubClientEventName = 'close' | 'message'
type PubsubServerEventName = 'close' | 'connection' | 'error' | 'headers' | 'listening'

type PubsubServerOptions = {
  clientHandlers?: Record<string, EventListener>
  logPingRounds?: boolean
  logPongMessages?: boolean
  maxPayload?: number
  messageHandlers?: Record<string, MessageHandler>
  pingInterval?: number
  rawHttpServer?: unknown
  serverHandlers?: Record<string, Callback>
}

const emptySet = Object.freeze(new Set())
// Used to tag console output.
const tag = '[pubsub]'

// ====== Helpers ====== //

const generateSocketID = (() => {
  let counter = 0

  return (debugID: string): string => String(counter++) + (debugID ? '-' + debugID : '')
})()

const logger = {
  log: console.log.bind(console, tag),
  debug: console.debug.bind(console, tag),
  error: console.error.bind(console, tag),
  info: console.info.bind(console, tag),
  warn: console.warn.bind(console, tag)
}

// ====== API ====== //

export function createErrorResponse (data: JSONType): string {
  return JSON.stringify({ type: 'error', data })
}

export function createMessage (type: string, data: JSONType): string {
  return JSON.stringify({ type, data })
}

export function createNotification (type: string, data: JSONType): string {
  return JSON.stringify({ type, data })
}

export function createResponse (type: string, data: JSONType): string {
  return JSON.stringify({ type, data })
}

export class PubsubClient {
  activeSinceLastPing: boolean
  id: string
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

  send (data: string | ArrayBufferLike | ArrayBufferView | Blob): void {
    const { socket } = this
    if (socket.readyState === WebSocket.OPEN) {
      this.socket.send(data)
    } else {
      // TODO: enqueue pending data.
    }
  }

  terminate () {
    const { server, socket } = this
    internalClientEventHandlers.close.call(this, new CloseEvent('close', { code: 4001, reason: 'terminated' }))
    // Remove listeners for socket events, i.e. events emitted on a socket object.
    ;['close', 'error', 'message', 'ping', 'pong'].forEach((eventName: string) => {
      socket.removeEventListener(eventName, internalClientEventHandlers[eventName as PubsubClientEventName] as EventListener)
      if (typeof server.customClientHandlers[eventName] === 'function') {
        socket.removeEventListener(eventName as keyof WebSocketEventMap, server.customClientHandlers[eventName] as EventListener)
      }
    })
    socket.close()
  }
}

export class PubsubServer {
  clients: Set<PubsubClient>
  customClientHandlers: Record<string, EventListener>
  customServerHandlers: Record<string, EventListener>
  messageHandlers: Record<string, MessageHandler>
  options: typeof defaultOptions
  pingIntervalID?: number
  queuesByEventName: Map<string, Set<Callback>>
  subscribersByContractID: Record<string, Set<PubsubClient>>

  constructor (options: PubsubServerOptions = {}) {
    this.clients = new Set()
    this.customClientHandlers = options.clientHandlers ?? Object.create(null)
    this.customServerHandlers = options.serverHandlers ?? Object.create(null)
    this.messageHandlers = { ...defaultMessageHandlers, ...options.messageHandlers }
    this.options = { ...defaultOptions, ...options }
    this.queuesByEventName = new Map()
    this.subscribersByContractID = Object.create(null)
  }

  close () {
    this.clients.forEach(client => client.terminate())
    this.emit('close')
  }

  handleUpgradeableRequest (request: Request): Response {
    const server = this
    const { socket, response } = Deno.upgradeWebSocket(request)

    socket.onopen = () => {
      server.emit('connection', socket, request)
    }
    return response
  }

  emit (name: string, ...args: unknown[]) {
    const server = this
    const queue = server.queuesByEventName.get(name) ?? emptySet
    try {
      for (const callback of queue) {
        Function.prototype.call.call(callback as Callback, server, ...args)
      }
    } catch (error) {
      if (server.queuesByEventName.has('error')) {
        server.emit('error', error)
      } else {
        throw error
      }
    }
  }

  off (name: string, callback: Callback) {
    const server = this
    const queue = server.queuesByEventName.get(name) ?? emptySet
    queue.delete(callback)
  }

  on (name: string, callback: Callback) {
    const server = this
    if (!server.queuesByEventName.has(name)) {
      server.queuesByEventName.set(name, new Set())
    }
    const queue = server.queuesByEventName.get(name)
    queue?.add(callback)
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

export function createServer (options: PubsubServerOptions = {}) {
  const server = new PubsubServer(options)

  // Add listeners for server events, i.e. events emitted on the server object.
  Object.keys(internalServerEventHandlers).forEach((name: string) => {
    server.on(name, (...args: unknown[]) => {
      try {
        // Always call the default handler first.
        // @ts-expect-error TS2556: A spread argument must either have a tuple type or be passed to a rest parameter.
        internalServerEventHandlers[name as PubsubServerEventName]?.call(server, ...args)
        // @ts-expect-error TS2556: A spread argument must either have a tuple type or be passed to a rest parameter.
        server.customServerHandlers[name as PubsubServerEventName]?.call(server, ...args)
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
  if (upgrade?.toLowerCase() === 'websocket') return true
  return false
}

// Internal default handlers for server events.
// The `this` binding refers to the server object.
const internalServerEventHandlers = {
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
          // @ts-expect-error TS2554 [ERROR]: Expected 3 arguments, but got 2.
          internalClientEventHandlers[eventName as PubsubClientEventName]?.call(client, ...args)
          server.customClientHandlers[eventName]?.call(client, ...args)
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
}

// Default handlers for server-side client socket events.
// The `this` binding refers to the connected `ws` socket object.
const internalClientEventHandlers = Object.freeze({
  close (this: PubsubClient, event: CloseEvent) {
    const client = this
    const { server, id: socketID } = this

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
    const { server } = this
    const { data } = event
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

  [SUB] (this: PubsubClient, { contractID, dontBroadcast }: Message) {
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

  [UNSUB] (this: PubsubClient, { contractID, dontBroadcast }: Message) {
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

const defaultOptions = {
  logPingRounds: true,
  logPongMessages: true,
  maxPayload: 6 * 1024 * 1024,
  pingInterval: 30000
}
