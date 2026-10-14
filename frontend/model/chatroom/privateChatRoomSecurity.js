'use strict'

import { SPMessage } from '@chelonia/lib/SPMessage'
import { CHATROOM_PRIVACY_LEVEL, CHATROOM_TYPES, PROFILE_STATUS } from '~/frontend/model/contracts/shared/constants.js'

// Private group chatrooms have their own keys, and their membership is managed
// through the group: the group contract records who is a member of each of its
// chatrooms. These functions only read contract state, so that they can be
// used with both the Chelonia and the Vuex state, as well as in unit tests.

// The contract and the key name that a foreign key points to
const parseForeignKey = (key: Object): ?{ contractID: string, keyName: ?string } => {
  if (typeof key?.foreignKey !== 'string') return undefined
  try {
    const url = new URL(key.foreignKey)
    return { contractID: url.pathname, keyName: url.searchParams.get('keyName') }
  } catch (e) {
    return undefined
  }
}

// The member that `key` belongs to, if it's the kind of key that members add
// to the chatroom when joining: a foreign key of their identity contract, named
// `${memberID}/…`
const memberKeyOwner = (key: Object): ?string => {
  const owner = parseForeignKey(key)?.contractID
  return owner && typeof key.name === 'string' && key.name.startsWith(`${owner}/`) ? owner : undefined
}

// IDs of the members who have left the chatroom. Chatroom contract versions
// 2.0.0 and 2.0.1 deleted members who left from `members` instead of marking
// them as having left, so the owners of member keys who aren't in `members`
// count as well.
const formerMemberIDs = (state: ?Object): string[] => {
  const members = state?.members
  if (!members) return []
  const keys: Object[] = (Object.values(state?._vm?.authorizedKeys || {}): any)
  const keyOwners = keys.map(memberKeyOwner).filter(Boolean)
  return [...new Set([...Object.keys(members), ...keyOwners])]
    .filter((memberID) => !members[memberID] || members[memberID].hasLeft === true)
}

// Whether `key` is the key that `memberID` added to the chatroom when joining
const isKeyOfMember = (key: Object, memberID: string): boolean => memberKeyOwner(key) === memberID

// The height at which the current chatroom keys became valid: the earliest of
// the CEK's and the CSK's, as they're rotated together. It's 0 if a key or its
// height is missing (`Math.min` then returns `NaN`). That errs on the side of
// rotating, as every former member who ever had a key then counts as holding
// the current keys (see `formerMembersWithCurrentKeys`).
export function currentKeysHeight (state: ?Object, CEKid: ?string, CSKid: ?string): number {
  const keys = state?._vm?.authorizedKeys || {}
  const heightOf = (keyId: ?string): number => keyId ? keys[keyId]?._notBeforeHeight : NaN
  return Math.min(heightOf(CEKid), heightOf(CSKid)) || 0
}

// Former members of a chatroom whose keys are still current, meaning that the
// chatroom keys must be rotated. `height` is the height at which the current
// chatroom CEK and CSK became valid. A former member's key is still current if
// it hasn't been removed yet, or if it was removed at or after `height`.
// "At" matters: a key removed in the same message that rotated the keys (e.g.,
// a leave that includes the leaver's own rotation) still counts.
export function formerMembersWithCurrentKeys (state: ?Object, height: number): string[] {
  const keys: Object[] = (Object.values(state?._vm?.authorizedKeys || {}): any)
  return formerMemberIDs(state).filter((memberID) => keys.some((key) =>
    isKeyOfMember(key, memberID) &&
    (key._notAfterHeight == null || key._notAfterHeight >= height)
  ))
}

