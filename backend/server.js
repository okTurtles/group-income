'use strict'

import sbp from '~/shared/sbp.js'
import './database.js'
import Hapi from '@hapi/hapi'
import GiAuth from './auth.js'
import { GIMessage } from '~/shared/GIMessage.js'
import { SERVER_RUNNING } from './events.js'
import { SERVER_INSTANCE, PUBSUB_INSTANCE } from './instance-keys.js'
import { createMessage, createServer } from './utils/pubsub.js'
import chalk from 'chalk'

const Inert = require('@hapi/inert')

// NOTE: migration guides for Hapi v16 -> v17:
//       https://github.com/hapijs/hapi/issues/3658
//       https://medium.com/yld-engineering-blog/so-youre-thinking-about-updating-your-hapi-js-server-to-v17-b5732ab5bdb8
//       https://futurestud.io/tutorials/hapi-v17-upgrade-guide-your-move-to-async-await

const hapi = new Hapi.Server({
  // TODO: improve logging and base it on process.env.NODE_ENV
  //       https://github.com/okTurtles/group-income-simple/issues/32
  // debug: false, // <- Hapi v16 was outputing too many unnecessary debug statements
  //               // v17 doesn't seem to do this anymore so I've re-enabled the logging
  debug: { log: ['error'], request: ['error'] },
  port: process.env.API_PORT,
  // See: https://github.com/hapijs/discuss/issues/262#issuecomment-204616831
  routes: {
    cors: {
      // TODO: figure out if we can live with '*' or if we need to restrict it
      origin: ['*']
      // origin: [
      //   process.env.API_URL,
      //   // improve support for browsersync proxy
      //   ...(process.env.NODE_ENV === 'development' && ['http://localhost:3000'])
      // ]
    }
  }
})

sbp('okTurtles.data/set', SERVER_INSTANCE, hapi)

sbp('sbp/selectors/register', {
  'backend/server/handleEntry': async function (entry: GIMessage) {
    const contractID = entry.contractID()
    await sbp('gi.db/log/addEntry', entry)
    console.log(chalk.blue.bold(`broadcasting ${entry.description()}`))
    sbp('okTurtles.data/apply', PUBSUB_INSTANCE, pubsub => {
      if (contractID in pubsub.subscribersByContractID) {
        pubsub.subscribersByContractID[contractID].forEach((client) => {
          client.send(createMessage('entry', entry.serialize()))
        })
      }
    })
  },
  'backend/server/stop': function () {
    return hapi.stop()
  }
})

if (process.env.NODE_ENV === 'development' && !process.env.CI) {
  hapi.events.on('response', (request, event, tags) => {
    console.debug(chalk`{grey ${request.info.remoteAddress}: ${request.method.toUpperCase()} ${request.path} --> ${request.response.statusCode}}`)
  })
}

sbp('okTurtles.data/set', PUBSUB_INSTANCE, createServer(hapi.listener))

;(async function () {
  // https://hapi.dev/tutorials/plugins
  await hapi.register([
    { plugin: GiAuth },
    { plugin: Inert }
  ])
  require('./routes.js')
  await hapi.start()
  console.log('Backend server running at:', hapi.info.uri)
  sbp('okTurtles.events/emit', SERVER_RUNNING, hapi)
})()
