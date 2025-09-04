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
  },
  isJoinedChatRoomForChatRoom (state, getters) {
    return (state: Object, memberID?: string) => {
      if (!memberID) memberID = getters.ourIdentityContractId
      const members = state?.members
      return !!members?.[memberID] && !members[memberID].hasLeft
    }
  },
  chatRoomActiveMemberIdsForChatRoom () {
    return (state: Object) => {
      const members = state?.members
      if (!members) return []
      return Object.keys(members).filter(memberID => !members[memberID].hasLeft)
    }
  }
}: Object)
