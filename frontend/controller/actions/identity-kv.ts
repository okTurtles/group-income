'use strict'
import sbp from '@sbp/sbp'
import { KV_NOOP } from '@chelonia/lib'
import { CHELONIA_RESET } from '@chelonia/lib/events'
import { KV_KEYS, KV_LOAD_STATUS } from '~/frontend/utils/constants.ts'
import { debounce } from 'turtledash'
import { NAMESPACE_REGISTRATION } from '~/frontend/utils/events.js'
import { createNamespaceCacheList, isContractDeletedError } from './namespaceCacheList.ts'
import type { NamespaceCacheList } from './namespaceCacheList.ts'

const initNotificationStatus = (data = {}) => ({ ...data, read: false })

// Whether an identity contract has been deleted. Contracts this device has
// synced are checked locally; others are checked with the server.
const isDeletedAccount = async (contractID: string): Promise<boolean> => {
  const meta = sbp('chelonia/rootState').contracts?.[contractID]
  // Tombstone: this device saw the contract being deleted
  if (meta === null) return true
  if (meta?.type) return false
  try {
    await sbp('chelonia/out/latestHEADInfo', contractID)
    return false
  } catch (e) {
    if (isContractDeletedError(e)) return true
    // Including 404: the name is checked again on the next load
    throw e
  }
}

// The `namespace-cache` KV list: the usernames known to this user's devices,
// so that a new device can show them. See `namespaceCacheList.ts`.
export const namespaceCacheList: NamespaceCacheList = createNamespaceCacheList({
  getState: () => sbp('chelonia/rootState'),
  getConfig: () => sbp('chelonia/config'),
  resolve: (name) => sbp('namespace/resolve', name),
  lookup: (name) => sbp('namespace/lookup', name, { skipCache: true }),
  isDeletedAccount,
  queue: (contractID, fn) => sbp('chelonia/queueInvocation', contractID, fn),
  write: (contractID, data, { ifMatch, onconflict }) => sbp('chelonia/kv/set', contractID, KV_KEYS.NS_CACHE, data, {
    ifMatch,
    encryptionKeyId: sbp('chelonia/contract/currentKeyIdByName', contractID, 'cek'),
    signingKeyId: sbp('chelonia/contract/currentKeyIdByName', contractID, 'csk'),
    onconflict
  }),
  onError: (name, e) => {
    console.warn(`[namespace-cache] Failed to verify name ${name}; will retry on the next load:`, e)
  }
})

export const scheduleSaveCachedNames = debounce(() => {
  if (!sbp('state/vuex/state').loggedIn?.identityContractID) return
  Promise.resolve().then(() => sbp('gi.actions/identity/kv/saveCachedNames')).catch((e) => {
    console.error('[saveCachedNames] Error saving cached names', e)
  })
}, 300)

// Called when an identity contract we're subscribed to has been deleted. Its
// names stay in this device's cache (so that, e.g., chat history keeps
// showing them) but are removed from the shared list, so that devices that
// never saw the account don't learn them.
export const forgetDeletedAccountNames = (contractID: string) => {
  if (!sbp('state/vuex/state').loggedIn?.identityContractID) return
  if (namespaceCacheList.markDeletedAccount(contractID).length) {
    scheduleSaveCachedNames()
  }
}

sbp('okTurtles.events/on', CHELONIA_RESET, () => {
  scheduleSaveCachedNames.clear()
  namespaceCacheList.reset()
})

// Only emitted when the cache actually changes
sbp('okTurtles.events/on', NAMESPACE_REGISTRATION, ({ name, value, deletedValue }) => {
  if (!sbp('state/vuex/state').loggedIn?.identityContractID) return
  if (value) {
    namespaceCacheList.markAdded(name)
  } else if (deletedValue) {
    namespaceCacheList.markDropped(name, 'unregistered')
  }
  scheduleSaveCachedNames()
})

