import sbp from '@sbp/sbp'
import { DELETED_CHATROOM, JOINED_CHATROOM, LEFT_CHATROOM, NEW_CHATROOM_NOTIFICATION_SETTINGS, NEW_CHATROOM_SCROLL_POSITION } from '@utils/events.js'
import { EVENT_HANDLED_READY } from '@chelonia/lib/events'

const switchCurrentChatRoomHandler = ({ identityContractID, groupContractID, chatRoomID }) => {
  const rootState = sbp('state/vuex/state')
  if (identityContractID && rootState.loggedIn?.identityContractID !== identityContractID) return
  if (!rootState[groupContractID]) return
  if (rootState.chatroom.currentChatRoomIDs[groupContractID] === chatRoomID) {
    sbp('state/vuex/commit', 'setCurrentChatRoomId', { groupID: groupContractID })
  }
}

// handle incoming chatroom-related events that are sent from the service worker
sbp('okTurtles.events/on', JOINED_CHATROOM, ({ identityContractID, groupContractID, chatRoomID }) => {
  const rootState = sbp('state/vuex/state')
  if (rootState.loggedIn?.identityContractID !== identityContractID) return
  if (!rootState.chatroom.currentChatRoomIDs[groupContractID] || rootState.chatroom.pendingChatRoomIDs[groupContractID] === chatRoomID) {
    // Sometimes, the state may not be ready (it needs to be copied from the SW
    // to Vuex). In this case, we try again after a short delay.
    // The specific issue is that the browsing-side state is updated in response
    // to the EVENT_HANDLED event. Although that event is correctly emitted
    // prior to JOINED_CHATROOM, processing might take slightly longer, causing
    // rootState[chatRoomID]?.members?.[identityContractID] to be briefly
    // undefined.
    const setCurrentChatRoomId = () => {
      // Re-grab the state as it could be a stale reference
      const rootState = sbp('state/vuex/state')
      const rootGetters = sbp('state/vuex/getters')
      // See if the state is right to do a chatroom switch right now
      // We need: to have joined AND, if the group is the current groupID,
      // we also need it to be either on groupChatRooms or ourGroupDirectMessages
      if (
        !rootGetters.isJoinedChatRoom(chatRoomID, identityContractID) ||
        (
          rootState.currentGroupId === groupContractID &&
          !rootGetters.groupChatRooms[chatRoomID] &&
          !rootGetters.ourGroupDirectMessages[chatRoomID]
        )
      ) {
        // We may not have processed everything. We add a handler on
        // EVENT_HANDLED_READY to wait for events on the relevant contracts
        const unregister = sbp('okTurtles.events/on', EVENT_HANDLED_READY, (contractID) => {
          if (![chatRoomID, groupContractID, identityContractID].includes(contractID)) return
          // Re-grab the state as it could be a stale reference
          const rootState = sbp('state/vuex/state')

          if (
            rootGetters.isJoinedChatRoom(chatRoomID, identityContractID) &&
            (
              rootState.currentGroupId !== groupContractID ||
              rootGetters.groupChatRooms[chatRoomID] ||
              rootGetters.ourGroupDirectMessages[chatRoomID]
            )
          ) {
            unregister()
            clearTimeout(timeoutId)

            sbp('state/vuex/commit', 'setCurrentChatRoomId', { groupID: groupContractID, chatRoomID })
          }
        })

        // Switching to a chatroom should be quick. If we need to wait too long,
        // give up.
        const timeoutId = setTimeout(() => {
          console.warn('[JOINED_CHATROOM] Given up on setCurrentChatRoomId after 5 seconds', { identityContractID, groupContractID, chatRoomID })
          unregister()
        }, 5000)
      } else {
        sbp('state/vuex/commit', 'setCurrentChatRoomId', { groupID: groupContractID, chatRoomID })
      }
    }
    setCurrentChatRoomId()
  }
})
sbp('okTurtles.events/on', LEFT_CHATROOM, switchCurrentChatRoomHandler)
sbp('okTurtles.events/on', DELETED_CHATROOM, switchCurrentChatRoomHandler)
sbp('okTurtles.events/on', NEW_CHATROOM_SCROLL_POSITION, ({ chatRoomID, messageHash }) => {
  if (messageHash) {
    sbp('state/vuex/commit', 'setChatRoomScrollPosition', { chatRoomID, messageHash })
  } else {
    sbp('state/vuex/commit', 'deleteChatRoomScrollPosition', { chatRoomID })
  }
})
sbp('okTurtles.events/on', NEW_CHATROOM_NOTIFICATION_SETTINGS, ({ chatRoomID, settings, isGlobal }) => {
  sbp('state/vuex/commit', 'setChatroomNotificationSettings', {
    isGlobal,
    chatRoomID,
    settings
  })
})

export default ([]: string[])
