'use strict'

import { REQUEST_TYPE } from '@chelonia/lib/pubsub'
import { OFFLINE, ONLINE, RECONNECTING, RECONNECTION_FAILED } from '../../utils/events.js'
import type { Timers } from '../../utils/timers.js'
import { defaultTimers } from '../../utils/timers.js'
import { isSocketOpen } from './socket.js'

// Events added by okTurtles/libcheloniajs#125. They're referenced by name
// because `@chelonia/lib` 2.0.0 doesn't export them, and importing a name
// that a module doesn't export breaks the build.
export const LIB_PUBSUB_STATE_CHANGED = 'pubsub-state-changed'
export const LIB_PUBSUB_SUBSCRIPTION_FAILED = 'pubsub-subscription-failed'

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
  getStatus: () => ConnectionStatus,
  start: () => void
}

const CONNECTION_STATES: ConnectionState[] = ['connecting', 'open', 'reconnecting', 'offline', 'closed']

// The state of a `@chelonia/lib` pubsub client, computed from fields that
// exist since 2.0.0. Same rules as `computeState` in okTurtles/libcheloniajs#125.
export function deriveState (client: ?Object, isOnline: () => boolean): ConnectionState {
  if (!client) return 'closed'
  const { socket } = client
  if (socket) {
    if (isSocketOpen(socket)) return 'open'
    if (socket.readyState === (socket.CONNECTING ?? 0)) return 'connecting'
  }
  if (!client.shouldReconnect) return 'closed'
  if (isOnline() === false) return 'offline'
  if (client.nextConnectionAttemptDelayID != null || socket) return 'reconnecting'
  return 'closed'
}

// Wanted contracts the client is neither subscribed to nor subscribing to
// (`missing`), and those with a subscription request not yet acknowledged
// (`pending`).
const clientSubscriptions = (client: ?Object, wanted: string[]): { missing: string[], pending: string[] } => {
  if (!client) return { missing: wanted.slice(), pending: [] }
  const subscribed = client.subscriptionSet
  const pendingSubs = client.pendingOperations?.get?.(REQUEST_TYPE.SUB)
  const missing = []
  const pending = []
  for (const id of wanted) {
    if (pendingSubs?.has(id)) pending.push(id)
    else if (!subscribed?.has(id)) missing.push(id)
  }
  return { missing, pending }
}

const onlyStrings = (list: $ReadOnlyArray<mixed>): string[] => (list.filter(id => typeof id === 'string'): any)

