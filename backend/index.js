'use strict'

import sbp from '@sbp/sbp'
import '@sbp/okturtles.data'
import '@sbp/okturtles.events'
import { SERVER_RUNNING } from './events.js'
import { PUBSUB_INSTANCE } from './instance-keys.js'
import chalk from 'chalk'
import './logger.js'

console.info('NODE_ENV =', process.env.NODE_ENV)

const dontLog = {
  'backend/server/broadcastEntry': true,
  'backend/server/broadcastDeletion': true,
  'backend/server/broadcastKV': true
}

function logSBP (domain, selector, data: Array<*>) {
  if (!dontLog[selector]) {
    if (selector === 'backend/server/handleEntry') {
      console.debug(chalk.bold(`[sbp] ${selector}`), data[0].description())
    } else {
      console.debug(chalk.bold(`[sbp] ${selector}`), data)
    }
  }
}

;['backend'].forEach(domain => sbp('sbp/filters/domain/add', domain, logSBP))
// any specific selectors outside of backend namespace to log
;[].forEach(sel => sbp('sbp/filters/selector/add', sel, logSBP))

module.exports = (new Promise((resolve, reject) => {
  sbp('okTurtles.events/on', SERVER_RUNNING, function () {
    console.info(chalk.bold('backend startup sequence complete.'))
    resolve()
  })
  // call this after we've registered listener for SERVER_RUNNING
  require('./server.js')
}): Promise<void>)

const shutdownFn = function (message) {
  sbp('okTurtles.data/apply', PUBSUB_INSTANCE, function (pubsub) {
    console.info('message received in child, shutting down...', message)
    pubsub.on('close', async function () {
      try {
        await sbp('backend/server/stop')
        console.info('Hapi server down')
        // await db.stop()
        // console.info('database stopped')
        process.send({}) // tell grunt we've successfully shutdown the server
        process.nextTick(() => process.exit(0)) // triple-check we quit :P
      } catch (err) {
        console.error(err, 'Error during shutdown')
        process.exit(1)
      }
    })
    pubsub.close()
    // Since `ws` v8.0, `WebSocketServer.close()` no longer closes remaining connections.
    // See https://github.com/websockets/ws/commit/df7de574a07115e2321fdb5fc9b2d0fea55d27e8
    pubsub.clients.forEach(client => client.terminate())
  })
}

// sent by nodemon
process.on('SIGUSR2', shutdownFn)

// when spawned via grunt, listen for message to cleanly shutdown and relinquish port
process.on('message', shutdownFn)

process.on('uncaughtException', (err) => {
  console.error(err, '[server] Unhandled exception')
  process.exit(1)
})

process.on('unhandledRejection', (reason, p) => {
  console.error(reason, '[server] Unhandled promise rejection:', reason)
  process.exit(1)
})

// TODO: should we use Bluebird to handle swallowed errors
// http://jamesknelson.com/are-es6-promises-swallowing-your-errors/
