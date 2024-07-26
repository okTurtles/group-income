'use strict'
import sbp from '@sbp/sbp'
import { KV_KEYS } from '~/frontend/utils/constants.js'
import { KV_QUEUE, ONLINE } from '~/frontend/utils/events.js'
import { isExpired } from '@model/notifications/utils.js'

const initNotificationStatus = (data = {}) => ({ ...data, read: false })

sbp('okTurtles.events/on', ONLINE, () => {
  sbp('gi.actions/identity/kv/load').catch(e => {
    console.error("Error from 'gi.actions/identity/kv/load' after reestablished connection:", e)
  })
})

export default (sbp('sbp/selectors/register', {
  'gi.actions/identity/kv/load': async () => {
    console.info('loading data from identity key-value store...')
    await sbp('gi.actions/identity/kv/loadChatRoomUnreadMessages')
    await sbp('gi.actions/identity/kv/loadPreferences')
    await sbp('gi.actions/identity/kv/loadNotificationStatus')
    console.info('identity key-value store data loaded!')
  },
  // Unread Messages
  'gi.actions/identity/kv/fetchChatRoomUnreadMessages': async () => {
    // Using 'chelonia/rootState' here as 'state/vuex/state' is not available
    // in the SW, and because, even without a SW, 'loggedIn' is not yet there
    // in Vuex state when logging in
    const identityContractID = sbp('chelonia/rootState').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to fetch chatroom unreadMessages without an active session')
    }
    return (await sbp('chelonia/kv/get', identityContractID, KV_KEYS.UNREAD_MESSAGES))?.data || {}
  },
  'gi.actions/identity/kv/saveChatRoomUnreadMessages': ({ data, onconflict }: { data: Object, onconflict?: Function }) => {
    const identityContractID = sbp('chelonia/rootState').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to update chatroom unreadMessages without an active session')
    }

    // NOTE: added the function `chelonia/kv/set` in identityContractID invocation queue in order to remove conflict error
    //       because it uses fields of the identity contract state including height, cek, csk
    //       this conflict error can cause the heisenbug mostly in Cypress
    //       https://okturtles.slack.com/archives/C0EH7P20Y/p1720053305870019?thread_ts=1720025185.746849&cid=C0EH7P20Y
    return sbp('chelonia/queueInvocation', identityContractID, () => {
      return sbp('chelonia/kv/set', identityContractID, KV_KEYS.UNREAD_MESSAGES, data, {
        encryptionKeyId: sbp('chelonia/contract/currentKeyIdByName', identityContractID, 'cek'),
        signingKeyId: sbp('chelonia/contract/currentKeyIdByName', identityContractID, 'csk'),
        onconflict
      })
    })
  },
  'gi.actions/identity/kv/loadChatRoomUnreadMessages': () => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const currentChatRoomUnreadMessages = await sbp('gi.actions/identity/kv/fetchChatRoomUnreadMessages')
      // TODO: Can't use state/vuex/commit
      sbp('state/vuex/commit', 'setUnreadMessages', currentChatRoomUnreadMessages)
    })
  },
  'gi.actions/identity/kv/initChatRoomUnreadMessages': ({ contractID, messageHash, createdHeight }: {
    contractID: string, messageHash: string, createdHeight: number
  }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedUnreadMessages = async () => {
        const currentData = await sbp('gi.actions/identity/kv/fetchChatRoomUnreadMessages')

        if (!currentData[contractID]) {
          return {
            ...currentData,
            [contractID]: {
              readUntil: { messageHash, createdHeight },
              unreadMessages: []
            }
          }
        }
        return null
      }

      const data = await getUpdatedUnreadMessages()
      if (data) {
        await sbp('gi.actions/identity/kv/saveChatRoomUnreadMessages', { data, onconflict: getUpdatedUnreadMessages })
      }
    })
  },
  'gi.actions/identity/kv/setChatRoomReadUntil': ({ contractID, messageHash, createdHeight }: {
    contractID: string, messageHash: string, createdHeight: number
  }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedUnreadMessages = async () => {
        const currentData = await sbp('gi.actions/identity/kv/fetchChatRoomUnreadMessages')

        if (currentData[contractID]?.readUntil.createdHeight < createdHeight) {
          const { unreadMessages } = currentData[contractID]
          return {
            ...currentData,
            [contractID]: {
              readUntil: { messageHash, createdHeight },
              unreadMessages: unreadMessages.filter(msg => msg.createdHeight > createdHeight)
            }
          }
        }
        return null
      }

      const data = await getUpdatedUnreadMessages()
      if (data) {
        await sbp('gi.actions/identity/kv/saveChatRoomUnreadMessages', { data, onconflict: getUpdatedUnreadMessages })
      }
    })
  },
  'gi.actions/identity/kv/addChatRoomUnreadMessage': ({ contractID, messageHash, createdHeight }: {
    contractID: string, messageHash: string, createdHeight: number
  }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedUnreadMessages = async () => {
        const currentData = await sbp('gi.actions/identity/kv/fetchChatRoomUnreadMessages')

        if (currentData[contractID]?.readUntil.createdHeight < createdHeight) {
          const index = currentData[contractID].unreadMessages.findIndex(msg => msg.messageHash === messageHash)
          if (index === -1) {
            currentData[contractID].unreadMessages.push({ messageHash, createdHeight })
            return currentData
          }
        }
        return null
      }

      const data = await getUpdatedUnreadMessages()
      if (data) {
        await sbp('gi.actions/identity/kv/saveChatRoomUnreadMessages', { data, onconflict: getUpdatedUnreadMessages })
      }
    })
  },
  'gi.actions/identity/kv/removeChatRoomUnreadMessage': ({ contractID, messageHash }: {
    contractID: string, messageHash: string
  }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedUnreadMessages = async () => {
        const currentData = await sbp('gi.actions/identity/kv/fetchChatRoomUnreadMessages')

        const index = currentData[contractID]?.unreadMessages.findIndex(msg => msg.messageHash === messageHash)
        // NOTE: index could be undefined if unreadMessages is not initialized
        if (Number.isInteger(index) && index >= 0) {
          currentData[contractID].unreadMessages.splice(index, 1)
          return currentData
        }
        return null
      }

      const data = await getUpdatedUnreadMessages()
      if (data) {
        await sbp('gi.actions/identity/kv/saveChatRoomUnreadMessages', { data, onconflict: getUpdatedUnreadMessages })
      }
    })
  },
  'gi.actions/identity/kv/deleteChatRoomUnreadMessages': ({ contractID }: { contractID: string }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedUnreadMessages = async () => {
        const currentData = await sbp('gi.actions/identity/kv/fetchChatRoomUnreadMessages')
        if (currentData[contractID]) {
          delete currentData[contractID]
          return currentData
        }
        return null
      }

      const data = await getUpdatedUnreadMessages()
      if (data) {
        await sbp('gi.actions/identity/kv/saveChatRoomUnreadMessages', { data, onconflict: getUpdatedUnreadMessages })
      }
    })
  },
  // Preferences
  'gi.actions/identity/kv/fetchPreferences': async () => {
    const identityContractID = sbp('chelonia/rootState').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to fetch preferences without an active session')
    }
    return (await sbp('chelonia/kv/get', identityContractID, KV_KEYS.PREFERENCES))?.data || {}
  },
  'gi.actions/identity/kv/savePreferences': ({ data, onconflict }: { data: Object, onconflict?: Function }) => {
    const identityContractID = sbp('chelonia/rootState').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to update preferences without an active session')
    }

    return sbp('chelonia/queueInvocation', identityContractID, () => {
      return sbp('chelonia/kv/set', identityContractID, KV_KEYS.PREFERENCES, data, {
        encryptionKeyId: sbp('chelonia/contract/currentKeyIdByName', identityContractID, 'cek'),
        signingKeyId: sbp('chelonia/contract/currentKeyIdByName', identityContractID, 'csk'),
        onconflict
      })
    })
  },
  'gi.actions/identity/kv/loadPreferences': () => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const preferences = await sbp('gi.actions/identity/kv/fetchPreferences')
      // TODO: Can't use state/vuex/commit
      sbp('state/vuex/commit', 'setPreferences', preferences)
    })
  },
  'gi.actions/identity/kv/updateDistributionBannerVisibility': ({ contractID, hidden }: { contractID: string, hidden: boolean }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedPreferences = async () => {
        const currentPreferences = await sbp('gi.actions/identity/kv/fetchPreferences')
        const hideDistributionBanner = {
          ...(currentPreferences.hideDistributionBanner || {}),
          [contractID]: hidden
        }
        return { ...currentPreferences, hideDistributionBanner }
      }

      const data = await getUpdatedPreferences()
      await sbp('gi.actions/identity/kv/savePreferences', { data, onconflict: getUpdatedPreferences })
    })
  },
  // Notifications
  'gi.actions/identity/kv/fetchNotificationStatus': async () => {
    const identityContractID = sbp('chelonia/rootState').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to fetch notification status without an active session')
    }
    return (await sbp('chelonia/kv/get', identityContractID, KV_KEYS.NOTIFICATIONS))?.data || {}
  },
  'gi.actions/identity/kv/saveNotificationStatus': ({ data, onconflict }: { data: Object, onconflict?: Function }) => {
    const identityContractID = sbp('chelonia/rootState').loggedIn?.identityContractID
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
      if (typeof onconflict === 'function') {
        return applyStorageRules(await onconflict(...args))
      }
      return null
    }

    return sbp('chelonia/queueInvocation', identityContractID, () => {
      return sbp('chelonia/kv/set', identityContractID, KV_KEYS.NOTIFICATIONS, applyStorageRules(data), {
        encryptionKeyId: sbp('chelonia/contract/currentKeyIdByName', identityContractID, 'cek'),
        signingKeyId: sbp('chelonia/contract/currentKeyIdByName', identityContractID, 'csk'),
        onconflict: updatedOnConflict
      })
    })
  },
  'gi.actions/identity/kv/loadNotificationStatus': () => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const status = await sbp('gi.actions/identity/kv/fetchNotificationStatus')
      sbp('state/vuex/commit', 'setNotificationStatus', status)
    })
  },
  'gi.actions/identity/kv/addNotificationStatus': (notification: Object) => {
    const { hash, timestamp } = notification
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedNotificationStatus = async () => {
        const currentData = await sbp('gi.actions/identity/kv/fetchNotificationStatus')
        if (!currentData[hash]) {
          return {
            ...currentData,
            [hash]: initNotificationStatus({ timestamp })
          }
        }
        return null
      }

      const data = await getUpdatedNotificationStatus()
      if (data) {
        await sbp('gi.actions/identity/kv/saveNotificationStatus', { data, onconflict: getUpdatedNotificationStatus })
      }
    })
  },
  'gi.actions/identity/kv/markNotificationStatusRead': (hashes: string | string[]) => {
    if (typeof hashes === 'string') {
      hashes = [hashes]
    }
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const { notifications } = sbp('state/vuex/getters')
      const getUpdatedNotificationStatus = async () => {
        const currentData = await sbp('gi.actions/identity/kv/fetchNotificationStatus')
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
        return isUpdated ? currentData : null
      }

      const data = await getUpdatedNotificationStatus()
      if (data) {
        await sbp('gi.actions/identity/kv/saveNotificationStatus', { data, onconflict: getUpdatedNotificationStatus })
      }
    })
  }
}): string[])
