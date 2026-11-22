'use strict'

import { OFFLINE, ONLINE, RECONNECTING, RECONNECTION_FAILED } from '../../utils/events.js'

// How long a wanted contract may stay unsubscribed while the connection is
// open before the connection is considered degraded.
export const CONNECTION_DEGRADED_GRACE = 10 * 1000
// Degradation depends on time alone, so the status is also recomputed
// periodically.
export const CONNECTION_TICK_INTERVAL = 5 * 1000
// Re-subscription requests in a degraded episode are backed off, from
// `CONNECTION_DEGRADED_GRACE` up to this delay, so that a server that keeps
// rejecting a subscription isn't flooded with requests.
export const CONNECTION_MAX_HEAL_DELAY = 5 * 60 * 1000
// A wanted contract that stays unsubscribed through this many re-subscription
// requests (e.g., one the server refuses) is still requested, backed off, but
// no longer makes the connection degraded: the banner can't promise a
// resynchronization that doesn't happen.
export const CONNECTION_MAX_DEGRADED_HEALS = 3

export type ConnectionState = 'connecting' | 'open' | 'reconnecting' | 'offline' | 'closed'

export type ConnectionStatus = {
  at: number,
  // `app`: the fallback, when the library's status couldn't be read yet
  source: 'chelonia' | 'app',
  state: ConnectionState,
  since: number | null,
  wanted: number,
  missing: string[],
  pending: string[],
  oldestPendingSince: number | null,
  unsubscribedSince: number | null,
  degraded: boolean,
  heals: number
}

export type ConnectionMonitor = {
  setWanted: (ids: mixed) => void,
  update: () => void,
  onReconnected: () => void,
  resetHealBackoff: () => void,
  getStatus: () => ConnectionStatus,
  start: () => void
}

const CONNECTION_STATES: ConnectionState[] = ['connecting', 'open', 'reconnecting', 'offline', 'closed']

const onlyStrings = (list: $ReadOnlyArray<mixed>): string[] => (list.filter(id => typeof id === 'string'): any)

// The answer of `chelonia/pubsub/status`, or `null` if it doesn't have the
// expected shape
const normalizeLibStatus = (status: any): ?{ state: ConnectionState, since: number | null, wanted: ?number, missing: string[], pending: string[], oldestPendingSince: number | null } => {
  if (
    !status || typeof status !== 'object' ||
    !CONNECTION_STATES.includes(status.state) ||
    !Array.isArray(status.missing) || !Array.isArray(status.pending)
  ) {
    return null
  }
  return {
    state: status.state,
    since: typeof status.since === 'number' ? status.since : null,
    wanted: typeof status.wanted === 'number' ? status.wanted : null,
    missing: onlyStrings(status.missing),
    pending: onlyStrings(status.pending),
    oldestPendingSince: typeof status.oldestPendingSince === 'number' ? status.oldestPendingSince : null
  }
}

// Keeps, for each ID in `ids`, the first time it was seen, and forgets the
// others
const trackFirstSeen = (map: Map<string, number>, ids: string[], at: number) => {
  const current = new Set(ids)
  for (const id of map.keys()) {
    if (!current.has(id)) map.delete(id)
  }
  for (const id of current) {
    if (!map.has(id)) map.set(id, at)
  }
}

const oldest = (map: Map<string, number>, include: (id: string) => boolean = () => true): number | null => {
  let result = null
  for (const [id, at] of map) {
    if (include(id) && (result === null || at < result)) result = at
  }
  return result
}

