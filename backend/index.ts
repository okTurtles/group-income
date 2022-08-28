import { bold } from "fmt/colors.ts"

import sbp from  "@sbp/sbp"
import "@sbp/okturtles.data"
import "@sbp/okturtles.events"

import { SERVER_RUNNING } from './events.ts'
import { PUBSUB_INSTANCE } from './instance-keys.ts'

const logger = window.logger = function (err) {
  console.error(err)
  err.stack && console.error(err.stack)
  return err // routes.js is written in a way that depends on this returning the error
}

const process = window.process = {
  env: {
    get (key) {
      return Deno.env.get(key)
    },
    set (key, value) {
      return Deno.env.set(key, value)
    }
  }
}

const dontLog = { 'backend/server/broadcastEntry': true }

function logSBP (domain, selector, data) {
  if (!dontLog[selector]) {
    console.log(bold(`[sbp] ${selector}`), data)
  }
}

;['backend'].forEach(domain => sbp('sbp/filters/domain/add', domain, logSBP))
;[].forEach(sel => sbp('sbp/filters/selector/add', sel, logSBP))

export default (new Promise((resolve, reject) => {
  sbp('okTurtles.events/on', SERVER_RUNNING, function () {
    console.log(bold('backend startup sequence complete.'))
    resolve()
  })
  // Call this after we've registered listener for `SERVER_RUNNING`.
  import('./server.ts')
}))

const shutdownFn = function (message) {
  sbp('okTurtles.data/apply', PUBSUB_INSTANCE, function (pubsub) {
    console.log('message received in child, shutting down...', message)
    pubsub.on('close', async function () {
      try {
        await sbp('backend/server/stop')
        console.log('Backend server down')
        process.send({}) // tell grunt we've successfully shutdown the server
        process.nextTick(() => Deno.exit(0)) // triple-check we quit :P
      } catch (err) {
        console.error('Error during shutdown:', err)
        Deno.exit(1)
      }
    })
    pubsub.close()
    // Since `ws` v8.0, `WebSocketServer.close()` no longer closes remaining connections.
    // See https://github.com/websockets/ws/commit/df7de574a07115e2321fdb5fc9b2d0fea55d27e8
    pubsub.clients.forEach(client => client.terminate())
  })
}

// Sent by Nodemon.
addEventListener('SIGUSR2', shutdownFn)

// When spawned by another process,
// listen for message events to cleanly shutdown and relinquish port.
addEventListener('message', shutdownFn)

// Equivalent to the `uncaughtException` event in Nodejs.
addEventListener('error', (event) => {
  console.error('[server] Unhandled exception:', event)
  Deno.exit(1)
})

addEventListener('unhandledRejection', (reason, p) => {
  console.error('[server] Unhandled promise rejection:', p, 'reason:', reason)
  Deno.exit(1)
})
