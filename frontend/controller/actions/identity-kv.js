'use strict'
import sbp from '@sbp/sbp'
import { ChelErrorInvalidMessageHeight } from '@chelonia/lib/errors'
import { GIErrorKVHeightAhead } from '@common/common.js'
import { KV_KEYS, KV_LOAD_STATUS } from '~/frontend/utils/constants.js'
import { cloneDeep, debounce, difference, intersection, union } from 'turtledash'
import { KV_QUEUE, NAMESPACE_REGISTRATION, NEW_PREFERENCES, NEW_UNREAD_MESSAGES, ONLINE, NEW_KV_LOAD_STATUS } from '~/frontend/utils/events.js'
import { isExpired } from '@model/notifications/utils.js'

const isHeightAheadError = (e: ?Object): boolean => {
  // Chelonia may rewrap the original error, so walk the cause chain instead of
  // only checking the top-level error. Matching on `name` as well as on the
  // constructor keeps this working when the error crosses a bundle boundary,
  // where `instanceof` fails because the class identity differs.
  for (let cur = e, i = 0; cur && i < 5; cur = cur.cause, i++) {
    if (cur instanceof ChelErrorInvalidMessageHeight) return true
    if (cur instanceof Error && cur.name === 'ChelErrorInvalidMessageHeight') return true
  }
  return false
}

// A KV value can be written by another device at a contract height that the
// local identity contract hasn't caught up to yet. Reading such a value throws
// `ChelErrorInvalidMessageHeight`, and writing while behind either gets
// discarded during conflict resolution (when the conflict handler can't parse
// the current value and gives up) or exhausts the retries in `chelonia/kv/set`.
// Recover by syncing the identity contract up to the server's height and
// retrying once; if it is still behind after that, throw `GIErrorKVHeightAhead`
// so callers know the value was neither read nor written.
const kvGetWithRecovery = async (contractID: string, key: string, attempt: number = 0): Promise<?Object> => {
  try {
    return await sbp('chelonia/kv/get', contractID, key)
  } catch (e) {
    if (!isHeightAheadError(e)) throw e
    if (attempt >= 1) {
      throw new GIErrorKVHeightAhead(e.message, { cause: e })
    }
    console.warn(`[identity-kv.js] '${key}' is ahead of the local identity contract; syncing before retrying`, e)
    await sbp('chelonia/contract/sync', contractID)
    return kvGetWithRecovery(contractID, key, attempt + 1)
  }
}

// Shared boundary for every identity KV write. Reading the current value first
// serves two purposes: it surfaces (and recovers from) the height-ahead state
// described above, and its result feeds the conflict handler so that the write
// is stamped with the current `etag`. Chelonia would otherwise perform this
// same read itself, so this doesn't add a round-trip; it only moves the read to
// where the recovery can happen.
const saveIdentityKV = async (contractID: string, key: string, { data, onconflict }: { data?: any, onconflict?: ?Function }): Promise<any> => {
  const currentValue = await kvGetWithRecovery(contractID, key)
  let ifMatch

  if (typeof onconflict === 'function') {
    // `currentData` is exposed as a lazy accessor to match how chelonia calls
    // conflict handlers: handlers that don't read it must not pay for (or fail
    // on) decoding the stored value. The clone keeps handlers that mutate it
    // in place from touching chelonia's cached copy.
    let cached
    let computed = false
    const resolved = await onconflict({
      contractID,
      key,
      failedData: data,
      status: currentValue ? 200 : 404,
      etag: currentValue?.etag,
      get currentData () {
        if (!computed) {
          computed = true
          cached = currentValue ? cloneDeep(currentValue.data) : undefined
        }
        return cached
      },
      currentValue
    })
    // A falsy result means the handler decided there is nothing to write.
    if (!resolved) return
    data = resolved[0]
    ifMatch = resolved[1]
  }

  try {
    return await sbp('chelonia/kv/queuedSet', { contractID, key, data, ifMatch, onconflict })
  } catch (e) {
    // Reachable when the contract falls behind again between the read above and
    // the write, or when chelonia exhausts its conflict retries.
    if (isHeightAheadError(e) || e?.name === 'ChelErrorKvMaxAttempts') {
      throw new GIErrorKVHeightAhead(e.message, { cause: e })
    }
    throw e
  }
}

