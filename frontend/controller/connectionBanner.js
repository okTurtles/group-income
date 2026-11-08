'use strict'

import { OFFLINE, ONLINE, RECONNECTING, RECONNECTION_FAILED } from '../utils/events.js'
import type { ConnectionStatus } from './serviceworkers/connectionMonitor.js'

// The kinds of connection banner a tab can show (the texts are in main.js)
export const CONNECTION_BANNER = {
  OFFLINE: 'offline',
  RECONNECTING: 'reconnecting',
  FAILED: 'failed',
  DEGRADED: 'degraded'
}

export type ConnectionBannerKind = 'offline' | 'reconnecting' | 'failed' | 'degraded'

// A connection that is `closed` for less than this is shown as reconnecting:
// after a pubsub error, the service worker re-creates the connection 100 ms
// later. A `connecting` one doesn't show a banner during this time unless a
// connection banner is already showing, so that a tab opened while the
// service worker connects for the first time doesn't flash
// "Trying to reconnect...".
export const CONNECTION_BANNER_GRACE = 2 * 1000
// The status is also queried periodically, in case a broadcast is missed
export const CONNECTION_BANNER_REFRESH_INTERVAL = 5 * 1000
// A request to a service worker that was terminated can stay unanswered
export const CONNECTION_STATUS_REQUEST_TIMEOUT = 10 * 1000

type Timers = {
  setTimeout: (fn: () => mixed, ms: number) => any,
  clearTimeout: (id: any) => void,
  setInterval: (fn: () => mixed, ms: number) => any,
  clearInterval: (id: any) => void
}

// Wrapped, because browsers throw 'Illegal invocation' when these are called
// as methods of another object
const defaultTimers: Timers = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id),
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearInterval: (id) => clearInterval(id)
}

const isStatus = (status: any): boolean => (
  !!status && typeof status === 'object' &&
  typeof status.state === 'string' && typeof status.at === 'number'
)

const inGrace = (status: ConnectionStatus, now: number, graceMs: number): boolean =>
  typeof status.since === 'number' && now - status.since < graceMs

// The banner for a connection status (`sw/connection/status`), given the
// banner currently shown (`current`). `null`: no connection banner.
export function bannerForStatus (
  status: ConnectionStatus,
  now: number,
  { graceMs = CONNECTION_BANNER_GRACE, current = null }: { graceMs?: number, current?: ConnectionBannerKind | null } = {}
): ConnectionBannerKind | null {
  switch (status.state) {
    case 'open':
      return status.degraded ? CONNECTION_BANNER.DEGRADED : null
    case 'offline':
      return CONNECTION_BANNER.OFFLINE
    case 'reconnecting':
      return CONNECTION_BANNER.RECONNECTING
    case 'connecting':
      return current === null && inGrace(status, now, graceMs) ? null : CONNECTION_BANNER.RECONNECTING
    case 'closed':
      // `since` is `null` before the service worker has a pubsub client
      return status.since === null || inGrace(status, now, graceMs) ? CONNECTION_BANNER.RECONNECTING : CONNECTION_BANNER.FAILED
    default:
      return current
  }
}

// When the banner for `status` changes on its own, as its grace period ends
const graceEndsAt = (status: ConnectionStatus, now: number, graceMs: number): number | null =>
  (status.state === 'closed' || status.state === 'connecting') && inGrace(status, now, graceMs)
    ? (status.since: any) + graceMs
    : null

const LEGACY_BANNERS: Map<string, ConnectionBannerKind | null> = new Map([
  [OFFLINE, CONNECTION_BANNER.OFFLINE],
  [RECONNECTING, CONNECTION_BANNER.RECONNECTING],
  [RECONNECTION_FAILED, CONNECTION_BANNER.FAILED],
  [ONLINE, null]
])

export type ConnectionBannerController = {
  start: () => void,
  stop: () => void,
  refresh: () => void,
  apply: (status: mixed) => void,
  onLegacyEvent: (name: string) => void,
  +kind: ConnectionBannerKind | null,
  +legacy: boolean
}

