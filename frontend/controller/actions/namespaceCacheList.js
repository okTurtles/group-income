'use strict'

// Keeps the `namespace-cache` KV list (the usernames this user's devices know)
// in sync, without re-checking names this device already knows.
//
// Each device keeps an "outbox" of edits it wants to make to the shared list:
//   - `add`:  names learned on this device
//   - `drop`: names found to be unregistered (`'unregistered'`) or to belong to
//             deleted accounts (`'deleted'`)
// A save applies the outbox to the last known server copy of the list; the
// list is never rewritten from this device's whole cache. This way, names that
// other devices removed aren't added back, and write conflicts are resolved
// without any lookups.
//
// The outbox is kept in Chelonia state so that it survives service worker
// restarts, logouts and logins on the same device.

export const NS_CACHE_OUTBOX = 'namespaceCacheOutbox'

type DropReason = 'unregistered' | 'deleted'

type ListState = { identityContractID: string, names: string[], etag: ?string }

const normalize = (names: mixed): string[] => {
  if (!Array.isArray(names)) return []
  const strings: string[] = []
  for (const name of names) {
    if (typeof name === 'string') strings.push(name)
  }
  return [...new Set(strings)].sort()
}

const sameList = (a: string[], b: string[]): boolean => a.length === b.length && a.every((name, i) => name === b[i])

