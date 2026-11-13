'use strict'

// The fields of a connection status (`ConnectionStatus`, see
// `controller/serviceworkers/connectionMonitor.js`) that hold no contract
// IDs, and the `error` that replaces a status that couldn't be obtained
const EXPORTED_KEYS = ['at', 'source', 'state', 'since', 'wanted', 'oldestPendingSince', 'unsubscribedSince', 'degraded', 'heals', 'error']
// The fields that list contract IDs. While the connection is down, they list
// every contract the user follows.
const COUNTED_KEYS = ['missing', 'pending']

// The connection status as written to the exported logs. Without journals
// (the opt-in for contract data), it holds no contract IDs: the lists are
// counted, and fields that aren't known to hold none are left out, since a
// newer service worker may add some. The logs can still name a few contracts,
// e.g. in the `@chelonia/lib` warnings about a failed subscription, and in the
// `[chatroomResync]` warnings about a chatroom that was checked or re-synced.
export const exportedConnection = (status: mixed, includeJournal: boolean): Object => {
  // An array's items aren't written: they could be contract IDs
  if (Array.isArray(status)) return { error: `Unexpected status: an array of ${status.length} item(s)` }
  if (!status || typeof status !== 'object') return { error: `Unexpected status: ${String(status)}` }
  if (includeJournal) return status
  const exported = {}
  for (const [key, value] of Object.entries(status)) {
    if (COUNTED_KEYS.includes(key)) {
      if (Array.isArray(value)) exported[key] = value.length
    } else if (EXPORTED_KEYS.includes(key)) {
      exported[key] = value
    }
  }
  return exported
}
