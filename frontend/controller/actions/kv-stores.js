'use strict'
import sbp from '@sbp/sbp'
import { KV_KEYS } from '~/frontend/utils/constants.js'
import { KV_QUEUE } from '~/frontend/utils/events.js'

export default (sbp('sbp/selectors/register', {
  // NOTE: Space of Identity Contract ID
  'gi.actions/kv/fetchChatRoomUnreadMessages': async () => {
    const { ourIdentityContractId } = sbp('state/vuex/getters')
    if (!ourIdentityContractId) {
      throw new Error('Unable to fetch chatroom unreadMessages without an active session')
    }
    return (await sbp('chelonia/kv/get', ourIdentityContractId, KV_KEYS.UNREAD_MESSAGES))?.data || {}
  },
  'gi.actions/kv/saveChatRoomUnreadMessages': ({ data, onconflict }: { data: Object, onconflict?: Function }) => {
    const { ourIdentityContractId } = sbp('state/vuex/getters')
    if (!ourIdentityContractId) {
      throw new Error('Unable to update chatroom unreadMessages without an active session')
    }
    return sbp('chelonia/kv/set', ourIdentityContractId, KV_KEYS.UNREAD_MESSAGES, data, {
      encryptionKeyId: sbp('chelonia/contract/currentKeyIdByName', ourIdentityContractId, 'cek'),
      signingKeyId: sbp('chelonia/contract/currentKeyIdByName', ourIdentityContractId, 'csk'),
      onconflict
    })
  },
  'gi.actions/kv/loadChatRoomUnreadMessages': () => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const currentChatRoomUnreadMessages = await sbp('gi.actions/kv/fetchChatRoomUnreadMessages')
      sbp('state/vuex/commit', 'setUnreadMessages', currentChatRoomUnreadMessages)
    })
  },
  'gi.actions/kv/initChatRoomUnreadMessages': ({ contractID, messageHash, createdHeight }: {
    contractID: string, messageHash: string, createdHeight: number
  }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedUnreadMessages = async (cID) => {
        const currentData = await sbp('gi.actions/kv/fetchChatRoomUnreadMessages')

        if (!currentData[cID]) {
          return {
            ...currentData,
            [cID]: {
              readUntil: { messageHash, createdHeight },
              unreadMessages: []
            }
          }
        }
        return null
      }

      const data = await getUpdatedUnreadMessages(contractID)
      if (data) {
        await sbp('gi.actions/kv/saveChatRoomUnreadMessages', { data, onconflict: getUpdatedUnreadMessages })
      }
    })
  },
  'gi.actions/kv/setChatRoomReadUntil': ({ contractID, messageHash, createdHeight }: {
    contractID: string, messageHash: string, createdHeight: number
  }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedUnreadMessages = async (cID) => {
        const currentData = await sbp('gi.actions/kv/fetchChatRoomUnreadMessages')

        if (currentData[cID]?.readUntil.createdHeight < createdHeight) {
          const { unreadMessages } = currentData[cID]
          return {
            ...currentData,
            [cID]: {
              readUntil: { messageHash, createdHeight },
              unreadMessages: unreadMessages.filter(msg => msg.createdHeight > createdHeight)
            }
          }
        }
        return null
      }

      const data = await getUpdatedUnreadMessages(contractID)
      if (data) {
        await sbp('gi.actions/kv/saveChatRoomUnreadMessages', { data, onconflict: getUpdatedUnreadMessages })
      }
    })
  },
  'gi.actions/kv/addChatRoomUnreadMessage': ({ contractID, messageHash, createdHeight }: {
    contractID: string, messageHash: string, createdHeight: number
  }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedUnreadMessages = async (cID) => {
        const currentData = await sbp('gi.actions/kv/fetchChatRoomUnreadMessages')

        if (currentData[cID]?.readUntil.createdHeight < createdHeight) {
          const index = currentData[cID].unreadMessages.findIndex(msg => msg.messageHash === messageHash)
          if (index === -1) {
            currentData[cID].unreadMessages.push({ messageHash, createdHeight })
            return currentData
          }
        }
        return null
      }

      const data = await getUpdatedUnreadMessages(contractID)
      if (data) {
        await sbp('gi.actions/kv/saveChatRoomUnreadMessages', { data, onconflict: getUpdatedUnreadMessages })
      }
    })
  },
  'gi.actions/kv/removeChatRoomUnreadMessage': ({ contractID, messageHash }: {
    contractID: string, messageHash: string
  }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedUnreadMessages = async (cID) => {
        const currentData = await sbp('gi.actions/kv/fetchChatRoomUnreadMessages')

        const index = currentData[cID]?.unreadMessages.findIndex(msg => msg.messageHash === messageHash)
        // NOTE: index could be undefined if unreadMessages is not initialized
        if (Number.isInteger(index) && index >= 0) {
          currentData[cID].unreadMessages.splice(index, 1)
          return currentData
        }
        return null
      }

      const data = await getUpdatedUnreadMessages(contractID)
      if (data) {
        await sbp('gi.actions/kv/saveChatRoomUnreadMessages', { data, onconflict: getUpdatedUnreadMessages })
      }
    })
  },
  'gi.actions/kv/deleteChatRoomUnreadMessages': ({ contractID }: { contractID: string }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedUnreadMessages = async (cID) => {
        const currentData = await sbp('gi.actions/kv/fetchChatRoomUnreadMessages')
        if (currentData[cID]) {
          delete currentData[cID]
          return currentData
        }
        return null
      }

      const data = await getUpdatedUnreadMessages(contractID)
      if (data) {
        await sbp('gi.actions/kv/saveChatRoomUnreadMessages', { data, onconflict: getUpdatedUnreadMessages })
      }
    })
  },
  'gi.actions/kv/fetchPreferences': async () => {
    const { ourIdentityContractId } = sbp('state/vuex/getters')
    if (!ourIdentityContractId) {
      throw new Error('Unable to fetch preferences without an active session')
    }
    return (await sbp('chelonia/kv/get', ourIdentityContractId, KV_KEYS.PREFERENCES))?.data || {}
  },
  'gi.actions/kv/savePreferences': ({ data, onconflict }: { data: Object, onconflict?: Function }) => {
    const { ourIdentityContractId } = sbp('state/vuex/getters')
    if (!ourIdentityContractId) {
      throw new Error('Unable to update preferences without an active session')
    }
    return sbp('chelonia/kv/set', ourIdentityContractId, KV_KEYS.PREFERENCES, data, {
      encryptionKeyId: sbp('chelonia/contract/currentKeyIdByName', ourIdentityContractId, 'cek'),
      signingKeyId: sbp('chelonia/contract/currentKeyIdByName', ourIdentityContractId, 'csk'),
      onconflict
    })
  },
  'gi.actions/kv/loadPreferences': () => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const preferences = await sbp('gi.actions/kv/fetchPreferences')
      sbp('state/vuex/commit', 'setPreferences', preferences)
    })
  },
  'gi.actions/kv/updateDistributionBannerVisibility': ({ contractID, hidden }: { contractID: string, hidden: boolean }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedPreferences = async (cID) => {
        const currentPreferences = await sbp('gi.actions/kv/fetchPreferences')
        const hideDistributionBanner = {
          ...(currentPreferences.hideDistributionBanner || {}),
          [contractID]: hidden
        }
        return { ...currentPreferences, hideDistributionBanner }
      }

      const data = await getUpdatedPreferences(contractID)
      await sbp('gi.actions/kv/savePreferences', { data, onconflict: getUpdatedPreferences })
    })
  },
  // NOTE: Space of Group Contract ID
  'gi.actions/kv/updateLastLoggedIn': async ({ contractID }: { contractID: string }) => {
    const { ourIdentityContractId } = sbp('state/vuex/getters')
    if (!ourIdentityContractId) {
      throw new Error('Unable to update lastLoggedIn without an active session')
    }

    // Wait for any pending operations (e.g., sync) to finish
    await sbp('chelonia/queueInvocation', contractID, () => {})

    const now = new Date().toISOString()
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedLastLoggedIn = async (cID, key) => {
        const current = (await sbp('chelonia/kv/get', cID, key))?.data || {}
        return { ...current, [ourIdentityContractId]: now }
      }

      const data = await getUpdatedLastLoggedIn(contractID, KV_KEYS.LAST_LOGGED_IN)
      await sbp('chelonia/kv/set', contractID, KV_KEYS.LAST_LOGGED_IN, data, {
        encryptionKeyId: sbp('chelonia/contract/currentKeyIdByName', contractID, 'cek'),
        signingKeyId: sbp('chelonia/contract/currentKeyIdByName', contractID, 'csk'),
        onconflict: getUpdatedLastLoggedIn
      })
    })
  }
}): string[])
