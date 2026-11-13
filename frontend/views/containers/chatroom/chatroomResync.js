'use strict'

// Safety net for chatrooms whose events may not be arriving over pubsub
// (issue #3176): the chatroom is force-synced over HTTP instead. Redundant,
// and harmless, once `@chelonia/lib` reconciles subscriptions and checks that
// published events are received.

import sbp from '@sbp/sbp'
import { CONNECTION_STATUS_TIMEOUT, isStatusUnavailableError, requestConnectionStatus } from '../../../controller/connectionStatus.js'
import type { Timers } from '../../../utils/timers.js'
import { defaultTimers } from '../../../utils/timers.js'

// How long after it was published an event of the user may stay unreceived
export const PUBLISHED_EVENT_CHECK_DELAY = 5 * 1000

// A chatroom being opened isn't synced again if a sync of it started less
// than this long ago and succeeded. The window counts from the start of the
// sync, since a sync fetches at least what was published before it started:
// a sync that took longer than this doesn't prevent the next one.
export const RECENT_SYNC_WINDOW = 2 * 1000

// A sync running for longer than this may never settle: a tab's call to the
// service worker never settles if the service worker is stopped while it
// answers. It is then no longer joined or waited for, and the checks below
// sync on their own.
export const SHARED_SYNC_MAX_AGE = 30 * 1000

// Whether a connection status (`sw/connection/status`) shows that the events
// of a chatroom may not be arriving although the connection is open: it isn't
// subscribed, or its subscription is still pending while the connection is
// degraded, i.e., some wanted contract, not necessarily this one, has been
// unsubscribed for longer than the service worker's grace period (contracts
// the server keeps refusing don't count, see CONNECTION_MAX_DEGRADED_HEALS).
// A chatroom that was just joined is pending for a moment, and Chelonia syncs
// it once subscribed.
export const isChatroomUnsubscribed = (status: mixed, chatRoomID: string): boolean => {
  if (!status || typeof status !== 'object' || status.state !== 'open') return false
  const { missing, pending, degraded } = status
  if (Array.isArray(missing) && missing.includes(chatRoomID)) return true
  return degraded === true && Array.isArray(pending) && pending.includes(chatRoomID)
}

// Whether the event at `height` has been processed, given the height of the
// latest processed event of the contract
export const isHeightProcessed = (latestHeight: mixed, height: number): boolean =>
  typeof latestHeight === 'number' && latestHeight >= height

// The `getStatus`, `getLatestHeight`, `isJoined` and `sync` options below call
// the app's selectors by default. Tests pass their own functions, or their own
// selector dispatcher (`sbp`): they can't register these selectors, since
// other test files register some of them and lock the `chelonia` domain.
type CallSelector = (selector: string, ...args: any[]) => any

const defaultIsJoined = (callSelector: CallSelector, chatRoomID: string) => (): boolean =>
  callSelector('state/vuex/getters').isJoinedChatRoom(chatRoomID)

const defaultSync = (callSelector: CallSelector) => (chatRoomID: string): mixed =>
  callSelector('chelonia/contract/sync', chatRoomID)

// The syncs that the two checks below made of a chatroom, so that they don't
// sync it twice in a row: the running one, and when (in the order of
// `nextOrder`) it and the last one that succeeded started. Their start times
// are kept too: the running one's for SHARED_SYNC_MAX_AGE, and the last
// success's for RECENT_SYNC_WINDOW.
type ChatroomSync = {|
  running: Promise<void> | null,
  runningSince: number,
  runningAt: number,
  lastSucceededSince: number,
  lastSucceededAt: number
|}
type ChatroomSyncs = Map<string, ChatroomSync>
const chatroomSyncs: ChatroomSyncs = new Map()

// Orders the starts of syncs and the checks of published events. A check is
// made once its event was accepted by the server, so a sync that started
// after it has fetched the event. No clock is needed for that.
let order = 0
const nextOrder = (): number => ++order

