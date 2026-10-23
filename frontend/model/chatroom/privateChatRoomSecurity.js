'use strict'

import { SPMessage } from '@chelonia/lib/SPMessage'
import { encryptedOutgoingData } from '@chelonia/lib/encryptedData'
import { findKeyIdByName } from '@chelonia/lib/utils'
import { CHATROOM_PRIVACY_LEVEL, CHATROOM_TYPES, PROFILE_STATUS } from '~/frontend/model/contracts/shared/constants.js'
import { GROUP_CEK_ALLOWED_ACTIONS, GROUP_CEK_PERMISSIONS, GROUP_CSK_ALLOWED_ACTIONS, GROUP_CSK_PERMISSIONS, MEMBER_KEY_PERMISSIONS } from './keyShapes.js'

// Private group chatrooms have their own keys, and their membership is managed
// through the group: the group contract records who is a member of each of its
// chatrooms. These functions only read contract state, so that they can be
// used with both the Chelonia and the Vuex state, as well as in unit tests
// (`keyRemovalEntries` also prepares the encrypted entries of a key removal).

type ParsedForeignKey = { contractID: string, keyName: ?string }

// The checks below run for every chatroom event and look at each foreign key
// several times, so each key's parsed `foreignKey` is cached. The `foreignKey`
// that was parsed is stored with it, in case the key object is changed.
const parsedForeignKeys: WeakMap<Object, { foreignKey: mixed, parsed: ?ParsedForeignKey }> = new WeakMap()
const parseForeignKeyURL = (key: Object): ?ParsedForeignKey => {
  const cached = parsedForeignKeys.get(key)
  if (cached && cached.foreignKey === key.foreignKey) return cached.parsed
  let parsed
  try {
    // Chelonia does `new URL(key.foreignKey)`, which converts non-strings
    const url = new URL(String(key.foreignKey))
    parsed = { contractID: url.pathname, keyName: url.searchParams.get('keyName') }
  } catch (e) {
    parsed = undefined
  }
  parsedForeignKeys.set(key, { foreignKey: key.foreignKey, parsed })
  return parsed
}

// The contract and the key name that a foreign key points to
const parseForeignKey = (key: ?Object): ?ParsedForeignKey => {
  if (!key || typeof key.foreignKey !== 'string') return undefined
  return parseForeignKeyURL(key)
}

// Whether `key` can be removed with `OP_KEY_DEL` once the removal is
// processed. Removing a foreign key that doesn't name both a contract and a
// key throws while the removal is processed, which makes the whole message
// invalid (including a key rotation that the removal is part of). `OP_KEY_ADD`
// doesn't check this, so a member holding the chatroom CSK can add such a key.
// This mirrors Chelonia's checks. Building the removal can fail too, for keys
// that were added encrypted, which `keyRemovalEntries` takes care of.
export const isRemovableKey = (key: ?Object): boolean => {
  if (!key?.foreignKey) return true
  const parsed = parseForeignKeyURL(key)
  return !!parsed?.contractID && !!parsed.keyName
}

// The entries of an `OP_KEY_DEL` that removes `keyIds` from a chatroom whose
// state is `chatRoomState`. Removing a key that was added encrypted
// (`_private`) must be encrypted as well, with any key, but
// `chelonia/out/keyDel` encrypts it with the key that it was added with, which
// fails once that key is removed without another key taking its name. Anyone
// holding the chatroom CSK can arrange that, and so make removing the key (and
// any rotation or leave that removes it) impossible. So such removals are
// encrypted with `encryptionKeyId` instead, which must be a current key that
// everyone who processes the removal holds. `stateOrContractID` is what the
// encrypted data is resolved with when it's serialized (the contract ID, in
// the app).
export const keyRemovalEntries = (
  stateOrContractID: string | Object, chatRoomState: ?Object, keyIds: string[], encryptionKeyId: ?string
): Array<string | Object> => {
  const authorizedKeys = chatRoomState?._vm?.authorizedKeys || {}
  return keyIds.map((id) => authorizedKeys[id]?._private && encryptionKeyId
    ? encryptedOutgoingData(stateOrContractID, encryptionKeyId, id)
    : id)
}