// IDs of former members' keys that haven't been removed from the chatroom.
// These must be removed before rotating the chatroom keys (in a separate
// message, see `formerMembersWithCurrentKeys`); otherwise, their former owners
// would still be considered to hold the current keys after the rotation, and
// the keys would be rotated again.
export function formerMemberKeyIdsToRemove (state: ?Object): string[] {
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

// Events that we couldn't decrypt are skipped, so our view of a contract is
// incomplete until we receive the missing keys (which re-syncs it)
const hasCompleteState = (state: ?Object, contractID: string): boolean =>
  !state?.contracts?.[contractID]?.missingDecryptionKeyIds?.length

// Whether `chatRoomID` is a private chatroom of `groupID` (i.e., not a DM),
// which we have completely synced (as has its group) and which we're a member
// of according to both the group and the chatroom
export function isOurPrivateGroupChatRoom (state: ?Object, ourIdentityContractID: string, groupID: string, chatRoomID: string): boolean {
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

// The members to remove from one of our private group chatrooms: those that it
// lists but its group doesn't (see `membersMissingFromGroup`). None if
// `chatRoomID` isn't one of those chatrooms (see `isOurPrivateGroupChatRoom`),
// which also means that we're never among them.
export function ourPrivateGroupChatRoomMembersToRemove (state: ?Object, ourIdentityContractID: string, groupID: string, chatRoomID: string): string[] {
  if (!state || !isOurPrivateGroupChatRoom(state, ourIdentityContractID, groupID, chatRoomID)) return []
  return membersMissingFromGroup(state[chatRoomID], state[groupID].chatRooms[chatRoomID])
}

// All of the chatrooms for which `isOurPrivateGroupChatRoom` is true
export function privateGroupChatRoomsToCheck (state: ?Object, ourIdentityContractID: string): Array<{ groupID: string, chatRoomID: string }> {
  const groups = state?.[ourIdentityContractID]?.groups || {}
  return Object.keys(groups).flatMap((groupID) =>
    Object.keys(state?.[groupID]?.chatRooms || {})
      .filter((chatRoomID) => isOurPrivateGroupChatRoom(state, ourIdentityContractID, groupID, chatRoomID))
      .map((chatRoomID) => ({ groupID, chatRoomID }))
  )
}

// The group (among ours) that `chatRoomID` belongs to
export function groupIDForChatRoom (state: ?Object, ourIdentityContractID: string, chatRoomID: string): ?string {
  return Object.keys(state?.[ourIdentityContractID]?.groups || {})
    .find((groupID) => !!state?.[groupID]?.chatRooms?.[chatRoomID])
}

// Whether a key request for `chatRoomID` comes from someone that the group
// lists as removed from that chatroom (e.g., a former member who re-joined the
// chatroom directly). Someone the group has no record of isn't included: that
// can be a new member whose addition we haven't received yet.
export function isKeyRequestFromRemovedMember (state: ?Object, ourIdentityContractID: string, chatRoomID: string, requesterID: string): boolean {
  const groupID = groupIDForChatRoom(state, ourIdentityContractID, chatRoomID)
  const record = groupID ? state?.[groupID]?.chatRooms?.[chatRoomID] : undefined
  const requester = record?.members?.[requesterID]
  return record?.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE &&
    !!requester && requester.status !== PROFILE_STATUS.ACTIVE
}

// Keys of private group chatrooms. Every chatroom member holds the chatroom's
// CSK, which can add, update and remove any key, so the keys are checked
// against the shapes that legitimate operations produce.

// The chatroom's own keys, which it's created with, and their purposes
const OWN_KEY_PURPOSES: { [name: string]: string } = { 'csk': 'sig', 'cek': 'enc', '#sak': 'sak' }
// The group's CSK and CEK, as added to its private chatrooms. Permissions and
// actions are the most that any version has given them.
const GROUP_KEYS: { [name: string]: { keyName: string, purpose: string, permissions: string[], allowedActions: string[] } } = {
  'group-csk': {
    keyName: 'csk',
    purpose: 'sig',
    permissions: [SPMessage.OP_ATOMIC, SPMessage.OP_KEY_DEL, SPMessage.OP_ACTION_ENCRYPTED, SPMessage.OP_KEY_REQUEST],
    allowedActions: ['gi.contracts/chatroom/leave']
  },
  'group-cek': {
    keyName: 'cek',
    purpose: 'enc',
    permissions: [SPMessage.OP_ATOMIC, SPMessage.OP_KEY_ADD, SPMessage.OP_KEY_DEL, SPMessage.OP_ACTION_ENCRYPTED],
    allowedActions: ['gi.contracts/chatroom/join', 'gi.contracts/chatroom/leave']
  }
}
// Names whose current key is unique: the chatroom's own keys and the group's
const UNIQUE_KEY_NAMES = [...Object.keys(OWN_KEY_PURPOSES), ...Object.keys(GROUP_KEYS)]
// Member keys can only be used for inner signatures (older versions gave them
// no permissions at all)
const MEMBER_KEY_PERMISSIONS = [SPMessage.OP_ACTION_ENCRYPTED + '#inner']
// Keys that chatrooms created by versions from 2023 had
const isLegacyKeyName = (name: mixed): boolean =>
  name === 'groupKey' || (typeof name === 'string' && name.startsWith('#joinKey-'))

const isSubsetOf = (values: mixed, allowed: string[]): boolean =>
  Array.isArray(values) && values.every((value) => allowed.includes(value))
const isExactly = (values: mixed, expected: string[]): boolean =>
  Array.isArray(values) && values.length === expected.length && isSubsetOf(values, expected)

// Whether a foreign key is the key that it claims to be in the contract it
// points to. If we don't have that contract's state, we can't tell, and the
// key is accepted. If we have it but the key isn't there, we can't tell either
// (`undefined`): our copy of that contract may be behind, e.g., if the key was
// just rotated.
const matchesForeignContract = (state: Object, key: Object, contractID: string, keyName: string): ?boolean => {
  const foreignKeys = state[contractID]?._vm?.authorizedKeys
  if (!foreignKeys) return true
  const foreignKey = foreignKeys[key.id]
  if (!foreignKey) return undefined
  return foreignKey.name === keyName && foreignKey.data === key.data
}

// The role of a foreign key whose shape matches `role`, after checking it
// against the contract that it points to if `checkForeign` is set
const foreignKeyRole = (state: Object, key: Object, role: string, contractID: string, keyName: string, checkForeign: boolean): ?string => {
  if (!checkForeign) return role
  const matches = matchesForeignContract(state, key, contractID, keyName)
  return matches === true ? role : matches === false ? undefined : 'unverified'
}

// The role of a key of a private group chatroom, if it has the shape that
// legitimate operations give keys in that role:
//  - 'own': the chatroom's own CSK, CEK and SAK
//  - 'group': the group's CSK and CEK
//  - 'member': the key that a member added when joining
//  - 'legacy': keys that older versions added
// `checkForeign` also checks that foreign keys match the contracts that they
// point to. Those that we can't check get the 'unverified' role.
// Permissions aren't checked for the chatroom's own keys: those are the most
// powerful keys anyway, and their permissions changed over time (see
// `gi.actions/chatroom/upgradeCekPermissions`). Chatrooms created before April
// 2024 have them at ring level 1.
const chatRoomKeyRole = (state: Object, groupID: string, key: Object, checkForeign: boolean): ?string => {
  const name = key.name
  if (Object.keys(OWN_KEY_PURPOSES).includes(name)) {
    return !key.foreignKey && [0, 1].includes(key.ringLevel) && isExactly(key.purpose, [OWN_KEY_PURPOSES[name]])
      ? 'own'
      : undefined
  }
  if (Object.keys(GROUP_KEYS).includes(name)) {
    const expected = GROUP_KEYS[name]
    const target = parseForeignKey(key)
    return !!target && target.contractID === groupID && target.keyName === expected.keyName &&
      key.ringLevel === 2 && isExactly(key.purpose, [expected.purpose]) &&
      isSubsetOf(key.permissions, expected.permissions) &&
      isSubsetOf(key.allowedActions, expected.allowedActions)
      ? foreignKeyRole(state, key, 'group', groupID, expected.keyName, checkForeign)
      : undefined
  }
  const owner = memberKeyOwner(key)
  if (owner) {
    return parseForeignKey(key)?.keyName === 'csk' &&
      key.ringLevel === Number.MAX_SAFE_INTEGER && isExactly(key.purpose, ['sig']) &&
      isSubsetOf(key.permissions, MEMBER_KEY_PERMISSIONS)
      ? foreignKeyRole(state, key, 'member', owner, 'csk', checkForeign)
      : undefined
  }
  return isLegacyKeyName(name) ? 'legacy' : undefined
}

// Sorts the current keys of one of our private group chatrooms:
//  - `kept`: for each of the chatroom's own keys and the group's keys, the one
//    current key with that name (others with the same name are unexpected).
//    That's the one matching the group's current key, for group keys, or else
//    the first one whose secret we hold, or else the first one, among those
//    with the expected shape. If none of the chatroom's own keys with a name
//    has the expected shape, one of them is kept anyway (and reported):
//    rotating doesn't change the shape of keys, so flagging it would only
//    rotate the keys again and again.
//  - `unexpected`: keys that no legitimate operation adds (e.g., a key that a
//    member added while holding the chatroom CSK, to keep access after leaving)
//  - `unknown`: keys that older versions added, own keys kept without the
//    expected shape, and foreign keys that we can't check yet (see
//    `matchesForeignContract`), which are only reported
// Nothing is returned for chatrooms that aren't our private group chatrooms.
export function classifyChatRoomKeys (
  state: ?Object, ourIdentityContractID: string, groupID: string, chatRoomID: string,
  haveSecretKey: (keyId: string) => boolean
): { kept: { [name: string]: string }, unexpected: string[], unknown: string[] } {
  const result = { kept: {}, unexpected: [], unknown: [] }
  if (!state || !isOurPrivateGroupChatRoom(state, ourIdentityContractID, groupID, chatRoomID)) return result
  const keys: Object[] = (Object.values(state[chatRoomID]._vm.authorizedKeys || {}): any)
    .filter((key) => key._notAfterHeight == null)
  const roles = new Map(keys.map((key) => [key, chatRoomKeyRole(state, groupID, key, true)]))
  const groupKeys = state[groupID]._vm?.authorizedKeys || {}

  for (const name of UNIQUE_KEY_NAMES) {
    const withName = keys.filter((key) => key.name === name)
    const withRole = withName.filter((key) => roles.get(key))
    const candidates = withRole.length || GROUP_KEYS[name] ? withRole : withName
    const kept = (
      (GROUP_KEYS[name] && candidates.find((key) => {
        const groupKey = groupKeys[key.id]
        return groupKey?._notAfterHeight == null && groupKey?.name === GROUP_KEYS[name].keyName
      })) ||
      candidates.find((key) => haveSecretKey(key.id)) ||
      candidates[0]
    )
    if (kept) result.kept[name] = kept.id
  }

  for (const key of keys) {
    const role = roles.get(key)
    if (UNIQUE_KEY_NAMES.includes(key.name) && result.kept[key.name] !== key.id) {
      result.unexpected.push(key.id)
    } else if (role === 'legacy' || role === 'unverified' || (!role && UNIQUE_KEY_NAMES.includes(key.name))) {
      result.unknown.push(key.id)
    } else if (!role) {
      result.unexpected.push(key.id)
    }
  }
  return result
}

// Keys that were removed after `height` (the height of the current chatroom
// keys) and that weren't legitimate, i.e., unexpected keys that someone may
// have used while the current keys were valid. Not included: keys replaced in
// the same message (by a rotation, or by updating a group key), keys removed in
// the message that rotated the keys (at `height`, so nobody could use them
// with the current keys), and member keys, which `formerMembersWithCurrentKeys`
// covers.
export function unexpectedKeysRemovedSince (state: ?Object, groupID: string, chatRoomID: string, height: number): string[] {
  if (!state) return []
  const keys: Object[] = (Object.values(state[chatRoomID]?._vm?.authorizedKeys || {}): any)
  const replacements = new Set(keys.map((key) => `${key.name}|${key._notBeforeHeight}`))
  return keys.filter((key) =>
    key._notAfterHeight != null && key._notAfterHeight > height &&
    !replacements.has(`${key.name}|${key._notAfterHeight}`) &&
    chatRoomKeyRole(state, groupID, key, false) !== 'member'
  ).map((key) => key.id)
}

// Whether the keys of one of our private group chatrooms must be rotated:
// former members still hold them, or someone may have used a key that no
// legitimate operation adds while they were valid
export function chatRoomKeysNeedRotation (
  state: ?Object, ourIdentityContractID: string, groupID: string, chatRoomID: string,
  haveSecretKey: (keyId: string) => boolean
): boolean {
  if (!state || !isOurPrivateGroupChatRoom(state, ourIdentityContractID, groupID, chatRoomID)) return false
  const { kept, unexpected } = classifyChatRoomKeys(state, ourIdentityContractID, groupID, chatRoomID, haveSecretKey)
  const height = currentKeysHeight(state[chatRoomID], kept.cek, kept.csk)
  return unexpected.length > 0 ||
    formerMembersWithCurrentKeys(state[chatRoomID], height).length > 0 ||
    unexpectedKeysRemovedSince(state, groupID, chatRoomID, height).length > 0
}
