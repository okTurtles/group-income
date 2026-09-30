'use strict'

import { CHATROOM_PRIVACY_LEVEL, CHATROOM_TYPES, PROFILE_STATUS } from '~/frontend/model/contracts/shared/constants.js'

// Private group chatrooms have their own keys, and their membership is managed
// through the group: the group contract records who is a member of each of its
// chatrooms. These functions only read contract state, so that they can be
// used with both the Chelonia and the Vuex state, as well as in unit tests.

// Former members of a chatroom whose keys are still current, meaning that the
// chatroom keys must be rotated. `height` is the height at which the current
// chatroom CEK and CSK became valid. A former member's key is still current if
// it hasn't been removed yet, or if it was removed at or after `height`.
export function formerMembersWithCurrentKeys (state: Object, height: number): string[] {
  const members = state?.members || {}
  const keys: Object[] = (Object.values(state?._vm?.authorizedKeys || {}): any)
  return Object.keys(members)
    .filter((memberID) => members[memberID].hasLeft === true)
    .filter((memberID) => keys.some((key) =>
      !!key.foreignKey &&
      typeof key.name === 'string' &&
      key.name.startsWith(`${memberID}/`) &&
      (key._notAfterHeight == null || key._notAfterHeight >= height)
    ))
}

// IDs of former members' keys that haven't been removed from the chatroom.
// These must be removed before rotating the chatroom keys; otherwise, their
// former owners would still be considered to hold the current keys after the
// rotation, and the keys would be rotated again.
export function formerMemberKeyIdsToRemove (state: Object): string[] {
  const members = state?.members || {}
  const authorizedKeys = state?._vm?.authorizedKeys || {}
  const formerMemberIDs = Object.keys(members).filter((memberID) => members[memberID].hasLeft === true)
  return Object.keys(authorizedKeys).filter((keyId) => {
    const key = authorizedKeys[keyId]
    return !!key.foreignKey &&
      key._notAfterHeight == null &&
      typeof key.name === 'string' &&
      formerMemberIDs.some((memberID) => key.name.startsWith(`${memberID}/`))
  })
}

// Members that a chatroom lists but that its group doesn't list as members of
// that chatroom. This happens when someone joins a private chatroom directly
// instead of being added through the group, for example, by re-joining the
// chatroom after leaving it using keys that hadn't been rotated yet.
export function membersMissingFromGroup (chatRoomState: ?Object, groupChatRoomRecord: ?Object): string[] {
  const members = chatRoomState?.members
  const groupMembers = groupChatRoomRecord?.members
  if (!members || !groupMembers) return []
  return Object.keys(members).filter((memberID) =>
    !members[memberID].hasLeft &&
    groupMembers[memberID]?.status !== PROFILE_STATUS.ACTIVE
  )
}

// Whether `chatRoomID` is a private chatroom of `groupID` (i.e., not a DM),
// which we have synced and which we're a member of according to both the group
// and the chatroom
export function isOurPrivateGroupChatRoom (state: Object, ourIdentityContractID: string, groupID: string, chatRoomID: string): boolean {
  const ourGroup = state?.[ourIdentityContractID]?.groups?.[groupID]
  const record = state?.[groupID]?.chatRooms?.[chatRoomID]
  const chatRoomState = state?.[chatRoomID]
  return !!ourGroup && !ourGroup.hasLeft &&
    !!record && !record.deletedDate &&
    record.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE &&
    record.members?.[ourIdentityContractID]?.status === PROFILE_STATUS.ACTIVE &&
    !!chatRoomState?._vm &&
    chatRoomState.attributes?.type === CHATROOM_TYPES.GROUP &&
    chatRoomState.attributes?.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE &&
    !!chatRoomState.members?.[ourIdentityContractID] &&
    !chatRoomState.members[ourIdentityContractID].hasLeft
}

// All of the chatrooms for which `isOurPrivateGroupChatRoom` is true
export function privateGroupChatRoomsToCheck (state: Object, ourIdentityContractID: string): Array<{ groupID: string, chatRoomID: string }> {
  const groups = state?.[ourIdentityContractID]?.groups || {}
  return Object.keys(groups).flatMap((groupID) =>
    Object.keys(state?.[groupID]?.chatRooms || {})
      .filter((chatRoomID) => isOurPrivateGroupChatRoom(state, ourIdentityContractID, groupID, chatRoomID))
      .map((chatRoomID) => ({ groupID, chatRoomID }))
  )
}
