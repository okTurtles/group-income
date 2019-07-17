'use strict'

import sbp from '~/shared/sbp.js'
import '~/shared/domains/okTurtles/data.js'
import '~/shared/domains/okTurtles/events.js'
import { SERVER_RUNNING } from './events.js'
import { PUBSUB_INSTANCE } from './instance-keys.js'
import chalk from 'chalk'

global.logger = function (err) {
  console.error(err)
  console.error(err.stack)
}

function logSBP (domain, selector, data) {
  console.log(chalk.bold(`[sbp] ${selector}`), data)
}

// ;[].forEach(domain => sbp('sbp/filters/domain/add', domain, logSBP))
;[
  'backend/server/handleEntry',
  'backend/db/streamEntriesSince'
].forEach(sel => sbp('sbp/filters/selector/add', sel, logSBP))

module.exports = new Promise((resolve, reject) => {
  sbp('okTurtles.events/on', SERVER_RUNNING, function () {
    console.log(chalk.bold('backend startup sequence complete.'))
    resolve()
  })
})

// call this after we've registered listener for SERVER_RUNNING
require('./server.js')

const shutdownFn = function () {
  sbp('okTurtles.data/apply', PUBSUB_INSTANCE, function (primus) {
    console.log('message received in child, shutting down...')
    primus.on('close', async function () {
      try {
        await sbp('backend/server/stop')
        console.log('Hapi server down')
        // await db.stop()
        // console.log('database stopped')
        process.send({}) // tell grunt we've successfully shutdown the server
        process.nextTick(() => process.exit(0)) // triple-check we quit :P
      } catch (err) {
        console.error('Error during shutdown:', err)
        process.exit(1)
      }
    })
    primus.destroy({ timeout: 1000 }) // TODO: close: false ?
  })
}

// sent by nodemon
process.on('SIGUSR2', shutdownFn)

// when spawned via grunt, listen for message to cleanly shutdown and relinquish port
process.on('message', shutdownFn)

process.on('uncaughtException', (err) => {
  console.error('[server] Unhandled exception:', err, err.stack)
  process.exit(1)
})

process.on('unhandledRejection', (reason, p) => {
  console.error('[server] Unhandled promise rejection:', p, 'reason:', reason)
  process.exit(1)
})

// TODO: should we use Bluebird to handle swallowed errors
// http://jamesknelson.com/are-es6-promises-swallowing-your-errors/