// Tracks the health of the service worker's pubsub connection: its state and
// whether the contracts Chelonia processes events for (the wanted set) are
// subscribed. A connection that is open while a wanted contract stays
// unsubscribed for `graceMs` is degraded; re-subscription is then requested
// (through `heal`), backed off. A contract still unsubscribed after
// `maxDegradedHeals` requests keeps being requested, but no longer counts
// toward `degraded`.
//   - `getLibStatus()`: the library's status (`chelonia/pubsub/status`).
//   - `heal()`: requests the missing subscriptions (`chelonia/pubsub/update`).
//   - `emit(status)`: called when the status changes in a way that matters
//     for the UI.
// None of the methods throw: `update()` and `onReconnected()` are called from
// pubsub event handlers, where an exception makes the app re-create the
// connection, and `getStatus()` answers the tabs' queries. `heal` and `emit`
// only run in the monitor's own timer callbacks.
export function createConnectionMonitor ({
  getLibStatus,
  heal,
  emit,
  now = () => Date.now(),
  graceMs = CONNECTION_DEGRADED_GRACE,
  tickInterval = CONNECTION_TICK_INTERVAL,
  maxHealDelay = CONNECTION_MAX_HEAL_DELAY,
  maxDegradedHeals = CONNECTION_MAX_DEGRADED_HEALS
}: {|
  getLibStatus: () => mixed,
  heal: () => mixed,
  emit: (status: ConnectionStatus) => mixed,
  now?: () => number,
  graceMs?: number,
  tickInterval?: number,
  maxHealDelay?: number,
  maxDegradedHeals?: number
|}): ConnectionMonitor {
  let wanted: string[] = []
  // Wanted contracts not subscribed while the connection is open, and since
  // when. Cleared whenever the connection isn't open, so that the grace
  // period starts when it opens or when the contract becomes unsubscribed,
  // whichever is later.
  const notSubscribedSince: Map<string, number> = new Map()
  // Re-subscription requests made for each contract while it stayed
  // unsubscribed
  const healAttempts: Map<string, number> = new Map()
  const keepHealAttempts = (ids: Set<string>) => {
    for (const id of Array.from(healAttempts.keys())) {
      if (!ids.has(id)) healAttempts.delete(id)
    }
  }
  let heals = 0
  let nextHealAt = 0
  // When the last re-subscription request was made, so that a restart signal
  // can't ask the server more often than the grace period already allows
  let lastHealAt: number | null = null
  let lastStatus: ConnectionStatus | null = null
  // Whether a wanted contract, counted toward `degraded` or not, was
  // unsubscribed for longer than the grace period at the last recompute
  let lastUnhealthy = false
  let lastEmitted: string | null = null
  let updateTimer: any = null
  let interval: any = null
  // Whether the last attempt to compute the status failed: a failure is
  // logged once, not on every tick and query, until it succeeds again
  let failing = false
  const computeFailed = (e: mixed) => {
    if (!failing) console.warn('[connection] Error computing the connection status (not logged again until it succeeds)', e)
    failing = true
  }
  const computeSucceeded = () => {
    if (failing) console.info('[connection] computing the connection status works again')
    failing = false
  }

  const safely = <T>(description: string, fn: () => T, fallback: T): T => {
    try {
      return fn()
    } catch (e) {
      console.warn(`[connection] Error ${description}`, e)
      return fallback
    }
  }

  const requestHeal = (reason: string) => {
    const warn = (e: mixed) => console.warn(`[connection] Error requesting re-subscription (${reason})`, e)
    try {
      const result: any = heal()
      if (typeof result?.catch === 'function') result.catch(warn)
    } catch (e) {
      warn(e)
    }
  }

  // Updates the first-seen bookkeeping only: no re-subscription, log line or
  // emit, and none of the state `recompute()` keeps. Throws when the library's
  // status can't be read: the callers then keep the last status, rather than
  // report a connection that is down.
  const compute = (): { status: ConnectionStatus, unhealthy: boolean } => {
    const at = now()
    const libStatus = normalizeLibStatus(getLibStatus())
    if (!libStatus) throw new Error('Unexpected library connection status')
    const status: ConnectionStatus = {
      at,
      source: 'chelonia',
      state: libStatus.state,
      since: libStatus.since,
      wanted: libStatus.wanted ?? wanted.length,
      missing: libStatus.missing,
      pending: libStatus.pending,
      oldestPendingSince: libStatus.oldestPendingSince,
      unsubscribedSince: null,
      degraded: false,
      heals
    }
    if (status.state === 'open') {
      trackFirstSeen(notSubscribedSince, status.missing.concat(status.pending), at)
    } else {
      notSubscribedSince.clear()
    }
    const overdue = (since: number | null) => status.state === 'open' && since !== null && at - since >= graceMs
    const unsubscribedSince = oldest(notSubscribedSince)
    status.unsubscribedSince = unsubscribedSince
    status.degraded = overdue(oldest(notSubscribedSince, (id) => (healAttempts.get(id) ?? 0) < maxDegradedHeals))
    return { status, unhealthy: overdue(unsubscribedSince) }
  }

  const fallbackStatus = (): ConnectionStatus => ({
    at: now(),
    source: 'app',
    state: 'closed',
    since: null,
    wanted: wanted.length,
    missing: [],
    pending: [],
    oldestPendingSince: null,
    unsubscribedSince: null,
    degraded: false,
    heals: 0
  })

  const describeCounts = (status: ConnectionStatus) => `wanted ${status.wanted}, missing ${status.missing.length}, pending ${status.pending.length}`

  const recompute = (): ConnectionStatus | null => {
    try {
      const { status, unhealthy } = compute()
      const previous = lastStatus
      const previousUnhealthy = lastUnhealthy
      let healed = false
      let givenUp = 0
      if (!unhealthy) {
        heals = 0
        nextHealAt = 0
        lastHealAt = null
      } else {
        // A contract lost while another one is still refused is requested
        // after the grace period, not after the refused one's backoff
        if (status.degraded && !previous?.degraded) {
          heals = 0
          nextHealAt = 0
        }
        if (status.missing.length > 0 && status.at >= nextHealAt) {
          // Pending-only degradation (a slow server) isn't healed: requesting
          // a pending subscription again does nothing.
          requestHeal('degraded')
          heals++
          lastHealAt = status.at
          for (const id of status.missing) {
            const attempts = (healAttempts.get(id) ?? 0) + 1
            healAttempts.set(id, attempts)
            if (attempts === maxDegradedHeals) givenUp++
          }
          nextHealAt = status.at + Math.min(graceMs * 2 ** (heals - 1), maxHealDelay)
          healed = true
        }
      }
      if (status.state === 'open') {
        // Subscribed at last: a later loss counts toward `degraded` again
        keepHealAttempts(new Set(status.missing.concat(status.pending)))
      }
      status.heals = heals
      lastStatus = status
      lastUnhealthy = unhealthy

      // Counts only: these lines are written on every change, and while the
      // connection is down the lists hold every contract the user follows
      // (the exported logs count them too, see `exportedConnection`)
      if (previous?.state !== status.state) {
        console.info(`[connection] ${previous ? `${previous.state} -> ` : ''}${status.state} (${describeCounts(status)})`)
      }
      if (status.degraded && (!previous?.degraded || healed)) {
        const duration = Math.round((status.at - (status.unsubscribedSince ?? status.at)) / 1000)
        const counts = `${status.missing.length} missing, ${status.pending.length} pending for ${duration} s`
        if (!previous?.degraded) {
          console.info(`[connection] degraded: ${counts}${healed ? '; re-subscribing' : ''}`)
        } else {
          console.info(`[connection] still degraded: ${counts}; re-subscribing (attempt ${heals})`)
        }
      } else if (!unhealthy && previousUnhealthy && previous?.state === status.state) {
        console.info('[connection] subscriptions healthy again')
      }
      if (givenUp > 0) {
        console.info(`[connection] ${givenUp} subscription(s) still refused after ${maxDegradedHeals} attempts; no longer reported as degraded, still re-subscribing`)
      }

      // Broadcast when what the tabs show may change: the state, `degraded`,
      // and whether `since` is known (`closed` without it: no pubsub client
      // yet). The lists are only returned by queries.
      const key = [status.state, status.degraded, status.since === null].join('|')
      if (key !== lastEmitted) {
        lastEmitted = key
        // Guarded on its own, so that a failing broadcast doesn't prevent
        // reporting a heal right away (below)
        safely('emitting the connection status', () => emit(status), undefined)
      }

      // The re-subscription request changes the subscriptions right away
      if (healed) update()
      computeSucceeded()
      return status
    } catch (e) {
      computeFailed(e)
      return lastStatus
    }
  }

  // Coalesces bursts of events into a single recompute
  const update = () => {
    if (updateTimer !== null) return
    try {
      updateTimer = setTimeout(() => {
        updateTimer = null
        recompute()
      }, 0)
    } catch (e) {
      updateTimer = null
      console.warn('[connection] Error scheduling a status update', e)
    }
  }

  return {
    setWanted (ids: mixed) {
      wanted = Array.isArray(ids) ? Array.from(new Set(onlyStrings(ids))) : []
      keepHealAttempts(new Set(wanted))
      update()
    },
    update,
    // Called from the `open` handler. The library then requests the
    // subscriptions again, so the grace period and the backoff restart.
    onReconnected () {
      notSubscribedSince.clear()
      heals = 0
      nextHealAt = 0
      lastHealAt = null
      update()
    },
    // Called when a page restarts the reconnection cycle while the connection
    // is open (see `reconnectionPolicy.js`): the next recompute requests the
    // missing subscriptions right away rather than after the backoff, if one
    // has been missing for longer than the grace period. The re-subscription
    // requests made for each contract are kept, so that one the server keeps
    // refusing doesn't make the connection degraded again on every restart,
    // and so are the first-seen times, so that the grace period doesn't
    // restart either. A request less than a grace period after the last one
    // would give the server less time to answer than the back-off ever does:
    // quick restarts (tab switches) would spend in seconds the attempts that
    // stop a refused contract from being reported as degraded, hiding the
    // banner long before the back-off would have. The restart's request then
    // comes at the earliest time allowed instead, a grace period after the
    // last one.
    resetHealBackoff () {
      const earliest = lastHealAt === null ? 0 : lastHealAt + graceMs
      if (earliest > now()) {
        nextHealAt = Math.min(nextHealAt, earliest)
      } else {
        heals = 0
        nextHealAt = 0
      }
      update()
    },
    // For queries (`sw/connection/status`): no re-subscription, log line or
    // broadcast, which follow the service worker's own tick and pubsub events,
    // so that they don't depend on how many tabs are open
    getStatus (): ConnectionStatus {
      try {
        const { status } = compute()
        computeSucceeded()
        return status
      } catch (e) {
        computeFailed(e)
        return lastStatus ?? fallbackStatus()
      }
    },
    start () {
      if (interval !== null) return
      try {
        interval = setInterval(recompute, tickInterval)
      } catch (e) {
        interval = null
        console.warn('[connection] Error starting the connection monitor', e)
      }
      update()
    }
  }
}