const initNotificationStatus = (data = {}) => ({ ...data, read: false })
// Name discrepancies between the KV store and `namespaceLookups` may occur
// due to being unsubcribed from an identity contract (e.g., someone has left
// a group) or due to the username being deleted. This function attempts to
// determine which case it is, and determine all of the names that are currently
// valid.
const checkAndAugmentNames = async (currentNames: string[]) => {
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
  return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
    const getUpdatedPreferences = ({ etag, currentData: currentPreferences = {} } = {}) => {
      return [updater(currentPreferences), etag]
    }

    const data = getUpdatedPreferences()[0]
    await sbp('gi.actions/identity/kv/savePreferences', { data, onconflict: getUpdatedPreferences })
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
    sbp('okTurtles.events/emit', NEW_KV_LOAD_STATUS, { name: 'identity', status: KV_LOAD_STATUS.LOADING })

    // Each value is loaded independently: a single unreadable key must not stop
    // the others from loading. Incoming chat messages are buffered until this
    // store reports itself as loaded, so reporting it as loaded even after a
    // failure is preferable to leaving messages unprocessed indefinitely. Unread
    // messages are loaded first because that is the value the buffered messages
    // depend on.
    const loaders = [
      ['unread messages', 'gi.actions/identity/kv/loadChatRoomUnreadMessages'],
      ['preferences', 'gi.actions/identity/kv/loadPreferences'],
      ['notification status', 'gi.actions/identity/kv/loadNotificationStatus'],
      ['cached names', 'gi.actions/identity/kv/loadCachedNames']
    ]
    const failures = []

    for (const [name, selector] of loaders) {
      try {
        await sbp(selector)
      } catch (e) {
        failures.push(name)
        console.error(`[gi.actions/identity/kv/load] Error loading ${name}`, e)
      }
    }

    if (failures.length) {
      console.error(`identity key-value store loaded with errors (${failures.join(', ')}); some values may be stale until the next reconnection`)
    } else {
      console.info('identity key-value store data loaded!')
    }
    sbp('okTurtles.events/emit', NEW_KV_LOAD_STATUS, { name: 'identity', status: KV_LOAD_STATUS.LOADED })
  },
  // Unread Messages
  'gi.actions/identity/kv/fetchChatRoomUnreadMessages': async () => {
    // Using 'chelonia/rootState' here as 'state/vuex/state' is not available
    // in the SW, and because, even without a SW, 'loggedIn' is not yet there
    // in Vuex state when logging in
    const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to fetch chatroom unreadMessages without an active session')
    }
    return (await kvGetWithRecovery(identityContractID, KV_KEYS.UNREAD_MESSAGES))?.data || {}
  },
  'gi.actions/identity/kv/saveChatRoomUnreadMessages': ({ data, onconflict }: { data: Object, onconflict?: Function }) => {
    const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to update chatroom unreadMessages without an active session')
    }

    // NOTE: added the function `chelonia/kv/set` in identityContractID invocation queue in order to remove conflict error
    //       because it uses fields of the identity contract state including height, cek, csk
    //       this conflict error can cause the heisenbug mostly in Cypress
    //       https://okturtles.slack.com/archives/C0EH7P20Y/p1720053305870019?thread_ts=1720025185.746849&cid=C0EH7P20Y
    // Every caller that writes `unreadMessages` (initChatRoomUnreadMessages,
    // setChatRoomReadUntil, markAsUnread, addChatRoomUnreadMessage,
    // removeChatRoomUnreadMessage, deleteChatRoomUnreadMessages) goes through
    // `saveIdentityKV`, so they all recover uniformly from the identity contract
    // being behind the server.
    return saveIdentityKV(identityContractID, KV_KEYS.UNREAD_MESSAGES, { data, onconflict })
  },
  'gi.actions/identity/kv/loadChatRoomUnreadMessages': () => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const currentChatRoomUnreadMessages = await sbp('gi.actions/identity/kv/fetchChatRoomUnreadMessages')
      sbp('okTurtles.events/emit', NEW_UNREAD_MESSAGES, currentChatRoomUnreadMessages)
    })
  },
  'gi.actions/identity/kv/initChatRoomUnreadMessages': ({ contractID, messageHash, createdHeight }: {
    contractID: string, messageHash: string, createdHeight: number
  }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedUnreadMessages = ({ currentData = {}, etag } = {}) => {
        if (!currentData[contractID]) {
          return [{
            ...currentData,
            [contractID]: {
              readUntil: { messageHash, createdHeight },
              unreadMessages: []
            }
          }, etag]
        }
        return null
      }

      const data = getUpdatedUnreadMessages()?.[0]
      await sbp('gi.actions/identity/kv/saveChatRoomUnreadMessages', { data, onconflict: getUpdatedUnreadMessages })
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
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedUnreadMessages = ({ currentData = {}, etag } = {}) => {
        if (forceUpdate || currentData[contractID]?.readUntil.createdHeight < createdHeight) {
          const { unreadMessages } = currentData[contractID]
          return [{
            ...currentData,
            [contractID]: {
              readUntil: { messageHash, createdHeight },
              unreadMessages: unreadMessages.filter(msg => msg.createdHeight > createdHeight)
            }
          }, etag]
        }
        return null
      }

      await sbp('gi.actions/identity/kv/saveChatRoomUnreadMessages', { onconflict: getUpdatedUnreadMessages })
    })
  },
  'gi.actions/identity/kv/markAsUnread': ({ contractID, messageHash, createdHeight, unreadMessages }: {
    contractID: string,
    messageHash: string,
    createdHeight: number,
    unreadMessages: Array<{ messageHash: string, createdHeight: number }>
  }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedUnreadMessages = ({ currentData = {}, etag } = {}) => {
        const existingReadUntil = currentData[contractID]?.readUntil

        // If the requested mark-unread hash has already been set, ignore it.
        if (existingReadUntil &&
          existingReadUntil.isManuallyMarked &&
          existingReadUntil?.messageHash === messageHash) { return null }

        return [{
          ...currentData,
          [contractID]: {
            readUntil: { messageHash, createdHeight, isManuallyMarked: true },
            unreadMessages
          }
        }, etag]
      }

      await sbp('gi.actions/identity/kv/saveChatRoomUnreadMessages', { onconflict: getUpdatedUnreadMessages })
    })
  },
  'gi.actions/identity/kv/addChatRoomUnreadMessage': ({ contractID, messageHash, createdHeight }: {
    contractID: string, messageHash: string, createdHeight: number
  }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedUnreadMessages = ({ currentData = {}, etag } = {}) => {
        if (currentData[contractID]?.readUntil.createdHeight < createdHeight) {
          const index = currentData[contractID].unreadMessages.findIndex(msg => msg.messageHash === messageHash)
          if (index === -1) {
            currentData[contractID].unreadMessages.push({ messageHash, createdHeight })
            return [currentData, etag]
          }
        }
        return null
      }

      await sbp('gi.actions/identity/kv/saveChatRoomUnreadMessages', { onconflict: getUpdatedUnreadMessages })
    })
  },
  'gi.actions/identity/kv/removeChatRoomUnreadMessage': ({ contractID, messageHash }: {
    contractID: string, messageHash: string
  }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedUnreadMessages = ({ currentData = {}, etag } = {}) => {
        const index = currentData[contractID]?.unreadMessages.findIndex(msg => msg.messageHash === messageHash)
        // NOTE: index could be undefined if unreadMessages is not initialized
        if (Number.isInteger(index) && index >= 0) {
          currentData[contractID].unreadMessages.splice(index, 1)
          return [currentData, etag]
        }
        return null
      }

      await sbp('gi.actions/identity/kv/saveChatRoomUnreadMessages', { onconflict: getUpdatedUnreadMessages })
    })
  },
  'gi.actions/identity/kv/deleteChatRoomUnreadMessages': ({ contractID }: { contractID: string }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedUnreadMessages = ({ currentData = {}, etag } = {}) => {
        if (currentData[contractID]) {
          delete currentData[contractID]
          return [currentData, etag]
        }
        return null
      }

      await sbp('gi.actions/identity/kv/saveChatRoomUnreadMessages', { onconflict: getUpdatedUnreadMessages })
    })
  },
  // Preferences
  'gi.actions/identity/kv/fetchPreferences': async () => {
    const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to fetch preferences without an active session')
    }
    return (await sbp('chelonia/kv/get', identityContractID, KV_KEYS.PREFERENCES))?.data || {}
  },
  'gi.actions/identity/kv/savePreferences': ({ data, onconflict }: { data: Object, onconflict?: Function }) => {
    const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to update preferences without an active session')
    }

    return sbp('chelonia/kv/queuedSet', {
      contractID: identityContractID,
      key: KV_KEYS.PREFERENCES,
      data,
      onconflict
    })
  },
  'gi.actions/identity/kv/loadPreferences': () => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const preferences = await sbp('gi.actions/identity/kv/fetchPreferences')
      sbp('okTurtles.events/emit', NEW_PREFERENCES, preferences)
    })
  },
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
    return updateKVPreferences((currentPreferences) => ({ ...currentPreferences, [key]: value }))
  },
  // Notifications
  'gi.actions/identity/kv/fetchNotificationStatus': async () => {
    const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to fetch notification status without an active session')
    }
    return (await sbp('chelonia/kv/get', identityContractID, KV_KEYS.NOTIFICATIONS))?.data || {}
  },
  'gi.actions/identity/kv/saveNotificationStatus': ({ data, onconflict }: { data: Object, onconflict?: Function }) => {
    const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to update notification status without an active session')
    }

    const applyStorageRules = (notificationStatus) => {
      return Object.keys(notificationStatus).reduce((acc, hash) => {
        if (!isExpired(notificationStatus[hash])) {
          acc[hash] = notificationStatus[hash]
        }
        return acc
      }, {})
    }

    const updatedOnConflict = async (...args) => {
      const result = await (onconflict: Function)(...args)
      if (!result) return null

      const [data, etag] = result
      return [applyStorageRules(data), etag]
    }

    return sbp('chelonia/kv/queuedSet', {
      contractID: identityContractID,
      key: KV_KEYS.NOTIFICATIONS,
      data: !!data && applyStorageRules(data),
      onconflict: typeof onconflict === 'function' ? updatedOnConflict : null
    })
  },
  'gi.actions/identity/kv/loadNotificationStatus': () => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const status = await sbp('gi.actions/identity/kv/fetchNotificationStatus')
      sbp('gi.notifications/setNotificationStatus', status)
    })
  },
  'gi.actions/identity/kv/addNotificationStatus': (notification: Object) => {
    const { hash, timestamp } = notification
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedNotificationStatus = ({ currentData = {}, etag } = {}) => {
        if (!currentData?.[hash]) {
          return [{
            ...currentData,
            [hash]: initNotificationStatus({ timestamp })
          }, etag]
        }
        return null
      }

      const data = getUpdatedNotificationStatus()?.[0]
      await sbp('gi.actions/identity/kv/saveNotificationStatus', { data, onconflict: getUpdatedNotificationStatus })
    })
  },
  'gi.actions/identity/kv/markNotificationStatusRead': (hashes: string | string[]) => {
    if (typeof hashes === 'string') {
      hashes = [hashes]
    }
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const notifications = sbp('chelonia/rootState').notifications.items
      const getUpdatedNotificationStatus = ({ currentData = {}, etag } = {}) => {
        let isUpdated = false
        for (const hash of hashes) {
          const existing = notifications.find(n => n.hash === hash)
          if (!currentData[hash]) {
            currentData[hash] = initNotificationStatus({ timestamp: existing.timestamp })
          }

          const isUnRead = currentData[hash].read === false
          // NOTE: sometimes the value from KV store could be different from the one
          //       from client Vuex store when the device is offline or on bad network
          //       in this case, we need to allow users to force the notifications to be marked as read
          const isDifferent = currentData[hash].read !== existing.read
          if (isUnRead || isDifferent) {
            currentData[hash].read = true
            isUpdated = true
          }
        }
        return isUpdated ? [currentData, etag] : null
      }

      await sbp('gi.actions/identity/kv/saveNotificationStatus', { onconflict: getUpdatedNotificationStatus })
    })
  },
  // Namespace lookups
  'gi.actions/identity/kv/fetchCachedNames': async () => {
    const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to fetch cached names without an active session')
    }
    return (await sbp('chelonia/kv/get', identityContractID, KV_KEYS.NS_CACHE))?.data || []
  },
  'gi.actions/identity/kv/saveCachedNames': () => {
    const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to update cached names without an active session')
    }

    const onconflict = async ({ currentData = [], etag } = {}) => {
      if (!currentData) currentData = []
      const data = await checkAndAugmentNames(currentData)

      data.sort()
      currentData.sort()

      // If there's no difference, there's no point in sending an update
      if (data.length === currentData.length) {
        let i = 0
        for (; i < data.length; i++) {
          if (data[i] !== currentData[i]) break
        }
        // If `i` equals `data.length`, the loop has ended and all items matched
        if (i === data.length) return
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
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const currentData = await sbp('gi.actions/identity/kv/fetchCachedNames')

      // `checkAndAugmentNames` will handle updating the namespace cache as
      // necessary. The return value isn't needed.
      await checkAndAugmentNames(currentData || [])
    })
  }
}): string[])

// Debounced so that `checkAndAugmentNames` (which may affect the names
// being stored) doesn't result in too many calls to saveCachedNames.
sbp('okTurtles.events/on', NAMESPACE_REGISTRATION, debounce(() => sbp('gi.actions/identity/kv/saveCachedNames'), 300))