// Uses the explicit `updater` form (not the slot's `defaultUpdater` via
// `value`) because callers like `updateDistributionBannerVisibility` merge into
// a nested subkey (`hideDistributionBanner[contractID]`). The slot's
// `defaultUpdater` is a top-level shallow merge and cannot read `prev`, so a
// nested write would have to pre-compute the patch from the local mirror —
// which goes stale on a 409/412 retry and would clobber a concurrent write
// from another device. Reading `prev` inside the reducer is the only correct
// way to merge into a nested subkey. (KV-REVAMPED.md §4.1)
const updateKVPreferences = (updater: Fn) => {
  const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
  if (!identityContractID) {
    throw new Error('Unable to update preferences without an active session')
  }
  return sbp('chelonia/kv/update', {
    contractID: identityContractID,
    key: KV_KEYS.PREFERENCES,
    updater
  })
}

// Shallow-merge `patch` over the current preferences via the slot's
// `defaultUpdater` (kv-slots.ts). Use this for single-shape writes; use
// `updateKVPreferences` when the write needs to read `prev` (e.g. nested merges).
const setKVPreferences = (patch: Record<string, any>) => {
  const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
  if (!identityContractID) {
    throw new Error('Unable to update preferences without an active session')
  }
  return sbp('chelonia/kv/update', {
    contractID: identityContractID,
    key: KV_KEYS.PREFERENCES,
    value: patch
  })
}