// The answer of `chelonia/pubsub/status` (okTurtles/libcheloniajs#125), or
// `null` if it doesn't have the expected shape
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
//   - `getPubsub()`: the current pubsub client, if any.
//   - `getLibStatus()`: the library's own status (`chelonia/pubsub/status`),
//     or `null` when the library doesn't provide one. Used when available.
//   - `heal()`: requests the missing subscriptions (`chelonia/pubsub/update`).
//   - `emit(status)`: called when the status changes in a way that matters
//     for the UI.
// None of the methods throw: they're called from pubsub event handlers, where
// an exception makes the app re-create the connection.
export function createConnectionMonitor ({
  getPubsub,
  getLibStatus,
  isOnline,
  heal,
  emit,
  now = () => Date.now(),
  graceMs = CONNECTION_DEGRADED_GRACE,
  tickInterval = CONNECTION_TICK_INTERVAL,
  maxHealDelay = CONNECTION_MAX_HEAL_DELAY,
  maxDegradedHeals = CONNECTION_MAX_DEGRADED_HEALS,
  timers = defaultTimers
}: {
  getPubsub: () => ?Object,
  getLibStatus: () => mixed,
  isOnline: () => boolean,
  heal: () => mixed,
  emit: (status: ConnectionStatus) => mixed,
  now?: () => number,
  graceMs?: number,
  tickInterval?: number,
  maxHealDelay?: number,
  maxDegradedHeals?: number,
  timers?: Timers
}): ConnectionMonitor {
  let wanted: string[] = []
  // Used to compute `since` when the library doesn't provide a status
  let appClient: ?Object = null
  let appState: ConnectionState | null = null
  let appSince: number | null = null
  const pendingSince: Map<string, number> = new Map()
  // Wanted contracts not subscribed while the connection is open, and since
  // when. Cleared whenever the connection isn't open, so that the grace
  // period starts when it opens or when the contract becomes unsubscribed,
  // whichever is later.
  const notSubscribedSince: Map<string, number> = new Map()
  // Re-subscription requests made for each contract while it stayed
  // unsubscribed
  const healAttempts: Map<string, number> = new Map()
  let heals = 0
  let nextHealAt = 0
  let lastStatus: ConnectionStatus | null = null
  // Whether a wanted contract, counted toward `degraded` or not, was
  // unsubscribed for longer than the grace period at the last recompute
  let lastUnhealthy = false
  let lastEmitted: string | null = null
  let updateTimer: any = null
  let reconnectTimer: any = null
  let interval: any = null

  const safely = <T>(description: string, fn: () => T, fallback: T): T => {
    try {
      return fn()
    } catch (e) {
      console.warn(`[connection] Error ${description}`, e)
      return fallback
    }
  }

  const online = (): boolean => {
    try {
      return isOnline() !== false
    } catch (e) {
      return true
    }
  }

  const requestHeal = (reason: string) => {
    try {
      const result: any = heal()
      if (typeof result?.catch === 'function') {
        result.catch((e) => {
          console.warn(`[connection] Error requesting re-subscription (${reason})`, e)
        })
      }
    } catch (e) {
      console.warn(`[connection] Error requesting re-subscription (${reason})`, e)
    }
  }

  // Updates the first-seen bookkeeping only: no re-subscription, log line or
  // emit, and none of the state `recompute()` keeps
  const compute = (): { status: ConnectionStatus, client: ?Object, unhealthy: boolean } => {
    const at = now()
    const client = safely('getting the pubsub client', getPubsub, null)
    const libStatus = normalizeLibStatus(safely('getting the library connection status', getLibStatus, null))
    let status: ConnectionStatus
    if (libStatus) {
      status = {
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
    } else {
      const state = deriveState(client, online)
      if (!client) {
        appSince = null
      } else if (client !== appClient || state !== appState) {
        appSince = at
      }
      appClient = client
      appState = state
      const { missing, pending } = clientSubscriptions(client, wanted)
      // The 2.0.0 client marks subscribed contracts as pending again when the
      // socket closes; their requests are only re-sent once it re-opens
      if (state === 'open') trackFirstSeen(pendingSince, pending, at)
      else pendingSince.clear()
      status = {
        at,
        source: 'app',
        state,
        since: appSince,
        wanted: wanted.length,
        missing,
        pending,
        oldestPendingSince: oldest(pendingSince),
        unsubscribedSince: null,
        degraded: false,
        heals
      }
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
    return { status, client, unhealthy: overdue(unsubscribedSince) }
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

  const describe = (status: ConnectionStatus) => `wanted ${status.wanted}, missing ${status.missing.length}, pending ${status.pending.length}`

  const recompute = (): ConnectionStatus | null => {
    try {
      const { status, client, unhealthy } = compute()
      const previous = lastStatus
      const previousUnhealthy = lastUnhealthy
      let healed = false
      let givenUp = 0
      if (!unhealthy) {
        heals = 0
        nextHealAt = 0
      } else {
        // A contract lost while another one is still refused is requested
        // after the grace period, not after the refused one's backoff
        if (status.degraded && !previous?.degraded) {
          heals = 0
          nextHealAt = 0
        }
        if (status.missing.length > 0 && status.at >= nextHealAt && client) {
          // Pending-only degradation (a slow server) isn't healed: requesting
          // a pending subscription again does nothing.
          requestHeal('degraded')
          heals++
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
        const unsubscribed = new Set(status.missing.concat(status.pending))
        for (const id of Array.from(healAttempts.keys())) {
          if (!unsubscribed.has(id)) healAttempts.delete(id)
        }
      }
      status.heals = heals
      lastStatus = status
      lastUnhealthy = unhealthy

      // Counts only: these lines are written on every change, and contract
      // IDs are only exported with journals (AppLogs.vue)
      if (previous?.state !== status.state) {
        console.info(`[connection] ${previous ? `${previous.state} -> ` : ''}${status.state} (${describe(status)})`)
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

      const key = [status.state, status.degraded, status.wanted, status.missing.length, status.pending.length].join('|')
      if (key !== lastEmitted) {
        lastEmitted = key
        safely('emitting the connection status', () => emit(status), undefined)
      }

      // The re-subscription request changes the subscriptions right away
      if (healed) update()
      return status
    } catch (e) {
      console.warn('[connection] Error computing the connection status', e)
      return lastStatus
    }
  }

  // Coalesces bursts of events into a single recompute
  const update = () => {
    if (updateTimer !== null) return
    try {
      updateTimer = timers.setTimeout(() => {
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
      const current = new Set(wanted)
      for (const id of Array.from(healAttempts.keys())) {
        if (!current.has(id)) healAttempts.delete(id)
      }
      update()
    },
    update,
    // Stopgap until the library re-subscribes after reconnecting
    // (okTurtles/libcheloniajs#125): with 2.0.0, contracts whose subscription
    // was given up stay unsubscribed. Called from the `open` handler, before
    // the client re-sends its pending subscriptions, hence the timer: those
    // must be pending when `heal()` runs, or they'd be requested twice.
    onReconnected () {
      notSubscribedSince.clear()
      heals = 0
      nextHealAt = 0
      if (reconnectTimer === null) {
        try {
          reconnectTimer = timers.setTimeout(() => {
            reconnectTimer = null
            if (safely('getting the pubsub client', getPubsub, null)) {
              requestHeal('reconnected')
            }
            update()
          }, 0)
        } catch (e) {
          reconnectTimer = null
          console.warn('[connection] Error scheduling re-subscription', e)
        }
      }
      update()
    },
    // For queries (`sw/connection/status`): no re-subscription, log line or
    // broadcast, which follow the service worker's own tick and pubsub events,
    // so that they don't depend on how many tabs are open
    getStatus (): ConnectionStatus {
      try {
        return compute().status
      } catch (e) {
        console.warn('[connection] Error computing the connection status', e)
        return lastStatus ?? fallbackStatus()
      }
    },
    start () {
      if (interval !== null) return
      try {
        interval = timers.setInterval(recompute, tickInterval)
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
export function createPubsubHandlers ({ monitor, emitEvent }: {
  monitor: ConnectionMonitor,
  emitEvent: (name: string) => mixed
}): { [name: string]: () => void } {
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
