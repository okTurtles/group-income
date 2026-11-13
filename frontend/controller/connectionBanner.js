'use strict'

import { OFFLINE, ONLINE, RECONNECTING, RECONNECTION_FAILED } from '../utils/events.js'
import type { Timers } from '../utils/timers.js'
import { defaultTimers } from '../utils/timers.js'
import { CONNECTION_STATUS_TIMEOUT, isStatusUnavailableError, requestConnectionStatus } from './connectionStatus.js'
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
      // `since` is `null` before the service worker has a pubsub client (the
      // controller shows that like a connection being made, see `apply()`)
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
// passed to `apply()`. A service worker from an older version (without
// `sw/connection/status`) puts the controller in legacy mode, where the
// banner follows the connection events passed to `onLegacyEvent()`, as it
// used to. So does a query that fails before any status was received, or
// while the device is offline. Other failures (e.g., a busy or restarting
// service worker) keep the last status, whose grace period still applies,
// until a query answers. A valid status ends legacy mode.
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
  let graceTimer: any = null
  let inFlight = false
  let refreshQueued = false
  // One warning per run of failed queries: a busy service worker can fail
  // every query for minutes
  let failureLogged = false
  // When a `closed` status without `since` was first seen: the service worker
  // has no pubsub client yet (e.g., the browser just restarted it). It's shown
  // like a connection being made since then, so that a restart doesn't flash
  // a banner, and a client that doesn't come still shows one.
  let noClientSince: number | null = null

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
    if (!lastStatus) return
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
    let valid: ConnectionStatus = (status: any)
    // Answers and broadcasts can arrive out of order. The check is skipped if
    // the clock went back since the last status.
    if (lastStatus && valid.at < lastStatus.at && lastStatus.at <= now()) return
    if (valid.state === 'closed' && valid.since === null) {
      if (noClientSince === null) noClientSince = valid.at
      valid = { ...valid, state: 'connecting', since: noClientSince }
    } else {
      noClientSince = null
    }
    lastStatus = valid
    failureLogged = false
    if (legacy) {
      legacy = false
      console.info('[connection banner] The connection status is available again')
    }
    evaluate()
  }

  const deviceOffline = (): boolean => {
    try {
      return isOnline() === false
    } catch (e) {
      console.warn('[connection banner] Error checking whether the device is online', e)
      return false
    }
  }

  const enterLegacyMode = (e: mixed) => {
    if (legacy) return
    legacy = true
    console.warn('[connection banner] Could not get the connection status; following the connection events instead', e)
    clearGraceTimer()
    lastStatus = null
    noClientSince = null
    if (deviceOffline()) setKind(CONNECTION_BANNER.OFFLINE)
  }

  // Legacy mode is also used when there's no status to keep, since the tab
  // would otherwise show no banner at all, and while the device is offline,
  // which the last status may not show
  const queryFailed = (e: mixed) => {
    if (isStatusUnavailableError(e) || !lastStatus || deviceOffline()) {
      enterLegacyMode(e)
    } else if (!failureLogged) {
      failureLogged = true
      console.warn('[connection banner] Could not get the connection status; will retry', e)
    }
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
    // `getStatus()` is called right away; an answer that arrives after the
    // timeout is still applied (and ends legacy mode)
    const answer: Promise<mixed> = new Promise(resolve => resolve(getStatus()))
    answer.then(apply, () => {})
    requestConnectionStatus({ getStatus: () => answer, timeout: requestTimeout, timers })
      .then((status) => {
        if (!isStatus(status)) enterLegacyMode(new Error('Invalid connection status'))
      }, queryFailed)
      .finally(() => {
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
      timers.setInterval(() => { if (visible()) refresh() }, refreshInterval)
      refresh()
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