// Never rejects
const syncChatroom = (
  sync: (chatRoomID: string) => mixed, chatRoomID: string, syncs: ChatroomSyncs, now: () => number
): Promise<void> => {
  const previous = syncs.get(chatRoomID)
  const startedSince = nextOrder()
  const startedAt = now()
  const running = Promise.resolve()
    .then(() => sync(chatRoomID))
    .then(() => {
      const entry = syncs.get(chatRoomID)
      if (entry && startedSince > entry.lastSucceededSince) {
        entry.lastSucceededSince = startedSince
        entry.lastSucceededAt = startedAt
      }
    }, (e) => {
      console.warn('[chatroomResync] Error re-syncing the chatroom', chatRoomID, e)
    })
    .finally(() => {
      const entry = syncs.get(chatRoomID)
      if (entry && entry.running === running) entry.running = null
    })
  syncs.set(chatRoomID, {
    running,
    runningSince: startedSince,
    runningAt: startedAt,
    lastSucceededSince: previous?.lastSucceededSince ?? 0,
    lastSucceededAt: previous?.lastSucceededAt ?? -Infinity
  })
  return running
}

// The options that both checks take (see `CallSelector`). Exact, so that a
// misspelled option fails Flow instead of falling back to its default.
type SyncOptions = {|
  sbp?: CallSelector,
  isJoined?: () => boolean,
  sync?: (chatRoomID: string) => mixed,
  timers?: Timers,
  syncs?: ChatroomSyncs,
  now?: () => number
|}

type ResyncOptions = {|
  ...SyncOptions,
  chatRoomID: string,
  getStatus?: () => mixed,
  timeout?: number
|}

// For a chatroom being opened. Resolves to whether the chatroom was synced,
// by a new sync or by one that was already running; never rejects. Does
// nothing if the status is unavailable (older service worker).
export function resyncChatroomIfUnsubscribed ({
  chatRoomID,
  sbp: callSelector = sbp,
  getStatus = () => callSelector('sw/connection/status'),
  isJoined = defaultIsJoined(callSelector, chatRoomID),
  sync = defaultSync(callSelector),
  timeout = CONNECTION_STATUS_TIMEOUT,
  timers = defaultTimers,
  syncs = chatroomSyncs,
  now = () => Date.now()
}: ResyncOptions): Promise<boolean> {
  return requestConnectionStatus({ getStatus, timeout, timers }).then((status) => {
    if (!isChatroomUnsubscribed(status, chatRoomID) || !isJoined()) return false
    // A sync that is running (for less than SHARED_SYNC_MAX_AGE), or that
    // started less than RECENT_SYNC_WINDOW ago and succeeded (e.g., the check
    // of a published event), will do
    const entry = syncs.get(chatRoomID)
    const running = entry && now() - entry.runningAt < SHARED_SYNC_MAX_AGE ? entry.running : null
    if (running) return running.then(() => true)
    if (entry && now() - entry.lastSucceededAt < RECENT_SYNC_WINDOW) return false
    console.warn('[chatroomResync] The chatroom is not subscribed although connected; re-syncing it', chatRoomID)
    return syncChatroom(sync, chatRoomID, syncs, now).then(() => true)
  }, (e) => {
    // A service worker older than `sw/connection/status` is expected
    if (!isStatusUnavailableError(e)) {
      console.warn('[chatroomResync] Could not get the connection status; not checking the chatroom subscription', chatRoomID, e)
    }
    return false
  }).catch((e) => {
    console.warn('[chatroomResync] Error checking the chatroom subscription', chatRoomID, e)
    return false
  })
}

type PublishedEventCheck = { height: number, cancel: () => void }

// The pending check of each chatroom (see `checkPublishedEventLater`)
const pendingPublishedEventChecks: Map<string, PublishedEventCheck> = new Map()

type PublishedEventCheckOptions = {|
  ...SyncOptions,
  getLatestHeight?: () => mixed,
  delay?: number,
  checks?: Map<string, PublishedEventCheck>
|}

