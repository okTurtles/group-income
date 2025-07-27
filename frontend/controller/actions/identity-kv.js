'use strict'
import sbp from '@sbp/sbp'
import { KV_KEYS, KV_LOAD_STATUS } from '~/frontend/utils/constants.js'
import { debounce, difference, intersection, union } from 'turtledash'
import { KV_QUEUE, NAMESPACE_REGISTRATION, NEW_PREFERENCES, NEW_UNREAD_MESSAGES, ONLINE, NEW_KV_LOAD_STATUS } from '~/frontend/utils/events.js'
import { isExpired } from '@model/notifications/utils.js'

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

    await sbp('gi.actions/identity/kv/loadChatRoomUnreadMessages')
    await sbp('gi.actions/identity/kv/loadPreferences')
    await sbp('gi.actions/identity/kv/loadNotificationStatus')
    await sbp('gi.actions/identity/kv/loadCachedNames')

    console.info('identity key-value store data loaded!')
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
    return (await sbp('chelonia/kv/get', identityContractID, KV_KEYS.UNREAD_MESSAGES))?.data || {}
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
    return sbp('chelonia/kv/queuedSet', {
      contractID: identityContractID,
      key: KV_KEYS.UNREAD_MESSAGES,
      data,
      onconflict
    })
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
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedPreferences = ({ etag, currentData: currentPreferences = {} } = {}) => {
        const hideDistributionBanner = {
          ...(currentPreferences.hideDistributionBanner || {}),
          [contractID]: hidden
        }
        return [{ ...currentPreferences, hideDistributionBanner }, etag]
      }

      const data = getUpdatedPreferences()[0]
      await sbp('gi.actions/identity/kv/savePreferences', { data, onconflict: getUpdatedPreferences })
    })
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
