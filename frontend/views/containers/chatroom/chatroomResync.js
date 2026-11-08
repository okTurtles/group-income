'use strict'

// Safety net for chatrooms whose events may not be arriving over pubsub
// (issue #3176): the chatroom is force-synced over HTTP instead. Redundant,
// and harmless, once `@chelonia/lib` reconciles subscriptions and checks that
// published events are received.

// How long after it was published a sent message may stay unreceived
export const SENT_MESSAGE_CHECK_DELAY = 5 * 1000
// A request to a service worker that was terminated can stay unanswered
export const CONNECTION_STATUS_TIMEOUT = 10 * 1000

type Timers = {
  setTimeout: (fn: () => mixed, ms: number) => any,
  clearTimeout: (id: any) => void
}

// Wrapped, because browsers throw 'Illegal invocation' when these are called
// as methods of another object
const defaultTimers: Timers = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id)
}

// Whether a connection status (`sw/connection/status`) shows that the events
// of a chatroom may not be arriving although the connection is open: it isn't
// subscribed, or its subscription is pending for longer than the service
// worker's grace period (`degraded`). A chatroom that was just joined is
// pending for a moment, and Chelonia syncs it once subscribed.
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

const syncChatroom = (sync: (chatRoomID: string) => mixed, chatRoomID: string): Promise<void> =>
  Promise.resolve()
    .then(() => sync(chatRoomID))
    .then(() => undefined, (e) => {
      console.warn('[chatroomResync] Error re-syncing the chatroom', chatRoomID, e)
    })

// For a chatroom being opened. Resolves to whether a sync was made; never
// rejects. Does nothing if the status is unavailable (older service worker).
export function resyncChatroomIfUnsubscribed ({
  chatRoomID,
  getStatus,
  isJoined,
  sync,
  timeout = CONNECTION_STATUS_TIMEOUT,
  timers = defaultTimers
}: {
  chatRoomID: string,
  getStatus: () => mixed,
  isJoined: () => boolean,
  sync: (chatRoomID: string) => mixed,
  timeout?: number,
  timers?: Timers
}): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const timer = timers.setTimeout(() => reject(new Error('Timed out getting the connection status')), timeout)
    Promise.resolve()
      .then(getStatus)
      .then(resolve, reject)
      .finally(() => timers.clearTimeout(timer))
  }).then((status) => {
    if (!isChatroomUnsubscribed(status, chatRoomID) || !isJoined()) return false
    console.warn('[chatroomResync] The chatroom is not subscribed although connected; re-syncing it', chatRoomID)
    return syncChatroom(sync, chatRoomID).then(() => true)
  }).catch(() => false)
}

// For a message that was published at `height`: if, after `delay`, its event
// still hasn't been processed, the chatroom is synced. Returns a function
// that cancels the check.
export function checkSentMessageLater ({
  chatRoomID,
  height,
  getLatestHeight,
  isJoined,
  sync,
  delay = SENT_MESSAGE_CHECK_DELAY,
  timers = defaultTimers
}: {
  chatRoomID: string,
  height: number,
  getLatestHeight: () => mixed,
  isJoined: () => boolean,
  sync: (chatRoomID: string) => mixed,
  delay?: number,
  timers?: Timers
}): () => void {
  const timer = timers.setTimeout(() => {
    try {
      if (isHeightProcessed(getLatestHeight(), height) || !isJoined()) return
    } catch (e) {
      console.warn('[chatroomResync] Error checking a sent message', chatRoomID, e)
      return
    }
    console.warn(`[chatroomResync] A sent message (height ${height}) was not received ${delay / 1000} s after it was published; re-syncing the chatroom`, chatRoomID)
    syncChatroom(sync, chatRoomID)
  }, delay)
  return () => timers.clearTimeout(timer)
}