// Decides which connection banner a tab shows, from the service worker's
// connection status:
//   - `getStatus()`: queries the status (`sw/connection/status`).
//   - `onChange(kind)`: shows the banner for `kind`, or clears it (`null`).
//     Only called when the kind changes.
//   - `isOnline()`: `navigator.onLine`.
// The status is queried on `start()`, every `refreshInterval` and on
// `refresh()`; statuses broadcast by the service worker are passed to
// `apply()`. A service worker that can't answer (e.g., one from an older
// version, without `sw/connection/status`) puts the controller in legacy
// mode, where the banner follows the connection events passed to
// `onLegacyEvent()`, as it used to. A valid status ends legacy mode.
export function createConnectionBannerController ({
  getStatus,
  onChange,
  isOnline,
  now = () => Date.now(),
  graceMs = CONNECTION_BANNER_GRACE,
  refreshInterval = CONNECTION_BANNER_REFRESH_INTERVAL,
  requestTimeout = CONNECTION_STATUS_REQUEST_TIMEOUT,
  timers = defaultTimers
}: {
  getStatus: () => mixed,
  onChange: (kind: ConnectionBannerKind | null) => mixed,
  isOnline: () => boolean,
  now?: () => number,
  graceMs?: number,
  refreshInterval?: number,
  requestTimeout?: number,
  timers?: Timers
}): ConnectionBannerController {
  let running = false
  let kind: ConnectionBannerKind | null = null
  let legacy = false
  let lastStatus: ConnectionStatus | null = null
  let interval: any = null
  let graceTimer: any = null
  let requestTimer: any = null
  let inFlight = false
  let again = false
  // Incremented by `stop()`, so that requests made before don't affect the
  // ones made after a restart
  let generation = 0

  const setKind = (next: ConnectionBannerKind | null) => {
    if (next === kind) return
    kind = next
    try {
      onChange(next)
    } catch (e) {
      console.error('[connection banner] Error updating the banner', e)
    }
  }

  const clearGraceTimer = () => {
    if (graceTimer !== null) timers.clearTimeout(graceTimer)
    graceTimer = null
  }

  const evaluate = () => {
    clearGraceTimer()
    if (!running || !lastStatus) return
    const status = lastStatus
    const at = now()
    setKind(bannerForStatus(status, at, { graceMs, current: kind }))
    const endsAt = graceEndsAt(status, at, graceMs)
    if (endsAt !== null) {
      graceTimer = timers.setTimeout(() => {
        graceTimer = null
        evaluate()
      }, endsAt - at)
    }
  }

  const apply = (status: mixed) => {
    if (!running || !isStatus(status)) return
    const valid: ConnectionStatus = (status: any)
    // Answers and broadcasts can arrive out of order. The check is skipped if
    // the clock went back since the last status.
    if (lastStatus && valid.at < lastStatus.at && lastStatus.at <= now()) return
    lastStatus = valid
    if (legacy) {
      legacy = false
      console.info('[connection banner] The connection status is available again')
    }
    evaluate()
  }

  const fail = (e: mixed) => {
    if (!running || legacy) return
    legacy = true
    console.warn('[connection banner] Could not get the connection status; following the connection events instead', e)
    clearGraceTimer()
    lastStatus = null
    let offline = false
    try {
      offline = isOnline() === false
    } catch (err) {
      console.warn('[connection banner] Error checking whether the device is online', err)
    }
    if (offline) setKind(CONNECTION_BANNER.OFFLINE)
  }

  const refresh = () => {
    if (!running) return
    if (inFlight) {
      again = true
      return
    }
    inFlight = true
    const requestGeneration = generation
    let settled = false
    const settle = (fn: () => void) => {
      if (settled || requestGeneration !== generation) return
      settled = true
      if (requestTimer !== null) timers.clearTimeout(requestTimer)
      requestTimer = null
      fn()
      inFlight = false
      if (again) {
        again = false
        refresh()
      }
    }
    requestTimer = timers.setTimeout(() => {
      requestTimer = null
      settle(() => fail(new Error('Timed out getting the connection status')))
    }, requestTimeout)
    let request: Promise<mixed>
    try {
      request = Promise.resolve(getStatus())
    } catch (e) {
      request = Promise.reject(e)
    }
    request.then((status) => {
      // A late answer is still used
      apply(status)
      settle(() => { if (!isStatus(status)) fail(new Error('Invalid connection status')) })
    }, (e) => {
      settle(() => fail(e))
    })
  }

  return {
    start () {
      if (running) return
      running = true
      interval = timers.setInterval(refresh, refreshInterval)
      refresh()
    },
    stop () {
      running = false
      if (interval !== null) timers.clearInterval(interval)
      if (requestTimer !== null) timers.clearTimeout(requestTimer)
      clearGraceTimer()
      interval = requestTimer = null
      inFlight = again = false
      generation++
    },
    refresh,
    apply,
    onLegacyEvent (name: string) {
      if (!running) return
      if (!legacy) {
        refresh()
      } else if (LEGACY_BANNERS.has(name)) {
        setKind(LEGACY_BANNERS.get(name) ?? null)
      }
    },
    get kind () {
      return kind
    },
    get legacy () {
      return legacy
    }
  }
}
