'use strict'

// How long the server's answer for a registered name is reused.
export const NAMESPACE_VERIFY_TTL = 5 * 60 * 1000
// How long a 'not registered' answer is reused. It goes stale as soon as the
// name is registered (possibly on another device), so it's only reused long
// enough to collapse a burst of lookups (e.g., while replaying a contract's
// history).
export const NAMESPACE_UNREGISTERED_TTL = 15 * 1000
// How long to wait for the server's answer before giving up.
export const NAMESPACE_REQUEST_TIMEOUT = 30 * 1000

// Shares and briefly reuses server answers for username lookups, so that
// repeated verification of the same name (e.g., while replaying a contract's
// history) results in a single network request.
//   - `fetchName(name, signal)` resolves to the contract ID, `null` if the
//     name isn't registered, or rejects on network / server errors. Requests
//     taking longer than `requestTimeout` are aborted (through `signal`) and
//     rejected. Rejections are never reused.
//   - `readCache(name)` reads the local cache.
//   - `project(name, value)` writes an answer into the local cache.
export function createNamespaceResolver ({
  fetchName,
  readCache,
  project,
  now = () => Date.now(),
  ttl = NAMESPACE_VERIFY_TTL,
  unregisteredTtl = NAMESPACE_UNREGISTERED_TTL,
  requestTimeout = NAMESPACE_REQUEST_TIMEOUT
}: {
  fetchName: (name: string, signal: AbortSignal) => Promise<string | null | undefined>,
  readCache: (name: string) => string | null | undefined,
  project: (name: string, value: string | null | undefined) => void,
  now?: () => number,
  ttl?: number,
  unregisteredTtl?: number,
  requestTimeout?: number
}): Record<string, any> {
  const entries: Map<string, Record<string, any>> = new Map()
  // Incremented by `reset()`. A lookup started before a reset still returns its
  // answer but doesn't write it into the (new) cache. Server answers aren't tied
  // to a session: lookups started after a reset may reuse a remembered answer
  // (pending, or settled for up to `ttl` / `unregisteredTtl`), and those do
  // write it into the cache.
  let generation = 0

  const isFresh = (entry: Record<string, any>) => !entry.settled ||
    now() - entry.at < (entry.value ? ttl : unregisteredTtl)

  // `fetchName`, limited to `requestTimeout`. On timeout the request is
  // aborted and the returned promise rejects.
  const fetchWithTimeout = (name: string): Promise<string | null | undefined> => {
    const controller = new AbortController()
    let timer
    const timedOut = new Promise<never>((resolve, reject) => {
      timer = setTimeout(() => {
        // Rejected before aborting, so that callers get this error rather
        // than the aborted request's
        reject(new Error(`Timed out looking up the name ${name}`))
        controller.abort()
      }, requestTimeout)
    })
    // The race also covers a `fetchName` that ignores the abort signal
    return Promise.race([
      Promise.resolve().then(() => fetchName(name, controller.signal)),
      timedOut
    ]).finally(() => clearTimeout(timer))
  }

  const start = (name: string): Record<string, any> => {
    for (const [key, entry] of entries) {
      if (!isFresh(entry)) entries.delete(key)
    }
    const entry: Record<string, any> = { settled: false, value: undefined, at: 0 }
    entry.promise = fetchWithTimeout(name).then((value) => {
      if (entries.get(name) === entry) {
        entry.settled = true
        entry.value = value
        entry.at = now()
      }
      return value
    }, (e) => {
      // Rejections (including timeouts) are never reused, so that the next
      // caller makes a new request
      if (entries.get(name) === entry) entries.delete(name)
      throw e
    })
    entries.set(name, entry)
    return entry
  }

  const entryFor = (name: string, forceRefresh: boolean): Record<string, any> => {
    const entry = entries.get(name)
    if (!forceRefresh && entry && isFresh(entry)) return entry
    return start(name)
  }

  return {
    // The server's answer, without touching the cache.
    resolve (name: string, { forceRefresh = false }: { forceRefresh?: boolean } = {}): Promise<string | null | undefined> {
      return entryFor(name, forceRefresh).promise
    },
    // The cached value unless `skipCache` or `forceRefresh` is set; otherwise
    // the server's answer, which is also written into the cache.
    lookup (name: string, { skipCache = false, forceRefresh = false }: { skipCache?: boolean, forceRefresh?: boolean } = {}): Promise<string | null | undefined> {
      if (!skipCache && !forceRefresh) {
        const cached = readCache(name)
        if (cached) return Promise.resolve(cached)
      }
      const callerGeneration = generation
      const entry = entryFor(name, forceRefresh)
      return entry.promise.then((value) => {
        // Answers superseded by a reset, a forced refresh or an invalidation
        // don't touch the cache
        if (callerGeneration === generation && entries.get(name) === entry) {
          project(name, value)
        }
        return value
      })
    },
    invalidate (name: string) {
      entries.delete(name)
    },
    reset () {
      generation++
    }
  }
}
