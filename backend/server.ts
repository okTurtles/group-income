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

import { GIMessage } from '../shared/domains/chelonia/GIMessage.js'

const { version } = await import('~/package.json', {
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
const NODE_ENV = Deno.env.get('NODE_ENV')

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
  onPreResponse (response) {
    try {
      if (typeof response.header === 'function') {
        response.header('X-Frame-Options', 'deny')
      }
    } catch (err) {
      console.warn('could not set X-Frame-Options header:', err.message)
    }
  }
})

// Patch the Pogo server to add WebSocket support.
{
  const originalInject = pogoServer.inject.bind(pogoServer)

  pogoServer.inject = (request) => {
    if (isUpgradeableRequest(request)) {
      return pubsub.handleUpgradeableRequest(request)
    } else {
      if (NODE_ENV === 'development' && !CI) {
        console.debug(grey(`${request.info.remoteAddress}: ${request.toString()} --> ${request.response.status}`))
      }
      return originalInject(request)
    }
  }
}
pogoServer.router = router

console.log('Backend HTTP server listening:', pogoServer.options)

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

pogoServer.start()
  .then(() => sbp('okTurtles.events/emit', SERVER_RUNNING, pogoServer))
  .catch(console.error.bind(console, 'error in server.start():'))