// For an event that the user published to a chatroom at `height` (a message,
// an edit, a reaction, etc.), once the server accepted it: if, after `delay`,
// the chatroom's latest processed event is still older, the chatroom is
// synced, unless a sync of it that started after the check was made succeeds
// within SHARED_SYNC_MAX_AGE of its start.
// Checks are coalesced per chatroom, so that a burst of actions makes at most
// one sync and one warning: a check for a newer height replaces the pending
// one (an event at the newer height being processed implies the older ones
// were), and a check for an older or equal height is covered by the pending
// one. In the running app, a burst made one sync even before this: while the
// subscription is broken, each later publish conflicts, and Chelonia fetches
// the earlier events.
// Callers can't cancel a check, and don't need to: `isJoined()` is checked
// when the timer fires, and an event still missing after the user switched
// chatrooms should still be synced.
export function checkPublishedEventLater ({
  chatRoomID,
  height,
  sbp: callSelector = sbp,
  getLatestHeight = () => callSelector('state/vuex/state').contracts?.[chatRoomID]?.height,
  isJoined = defaultIsJoined(callSelector, chatRoomID),
  sync = defaultSync(callSelector),
  delay = PUBLISHED_EVENT_CHECK_DELAY,
  timers = defaultTimers,
  checks = pendingPublishedEventChecks,
  syncs = chatroomSyncs,
  now = () => Date.now()
}: {| ...PublishedEventCheckOptions, chatRoomID: string, height: number |}): void {
  const pending = checks.get(chatRoomID)
  if (pending && pending.height >= height) return
  pending?.cancel()
  const check: PublishedEventCheck = { height, cancel: () => {} }
  const since = nextOrder()
  // When the timer fires, and again after a running sync that it waits for
  const run = () => {
    try {
      if (isHeightProcessed(getLatestHeight(), height) || !isJoined()) return
    } catch (e) {
      console.warn('[chatroomResync] Error checking a published event', chatRoomID, e)
      return
    }
    // A sync that started since the check was made fetches the event, even
    // if this tab's copy of the state doesn't show it yet (e.g., the user
    // came back to the chatroom). Once one has succeeded, nothing is needed.
    // While one runs, its outcome is awaited, until it is SHARED_SYNC_MAX_AGE
    // old at most.
    const entry = syncs.get(chatRoomID)
    if (entry && entry.lastSucceededSince > since) return
    const age = entry ? now() - entry.runningAt : Infinity
    const running = entry && entry.runningSince > since && age < SHARED_SYNC_MAX_AGE ? entry.running : null
    if (running) {
      // Runs again once, when the sync settles or when it gets too old
      let waiting = true
      const again = () => {
        if (!waiting) return
        waiting = false
        timers.clearTimeout(limit)
        run()
      }
      const limit = timers.setTimeout(again, SHARED_SYNC_MAX_AGE - age)
      running.then(again)
      return
    }
    console.warn(`[chatroomResync] An event published at height ${height} was not received ${delay / 1000} s later; re-syncing the chatroom`, chatRoomID)
    syncChatroom(sync, chatRoomID, syncs, now)
  }
  const timer = timers.setTimeout(() => {
    if (checks.get(chatRoomID) === check) checks.delete(chatRoomID)
    run()
  }, delay)
  check.cancel = () => timers.clearTimeout(timer)
  checks.set(chatRoomID, check)
}

// The safety net for an event that a tab published to a chatroom: call it
// with the action's result once the action has resolved. That result is the
// event as the server accepted it, after any conflict resend. Every chatroom
// action that a tab publishes should call it, as ChatMain.vue's and the poll
// components' do. Chatroom events published from within the service worker
// (e.g., by `gi.actions/group/renameChatRoom`, or by contract side effects)
// aren't covered. Never throws.
export const checkPublishedEvent = (chatRoomID: string, message: mixed, options?: PublishedEventCheckOptions): void => {
  try {
    const height = typeof (message: any)?.height === 'function' ? (message: any).height() : undefined
    if (typeof height === 'number') checkPublishedEventLater({ ...options, chatRoomID, height })
  } catch (e) {
    console.warn('[chatroomResync] Error reading the height of a published event', chatRoomID, e)
  }
}
