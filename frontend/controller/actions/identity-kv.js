'use strict'
import sbp from '@sbp/sbp'
import { KV_KEYS } from '~/frontend/utils/constants.js'
import { KV_QUEUE } from '~/frontend/utils/events.js'

export default (sbp('sbp/selectors/register', {
  'gi.actions/identity/kv/fetchChatRoomUnreadMessages': async () => {
    const { ourIdentityContractId } = sbp('state/vuex/getters')
    if (!ourIdentityContractId) {
      throw new Error('Unable to fetch chatroom unreadMessages without an active session')
    }
    return (await sbp('chelonia/kv/get', ourIdentityContractId, KV_KEYS.UNREAD_MESSAGES))?.data || {}
  },
  'gi.actions/identity/kv/saveChatRoomUnreadMessages': ({ data, onconflict }: { data: Object, onconflict?: Function }) => {
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
  'gi.actions/identity/kv/loadChatRoomUnreadMessages': () => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const currentChatRoomUnreadMessages = await sbp('gi.actions/identity/kv/fetchChatRoomUnreadMessages')
      sbp('state/vuex/commit', 'setUnreadMessages', currentChatRoomUnreadMessages)
    })
  },
  'gi.actions/identity/kv/initChatRoomUnreadMessages': ({ contractID, messageHash, createdHeight }: {
    contractID: string, messageHash: string, createdHeight: number
  }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedUnreadMessages = async (cID) => {
        const currentData = await sbp('gi.actions/identity/kv/fetchChatRoomUnreadMessages')

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
        await sbp('gi.actions/identity/kv/saveChatRoomUnreadMessages', { data, onconflict: getUpdatedUnreadMessages })
      }
    })
  },
  'gi.actions/identity/kv/setChatRoomReadUntil': ({ contractID, messageHash, createdHeight }: {
    contractID: string, messageHash: string, createdHeight: number
  }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedUnreadMessages = async (cID) => {
        const currentData = await sbp('gi.actions/identity/kv/fetchChatRoomUnreadMessages')

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
        await sbp('gi.actions/identity/kv/saveChatRoomUnreadMessages', { data, onconflict: getUpdatedUnreadMessages })
      }
    })
  },
  'gi.actions/identity/kv/addChatRoomUnreadMessage': ({ contractID, messageHash, createdHeight }: {
    contractID: string, messageHash: string, createdHeight: number
  }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedUnreadMessages = async (cID) => {
        const currentData = await sbp('gi.actions/identity/kv/fetchChatRoomUnreadMessages')

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
        await sbp('gi.actions/identity/kv/saveChatRoomUnreadMessages', { data, onconflict: getUpdatedUnreadMessages })
      }
    })
  },
  'gi.actions/identity/kv/removeChatRoomUnreadMessage': ({ contractID, messageHash }: {
    contractID: string, messageHash: string
  }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedUnreadMessages = async (cID) => {
        const currentData = await sbp('gi.actions/identity/kv/fetchChatRoomUnreadMessages')

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
        await sbp('gi.actions/identity/kv/saveChatRoomUnreadMessages', { data, onconflict: getUpdatedUnreadMessages })
      }
    })
  },
  'gi.actions/identity/kv/deleteChatRoomUnreadMessages': ({ contractID }: { contractID: string }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedUnreadMessages = async (cID) => {
        const currentData = await sbp('gi.actions/identity/kv/fetchChatRoomUnreadMessages')
        if (currentData[cID]) {
          delete currentData[cID]
          return currentData
        }
        return null
      }

      const data = await getUpdatedUnreadMessages(contractID)
      if (data) {
        await sbp('gi.actions/identity/kv/saveChatRoomUnreadMessages', { data, onconflict: getUpdatedUnreadMessages })
      }
    })
  },
  'gi.actions/identity/kv/fetchPreferences': async () => {
    const { ourIdentityContractId } = sbp('state/vuex/getters')
    if (!ourIdentityContractId) {
      throw new Error('Unable to fetch preferences without an active session')
    }
    return (await sbp('chelonia/kv/get', ourIdentityContractId, KV_KEYS.PREFERENCES))?.data || {}
  },
  'gi.actions/identity/kv/savePreferences': ({ data, onconflict }: { data: Object, onconflict?: Function }) => {
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
  'gi.actions/identity/kv/loadPreferences': () => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const preferences = await sbp('gi.actions/identity/kv/fetchPreferences')
      sbp('state/vuex/commit', 'setPreferences', preferences)
    })
  },
  'gi.actions/identity/kv/updateDistributionBannerVisibility': ({ contractID, hidden }: { contractID: string, hidden: boolean }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedPreferences = async (cID) => {
        const currentPreferences = await sbp('gi.actions/identity/kv/fetchPreferences')
        const hideDistributionBanner = {
          ...(currentPreferences.hideDistributionBanner || {}),
          [contractID]: hidden
        }
        return { ...currentPreferences, hideDistributionBanner }
      }

      const data = await getUpdatedPreferences(contractID)
      await sbp('gi.actions/identity/kv/savePreferences', { data, onconflict: getUpdatedPreferences })
    })
  }
}): string[])
