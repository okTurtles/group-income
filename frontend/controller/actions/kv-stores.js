'use strict'
import sbp from '@sbp/sbp'
import { KV_KEYS } from '~/frontend/utils/constants.js'
import { KV_QUEUE } from '~/frontend/utils/events.js'

export default (sbp('sbp/selectors/register', {
  // NOTE: Identity Contract ID
  'gi.actions/kv/fetchChatRoomUnreadMessages': async () => {
    const { ourIdentityContractId } = sbp('state/vuex/getters')
    return (await sbp('chelonia/kv/get', ourIdentityContractId, KV_KEYS.UNREAD_MESSAGES))?.data || {}
  },
  'gi.actions/kv/saveChatRoomUnreadMessages': ({ contractID, data, onconflict }: {
    contractID: string, data: Object, onconflict?: Function
  }) => {
    const { ourIdentityContractId } = sbp('state/vuex/getters')

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
      const fnInitUnreadMessages = async (cID) => {
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

      const data = await fnInitUnreadMessages(contractID)
      if (data) {
        await sbp('gi.actions/kv/saveChatRoomUnreadMessages', { contractID, data, onconflict: fnInitUnreadMessages })
      }
    })
  },
  'gi.actions/kv/setChatRoomReadUntil': ({ contractID, messageHash, createdHeight }: {
    contractID: string, messageHash: string, createdHeight: number
  }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const fnSetReadUntil = async (cID) => {
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

      const data = await fnSetReadUntil(contractID)
      if (data) {
        await sbp('gi.actions/kv/saveChatRoomUnreadMessages', { contractID, data, onconflict: fnSetReadUntil })
      }
    })
  },
  'gi.actions/kv/addChatRoomUnreadMessage': ({ contractID, messageHash, createdHeight }: {
    contractID: string, messageHash: string, createdHeight: number
  }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const fnAddUnreadMessage = async (cID) => {
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

      const data = await fnAddUnreadMessage(contractID)
      if (data) {
        await sbp('gi.actions/kv/saveChatRoomUnreadMessages', { contractID, data, onconflict: fnAddUnreadMessage })
      }
    })
  },
  'gi.actions/kv/removeChatRoomUnreadMessage': ({ contractID, messageHash }: {
    contractID: string, messageHash: string
  }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const fnRemoveUnreadMessage = async (cID) => {
        const currentData = await sbp('gi.actions/kv/fetchChatRoomUnreadMessages')

        const index = currentData[cID]?.unreadMessages.findIndex(msg => msg.messageHash === messageHash)
        // NOTE: index could be undefined if unreadMessages is not initialized
        if (Number.isInteger(index) && index >= 0) {
          currentData[cID].unreadMessages.splice(index, 1)
          return currentData
        }
        return null
      }

      const data = await fnRemoveUnreadMessage(contractID)
      if (data) {
        await sbp('gi.actions/kv/saveChatRoomUnreadMessages', { contractID, data, onconflict: fnRemoveUnreadMessage })
      }
    })
  },
  'gi.actions/kv/deleteChatRoomUnreadMessages': ({ contractID }: { contractID: string }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const fnDeleteUnreadMessages = async (cID) => {
        const currentData = await sbp('gi.actions/kv/fetchChatRoomUnreadMessages')
        if (currentData[cID]) {
          delete currentData[cID]
          return currentData
        }
        return null
      }

      const data = await fnDeleteUnreadMessages(contractID)
      if (data) {
        await sbp('gi.actions/kv/saveChatRoomUnreadMessages', { contractID, data, onconflict: fnDeleteUnreadMessages })
      }
    })
  },
  // NOTE: Group Contract ID
  'gi.actions/kv/updateLastLoggedIn': async ({ contractID }: { contractID: string }) => {
    const { ourIdentityContractId }  = sbp('state/vuex/getters')
    if (!ourIdentityContractId) {
      throw new Error('Unable to update last logged in without an active session')
    }

    // Wait for any pending operations (e.g., sync) to finish
    await sbp('chelonia/queueInvocation', contractID, () => {})

    const now = new Date().toISOString()
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const fnGetUpdatedLastLoggedIn = async (cID, key) => {
        const current = (await sbp('chelonia/kv/get', cID, key))?.data || {}
        return { ...current, [ourIdentityContractId]: now }
      }

      const data = await fnGetUpdatedLastLoggedIn(contractID, KV_KEYS.LAST_LOGGED_IN)
      await sbp('chelonia/kv/set', contractID, KV_KEYS.LAST_LOGGED_IN, data, {
        encryptionKeyId: sbp('chelonia/contract/currentKeyIdByName', contractID, 'cek'),
        signingKeyId: sbp('chelonia/contract/currentKeyIdByName', contractID, 'csk'),
        onconflict: fnGetUpdatedLastLoggedIn
      })
    })
  }
}): string[])
