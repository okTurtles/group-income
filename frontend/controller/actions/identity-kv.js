'use strict'
import sbp from '@sbp/sbp'
import { KV_NOOP } from '@chelonia/lib'
import { KV_KEYS } from '~/frontend/utils/constants.js'
import { debounce, difference, intersection, union } from 'turtledash'
import { NAMESPACE_REGISTRATION, ONLINE } from '~/frontend/utils/events.js'

const initNotificationStatus = (data = {}) => ({ ...data, read: false })
// Name discrepancies between the KV store and `namespaceLookups` may occur
// due to being unsubcribed from an identity contract (e.g., someone has left
// a group) or due to the username being deleted. This function attempts to
// determine which case it is, and determine all of the names that are currently
// valid.
export const checkAndAugmentNames = async (currentNames: string[]): Promise<string[]> => {
  const ourNames = Object.keys(sbp('state/vuex/state').namespaceLookups || {})
  const unconflictedNames = intersection(currentNames, ourNames)
  // Batch the lookups to avoid too many concurrent requests
  const BATCH_SIZE = 10
  const namesToCheck = difference(union(currentNames, ourNames), unconflictedNames)
  const recheckedNames = []

  for (let i = 0; i < namesToCheck.length; i += BATCH_SIZE) {
    const batch = namesToCheck.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(batch.map(async (name) => {
      const value = await sbp('namespace/lookup', name, { skipCache: true }).catch(e => {
        console.warn(`[checkAndAugmentNames] Failed to lookup name ${name}:`, e)
      })
      return value ? name : null
    }))
    recheckedNames.push(...results.filter(v => !!v))
  }

  return union(unconflictedNames, recheckedNames)
}

const updateKVPreferences = (updater: Function) => {
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
// `defaultUpdater` (kv-slots.js). Use this for single-shape writes; use
// `updateKVPreferences` when the write needs to read `prev` (e.g. nested merges).
const setKVPreferences = (patch: Object) => {
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

sbp('okTurtles.events/on', ONLINE, () => {
  if (!sbp('state/vuex/state').loggedIn?.identityContractID) {
    return
  }
  sbp('gi.actions/identity/kv/load').catch(e => {
    console.error("Error from 'gi.actions/identity/kv/load' after reestablished connection:", e)
  })
})

export default (sbp('sbp/selectors/register', {
  'gi.actions/identity/kv/load': async () => {
    console.info('loading data from identity key-value store...')

    await sbp('gi.actions/identity/kv/loadCachedNames')

    console.info('identity key-value store data loaded!')
  },
  // Unread Messages.
  //
  // The `unreadMessages` slot (`gi.contracts/identity::unreadMessages`,
  // registered in `kv-slots.js`) owns subscription (`autoSubscribe`) and the
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
      updater: (prev = {}) => {
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
  'gi.actions/identity/kv/addNotificationStatus': (notification: Object) => {
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
    return sbp('chelonia/kv/update', {
      contractID: identityContractID,
      key: KV_KEYS.NOTIFICATIONS,
      updater: (currentData = {}) => {
        const notifications = sbp('chelonia/rootState').notifications.items
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
  // registered in `kv-slots.js`) owns the on-demand fetch (`autoLoad:
  // 'on-demand'`) and re-runs `checkAndAugmentNames` on every value change via
  // its `onUpdate` hook (replacing the post-fetch augmentation that used to
  // live here and the `NS_CACHE` branch of the `sw-primary.js` `KV_EVENT`
  // switch). The slot is `autoSubscribe: false` (never in the pubsub filter),
  // matching the original behavior. (KV-REVAMPED.md §4.8)
  'gi.actions/identity/kv/saveCachedNames': () => {
    const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to update cached names without an active session')
    }
    // Prune-on-write MUST validate the value the write actually races against:
    // the *server* value seen on each conflict retry. The declarative
    // `chelonia/kv/update` reducer cannot express this — it is synchronous and
    // re-runs against the server `prev` on a 409/412, but `checkAndAugmentNames`
    // is async and §3.3 forbids network calls in the reducer. A reducer that
    // pre-computes a validated set from the (possibly stale) local mirror would
    // silently drop valid server names another device added (this slot is
    // `autoSubscribe: false` + `autoLoad: 'on-demand'`, so the mirror is
    // routinely stale). We therefore keep the low-level `chelonia/kv/queuedSet`
    // + async `onconflict` for this one slot, re-validating the real server
    // value on every retry exactly as the pre-revamp code did, so a valid name
    // another device knows about is never clobbered.
    const onconflict = async ({ currentData = [], etag } = {}) => {
      if (!Array.isArray(currentData)) currentData = []
      // `checkAndAugmentNames` unions the server value with our local lookups
      // and re-verifies the conflicted names, dropping only those that no
      // longer resolve (left group / deleted username).
      const data = await checkAndAugmentNames(currentData)
      data.sort()
      const sortedCurrent = [...currentData].sort()
      // Skip the write when nothing changed.
      if (data.length === sortedCurrent.length && data.every((n, i) => n === sortedCurrent[i])) {
        return null
      }
      return [data, etag]
    }
    return sbp('chelonia/kv/queuedSet', {
      contractID: identityContractID,
      key: KV_KEYS.NS_CACHE,
      data: Object.keys(sbp('state/vuex/state').namespaceLookups || {}).sort(),
      onconflict
    })
  },
  'gi.actions/identity/kv/loadCachedNames': () => {
    const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to load cached names without an active session')
    }
    // Force a fetch of the on-demand slot; the refresh fires the slot's
    // `onUpdate` (reason 'load'), which runs `checkAndAugmentNames`.
    return sbp('chelonia/kv/sync', identityContractID, KV_KEYS.NS_CACHE)
  }
}): string[])

// Debounced so that `checkAndAugmentNames` (which may affect the names
// being stored) doesn't result in too many calls to saveCachedNames.
sbp('okTurtles.events/on', NAMESPACE_REGISTRATION, debounce(() => sbp('gi.actions/identity/kv/saveCachedNames'), 300))
