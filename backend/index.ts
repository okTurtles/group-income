declare var process: any

import { bold } from 'fmt/colors.ts'

import sbp from  '@sbp/sbp'
import '@sbp/okturtles.data'
import '@sbp/okturtles.events'
import { notFound } from 'pogo/lib/bang.ts'

import '~/scripts/process-shim.ts'
import { SERVER_RUNNING } from './events.ts'
import { PUBSUB_INSTANCE } from './instance-keys.ts'
import type { PubsubClient, PubsubServer } from './pubsub.ts'

// @ts-ignore
globalThis.logger = function (err: Error) {
  console.error(err)
  err.stack && console.error(err.stack)
  if (err instanceof Deno.errors.NotFound) {
    console.log('Returning notFound()', err.message)
    return notFound(err.message)
  }
  return err // routes.ts is written in a way that depends on this returning the error
}

const dontLog: Record<string, boolean> = { 'backend/server/broadcastEntry': true }

function logSBP (domain: string, selector: string, data: any) {
  if (!(selector in dontLog)) {
    console.log(bold(`[sbp] ${selector}`), data)
  }
}

['backend'].forEach(domain => sbp('sbp/filters/domain/add', domain, logSBP))
;[].forEach(sel => sbp('sbp/filters/selector/add', sel, logSBP))

export default (new Promise((resolve, reject) => {
  try {
    sbp('okTurtles.events/on', SERVER_RUNNING, function () {
      console.log(bold('backend startup sequence complete.'))
      resolve(undefined)
    })
    // Call this after we've registered listener for `SERVER_RUNNING`.
    import('./server.ts')
  } catch (err) {
    reject(err)
  }
}))

const shutdownFn = function () {
  sbp('okTurtles.data/apply', PUBSUB_INSTANCE, function (pubsub: PubsubServer) {
    console.log('message received in child, shutting down...')
    pubsub.on('close', async function () {
      try {
        await sbp('backend/server/stop')
        console.log('Backend server down')
        Deno.exit(0)
      } catch (err) {
        console.error('Error during shutdown:', err)
        Deno.exit(1)
      }
    })
    pubsub.close()
    // Since `ws` v8.0, `WebSocketServer.close()` no longer closes remaining connections.
    // See https://github.com/websockets/ws/commit/df7de574a07115e2321fdb5fc9b2d0fea55d27e8
    pubsub.clients.forEach((client: PubsubClient) => client.terminate())
  })
}

Deno.addSignalListener('SIGUSR2', shutdownFn)

// Equivalent to the `uncaughtException` event in Nodejs.
addEventListener('error', (event) => {
  console.error('[server] Unhandled exception:', event)
  Deno.exit(1)
})
