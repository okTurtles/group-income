export default ({
  chatRoomSettings (state, getters) {
    return getters.currentChatRoomState.settings || {}
  },
  chatRoomAttributes (state, getters) {
    return getters.currentChatRoomState.attributes || {}
  },
  chatRoomMembers (state, getters) {
    return getters.currentChatRoomState.members || {}
  },
  chatRoomRecentMessages (state, getters) {
    return getters.currentChatRoomState.messages || []
  },
  chatRoomPinnedMessages (state, getters) {
    return (getters.currentChatRoomState.pinnedMessages || []).sort((a, b) => a.height < b.height ? 1 : -1)
  }
}: Object)
