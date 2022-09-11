import { blue, bold, gray } from "fmt/colors.ts"

import * as http from 'https://deno.land/std@0.132.0/http/server.ts';
import pogo from 'pogo';

import sbp from  "@sbp/sbp"
import GiAuth from './auth.ts'
import './database.ts'
import { SERVER_RUNNING } from './events.ts'
import { SERVER_INSTANCE, PUBSUB_INSTANCE } from './instance-keys.ts'
import {
  createMessage,
  createNotification,
  createServer,
  isUpgradeableRequest,
  NOTIFICATION_TYPE,
} from '~/backend/pubsub.ts'
import { router } from './routes.ts'

import { GIMessage } from '../shared/domains/chelonia/GIMessage.ts'

const { default: { version }} = await import('~/package.json', {
  assert: { type: "json" },
})

const applyPortShift = (env) => {
  // TODO: implement automatic port selection when `PORT_SHIFT` is 'auto'.
  const API_PORT = 8000 + Number.parseInt(env.PORT_SHIFT || '0')
  const API_URL = 'http://127.0.0.1:' + API_PORT

  if (Number.isNaN(API_PORT) || API_PORT < 8000 || API_PORT > 65535) {
    throw new RangeError(`Invalid API_PORT value: ${API_PORT}.`)
  }
  return { ...env, API_PORT: String(API_PORT), API_URL: String(API_URL) }
}

for (const [key, value] of Object.entries(applyPortShift(Deno.env.toObject()))) {
  Deno.env.set(key, value)
}

Deno.env.set('GI_VERSION', `${version}@${new Date().toISOString()}`)

const API_PORT = Deno.env.get('API_PORT')
const API_URL = Deno.env.get('API_URL')
const CI = Deno.env.get('CI')
const GI_VERSION = Deno.env.get('GI_VERSION')
const NODE_ENV = Deno.env.get('NODE_ENV') ?? 'development'

console.info('GI_VERSION:', GI_VERSION)
console.info('NODE_ENV:', NODE_ENV)

const pubsub = createServer({
  serverHandlers: {
    connection (socket: Object, request: Object) {
      if (NODE_ENV === 'production') {
        socket.send(createNotification(NOTIFICATION_TYPE.APP_VERSION, GI_VERSION))
      }
    }
  }
})

const pogoServer = pogo.server({
  hostname: 'localhost',
  port: Number.parseInt(API_PORT),
  onPreResponse (response, h) {
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

  pogoServer.inject = async (request, connInfo) => {
    if (isUpgradeableRequest(request)) {
      return pubsub.handleUpgradeableRequest(request)
    } else {
      const response = await originalInject(request, connInfo)
      // This logging code has to be put here instead of inside onPreResponse
      // because it requires access to the request object.
      if (NODE_ENV === 'development' && !CI) {
        console.debug(gray(`${connInfo.remoteAddr.hostname}: ${request.method} ${request.url} --> ${response.status}`))
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
