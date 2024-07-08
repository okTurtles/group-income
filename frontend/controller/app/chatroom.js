import sbp from '@sbp/sbp'
import { DELETED_CHATROOM, JOINED_CHATROOM, LEFT_CHATROOM } from '@utils/events.js'

const switchCurrentChatRoomHandler = ({ identityContractID, groupContractID, chatRoomID }) => {
  const rootState = sbp('state/vuex/state')
  if (identityContractID && rootState.loggedIn?.identityContractID !== identityContractID) return
  if (!rootState[groupContractID]) return
  if (rootState.chatroom.currentChatRoomIDs[groupContractID] === chatRoomID) {
    const id = rootState[groupContractID].generalChatRoomId || Object.entries(rootState[groupContractID].chatRooms).find(([id, value]) => {
      // $FlowFixMe[incompatible-use]
      return id !== chatRoomID && value.members[identityContractID]?.status === 'active'
    })?.[0]
    if (id) {
      sbp('state/vuex/commit', 'setCurrentChatRoomId', { groupID: groupContractID, chatRoomID: id })
    }
  }
}

sbp('okTurtles.events/on', JOINED_CHATROOM, ({ identityContractID, groupContractID, chatRoomID }) => {
  const rootState = sbp('state/vuex/state')
  if (rootState.loggedIn?.identityContractID !== identityContractID) return
  if (!rootState.chatroom.currentChatRoomIDs[groupContractID] || rootState.chatroom.pendingChatRoomIDs[groupContractID] === chatRoomID) {
    sbp('state/vuex/commit', 'setCurrentChatRoomId', { groupID: groupContractID, chatRoomID })
  }
})
sbp('okTurtles.events/on', LEFT_CHATROOM, switchCurrentChatRoomHandler)
sbp('okTurtles.events/on', DELETED_CHATROOM, switchCurrentChatRoomHandler)

export default ([]: string[])
