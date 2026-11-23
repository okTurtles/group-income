'use strict'

// Safety net for a chatroom whose events may not be arriving over pubsub
// (issue #3176): when a chatroom is opened while the service worker reports
// it unsubscribed, it is synced over HTTP, so that the user sees the events
// that others published to it. `@chelonia/lib` re-subscribes on its own, but
// only after reconnecting and every minute. It also syncs a contract when an
// event published to it isn't received, so the user's own events need no
// check here.

import sbp from '@sbp/sbp'
import { CONNECTION_STATUS_TIMEOUT, isStatusUnavailableError, requestConnectionStatus } from '../../../controller/connectionStatus.ts'
import { CONNECTION_STATUS_SELECTOR } from '../../../utils/constants.ts'

// A chatroom being opened isn't synced again if a sync of it started less
// than this long ago and succeeded. The window counts from the start of the
// sync, since a sync fetches at least what was published before it started:
// a sync that took longer than this doesn't prevent the next one.
export const RECENT_SYNC_WINDOW = 2 * 1000

// A sync running for longer than this may never settle: a tab's call to the
// service worker never settles if the service worker is stopped while it
// answers. It is then no longer joined, and opening the chatroom syncs it
// again.
export const SHARED_SYNC_MAX_AGE = 30 * 1000

// Whether a connection status (`sw/connection/status`) shows that the events
// of a chatroom may not be arriving although the connection is open: it isn't
// subscribed, or its subscription is still pending while the connection is
// degraded, i.e., some wanted contract, not necessarily this one, has been
// unsubscribed for longer than the service worker's grace period (contracts
// the server keeps refusing don't count, see CONNECTION_MAX_DEGRADED_HEALS).
// A chatroom that was just joined is pending for a moment, and Chelonia syncs
// it once subscribed.
export const isChatroomUnsubscribed = (status: any, chatRoomID: string): boolean => {
  if (!status || typeof status !== 'object' || status.state !== 'open') return false
  const { missing, pending, degraded } = status
  if (Array.isArray(missing) && missing.includes(chatRoomID)) return true
  return degraded === true && Array.isArray(pending) && pending.includes(chatRoomID)
}

// The `getStatus`, `isJoined` and `sync` options below call the app's
// selectors by default. Tests pass their own functions, or their own selector
// dispatcher (`sbp`): they can't register these selectors, since other test
// files register some of them and lock the `chelonia` domain.
type CallSelector = (selector: string, ...args: any[]) => any

const defaultIsJoined = (callSelector: CallSelector, chatRoomID: string) => (): boolean =>
  callSelector('state/vuex/getters').isJoinedChatRoom(chatRoomID)

const defaultSync = (callSelector: CallSelector) => (chatRoomID: string): unknown =>
  callSelector('chelonia/contract/sync', chatRoomID)

// The syncs that `resyncChatroomIfUnsubscribed` made of a chatroom, so that
// opening it again doesn't sync it twice in a row: the running one, and when
// it and the last one that succeeded started (for SHARED_SYNC_MAX_AGE and
// RECENT_SYNC_WINDOW).
type ChatroomSync = {
  running: Promise<boolean> | null,
  runningAt: number,
  lastSucceededAt: number
}
type ChatroomSyncs = Map<string, ChatroomSync>
const chatroomSyncs: ChatroomSyncs = new Map()

// Never rejects; resolves to whether the sync succeeded
const syncChatroom = (
  sync: (chatRoomID: string) => unknown, chatRoomID: string, syncs: ChatroomSyncs, now: () => number
): Promise<boolean> => {
  const previous = syncs.get(chatRoomID)
  const startedAt = now()
  const running = Promise.resolve()
    .then(() => sync(chatRoomID))
    .then(() => {
      const entry = syncs.get(chatRoomID)
      if (entry && startedAt > entry.lastSucceededAt) entry.lastSucceededAt = startedAt
      return true
    }, (e) => {
      console.warn('[chatroomResync] Error re-syncing the chatroom', chatRoomID, e)
      return false
    })
    .finally(() => {
      const entry = syncs.get(chatRoomID)
      if (entry && entry.running === running) entry.running = null
    })
  syncs.set(chatRoomID, {
    running,
    runningAt: startedAt,
    lastSucceededAt: previous?.lastSucceededAt ?? -Infinity
  })
  return running
}

// The options (see `CallSelector`). Typed, so that a misspelled option in an
// object literal fails `tsc` instead of falling back to its default.
type ResyncOptions = {
  chatRoomID: string,
  sbp?: CallSelector,
  getStatus?: () => unknown,
  isJoined?: () => boolean,
  sync?: (chatRoomID: string) => unknown,
  timeout?: number,
  syncs?: ChatroomSyncs,
  now?: () => number
}

// For a chatroom being opened. Resolves to whether a sync made or joined by
// this call succeeded; never rejects. Does nothing if the status is
// unavailable (older service worker).
export function resyncChatroomIfUnsubscribed ({
  chatRoomID,
  sbp: callSelector = sbp,
  getStatus = () => callSelector(CONNECTION_STATUS_SELECTOR),
  isJoined = defaultIsJoined(callSelector, chatRoomID),
  sync = defaultSync(callSelector),
  timeout = CONNECTION_STATUS_TIMEOUT,
  syncs = chatroomSyncs,
  now = () => Date.now()
}: ResyncOptions): Promise<boolean> {
  return requestConnectionStatus({ getStatus, timeout }).then((status) => {
    if (!isChatroomUnsubscribed(status, chatRoomID) || !isJoined()) return false
    // A sync that is running (for less than SHARED_SYNC_MAX_AGE), or that
    // started less than RECENT_SYNC_WINDOW ago and succeeded, will do
    const entry = syncs.get(chatRoomID)
    const running = entry && now() - entry.runningAt < SHARED_SYNC_MAX_AGE ? entry.running : null
    if (running) return running
    if (entry && now() - entry.lastSucceededAt < RECENT_SYNC_WINDOW) return false
    console.warn('[chatroomResync] The chatroom is not subscribed although connected; re-syncing it', chatRoomID)
    return syncChatroom(sync, chatRoomID, syncs, now)
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
