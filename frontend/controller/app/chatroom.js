import sbp from '@sbp/sbp'
import { DELETED_CHATROOM, JOINED_CHATROOM, LEFT_CHATROOM } from '@utils/events.js'

const switchCurrentChatRoomHandler = ({ identityContractID, groupContractID, chatRoomID }) => {
  const rootState = sbp('state/vuex/state')
  if (identityContractID && rootState.loggedIn?.identityContractID !== identityContractID) return
  if (!rootState[groupContractID]) return
  if (rootState.chatroom.currentChatRoomIDs[groupContractID] === chatRoomID) {
    sbp('state/vuex/commit', 'setCurrentChatRoomId', { groupID: groupContractID })
  }
}

sbp('okTurtles.events/on', JOINED_CHATROOM, ({ identityContractID, groupContractID, chatRoomID }) => {
  const rootState = sbp('state/vuex/state')
  if (rootState.loggedIn?.identityContractID !== identityContractID) return
  if (!rootState.chatroom.currentChatRoomIDs[groupContractID] || rootState.chatroom.pendingChatRoomIDs[groupContractID] === chatRoomID) {
    let attemptCount = 0
    // Sometimes, the state may not be ready (it needs to be copied from the SW
    // to Vuex). In this case, we try again after a short delay.
    // The specific issue is that the browsing-side state is updated in response
    // to the EVENT_HANDLED event. Although that event is correctly emitted
    // prior to JOINED_CHATROOM, processing might take slightly longer, causing
    // rootState[chatRoomID]?.members?.[identityContractID] to be briefly
    // undefined.
    // TODO: Figure out a better way of doing this that doesn't require a timeout
    const setCurrentChatRoomId = () => {
      // Re-grab the state as it could be a stale reference
      const rootState = sbp('state/vuex/state')
      if (!rootState[chatRoomID]?.members?.[identityContractID]) {
        if (++attemptCount > 5) {
          console.warn('[JOINED_CHATROOM] Given up on setCurrentChatRoomId after 5 attempts', { identityContractID, groupContractID, chatRoomID })
          return
        }
        setTimeout(setCurrentChatRoomId, 5 * Math.pow(1.75, attemptCount))
      } else {
        sbp('state/vuex/commit', 'setCurrentChatRoomId', { groupID: groupContractID, chatRoomID })
      }
    }
    setCurrentChatRoomId()
  }
})
sbp('okTurtles.events/on', LEFT_CHATROOM, switchCurrentChatRoomHandler)
sbp('okTurtles.events/on', DELETED_CHATROOM, switchCurrentChatRoomHandler)

export default ([]: string[])