// The current foreign keys that point to `memberID` and that a key at
// `signingRingLevel` can remove with `OP_KEY_DEL`: the `foreignKey` must be a
// string naming a contract and a key (see `isRemovableKey`), and the key's
// ring level can't be below the signing key's. Chelonia rejects a `keyDel`
// that breaks either rule, taking the whole message with it, and anyone
// holding the chatroom CSK (ring 0) can add keys pointing to any member at
// ring 0, while group chatroom leaves are signed with the `group-csk`
// (ring 2). The substring match is Chelonia's
// (`findForeignKeysByContractID`), whose `foreignKey?.includes` would also
// throw on a non-string `foreignKey`.
export const removableForeignKeysOf = (chatRoomState: ?Object, memberID: string, signingRingLevel: number): string[] => {
  const authorizedKeys = chatRoomState?._vm?.authorizedKeys || {}
  return (Object.values(authorizedKeys): any)
    .filter((key: Object) =>
      key._notAfterHeight == null &&
      typeof key.foreignKey === 'string' && key.foreignKey.includes(memberID) &&
      isRemovableKey(key) &&
      Number.isSafeInteger(key.ringLevel) && key.ringLevel >= signingRingLevel)
    .map((key: Object) => key.id)
}

// The member that `key` belongs to, if it's the kind of key that members add
// to the chatroom when joining: a foreign key of their identity contract,
// named `${memberID}/…`
const memberKeyOwner = (key: Object): ?string => {
  const owner = parseForeignKey(key)?.contractID
  return owner && typeof key.name === 'string' && key.name.startsWith(`${owner}/`) ? owner : undefined
}

// Whether `memberID` has left the chatroom. Chatroom contract versions 2.0.0
// and 2.0.1 deleted members who left from `members` instead of marking them
// as having left, so members missing from `members` count as having left too.
const hasLeftChatRoom = (members: Object, memberID: string): boolean =>
  !members[memberID] || members[memberID].hasLeft === true

// The height at which the current chatroom keys became valid: the earliest of
// the CEK's and the CSK's, as they're rotated together. It's 0 if a key or its
// height is missing (`Math.min` then returns `NaN`). That errs on the side of
// rotating, as every former member who ever had a key then counts as holding
// the current keys (see `formerMembersWithCurrentKeys`).
export function currentKeysHeight (chatRoomState: ?Object, CEKid: ?string, CSKid: ?string): number {
  const keys = chatRoomState?._vm?.authorizedKeys || {}
  const heightOf = (id: ?string): number => id ? keys[id]?._notBeforeHeight : NaN
  return Math.min(heightOf(CEKid), heightOf(CSKid)) || 0
}

// Whether `key` is a former member's key (see `memberKeyOwner`) that Chelonia
// can remove (see `isRemovableKey`)
const isRemovableFormerMemberKey = (members: Object, key: Object): boolean => {
  const owner = memberKeyOwner(key)
  return !!owner && hasLeftChatRoom(members, owner) && isRemovableKey(key)
}

// Former members of a chatroom whose keys are still current, meaning that the
// chatroom keys must be rotated. `height` is the height at which the current
// chatroom CEK and CSK became valid. A former member's key is still current if
// it hasn't been removed yet, or if it was removed at or after `height`.
// "At" matters: a key removed in the same message that rotated the keys (e.g.,
// a leave that includes the leaver's own rotation) still counts.
// Keys that can't be removed (see `isRemovableKey`) don't count: rotating
// can't change that they're current, so counting them would rotate the keys
// again and again, and former members don't get the new keys anyway.
// This runs for every chatroom event, so each key is looked at only once.
export function formerMembersWithCurrentKeys (chatRoomState: ?Object, height: number): string[] {
  const members = chatRoomState?.members
  if (!members) return []
  const owners: Set<string> = new Set()
  for (const key of (Object.values(chatRoomState?._vm?.authorizedKeys || {}): any)) {
    if (key._notAfterHeight != null && key._notAfterHeight < height) continue
    const owner = memberKeyOwner(key)
    if (owner && isRemovableFormerMemberKey(members, key)) owners.add(owner)
  }
  return [...owners]
}

