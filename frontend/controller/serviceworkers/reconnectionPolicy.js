'use strict'

import type { ConnectionStatus } from './connectionMonitor.js'

// What restarts the reconnection cycle: a page opened or refreshed (its
// `ready` message), a tab becoming visible, and the connection banner's
// "Retry now" button. Only used in the log line.
export type RestartReason = 'page-opened' | 'tab-visible' | 'retry-button'

// What `restart()` did: re-created the pubsub client, asked for the missing
// subscriptions of a degraded connection (one degraded by pending
// subscriptions only has nothing to ask for), or neither
export type RestartResult = 'reconnecting' | 'healing' | 'nothing-to-do'

// The second argument of `PUBSUB_RECONNECTION_SCHEDULED`: the attempt's delay
// and number. `nth` is 1 for the first attempt after an open connection was
// lost and after the device came back online.
export type ReconnectionScheduledDetail = { delay?: mixed, nth?: mixed, ... }

export type ReconnectionPolicy = {
  restart: (reason: RestartReason) => RestartResult,
  onReconnectionScheduled: (client: mixed, detail?: ?ReconnectionScheduledDetail) => void
}

// When the service worker's pubsub connection retries, and when it starts a
// new cycle:
//   1. While at least one page is open, the pubsub client keeps retrying,
//      backed off (up to `PUBSUB_MAX_RECONNECTION_DELAY`). With no page open,
//      it's paused (destroyed) at its first failed attempt: nobody would see
//      the connection, and push notifications don't need it. Losing an open
//      connection (e.g., a server restart) or coming back online isn't a
//      failed attempt: the connection is retried once first.
//   2. A restart signal re-creates a client that is waiting out a back-off or
//      that was destroyed (paused, or given up), so that the new cycle starts
//      with short delays instead of continuing the long ones. While the
//      connection is open but degraded, it asks for the missing subscriptions
//      again instead (pending-only degradation has nothing to ask for).
// The dependencies:
//   - `getClient()`: the current pubsub client (`PUBSUB_INSTANCE`).
//   - `reconnect(reason)`: replaces it with a new one that connects right away
//     (`chelonia/connect`, through `connectPubsub` in setupChelonia.js).
//   - `resetHealBackoff()` and `getStatus()`: the connection monitor's.
//   - `countPages()`: how many pages (window clients) are open, or
//     `undefined` without a clients API (a browsing context, which always has
//     a page).
//   - `isOffline()`: whether the device is known to be offline.
// None of the methods throw: `restart()` answers the tabs' requests, and
// `onReconnectionScheduled()` is called from a pubsub event listener.
export function createReconnectionPolicy ({
  getClient,
  reconnect,
  resetHealBackoff,
  getStatus,
  countPages,
  isOffline
}: {|
  getClient: () => mixed,
  reconnect: (reason: RestartReason) => mixed,
  resetHealBackoff: () => mixed,
  getStatus: () => ConnectionStatus,
  countPages?: ?(() => Promise<number> | number),
  isOffline: () => boolean
|}): ReconnectionPolicy {
  const offline = (): boolean => {
    try {
      return isOffline() === true
    } catch (e) {
      // Trying to connect is the safe default
      console.warn('[connection] Error checking whether the device is offline', e)
      return false
    }
  }

  const stateOf = (client: mixed): mixed =>
    client && typeof client === 'object' ? (client: any).state : undefined

  return {
    restart (reason: RestartReason): RestartResult {
      try {
        const client = getClient()
        const state = stateOf(client)
        // `connecting` (an attempt is running) is left alone: this also
        // coalesces several tabs restored at once and repeated clicks, since
        // the first restart makes the state `connecting`. So are `offline` and
        // `reconnecting` on an offline device: the client's own `online`
        // listener starts a fresh cycle once the network is back. A `closed`
        // client has none (`destroy()` removes it, and it would ignore the
        // event anyway), so it's re-created even offline: its first attempt
        // fails, which leaves the new client `offline`, with that listener.
        if (state === 'reconnecting' || state === 'closed') {
          if (state === 'reconnecting' && offline()) return 'nothing-to-do'
          console.info(`[connection] ${reason} while ${state}; restarting the reconnection cycle`)
          const warn = (e: mixed) => console.warn(`[connection] Error restarting the reconnection cycle (${reason})`, e)
          try {
            const result: any = reconnect(reason)
            if (typeof result?.catch === 'function') result.catch(warn)
          } catch (e) {
            warn(e)
            return 'nothing-to-do'
          }
          return 'reconnecting'
        }
        if (state === 'open') {
          const status = getStatus()
          // Degraded by pending subscriptions only (a slow server): the
          // requests are already on their way, and asking again does nothing
          // (the monitor doesn't heal those either)
          if (status.degraded && status.missing.length > 0) {
            console.info(`[connection] ${reason} while degraded; re-subscribing now`)
            resetHealBackoff()
            return 'healing'
          }
        }
      } catch (e) {
        console.warn(`[connection] Error handling a restart of the reconnection cycle (${reason})`, e)
      }
      return 'nothing-to-do'
    },
    // Called on `PUBSUB_RECONNECTION_SCHEDULED`, with its arguments. Besides
    // after a failed attempt, the library schedules one with `nth: 1` when an
    // open connection is lost (closed by the server, a ping timeout) and when
    // the device comes back online. So an attempt failed if `nth` is greater
    // than 1 (the previous socket never opened), or if a connection is
    // replaced for leaving its requests unanswered a second time in a row
    // (each of those sockets opened, which keeps `nth` at 1). A missing or
    // invalid `nth` (`@chelonia/lib` 2.2.0 always sends one) doesn't count as
    // a failed attempt: retrying is the safe default, as before pausing
    // existed.
    // Pausing destroys the client, whose state becomes `closed` (broadcast to
    // the tabs by the connection monitor, as usual); the next page opened
    // restarts the cycle.
    onReconnectionScheduled (client: mixed, detail?: ?ReconnectionScheduledDetail): void {
      const pages = countPages
      if (!pages) return
      const nth = detail && typeof detail === 'object' ? detail.nth : undefined
      const unanswered = client && typeof client === 'object' ? (client: any).unansweredReplacements : undefined
      const failed = (typeof nth === 'number' && nth > 1) ||
        (typeof unanswered === 'number' && unanswered > 1)
      if (!failed) return
      const pause = (count: mixed) => {
        // Retrying is the safe default, e.g., for an unexpected answer
        if (count !== 0) return
        try {
          // Checked once the answer is in: meanwhile, the client may have
          // been replaced (a restart, a pubsub error) or have connected. One
          // that is already `closed` was paused (or destroyed) already.
          if (getClient() !== client) return
          const state = stateOf(client)
          if (state === 'open' || state === 'connecting' || state === 'closed') return
          console.info('[connection] no open pages; pausing reconnection until a page is opened')
          ;(client: any).destroy()
        } catch (e) {
          console.warn('[connection] Error pausing reconnection', e)
        }
      }
      // `countPages()` throwing is a rejection
      new Promise((resolve) => resolve(pages())).then(pause, (e) => {
        console.warn('[connection] Error counting the open pages; not pausing reconnection', e)
      })
    }
  }
}