export default (sbp('sbp/selectors/register', {
  'gi.actions/identity/kv/load': async () => {
    console.info('loading data from identity key-value store...')

    await sbp('gi.actions/identity/kv/loadCachedNames')

    console.info('identity key-value store data loaded!')
  },
  // Unread Messages.
  //
  // The `unreadMessages` slot (`gi.contracts/identity::unreadMessages`,
  // registered in `kv-slots.ts`) owns subscription (`autoSubscribe`) and the
  // initial fetch (`autoLoad: 'on-sync'`). The
  // selectors below are thin shims kept for backward compatibility — contract
  // sideEffects call `initChatRoomUnreadMessages` and
  // `deleteChatRoomUnreadMessages`, so their names/signatures MUST NOT change
  // (Calls-From-Contracts.md). Each delegates to `chelonia/kv/update` with a
  // pure reducer; the library serializes writes per-contract and retries
  // conflicts, replacing the old `KV_QUEUE` + `queuedSet`/`onconflict`
  // plumbing. Reducers return `KV_NOOP` to skip a write. (KV-REVAMPED.md §8)
  'gi.actions/identity/kv/initChatRoomUnreadMessages': ({ contractID, messageHash, createdHeight }: {
    contractID: string, messageHash: string, createdHeight: number
  }) => {
    const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to update chatroom unreadMessages without an active session')
    }
    return sbp('chelonia/kv/update', {
      contractID: identityContractID,
      key: KV_KEYS.UNREAD_MESSAGES,
      updater: (prev = {}) => {
        if (prev[contractID]) return KV_NOOP
        return {
          ...prev,
          [contractID]: { readUntil: { messageHash, createdHeight }, unreadMessages: [] }
        }
      }
    })
  },
  'gi.actions/identity/kv/setChatRoomReadUntil': ({ contractID, messageHash, createdHeight, forceUpdate = false }: {
    contractID: string,
    messageHash: string,
    createdHeight: number,
    // In a rare case, such as when the latest message is deleted,
    // the 'readUntil' value needs to be set to the msg with lower 'createdHeight'.
    // 'forceUpdate' flag is used to override the 'createdHeight' check below to allow this kind of update.
    // (reference: https://github.com/okTurtles/group-income/issues/2729)
    forceUpdate: boolean
  }) => {
    const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to update chatroom unreadMessages without an active session')
    }
    return sbp('chelonia/kv/update', {
      contractID: identityContractID,
      key: KV_KEYS.UNREAD_MESSAGES,
      updater: (prev = {}) => {
        const entry = prev[contractID]
        if (!forceUpdate && !(entry?.readUntil.createdHeight < createdHeight)) return KV_NOOP
        return {
          ...prev,
          [contractID]: {
            readUntil: { messageHash, createdHeight },
            unreadMessages: (entry?.unreadMessages ?? []).filter(msg => msg.createdHeight > createdHeight)
          }
        }
      }
    })
  },
  'gi.actions/identity/kv/markAsUnread': ({ contractID, messageHash, createdHeight, unreadMessages }: {
    contractID: string,
    messageHash: string,
    createdHeight: number,
    unreadMessages: Array<{ messageHash: string, createdHeight: number }>
  }) => {
    const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to update chatroom unreadMessages without an active session')
    }
    return sbp('chelonia/kv/update', {
      contractID: identityContractID,
      key: KV_KEYS.UNREAD_MESSAGES,
      updater: (prev = {}) => {
        const existingReadUntil = prev[contractID]?.readUntil
        // If the requested mark-unread hash has already been set, ignore it.
        if (existingReadUntil &&
          existingReadUntil.isManuallyMarked &&
          existingReadUntil.messageHash === messageHash) { return KV_NOOP }
        return {
          ...prev,
          [contractID]: {
            readUntil: { messageHash, createdHeight, isManuallyMarked: true },
            unreadMessages
          }
        }
      }
    })
  },
  'gi.actions/identity/kv/addChatRoomUnreadMessage': ({ contractID, messageHash, createdHeight }: {
    contractID: string, messageHash: string, createdHeight: number
  }) => {
    const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to update chatroom unreadMessages without an active session')
    }
    return sbp('chelonia/kv/update', {
      contractID: identityContractID,
      key: KV_KEYS.UNREAD_MESSAGES,
      updater: (prev = {}) => {
        const entry = prev[contractID]
        if (!(entry?.readUntil.createdHeight < createdHeight)) return KV_NOOP
        if (entry.unreadMessages.some(msg => msg.messageHash === messageHash)) return KV_NOOP
        return {
          ...prev,
          [contractID]: { ...entry, unreadMessages: [...entry.unreadMessages, { messageHash, createdHeight }] }
        }
      }
    })
  },
  'gi.actions/identity/kv/removeChatRoomUnreadMessage': ({ contractID, messageHash }: {
    contractID: string, messageHash: string
  }) => {
    const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to update chatroom unreadMessages without an active session')
    }
    return sbp('chelonia/kv/update', {
      contractID: identityContractID,
      key: KV_KEYS.UNREAD_MESSAGES,
      updater: (prev = {}) => {
        const entry = prev[contractID]
        // NOTE: entry could be undefined if unreadMessages is not initialized
        if (!entry?.unreadMessages.some(msg => msg.messageHash === messageHash)) return KV_NOOP
        return {
          ...prev,
          [contractID]: { ...entry, unreadMessages: entry.unreadMessages.filter(msg => msg.messageHash !== messageHash) }
        }
      }
    })
  },
  'gi.actions/identity/kv/deleteChatRoomUnreadMessages': ({ contractID }: { contractID: string }) => {
    const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to update chatroom unreadMessages without an active session')
    }
    return sbp('chelonia/kv/update', {
      contractID: identityContractID,
      key: KV_KEYS.UNREAD_MESSAGES,
      updater: (prev: any = {}) => {
        if (!(contractID in prev)) return KV_NOOP
        const { [contractID]: _gone, ...rest } = prev
        return rest
      }
    })
  },
  // Preferences
  'gi.actions/identity/kv/updateDistributionBannerVisibility': ({ contractID, hidden }: { contractID: string, hidden: boolean }) => {
    return updateKVPreferences((currentPreferences) => {
      const hideDistributionBanner = {
        ...(currentPreferences.hideDistributionBanner || {}),
        [contractID]: hidden
      }
      return { ...currentPreferences, hideDistributionBanner }
    })
  },
  'gi.actions/identity/kv/updatePreference': ({ key, value }: { key: string, value: any }) => {
    return setKVPreferences({ [key]: value })
  },
  // Notifications
  'gi.actions/identity/kv/addNotificationStatus': (notification: Record<string, any>) => {
    const { hash, timestamp } = notification
    const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to update notification status without an active session')
    }
    return sbp('chelonia/kv/update', {
      contractID: identityContractID,
      key: KV_KEYS.NOTIFICATIONS,
      // Add this notification's status only if it isn't already tracked; the
      // reducer is re-run on conflict retries, so a concurrent write that
      // added the same hash collapses to a no-op (KV-REVAMPED.md §3.3).
      updater: (currentData = {}) => {
        if (currentData[hash]) return KV_NOOP
        return { ...currentData, [hash]: initNotificationStatus({ timestamp }) }
      }
    })
  },
  'gi.actions/identity/kv/markNotificationStatusRead': (hashes: string | string[]) => {
    if (typeof hashes === 'string') {
      hashes = [hashes]
    }
    const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to update notification status without an active session')
    }
    // Capture the client-side notification list once outside the reducer so
    // conflict-retry invocations read a stable snapshot (KV-REVAMPED.md §3.3).
    const notifications = sbp('chelonia/rootState').notifications.items
    return sbp('chelonia/kv/update', {
      contractID: identityContractID,
      key: KV_KEYS.NOTIFICATIONS,
      updater: (currentData = {}) => {
        const next = { ...currentData }
        let isUpdated = false
        for (const hash of hashes) {
          const existing = notifications.find(n => n.hash === hash)
          if (!existing) continue
          if (!next[hash]) {
            next[hash] = initNotificationStatus({ timestamp: existing.timestamp })
          } else {
            next[hash] = { ...next[hash] }
          }

          const isUnRead = next[hash].read === false
          // NOTE: sometimes the value from KV store could be different from the one
          //       from client Vuex store when the device is offline or on bad network
          //       in this case, we need to allow users to force the notifications to be marked as read
          const isDifferent = next[hash].read !== existing.read
          if (isUnRead || isDifferent) {
            next[hash].read = true
            isUpdated = true
          }
        }
        return isUpdated ? next : KV_NOOP
      }
    })
  },
  // Namespace lookups
  //
  // The `namespace-cache` slot (`gi.contracts/identity::namespace-cache`,
  // registered in `kv-slots.ts`) owns the on-demand fetch (`autoLoad:
  // 'on-demand'`); its `onUpdate` hook records the server copy of the list and
  // looks up the names this device doesn't know yet. The slot is
  // `autoSubscribe: false` (never in the pubsub filter), matching the original
  // behavior. (KV-REVAMPED.md §4.8)
  //
  // Writes use the low-level `chelonia/kv/set` (see `namespaceCacheList.ts`):
  // they apply this device's pending edits to the last known server copy, send
  // its version tag, skip unchanged writes and merge conflicts without
  // lookups. The declarative `chelonia/kv/update` can't be used because
  // looking up unknown names is async (and §3.3 forbids network calls in the
  // reducer).
  'gi.actions/identity/kv/saveCachedNames': () => {
    const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to update cached names without an active session')
    }
    return namespaceCacheList.save(identityContractID)
  },
  'gi.actions/identity/kv/loadCachedNames': async () => {
    const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to load cached names without an active session')
    }
    // Force a fetch of the on-demand slot; a successful load fires the slot's
    // `onUpdate` (reason 'load'), which handles the loaded list.
    await sbp('chelonia/kv/sync', identityContractID, KV_KEYS.NS_CACHE)
    // On a 404 (key never written or deleted server-side) the slot settles to
    // 'non-init' (the lib only invokes `onUpdate` on a 404 when the slot
    // previously held a value). Create the list from every name this device
    // knows.
    if (sbp('chelonia/kv/status', identityContractID, KV_KEYS.NS_CACHE) === KV_LOAD_STATUS.NON_INIT) {
      await namespaceCacheList.createMissingList(identityContractID)
    }
  }
}) as string[])
