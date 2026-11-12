'use strict'

import { OFFLINE, ONLINE, RECONNECTING, RECONNECTION_FAILED } from '../utils/events.js'
import type { Timers } from '../utils/timers.js'
import { defaultTimers } from '../utils/timers.js'
import { CONNECTION_STATUS_TIMEOUT, requestConnectionStatus } from './connectionStatus.js'
import type { ConnectionStatus } from './serviceworkers/connectionMonitor.js'

// The kinds of connection banner a tab can show (the texts are in main.js)
export const CONNECTION_BANNER = Object.freeze({
  OFFLINE: 'offline',
  RECONNECTING: 'reconnecting',
  FAILED: 'failed',
  DEGRADED: 'degraded'
})

export type ConnectionBannerKind = $Values<typeof CONNECTION_BANNER>

// A connection that is `closed` for less than this is shown as reconnecting:
// after a pubsub error, the service worker re-creates the connection 100 ms
// later. A `connecting` one doesn't show a banner during this time unless a
// connection banner is already showing, so that a tab opened while the
// service worker connects for the first time doesn't flash
// "Trying to reconnect...".
export const CONNECTION_BANNER_GRACE = 2 * 1000
// The status is also queried periodically while the tab is visible. The
// statuses broadcast by the service worker are the main channel; this catches
// the missed ones, e.g., after the browser restarts an idle service worker.
export const CONNECTION_BANNER_REFRESH_INTERVAL = 30 * 1000

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
//   - `isVisible()`: whether the tab is visible.
// The status is queried on `start()`, every `refreshInterval` while the tab is
// visible and on `refresh()`; statuses broadcast by the service worker are
// passed to `apply()`. A service worker that can't answer (e.g., one from an
// older version, without `sw/connection/status`) puts the controller in
// legacy mode, where the banner follows the connection events passed to
// `onLegacyEvent()`, as it used to. A valid status ends legacy mode.
// `stop()` clears the banner and the state; a restart starts afresh.
export function createConnectionBannerController ({
  getStatus,
  onChange,
  isOnline,
  isVisible = () => true,
  now = () => Date.now(),
  graceMs = CONNECTION_BANNER_GRACE,
  refreshInterval = CONNECTION_BANNER_REFRESH_INTERVAL,
  requestTimeout = CONNECTION_STATUS_TIMEOUT,
  timers = defaultTimers
}: {
  getStatus: () => mixed,
  onChange: (kind: ConnectionBannerKind | null) => mixed,
  isOnline: () => boolean,
  isVisible?: () => boolean,
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
  let inFlight = false
  let refreshQueued = false
  // Incremented by `stop()`: a query made before is ignored, whether it
  // resolves or rejects, even after a restart
  let generation = 0
  // Settles the query in flight, so that `stop()` leaves no timer behind
  let cancelRequest: (() => void) | null = null

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

  const enterLegacyMode = (e: mixed) => {
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

  const visible = (): boolean => {
    try {
      return isVisible() !== false
    } catch (e) {
      console.warn('[connection banner] Error checking whether the tab is visible', e)
      return true
    }
  }

  const refresh = () => {
    if (!running) return
    if (inFlight) {
      refreshQueued = true
      return
    }
    inFlight = true
    const requestGeneration = generation
    const current = () => requestGeneration === generation
    // `getStatus()` is called right away; an answer that arrives after the
    // timeout is still applied (and ends legacy mode)
    const answer: Promise<mixed> = new Promise(resolve => resolve(getStatus()))
    answer.then((status) => { if (current()) apply(status) }, () => {})
    const cancelled: Promise<mixed> = new Promise((resolve, reject) => {
      cancelRequest = () => reject(new Error('Connection banner stopped'))
    })
    requestConnectionStatus({ getStatus: () => Promise.race([answer, cancelled]), timeout: requestTimeout, timers })
      .then((status) => {
        if (current() && !isStatus(status)) enterLegacyMode(new Error('Invalid connection status'))
      }, (e) => {
        if (current()) enterLegacyMode(e)
      })
      .finally(() => {
        // `stop()` already reset these for the next request
        if (!current()) return
        cancelRequest = null
        inFlight = false
        if (refreshQueued) {
          refreshQueued = false
          refresh()
        }
      })
  }

  return {
    start () {
      if (running) return
      running = true
      interval = timers.setInterval(() => { if (visible()) refresh() }, refreshInterval)
      refresh()
    },
    stop () {
      running = false
      generation++
      if (interval !== null) timers.clearInterval(interval)
      interval = null
      clearGraceTimer()
      cancelRequest?.()
      cancelRequest = null
      inFlight = refreshQueued = false
      lastStatus = null
      legacy = false
      // `onChange(null)` if a banner is showing, so that a stopped
      // controller doesn't leave it on screen
      setKind(null)
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