// The custom handlers passed to `chelonia/connect`. They keep emitting the
// events older tabs rely on, except `ONLINE` on the browser's `online` event:
// the network being back doesn't mean the connection is.
export function createPubsubHandlers ({ monitor, emitEvent }: {|
  monitor: ConnectionMonitor,
  emitEvent: (name: string) => mixed
|}): { [name: string]: () => void } {
  // An exception in a pubsub handler makes the app re-create the connection
  const handler = (name: string, steps: Array<() => mixed>) => () => {
    for (const step of steps) {
      try {
        step()
      } catch (e) {
        console.error(`[connection] Error in the pubsub '${name}' handler`, e)
      }
    }
  }
  const notify = (event: string) => () => emitEvent(event)
  const update = () => monitor.update()
  return {
    offline: handler('offline', [notify(OFFLINE), update]),
    online: handler('online', [() => console.info('[connection] browser back online; waiting for the pubsub connection'), update]),
    'reconnection-attempt': handler('reconnection-attempt', [notify(RECONNECTING), update]),
    'reconnection-scheduled': handler('reconnection-scheduled', [update]),
    'reconnection-failed': handler('reconnection-failed', [notify(RECONNECTION_FAILED), update]),
    'reconnection-succeeded': handler('reconnection-succeeded', [
      notify(ONLINE),
      () => console.info('reconnected to pubsub!'),
      () => monitor.onReconnected()
    ]),
    close: handler('close', [update]),
    'subscription-succeeded': handler('subscription-succeeded', [update])
  }
}