// IDs of former members' keys that haven't been removed from the chatroom.
// These must be removed before rotating the chatroom keys (in a separate
// message, see `formerMembersWithCurrentKeys`); otherwise, their former owners
// would still be considered to hold the current keys after the rotation, and
// the keys would be rotated again. Keys that can't be removed aren't included
// (see `isRemovableKey`).
export function formerMemberKeyIdsToRemove (chatRoomState: ?Object): string[] {
  const members = chatRoomState?.members
  if (!members) return []
  const authorizedKeys = chatRoomState?._vm?.authorizedKeys || {}
  return Object.keys(authorizedKeys).filter((id) => {
    const key = authorizedKeys[id]
    return key._notAfterHeight == null && isRemovableFormerMemberKey(members, key)
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
    !hasLeftChatRoom(members, memberID) &&
    groupMembers[memberID]?.status !== PROFILE_STATUS.ACTIVE
  )
}

// Whether `key` was added while another current key had its name, rather than
// in the message that removed that key (as rotations do). Keys whose heights
// aren't numbers don't count as added next to another key.
const isAddedNextToCurrentKey = (keys: Object[], key: Object): boolean =>
  keys.some((other) => other !== key && other.name === key.name &&
    other._notBeforeHeight < key._notBeforeHeight &&
    (other._notAfterHeight == null || other._notAfterHeight > key._notBeforeHeight))

// Whether `keyId` is a CEK of the contract whose state is `contractState` that
// its legitimate events can be encrypted with: a key named `cek` (which isn't
// a foreign key), other than one added while another `cek` was current, which
// is what someone holding the contract's CSK can do
const isLegitimateCEK = (contractState: ?Object, keyId: string): boolean => {
  const keys = contractState?._vm?.authorizedKeys || {}
  const key = keys[keyId]
  return key?.name === 'cek' && key.foreignKey == null &&
    Array.isArray(key.purpose) && key.purpose.includes('enc') &&
    !isAddedNextToCurrentKey((Object.values(keys): any), key)
}

// Events that we couldn't decrypt are skipped, so our view of a contract is
// incomplete until we receive the missing keys (which re-syncs it). Chelonia
// records the ID of any key that we don't hold, before checking that it may
// be used, so anyone who can send events to a contract can add IDs, including
// made-up ones and keys that they added. Those don't mean that our view is
// incomplete, as no legitimate event is encrypted with them. This returns the
// IDs that do: the contract's own CEKs (see `isLegitimateCEK`) and, for a
// group chatroom (if `groupID` is given), its `group-cek` keys that are CEKs
// of the group.
// Skipping an event can only hold back a change, never make one, so this only
// matters for decisions that a missed event could turn against someone (see
// `ourPrivateGroupChatRoomMembersToRemove` and `chatRoomRotationReasons`).
export function missingLegitimateKeyIds (rootState: ?Object, contractID: string, groupID?: ?string): string[] {
  const missing = rootState?.contracts?.[contractID]?.missingDecryptionKeyIds
  if (!Array.isArray(missing) || !missing.length) return []
  const contractState = rootState?.[contractID]
  return missing.filter((keyId) => isLegitimateCEK(contractState, keyId) || (
    !!groupID && contractState?._vm?.authorizedKeys?.[keyId]?.name === 'group-cek' &&
    isLegitimateCEK(rootState?.[groupID], keyId)
  ))
}

// Whether `chatRoomID` is a private chatroom of `groupID` (i.e., not a DM, and
// the group that it belongs to, see `chatRoomGroupID`), which we're a member
// of according to both the group and the chatroom. Whether our copies of the
// chatroom and of the group are complete is checked by the decisions that
// need it (see `missingLegitimateKeyIds`).
export function isOurPrivateGroupChatRoom (rootState: ?Object, ourIdentityContractID: string, groupID: string, chatRoomID: string): boolean {
  const ourGroup = rootState?.[ourIdentityContractID]?.groups?.[groupID]
  const record = rootState?.[groupID]?.chatRooms?.[chatRoomID]
  const chatRoomState = rootState?.[chatRoomID]
  return !!ourGroup && !ourGroup.hasLeft &&
    chatRoomGroupID(rootState, ourIdentityContractID, chatRoomID) === groupID &&
    !!record && !record.deletedDate &&
    record.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE &&
    record.members?.[ourIdentityContractID]?.status === PROFILE_STATUS.ACTIVE &&
    !!chatRoomState?._vm &&
    chatRoomState.attributes?.type === CHATROOM_TYPES.GROUP &&
    chatRoomState.attributes?.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE &&
    !!chatRoomState.members && !hasLeftChatRoom(chatRoomState.members, ourIdentityContractID)
}

// The members to remove from one of our private group chatrooms: those that it
// lists but its group doesn't (see `membersMissingFromGroup`). None if
// `chatRoomID` isn't one of those chatrooms (see `isOurPrivateGroupChatRoom`),
// which also means that we're never among them.
// None while our copy of the group is incomplete either: we could have missed
// the group adding someone back. A chatroom event that we missed can't make
// us remove someone who should stay (if we missed their leave, removing them
// again fails), so our copy of the chatroom can be incomplete.
export function ourPrivateGroupChatRoomMembersToRemove (rootState: ?Object, ourIdentityContractID: string, groupID: string, chatRoomID: string): string[] {
  if (!rootState || !isOurPrivateGroupChatRoom(rootState, ourIdentityContractID, groupID, chatRoomID)) return []
  if (missingLegitimateKeyIds(rootState, groupID).length) return []
  return membersMissingFromGroup(rootState[chatRoomID], rootState[groupID].chatRooms[chatRoomID])
}

// All of the chatrooms for which `isOurPrivateGroupChatRoom` is true
export function privateGroupChatRoomsToCheck (rootState: ?Object, ourIdentityContractID: string): Array<{ groupID: string, chatRoomID: string }> {
  const groups = rootState?.[ourIdentityContractID]?.groups || {}
  return Object.keys(groups).flatMap((groupID) =>
    Object.keys(rootState?.[groupID]?.chatRooms || {})
      .filter((chatRoomID) => isOurPrivateGroupChatRoom(rootState, ourIdentityContractID, groupID, chatRoomID))
      .map((chatRoomID) => ({ groupID, chatRoomID }))
  )
}

// The private chatrooms of `groupID` that have members to remove (see
// `ourPrivateGroupChatRoomMembersToRemove`), for example, because their
// removal through the group didn't reach the chatroom. This runs for every
// group event, so the group's records are looked at first.
export function ourPrivateGroupChatRoomsWithMembersToRemove (rootState: ?Object, ourIdentityContractID: string, groupID: string): Array<{ chatRoomID: string, toRemove: string[] }> {
  const records = rootState?.[groupID]?.chatRooms || {}
  return Object.keys(records).flatMap((chatRoomID) => {
    const record = records[chatRoomID]
    if (
      record?.privacyLevel !== CHATROOM_PRIVACY_LEVEL.PRIVATE || record.deletedDate ||
      record.members?.[ourIdentityContractID]?.status !== PROFILE_STATUS.ACTIVE ||
      !membersMissingFromGroup(rootState?.[chatRoomID], record).length
    ) return []
    const toRemove = ourPrivateGroupChatRoomMembersToRemove(rootState, ourIdentityContractID, groupID, chatRoomID)
    return toRemove.length ? [{ chatRoomID, toRemove }] : []
  })
}

// Whether a key request for `chatRoomID` comes from someone that the group
// lists as removed from that chatroom (e.g., a former member who re-joined the
// chatroom directly). Someone the group has no record of isn't included: that
// can be a new member whose addition we haven't received yet.
export function isKeyRequestFromRemovedMember (rootState: ?Object, ourIdentityContractID: string, chatRoomID: string, requesterID: string): boolean {
  const groupID = chatRoomGroupID(rootState, ourIdentityContractID, chatRoomID)
  const record = groupID ? rootState?.[groupID]?.chatRooms?.[chatRoomID] : undefined
  const requester = record?.members?.[requesterID]
  return record?.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE &&
    !!requester && requester.status !== PROFILE_STATUS.ACTIVE
}

// Keys of private group chatrooms. Every chatroom member holds the chatroom's
// CSK, which can add, update and remove any key, so the keys are checked
// against the shapes that legitimate operations produce.

// The chatroom's own keys, which it's created with, and their purposes
const OWN_KEY_PURPOSES: { [name: string]: string } = { 'csk': 'sig', 'cek': 'enc', '#sak': 'sak' }
// The group's CSK and CEK, as added to its private chatrooms, and the
// `groupKey` that versions from 2023 added (the same mirror of the group's
// CSK, with the permissions of that time). Permissions and actions are the
// most that any version has given them, which are those that keys are added
// with now (see 'frontend/model/chatroom/keyShapes.js').
const GROUP_KEYS: { [name: string]: { keyName: string, purpose: string, permissions: string[], allowedActions: string[] } } = {
  'group-csk': {
    keyName: 'csk',
    purpose: 'sig',
    permissions: GROUP_CSK_PERMISSIONS,
    allowedActions: GROUP_CSK_ALLOWED_ACTIONS
  },
  'group-cek': {
    keyName: 'cek',
    purpose: 'enc',
    permissions: GROUP_CEK_PERMISSIONS,
    allowedActions: GROUP_CEK_ALLOWED_ACTIONS
  },
  'groupKey': {
    keyName: 'csk',
    purpose: 'sig',
    permissions: [SPMessage.OP_ACTION_ENCRYPTED],
    allowedActions: ['gi.contracts/chatroom/leave']
  }
}
const GROUP_KEY_NAMES = Object.keys(GROUP_KEYS)
// Names whose current key is unique: the chatroom's own keys and the group's
const UNIQUE_KEY_NAMES = [...Object.keys(OWN_KEY_PURPOSES), ...GROUP_KEY_NAMES]

// The group (among ours) that a group chatroom belongs to, according to the
// chatroom's own keys. Any member of a group can list any chatroom ID in it
// (`gi.contracts/group/addChatRoom` doesn't check), and add any other member
// of the group to it (`gi.contracts/group/joinChatRoom`). So the groups that
// list a chatroom can't be trusted to own it: if another of our groups listed
// it, the chatroom would be checked against that group's members, which would
// remove the chatroom's actual members. Only those holding the chatroom keys
// can add keys to it, so the group is the one that the chatroom's earliest
// group keys (`group-csk`, `group-cek` or the older `groupKey`) point to,
// i.e., the group that it was created with (if those keys disagree, the one
// of our groups that they point to, if there's just one). Removed keys count
// as well, as group keys are replaced whenever the group's keys are rotated.
// Without such keys, it's the only one of our groups that lists the chatroom,
// if there's only one.
// Someone holding the chatroom CSK could still change this, by re-adding a
// removed group key under the same ID (Chelonia keeps the key's earliest
// height) pointing to another group. They can remove members anyway.
export function chatRoomGroupID (rootState: ?Object, ourIdentityContractID: string, chatRoomID: string): ?string {
  const candidates = Object.keys(rootState?.[ourIdentityContractID]?.groups || {})
    .filter((groupID) => !!rootState?.[groupID]?.chatRooms?.[chatRoomID])
  let earliestHeight = Infinity
  let earliest: Set<string> = new Set()
  for (const key of (Object.values(rootState?.[chatRoomID]?._vm?.authorizedKeys || {}): any)) {
    if (!GROUP_KEY_NAMES.includes(key.name)) continue
    const contractID = parseForeignKey(key)?.contractID
    if (!contractID) continue
    const height = Number.isFinite(key._notBeforeHeight) ? key._notBeforeHeight : Infinity
    if (height < earliestHeight || !earliest.size) {
      earliestHeight = height
      earliest = new Set([contractID])
    } else if (height === earliestHeight) {
      earliest.add(contractID)
    }
  }
  if (earliest.size) {
    const owners = [...earliest].filter((groupID) => candidates.includes(groupID))
    return owners.length === 1 ? owners[0] : undefined
  }
  return candidates.length === 1 ? candidates[0] : undefined
}
// The `#joinKey-<id>` keys that versions from 2023 added: the name is bound
// to the key's id, and the key could only request keys. A key with such a
// name but other powers was added by someone holding the chatroom CSK.
const isLegacyJoinKey = (key: Object): boolean =>
  key.name === `#joinKey-${key.id}` &&
    key.ringLevel === Number.MAX_SAFE_INTEGER && isExactly(key.purpose, ['sig']) &&
    isSubsetOf(key.permissions, [SPMessage.OP_KEY_REQUEST]) &&
    key.allowedActions == null && key.foreignKey == null

const isSubsetOf = (values: mixed, allowed: string[]): boolean =>
  Array.isArray(values) && values.every((value) => allowed.includes(value))
const isExactly = (values: mixed, expected: string[]): boolean =>
  Array.isArray(values) && values.length === expected.length && isSubsetOf(values, expected)

// Whether a foreign key is the key that it claims to be in the contract it
// points to. If we don't have that contract's state, we can't tell, and the
// key is accepted. If we have it but the key isn't there, we can't tell either
// (`undefined`): our copy of that contract may be behind, e.g., if the key was
// just rotated.
const matchesForeignContract = (rootState: Object, key: Object, contractID: string, keyName: string): ?boolean => {
  const foreignKeys = rootState[contractID]?._vm?.authorizedKeys
  if (!foreignKeys) return true
  const foreignKey = foreignKeys[key.id]
  if (!foreignKey) return undefined
  return foreignKey.name === keyName && foreignKey.data === key.data
}

// The role of a foreign key whose shape matches `role`, after checking it
// against the contract that it points to if `checkForeign` is set
const foreignKeyRole = (rootState: Object, key: Object, role: string, contractID: string, keyName: string, checkForeign: boolean): ?string => {
  if (!checkForeign) return role
  const matches = matchesForeignContract(rootState, key, contractID, keyName)
  return matches === true ? role : matches === false ? undefined : 'unverified'
}

// The role of a key of a private group chatroom, if it has the shape that
// legitimate operations give keys in that role:
//  - 'own': the chatroom's own CSK, CEK and SAK
//  - 'group': the group's CSK and CEK
//  - 'member': the key that a member added when joining
//  - 'legacy': keys that older versions added (`#joinKey-<id>`; the old
//    `groupKey` is a group key, above)
// `checkForeign` also checks that foreign keys match the contracts that they
// point to. Those that we can't check get the 'unverified' role.
// Permissions aren't checked for the chatroom's own keys: those are the most
// powerful keys anyway, and their permissions changed over time (see
// `gi.actions/chatroom/upgradeCekPermissions`). Chatrooms created before April
// 2024 have them at ring level 1.
const chatRoomKeyRole = (rootState: Object, groupID: string, key: Object, checkForeign: boolean): ?string => {
  const name = key.name
  if (Object.keys(OWN_KEY_PURPOSES).includes(name)) {
    return key.foreignKey == null && [0, 1].includes(key.ringLevel) && isExactly(key.purpose, [OWN_KEY_PURPOSES[name]])
      ? 'own'
      : undefined
  }
  if (GROUP_KEY_NAMES.includes(name)) {
    const expected = GROUP_KEYS[name]
    const target = parseForeignKey(key)
    return !!target && target.contractID === groupID && target.keyName === expected.keyName &&
      key.ringLevel === 2 && isExactly(key.purpose, [expected.purpose]) &&
      isSubsetOf(key.permissions, expected.permissions) &&
      isSubsetOf(key.allowedActions, expected.allowedActions)
      ? foreignKeyRole(rootState, key, 'group', groupID, expected.keyName, checkForeign)
      : undefined
  }
  const owner = memberKeyOwner(key)
  if (owner) {
    // Member keys can only be used for inner signatures (older versions gave
    // them no permissions at all)
    return parseForeignKey(key)?.keyName === 'csk' &&
      key.ringLevel === Number.MAX_SAFE_INTEGER && isExactly(key.purpose, ['sig']) &&
      isSubsetOf(key.permissions, MEMBER_KEY_PERMISSIONS)
      ? foreignKeyRole(rootState, key, 'member', owner, 'csk', checkForeign)
      : undefined
  }
  return isLegacyJoinKey(key) ? 'legacy' : undefined
}

export type ClassifiedChatRoomKeys = { kept: { [name: string]: string }, unexpected: string[], unknown: string[] }

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
//    expected shape, foreign keys that we can't check yet (see
//    `matchesForeignContract`), and keys that would be unexpected but that
//    Chelonia can't remove (see `isRemovableKey`), which are only reported.
//    Asking to remove one would make the message invalid, so a rotation that
//    removed it could never be sent.
// Nothing is returned for chatrooms that aren't our private group chatrooms.
export function classifyChatRoomKeys (
  rootState: ?Object, ourIdentityContractID: string, groupID: string, chatRoomID: string,
  haveSecretKey: (keyId: string) => boolean
): ClassifiedChatRoomKeys {
  if (!rootState || !isOurPrivateGroupChatRoom(rootState, ourIdentityContractID, groupID, chatRoomID)) return { kept: {}, unexpected: [], unknown: [] }
  return classifyKeys(rootState, groupID, chatRoomID, haveSecretKey)
}

// `classifyChatRoomKeys`, for a chatroom known to be one of our private group
// chatrooms
const classifyKeys = (
  rootState: Object, groupID: string, chatRoomID: string, haveSecretKey: (keyId: string) => boolean
): ClassifiedChatRoomKeys => {
  const result = { kept: {}, unexpected: [], unknown: [] }
  const keys: Object[] = (Object.values(rootState[chatRoomID]._vm.authorizedKeys || {}): any)
    .filter((key) => key._notAfterHeight == null)
  const roles = new Map(keys.map((key) => [key, chatRoomKeyRole(rootState, groupID, key, true)]))
  const groupKeys = rootState[groupID]._vm?.authorizedKeys || {}

  for (const name of UNIQUE_KEY_NAMES) {
    const withName = keys.filter((key) => key.name === name)
    const withRole = withName.filter((key) => roles.get(key))
    const candidates = (withRole.length || GROUP_KEYS[name]) ? withRole : withName
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
    const isUniqueName = UNIQUE_KEY_NAMES.includes(key.name)
    if (isUniqueName ? result.kept[key.name] !== key.id : !role) {
      (isRemovableKey(key) ? result.unexpected : result.unknown).push(key.id)
    } else if (role === 'legacy' || role === 'unverified' || !role) {
      result.unknown.push(key.id)
    }
  }
  return result
}

// Keys other than member keys that were removed after `height` (the height of
// the current chatroom keys), which someone may have used while the current
// keys were valid. Not included: keys replaced in the same message (by a
// rotation, or by updating a group key), keys removed in the message that
// rotated the keys (at `height`, so nobody could use them with the current
// keys), and member keys, which `formerMembersWithCurrentKeys` covers.
// Legitimate keys removed without being replaced (e.g., keys from older
// versions) are included too, which only costs a rotation.
// A key added and removed in the same message doesn't count as replacing
// anything: it could otherwise hide a key with the same name removed in that
// message, including itself.
export function nonMemberKeysRemovedSince (rootState: ?Object, groupID: string, chatRoomID: string, height: number): string[] {
  if (!rootState) return []
  const keys: Object[] = (Object.values(rootState[chatRoomID]?._vm?.authorizedKeys || {}): any)
  const replacements = new Set(keys
    .filter((key) => key._notAfterHeight == null || key._notAfterHeight > key._notBeforeHeight)
    .map((key) => `${key.name}|${key._notBeforeHeight}`))
  return keys.filter((key) =>
    key._notAfterHeight != null && key._notAfterHeight > height &&
    !replacements.has(`${key.name}|${key._notAfterHeight}`) &&
    chatRoomKeyRole(rootState, groupID, key, false) !== 'member'
  ).map((key) => key.id)
}

// The chatroom keys that rotations replace
export const ROTATED_KEY_NAMES = ['cek', 'csk']

// Whether Chelonia's lookups by name return the keys kept (see
// `classifyChatRoomKeys`) for the keys that rotations replace. Keys are marked
// for rotation using those lookups, and those that aren't the keys given are
// skipped (`chelonia/contract/setPendingKeyRevocation`), so otherwise a
// rotation would leave out the keys kept. Another key with the same name comes
// first once a rotation has happened after it was added, as rotating adds the
// new keys last.
export function lookupsReturnKeptKeys (chatRoomState: ?Object, classified: ClassifiedChatRoomKeys): boolean {
  return !!chatRoomState && ROTATED_KEY_NAMES.every((name) => findKeyIdByName(chatRoomState, name) === classified.kept[name])
}

export type RemovalSigningKey = { signingKeyId: string, keepSigningKey: boolean }

// The key that removals of members from one of our private group chatrooms are
// signed with: the first current `group-csk`, or else the first current
// `csk`, if we hold it, which is what 'gi.actions/chatroom/leave' picks, and
// otherwise the CSK that the classification keeps (see
// `classifyChatRoomKeys`), if we hold it, which the leave must then keep
// (`keepSigningKey`). Anyone holding the chatroom CSK can add keys with these
// names that nobody else holds, and that come first once the keys they were
// added next to are replaced (e.g., by a rotation).
export function removalSigningKey (
  chatRoomState: ?Object, classified: ClassifiedChatRoomKeys, haveSecretKey: (keyId: string) => boolean
): ?RemovalSigningKey {
  if (!chatRoomState) return undefined
  const firstIfHeld = (name: string): ?string => {
    const id = findKeyIdByName(chatRoomState, name)
    return id && haveSecretKey(id) ? id : undefined
  }
  const signingKeyId = firstIfHeld('group-csk') || firstIfHeld('csk')
  if (signingKeyId) return { signingKeyId, keepSigningKey: false }
  const keptCSKid = classified.kept.csk
  return keptCSKid && haveSecretKey(keptCSKid) ? { signingKeyId: keptCSKid, keepSigningKey: true } : undefined
}

// Keys named like the ones that rotations replace, which a rotation cannot
// replace: besides the one kept, keys that Chelonia can't remove (see
// `isRemovableKey`), and the one kept itself if it has a `foreignKey`
// (`OP_KEY_UPDATE` keeps the `foreignKey`, and throws on one that doesn't name
// a key). The keys mustn't be rotated while there are any: rotating adds the
// new keys after them, and Chelonia's lookups by name return the first
// current key with a name, so the new keys would never be used: messages
// would be encrypted to a CEK that only whoever added it holds, or signed
// with a CSK that nobody else holds. Rotations are refused while there are
// any, and the keys are reported. Until Chelonia can remove such keys (which
// needs a change in Chelonia: `OP_KEY_DEL` rejects foreign keys that don't
// name both a contract and a key, and `OP_KEY_ADD` accepts them; see the
// Chelonia issue "Keys that can be added to a contract but never removed"), a
// member who adds one named like these and then leaves keeps reading the
// channel, which is preferred over losing the channel's messages or the
// ability to send altogether. With any other name, such a key never blocks
// anything, but it is never removed either: if it's a signing key with enough
// permissions, whoever added it can keep using it.
export function keysBlockingRotation (rootState: ?Object, chatRoomID: string, classified: ClassifiedChatRoomKeys): string[] {
  const keys = rootState?.[chatRoomID]?._vm?.authorizedKeys || {}
  const blocks = (id: string): boolean => {
    const key = keys[id]
    if (!ROTATED_KEY_NAMES.includes(key?.name)) return false
    return classified.kept[key.name] === id ? key.foreignKey != null : !isRemovableKey(key)
  }
  return [...new Set([
    ...classified.unknown,
    ...ROTATED_KEY_NAMES.map((name) => classified.kept[name])
  ])].filter(blocks)
}

export type ChatRoomRotationReasons = { unexpected: string[], formerMembers: string[], removedSince: string[] }

// Why the keys of one of our private group chatrooms must be rotated, if they
// must: keys that no legitimate operation adds are current (`unexpected`),
// former members still hold them (`formerMembers`), or keys other than member
// keys were removed while they were valid (`removedSince`, see
// `nonMemberKeysRemovedSince`). Each list is sorted, so that the same reasons
// compare equal. Nothing is returned while some key blocks rotations (see
// `keysBlockingRotation`), as rotating would only make things worse.
// Former members aren't looked for while our copy of the chatroom is
// incomplete: members missing from `members` count as former members (see
// `hasLeftChatRoom`), so a join that we missed would make a member's key look
// like a former member's, which gets removed before rotating. The other
// reasons come from key operations, which we always see (keys added in
// entries that we can't decrypt are left out of our copy altogether).
// `classified`, if given, is what `classifyChatRoomKeys` returns for the same
// state (so that callers that need it as well don't classify the keys twice).
export function chatRoomRotationReasons (
  rootState: ?Object, ourIdentityContractID: string, groupID: string, chatRoomID: string,
  haveSecretKey: (keyId: string) => boolean, classified?: ClassifiedChatRoomKeys
): ?ChatRoomRotationReasons {
  if (!rootState || !isOurPrivateGroupChatRoom(rootState, ourIdentityContractID, groupID, chatRoomID)) return undefined
  const classifiedKeys = classified || classifyKeys(rootState, groupID, chatRoomID, haveSecretKey)
  if (keysBlockingRotation(rootState, chatRoomID, classifiedKeys).length) return undefined
  const { kept, unexpected } = classifiedKeys
  const height = currentKeysHeight(rootState[chatRoomID], kept.cek, kept.csk)
  const reasons = {
    unexpected: [...unexpected].sort(),
    formerMembers: missingLegitimateKeyIds(rootState, chatRoomID, groupID).length
      ? []
      : formerMembersWithCurrentKeys(rootState[chatRoomID], height).sort(),
    removedSince: nonMemberKeysRemovedSince(rootState, groupID, chatRoomID, height).sort()
  }
  return reasons.unexpected.length || reasons.formerMembers.length || reasons.removedSince.length
    ? reasons
    : undefined
}

// Whether the keys of one of our private group chatrooms must be rotated (see
// `chatRoomRotationReasons`)
export function chatRoomKeysNeedRotation (
  rootState: ?Object, ourIdentityContractID: string, groupID: string, chatRoomID: string,
  haveSecretKey: (keyId: string) => boolean, classified?: ClassifiedChatRoomKeys
): boolean {
  return !!chatRoomRotationReasons(rootState, ourIdentityContractID, groupID, chatRoomID, haveSecretKey, classified)
}

// What a membership check of a chatroom is about: the members to remove, or
// else why its keys need rotating. Checks aren't repeated for the same subject
// for a while (see the `EVENT_HANDLED` handler in
// 'frontend/controller/actions/chatroom.js'), so a rotation that doesn't
// change why the keys need rotating isn't followed by another one.
export const membershipCheckSubject = (toRemove: string[], reasons: ?ChatRoomRotationReasons): string =>
  toRemove.length ? [...toRemove].sort().join(',') : `rotate:${JSON.stringify(reasons ?? null)}`
