'use strict'

import { merge, union } from 'turtledash'
import { MESSAGE_NOTIFY_SETTINGS, CHATROOM_PRIVACY_LEVEL } from '@model/contracts/shared/constants.js'

const getters: { [x: string]: (state: Object, getters: { [x: string]: any }, rootState: Object) => any } = {
  currentChatRoomId (state, getters, rootState) {
    return state.currentChatRoomIDs[rootState.currentGroupId] || null
  },
  currentChatRoomState (state, getters, rootState) {
    return rootState[getters.currentChatRoomId] || {} // avoid "undefined" vue errors at inoportune times
  },
  chatNotificationSettings (state) {
    return Object.assign({
      publicDefault: {
        messageNotification: MESSAGE_NOTIFY_SETTINGS.DIRECT_MESSAGES,
        messageSound: MESSAGE_NOTIFY_SETTINGS.DIRECT_MESSAGES
      },
      privateDefault: {
        messageNotification: MESSAGE_NOTIFY_SETTINGS.ALL_MESSAGES,
        messageSound: MESSAGE_NOTIFY_SETTINGS.ALL_MESSAGES
      }
    }, state.chatNotificationSettings || {})
  },
  ourUnreadMessages (state) {
    return state.unreadMessages || {}
  },
  directMessagesByGroup (state, getters, rootState) {
    return groupID => {
      const currentGroupDirectMessages = {}

      if (!groupID) {
        // NOTE: groupID could be null before finish syncing group contracts
        return currentGroupDirectMessages
      }

      for (const chatRoomID of Object.keys(getters.ourDirectMessages)) {
        const chatRoomState = rootState[chatRoomID]
        const directMessageSettings = getters.ourDirectMessages[chatRoomID]
        const myIdentityId = getters.ourIdentityContractId

        // NOTE: skip DMs whose chatroom contracts are not synced yet
        if (!getters.isJoinedChatRoom(chatRoomID, myIdentityId)) {
          continue
        }
        // NOTE: direct messages should be filtered to the ones which are visible and of active group members
        const members = Object.keys(chatRoomState.members)
        const isDMToMyself = members.length === 1 && members[0] === myIdentityId
        // Explicitly don't filter out on `hasLeft` attribute, so that DMs can
        // still show all participants, past and present.
        const partners = members
          .filter(memberID => memberID !== myIdentityId)
          .sort((p1, p2) => {
            const p1JoinedDate = new Date(chatRoomState.members[p1].joinedDate).getTime()
            const p2JoinedDate = new Date(chatRoomState.members[p2].joinedDate).getTime()
            return p1JoinedDate - p2JoinedDate
          })
        // The following line ensured that DMs for former members were hidden.
        // Until the DM global dashboard is implemented, this check has been
        // replaced with a check for all members (past and present), so that
        // a conversation doesn't suddenly become inaccessible.
        // // const hasActiveMember = partners.some(memberID => Object.keys(getters.profilesByGroup(groupID)).includes(memberID))
        const hasActiveMember = partners.some(memberID => !!rootState[groupID]?.profiles[memberID])
        if (directMessageSettings.visible && (isDMToMyself || hasActiveMember)) {
          // NOTE: lastJoinedParter is chatroom member who has joined the chatroom for the last time.
          //       His profile picture can be used as the picture of the direct message
          //       possibly with the badge of the number of partners.
          const lastJoinedPartner = isDMToMyself ? myIdentityId : partners[partners.length - 1]
          const lastMsgTimeStamp = chatRoomState.messages?.length > 0
            ? new Date(chatRoomState.messages[chatRoomState.messages.length - 1].datetime).getTime()
            : 0

          currentGroupDirectMessages[chatRoomID] = {
            ...directMessageSettings,
            members,
            partners: partners.map(memberID => ({
              contractID: memberID,
              username: getters.usernameFromID(memberID),
              displayName: getters.userDisplayNameFromID(memberID)
            })),
            lastJoinedPartner,
            // TODO: The UI should display display names, usernames and (in the future)
            // identity contract IDs differently in some way (e.g., font, font size,
            // prefix (@), etc.) to make it impossible (or at least obvious) to impersonate
            // users (e.g., 'user1' changing their display name to 'user2')
            title: isDMToMyself
              ? getters.userDisplayNameFromID(myIdentityId)
              : partners.map(cID => getters.userDisplayNameFromID(cID)).join(', '),
            lastMsgTimeStamp,
            picture: getters.ourContactProfilesById[lastJoinedPartner]?.picture,
            isDMToMyself // Can be useful when certain things in UI are meant only for 'DM to myself'
          }
        }
      }
      return currentGroupDirectMessages
    }
  },
  ourGroupDirectMessages (state, getters, rootState) {
    return getters.directMessagesByGroup(rootState.currentGroupId)
  },
  // NOTE: this getter is used to find the ID of the direct message in the current group
  //       with the name[s] of partner[s]. Normally it's more useful to find direct message
  //       by the partners instead of contractID
  ourGroupDirectMessageFromUserIds (state, getters, rootState) {
    return (partners) => { // NOTE: string | string[]
      if (typeof partners === 'string') {
        partners = [partners]
      }

      const shouldFindDMToMyself = partners.length === 1 && partners[0] === rootState.loggedIn.identityContractID
      const currentGroupDirectMessages = getters.ourGroupDirectMessages
      return Object.keys(currentGroupDirectMessages).find(chatRoomID => {
        const chatRoomSettings = currentGroupDirectMessages[chatRoomID]

        if (shouldFindDMToMyself) return chatRoomSettings.isDMToMyself
        else {
          const cPartners = chatRoomSettings.partners.map(partner => partner.contractID)
          return cPartners.length === partners.length && union(cPartners, ((partners: any): string[])).length === partners.length
        }
      })
    }
  },
  isGroupDirectMessage (state, getters) {
    // NOTE: identity contract could not be synced at the time of calling this getter
    return chatRoomID => !!getters.ourGroupDirectMessages[chatRoomID || getters.currentChatRoomId]
  },
  isDirectMessage (state, getters) {
    // NOTE: identity contract could not be synced at the time of calling this getter
    return chatRoomID => !!getters.ourDirectMessages[chatRoomID || getters.currentChatRoomId]
  },
  isGroupDirectMessageToMyself (state, getters) {
    return chatRoomID => {
      const chatRoomSettings = getters.ourGroupDirectMessages[chatRoomID || getters.currentChatRoomId]
      return !!chatRoomSettings && chatRoomSettings?.isDMToMyself
    }
  },
  isJoinedChatRoom (state, getters, rootState) {
    return (chatRoomID: string, memberID?: string) => {
      return getters.isJoinedChatRoomForChatRoom(rootState[chatRoomID], memberID)
    }
  },
  chatRoomActiveMemberIds (state, getters, rootState) {
    return (chatRoomID: string) => {
      return getters.chatRoomActiveMemberIdsForChatRoom(rootState[chatRoomID])
    }
  },
  currentChatVm (state, getters, rootState) {
    return rootState?.[getters.currentChatRoomId]?._vm || null
  },
  currentChatRoomScrollPosition (state, getters) {
    return state.chatRoomScrollPosition?.[getters.currentChatRoomId] // undefined means to the latest
  },
  currentChatRoomReadUntil (state, getters) {
    // NOTE: Optional Chaining (?) is necessary when user viewing the chatroom which he is not part of
    return getters.ourUnreadMessages[getters.currentChatRoomId]?.readUntil // undefined means to the latest
  },
  chatRoomUnreadMessages (state, getters) {
    return (chatRoomID: string) => {
      // NOTE: Optional Chaining (?) is necessary when user tries to get mentions of the chatroom which he is not part of
      return getters.ourUnreadMessages[chatRoomID]?.unreadMessages || []
    }
  },
  isChatRoomManuallyMarkedUnread (state, getters) {
    return (chatroomID: string) => {
      return Boolean(getters.ourUnreadMessages[chatroomID || getters.currentChatRoomId]?.readUntil?.isManuallyMarked)
    }
  },
  groupUnreadMessages (state, getters, rootState) {
    return (groupID: string) => {
      const isGroupDirectMessage = cID => Object.keys(getters.directMessagesByGroup(groupID)).includes(cID)
      const isGroupChatroom = cID => Object.keys(rootState[groupID]?.chatRooms || {}).includes(cID)
      return Object.keys(getters.ourUnreadMessages)
        .filter(cID => isGroupDirectMessage(cID) || isGroupChatroom(cID))
        .map(cID => getters.ourUnreadMessages[cID].unreadMessages.length)
        .reduce((sum, n) => sum + n, 0)
    }
  },
  groupIdFromChatRoomId (state, getters, rootState) {
    return (chatRoomID: string) => Object.keys(rootState.contracts)
      .find(cId => rootState.contracts[cId]?.type === 'gi.contracts/group' &&
        Object.keys(rootState[cId].chatRooms).includes(chatRoomID))
  },
  chatRoomsInDetail (state, getters, rootState) {
    const chatRoomsInDetail = merge({}, getters.groupChatRooms)
    const myIdentityId = rootState.loggedIn.identityContractID
    for (const contractID in chatRoomsInDetail) {
      const chatRoom = rootState[contractID]
      if (getters.isJoinedChatRoom(contractID, myIdentityId)) {
        chatRoomsInDetail[contractID] = {
          ...chatRoom.attributes,
          id: contractID,
          unreadMessagesCount: getters.chatRoomUnreadMessages(contractID).length,
          joined: true
        }
      } else {
        const { name, privacyLevel } = chatRoomsInDetail[contractID]
        chatRoomsInDetail[contractID] = { id: contractID, name, privacyLevel, joined: false }
      }
    }
    return chatRoomsInDetail
  },
  mentionableChatroomsInDetails (state, getters) {
    // NOTE: Channel types a user can mention
    //       1. All public/group channels (regardless of whether joined or not).
    //       2. A private channel that he/she has joined.
    return Object.values(getters.chatRoomsInDetail).filter(
      (details: any) => [CHATROOM_PRIVACY_LEVEL.GROUP, CHATROOM_PRIVACY_LEVEL.PUBLIC].includes(details.privacyLevel) ||
      (details.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE && details.joined)
    )
  },
  getChatroomNameById (state, getters) {
    return chatRoomID => {
      const found: any = Object.values(getters.chatRoomsInDetail).find((details: any) => details.id === chatRoomID)
      return found ? found.name : null
    }
  },
  chatRoomMembersInSort (state, getters) {
    return getters.groupMembersSorted
      .map(member => ({ contractID: member.contractID, username: member.username, displayName: member.displayName }))
      .filter(member => !!getters.chatRoomMembers[member.contractID]) || []
  }
}

export default getters
