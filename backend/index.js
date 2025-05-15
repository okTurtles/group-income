'use strict'

import sbp from '@sbp/sbp'
import '@sbp/okturtles.data'
import '@sbp/okturtles.events'
import { SERVER_RUNNING } from './events.js'
import { PUBSUB_INSTANCE } from './instance-keys.js'
import chalk from 'chalk'
import pino from 'pino'

// NOTE: enabling pretty print does add a slight bit of overhead to logging and therefore is not recommended in production
// Learn more about the Pino API here: https://github.com/pinojs/pino/blob/master/docs/api.md
const prettyPrint = process.env.NODE_ENV === 'development' || process.env.CI || process.env.CYPRESS_RECORD_KEY || process.env.PRETTY
// support regular console.log('asdf', 'adsf', 'adsf') style logging that might be used by libraries
// https://github.com/pinojs/pino/blob/master/docs/api.md#interpolationvalues-any
function logMethod (args, method) {
  const stringIdx = typeof args[0] === 'string' ? 0 : 1
  if (args.length > 1) {
    for (let i = stringIdx + 1; i < args.length; ++i) {
      args[stringIdx] += typeof args[i] === 'string' ? ' %s' : ' %o'
    }
  }
  method.apply(this, args)
}
const logger = pino(prettyPrint
  ? {
      hooks: { logMethod },
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true
        }
      }
    }
  : { hooks: { logMethod } })

const logLevel = process.env.LOG_LEVEL || (prettyPrint ? 'debug' : 'info')
if (Object.keys(logger.levels.values).includes(logLevel)) {
  logger.level = logLevel
} else {
  logger.warn(`Unknown log level: ${logLevel}`)
}

global.logger = logger // $FlowExpectedError
console.debug = logger.debug.bind(logger) // $FlowExpectedError
console.info = logger.info.bind(logger) // $FlowExpectedError
console.log = logger.info.bind(logger) // $FlowExpectedError
console.warn = logger.warn.bind(logger) // $FlowExpectedError
console.error = logger.error.bind(logger)

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

export default (new Promise((resolve, reject) => {
  sbp('okTurtles.events/on', SERVER_RUNNING, function () {
    console.info(chalk.bold('backend startup sequence complete.'))
    resolve()
  })
  // call this after we've registered listener for SERVER_RUNNING
  import('./server.js').catch(reject)
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
