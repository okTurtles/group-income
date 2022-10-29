import { blue, bold, gray } from 'fmt/colors.ts'

import pogo from 'pogo'
import Toolkit from 'pogo/lib/toolkit.ts'
import sbp from '@sbp/sbp'
import './database.ts'
import { SERVER_RUNNING } from './events.ts'
import { SERVER_INSTANCE, PUBSUB_INSTANCE } from './instance-keys.ts'
import {
  createMessage,
  createNotification,
  createServer,
  isUpgradeableRequest,
  NOTIFICATION_TYPE
} from '~/backend/pubsub.ts'
import { router } from './routes.ts'

import { GIMessage } from '../shared/domains/chelonia/GIMessage.ts'

import applyPortShift from '~/scripts/applyPortShift.ts'
import packageJSON from '~/package.json' assert { type: 'json' }
const { version } = packageJSON

for (const [key, value] of Object.entries(applyPortShift(Deno.env.toObject()))) {
  Deno.env.set(key as string, value as string)
}

Deno.env.set('GI_VERSION', `${version}@${new Date().toISOString()}`)

const API_PORT = Deno.env.get('API_PORT') ?? '8000'
const CI = Deno.env.get('CI')
const GI_VERSION = Deno.env.get('GI_VERSION') as string
const NODE_ENV = Deno.env.get('NODE_ENV') ?? 'development'

console.info('GI_VERSION:', GI_VERSION)
console.info('NODE_ENV:', NODE_ENV)

const pubsub = createServer({
  serverHandlers: {
    connection (socket: WebSocket, request: Request) {
      if (NODE_ENV === 'production') {
        socket.send(createNotification(NOTIFICATION_TYPE.APP_VERSION, GI_VERSION))
      }
    }
  }
})

const pogoServer = pogo.server({
  hostname: 'localhost',
  port: Number.parseInt(API_PORT),
  onPreResponse (response: Response, h: Toolkit) {
    try {
      response.headers.set('X-Frame-Options', 'deny')
    } catch (err) {
      console.warn('could not set X-Frame-Options header:', err.message)
    }
  }
})

// Patch the Pogo server to add WebSocket support.
{
  const originalInject = pogoServer.inject.bind(pogoServer)

  pogoServer.inject = async (request: Request, connInfo: Deno.Conn) => {
    if (isUpgradeableRequest(request)) {
      return pubsub.handleUpgradeableRequest(request)
    } else {
      const response = await originalInject(request, connInfo)
      // This logging code has to be put here instead of inside onPreResponse
      // because it requires access to the request object.
      if (NODE_ENV === 'development' && !CI) {
        const { hostname } = connInfo.remoteAddr as Deno.NetAddr
        console.debug(gray(`${hostname}: ${request.method} ${request.url} --> ${response.status}`))
      }
      return response
    }
  }
}
pogoServer.router = router

sbp('okTurtles.data/set', PUBSUB_INSTANCE, pubsub)
sbp('okTurtles.data/set', SERVER_INSTANCE, pogoServer)

sbp('sbp/selectors/register', {
  'backend/server/broadcastEntry': async function (entry: GIMessage) {
    const pubsub = sbp('okTurtles.data/get', PUBSUB_INSTANCE)
    const pubsubMessage = createMessage(NOTIFICATION_TYPE.ENTRY, entry.serialize())
    const subscribers = pubsub.enumerateSubscribers(entry.contractID())
    console.log(blue(bold(`[pubsub] Broadcasting ${entry.description()}`)))
    await pubsub.broadcast(pubsubMessage, { to: subscribers })
  },
  'backend/server/handleEntry': async function (entry: GIMessage) {
    await sbp('chelonia/db/addEntry', entry)
    await sbp('backend/server/broadcastEntry', entry)
  },
  'backend/server/stop': function () {
    return pogoServer.stop()
  }
})

try {
  pogoServer.start()
  sbp('okTurtles.events/emit', SERVER_RUNNING, pogoServer)
} catch (err) {
  console.error('error in server.start():', err.message)
}
