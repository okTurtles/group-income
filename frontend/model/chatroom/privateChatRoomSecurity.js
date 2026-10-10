'use strict'

import { CHATROOM_PRIVACY_LEVEL, CHATROOM_TYPES, PROFILE_STATUS } from '~/frontend/model/contracts/shared/constants.js'

// Private group chatrooms have their own keys, and their membership is managed
// through the group: the group contract records who is a member of each of its
// chatrooms. These functions only read contract state, so that they can be
// used with both the Chelonia and the Vuex state, as well as in unit tests.

// IDs of the members who have left the chatroom
const formerMemberIDs = (state: Object): string[] => {
  const members = state?.members || {}
  return Object.keys(members).filter((memberID) => members[memberID].hasLeft === true)
}

// Whether `key` is the key that `memberID` added to the chatroom when joining
const isKeyOfMember = (key: Object, memberID: string): boolean =>
  !!key.foreignKey && typeof key.name === 'string' && key.name.startsWith(`${memberID}/`)

// The height at which the current chatroom keys became valid: the earliest of
// the CEK's and the CSK's, as they're rotated together. It's 0 if a key or its
// height is missing (`Math.min` then returns `NaN`). That errs on the side of
// rotating, as every former member who ever had a key then counts as holding
// the current keys (see `formerMembersWithCurrentKeys`).
export function currentKeysHeight (state: ?Object, CEKid: string, CSKid: string): number {
  const keys = state?._vm?.authorizedKeys || {}
  return Math.min(keys[CEKid]?._notBeforeHeight, keys[CSKid]?._notBeforeHeight) || 0
}

// Former members of a chatroom whose keys are still current, meaning that the
// chatroom keys must be rotated. `height` is the height at which the current
// chatroom CEK and CSK became valid. A former member's key is still current if
// it hasn't been removed yet, or if it was removed at or after `height`.
export function formerMembersWithCurrentKeys (state: Object, height: number): string[] {
  const keys: Object[] = (Object.values(state?._vm?.authorizedKeys || {}): any)
  return formerMemberIDs(state).filter((memberID) => keys.some((key) =>
    isKeyOfMember(key, memberID) &&
    (key._notAfterHeight == null || key._notAfterHeight >= height)
  ))
}

// IDs of former members' keys that haven't been removed from the chatroom.
// These must be removed before rotating the chatroom keys; otherwise, their
// former owners would still be considered to hold the current keys after the
// rotation, and the keys would be rotated again.
export function formerMemberKeyIdsToRemove (state: Object): string[] {
  const authorizedKeys = state?._vm?.authorizedKeys || {}
  const formerMembers = formerMemberIDs(state)
  return Object.keys(authorizedKeys).filter((keyId) => {
    const key = authorizedKeys[keyId]
    return key._notAfterHeight == null &&
      formerMembers.some((memberID) => isKeyOfMember(key, memberID))
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

// The members to remove from a chatroom: those that it lists but its group
// doesn't (see `membersMissingFromGroup`), except ourselves
export function chatRoomMembersToRemove (chatRoomState: ?Object, groupChatRoomRecord: ?Object, ourIdentityContractID: string): string[] {
  return membersMissingFromGroup(chatRoomState, groupChatRoomRecord)
    .filter((memberID) => memberID !== ourIdentityContractID)
}

// Events that we couldn't decrypt are skipped, so our view of a contract is
// incomplete until we receive the missing keys (which re-syncs it)
const hasCompleteState = (state: Object, contractID: string): boolean =>
  !state?.contracts?.[contractID]?.missingDecryptionKeyIds?.length

// Whether `chatRoomID` is a private chatroom of `groupID` (i.e., not a DM),
// which we have completely synced (as has its group) and which we're a member
// of according to both the group and the chatroom
export function isOurPrivateGroupChatRoom (state: Object, ourIdentityContractID: string, groupID: string, chatRoomID: string): boolean {
  const ourGroup = state?.[ourIdentityContractID]?.groups?.[groupID]
  const record = state?.[groupID]?.chatRooms?.[chatRoomID]
  const chatRoomState = state?.[chatRoomID]
  return hasCompleteState(state, groupID) && hasCompleteState(state, chatRoomID) &&
    !!ourGroup && !ourGroup.hasLeft &&
    !!record && !record.deletedDate &&
    record.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE &&
    record.members?.[ourIdentityContractID]?.status === PROFILE_STATUS.ACTIVE &&
    !!chatRoomState?._vm &&
    chatRoomState.attributes?.type === CHATROOM_TYPES.GROUP &&
    chatRoomState.attributes?.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE &&
    !!chatRoomState.members?.[ourIdentityContractID] &&
    !chatRoomState.members[ourIdentityContractID].hasLeft
}

// The members to remove from one of our private group chatrooms, or none if
// `chatRoomID` isn't one of those (see `isOurPrivateGroupChatRoom`)
export function ourPrivateGroupChatRoomMembersToRemove (state: Object, ourIdentityContractID: string, groupID: string, chatRoomID: string): string[] {
  if (!isOurPrivateGroupChatRoom(state, ourIdentityContractID, groupID, chatRoomID)) return []
  return chatRoomMembersToRemove(state[chatRoomID], state[groupID].chatRooms[chatRoomID], ourIdentityContractID)
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