export function createNamespaceCacheList ({
  getState,
  getConfig,
  resolve,
  lookup,
  isDeletedAccount,
  queue,
  write,
  onError = () => {},
  batchSize = 10
}: {
  // Chelonia root state (with `namespaceLookups`)
  getState: () => Object,
  getConfig: () => { reactiveSet: Function, reactiveDel: Function },
  // The server's answer for a name, without writing it into the cache
  resolve: (name: string) => Promise<?string>,
  // The server's answer for a name, written into the cache
  lookup: (name: string) => Promise<?string>,
  isDeletedAccount: (contractID: string) => Promise<boolean>,
  // Runs `fn` in the identity contract's queue
  queue: (identityContractID: string, fn: () => Promise<mixed>) => Promise<mixed>,
  write: (identityContractID: string, data: string[], options: { ifMatch?: string, onconflict: Function }) => Promise<?{ etag: ?string }>,
  onError?: (name: string, e: Error) => void,
  batchSize?: number
}): Object {
  // Last server copy of the list seen in this session
  let lastKnown: ?ListState = null
  // Incremented on reset; work started before a reset doesn't change state
  let generation = 0

  const localNames = (): string[] => Object.keys(getState().namespaceLookups || {})

  const outbox = (): { add: Object, drop: Object } => {
    const state = getState()
    if (!state[NS_CACHE_OUTBOX]) {
      // First use (including after upgrading from a version without an
      // outbox): make sure the list includes every name this device knows
      const add = Object.create(null)
      for (const name of localNames()) add[name] = true
      getConfig().reactiveSet(state, NS_CACHE_OUTBOX, { add, drop: Object.create(null) })
    }
    return state[NS_CACHE_OUTBOX]
  }

  const markAdded = (name: string) => {
    const { add, drop } = outbox()
    // Deleted accounts can't be registered again, so they're never re-added
    if (drop[name] === 'deleted') return
    const { reactiveSet, reactiveDel } = getConfig()
    if (drop[name]) reactiveDel(drop, name)
    if (!add[name]) reactiveSet(add, name, true)
  }

  const markDropped = (name: string, reason: DropReason) => {
    const { add, drop } = outbox()
    const { reactiveSet, reactiveDel } = getConfig()
    if (add[name]) reactiveDel(add, name)
    if (drop[name] !== 'deleted' && drop[name] !== reason) reactiveSet(drop, name, reason)
  }

  const applyOutbox = (serverNames: string[]): string[] => {
    const { add, drop } = outbox()
    return normalize([...serverNames, ...Object.keys(add)]).filter(name => !drop[name])
  }

  // Forget edits that the server copy now reflects. 'deleted' drops are kept:
  // deleted names can't be registered again, so they never come back.
  const settleOutbox = (serverNames: string[]) => {
    const { add, drop } = outbox()
    const { reactiveDel } = getConfig()
    const listed = new Set(serverNames)
    for (const name of Object.keys(add)) {
      if (listed.has(name)) reactiveDel(add, name)
    }
    for (const name of Object.keys(drop)) {
      if (drop[name] === 'unregistered' && !listed.has(name)) reactiveDel(drop, name)
    }
  }

  const recordServerState = (identityContractID: string, names: mixed, etag: ?string) => {
    lastKnown = { identityContractID, names: normalize(names), etag: etag ?? null }
  }

  // Looks up the names on the server list that this device doesn't know.
  // Names already in the local cache are trusted and never re-checked. Names
  // of deleted accounts are not added to the local cache.
  const verifyUnknownNames = async (serverNames: mixed): Promise<void> => {
    const startGeneration = generation
    const known = getState().namespaceLookups || {}
    const { drop } = outbox()
    const unknown = normalize(serverNames).filter(name => !known[name] && !drop[name])
    const active = () => startGeneration === generation
    for (let i = 0; i < unknown.length && active(); i += batchSize) {
      await Promise.all(unknown.slice(i, i + batchSize).map(async (name) => {
        try {
          if (!active() || getState().namespaceLookups?.[name]) return
          const value = await resolve(name)
          if (!active()) return
          if (!value) {
            markDropped(name, 'unregistered')
            return
          }
          const deleted = await isDeletedAccount(value)
          if (!active()) return
          if (deleted) {
            markDropped(name, 'deleted')
            return
          }
          await lookup(name)
        } catch (e) {
          // The name is kept and retried on the next load
          onError(name, e)
        }
      }))
    }
  }

  // Applies the outbox to the last known server copy and writes the result if
  // it differs. Does nothing until the list has been loaded in this session.
  const save = (identityContractID: string): Promise<mixed> => queue(identityContractID, async () => {
    const known = lastKnown
    if (!known || known.identityContractID !== identityContractID) return false
    const startGeneration = generation
    let written = applyOutbox(known.names)
    let etag = known.etag
    if (!sameList(written, known.names)) {
      const result = await write(identityContractID, written, {
        // With no list on the server yet, `undefined` means "create only"
        ifMatch: known.etag || undefined,
        onconflict: ({ currentData, etag: serverEtag }) => {
          if (startGeneration !== generation) return null
          // Reading `currentData` may throw (e.g., if it can't be decrypted);
          // the save then fails and the edits stay in the outbox
          const serverList = normalize(currentData)
          etag = serverEtag ?? null
          // If the list is missing on the server, recreate it from everything
          // this device knows
          written = applyOutbox(Array.isArray(currentData) ? serverList : localNames())
          return sameList(written, serverList) ? null : [written, serverEtag ?? undefined]
        }
      })
      if (result?.etag) etag = result.etag
    }
    if (startGeneration !== generation) return false
    recordServerState(identityContractID, written, etag)
    settleOutbox(written)
    return true
  })

  // The list doesn't exist on the server: create it from every name this
  // device knows.
  const createMissingList = async (identityContractID: string): Promise<mixed> => {
    await queue(identityContractID, () => {
      // A list cleared on the server (stored as `null`) still has a version
      // tag, which the load recorded. Keep it so that the write isn't sent as
      // "create only".
      const known = lastKnown
      const etag = known && known.identityContractID === identityContractID ? known.etag : null
      recordServerState(identityContractID, [], etag)
      for (const name of localNames()) markAdded(name)
      return Promise.resolve()
    })
    return save(identityContractID)
  }

  // An account was deleted: remove its names from the shared list (but not
  // from this device's cache). Returns the affected names.
  const markDeletedAccount = (contractID: string): string[] => {
    const cache = getState().namespaceLookups || {}
    const names = Object.keys(cache).filter(name => cache[name] === contractID)
    for (const name of names) markDropped(name, 'deleted')
    return names
  }

  return {
    recordServerState,
    verifyUnknownNames,
    markAdded,
    markDropped,
    markDeletedAccount,
    save,
    createMissingList,
    reset () {
      lastKnown = null
      generation++
    }
  }
}
