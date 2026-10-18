'use strict'

import { SPMessage } from '@chelonia/lib/SPMessage'
import { encryptedOutgoingData } from '@chelonia/lib/encryptedData'
import { findKeyIdByName } from '@chelonia/lib/utils'
import { CHATROOM_PRIVACY_LEVEL, CHATROOM_TYPES, PROFILE_STATUS } from '~/frontend/model/contracts/shared/constants.js'

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

// The entries of an `OP_KEY_DEL` that removes `keyIds` from a contract whose
// state is `state`. Removing a key that was added encrypted (`_private`) must
// be encrypted as well, with any key, but `chelonia/out/keyDel` encrypts it
// with the key that it was added with, which fails once that key is removed
// without another key taking its name. Anyone holding the chatroom CSK can
// arrange that, and so make removing the key (and any rotation or leave that
// removes it) impossible. So such removals are encrypted with
// `encryptionKeyId` instead, which must be a current key that everyone who
// processes the removal holds. `stateOrContractID` is what the encrypted data
// is resolved with when it's serialized (the contract ID, in the app).
export const keyRemovalEntries = (
  stateOrContractID: string | Object, state: ?Object, keyIds: string[], encryptionKeyId: ?string
): Array<string | Object> => {
  const authorizedKeys = state?._vm?.authorizedKeys || {}
  return keyIds.map((keyId) => authorizedKeys[keyId]?._private && encryptionKeyId
    ? encryptedOutgoingData(stateOrContractID, encryptionKeyId, keyId)
    : keyId)
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
export const removableForeignKeysOf = (state: ?Object, memberID: string, signingRingLevel: number): string[] => {
  const authorizedKeys = state?._vm?.authorizedKeys || {}
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
// Keys that can't be removed (see `isRemovableKey`) don't count: rotating
// can't change that they're current, so counting them would rotate the keys
// again and again, and former members don't get the new keys anyway.
// This runs for every chatroom event, so each key is looked at only once.
export function formerMembersWithCurrentKeys (state: ?Object, height: number): string[] {
  const members = state?.members
  if (!members) return []
  const owners: Set<string> = new Set()
  for (const key of (Object.values(state?._vm?.authorizedKeys || {}): any)) {
    if (key._notAfterHeight != null && key._notAfterHeight < height) continue
    const owner = memberKeyOwner(key)
    if (owner && hasLeftChatRoom(members, owner) && isRemovableKey(key)) owners.add(owner)
  }
  return [...owners]
}

// IDs of former members' keys that haven't been removed from the chatroom.
// These must be removed before rotating the chatroom keys (in a separate
// message, see `formerMembersWithCurrentKeys`); otherwise, their former owners
// would still be considered to hold the current keys after the rotation, and
// the keys would be rotated again. Keys that can't be removed aren't included
// (see `isRemovableKey`).
export function formerMemberKeyIdsToRemove (state: ?Object): string[] {
  const members = state?.members
  if (!members) return []
  const authorizedKeys = state?._vm?.authorizedKeys || {}
  return Object.keys(authorizedKeys).filter((keyId) => {
    const key = authorizedKeys[keyId]
    if (key._notAfterHeight != null) return false
    const owner = memberKeyOwner(key)
    return !!owner && hasLeftChatRoom(members, owner) && isRemovableKey(key)
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

// Whether `chatRoomID` is a private chatroom of `groupID` (i.e., not a DM, and
// the group that it belongs to, see `chatRoomGroupID`), which we have
// completely synced (as has its group) and which we're a member of according
// to both the group and the chatroom
export function isOurPrivateGroupChatRoom (state: ?Object, ourIdentityContractID: string, groupID: string, chatRoomID: string): boolean {
  const ourGroup = state?.[ourIdentityContractID]?.groups?.[groupID]
  const record = state?.[groupID]?.chatRooms?.[chatRoomID]
  const chatRoomState = state?.[chatRoomID]
  return hasCompleteState(state, groupID) && hasCompleteState(state, chatRoomID) &&
    !!ourGroup && !ourGroup.hasLeft &&
    chatRoomGroupID(state, ourIdentityContractID, chatRoomID) === groupID &&
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

// The group (among ours) that `chatRoomID` belongs to (see `chatRoomGroupID`)
export function groupIDForChatRoom (state: ?Object, ourIdentityContractID: string, chatRoomID: string): ?string {
  return chatRoomGroupID(state, ourIdentityContractID, chatRoomID)
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
// The group's CSK and CEK, as added to its private chatrooms, and the
// `groupKey` that versions from 2023 added (the same mirror of the group's
// CSK, with the permissions of that time). Permissions and actions are the
// most that any version has given them.
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
export function chatRoomGroupID (state: ?Object, ourIdentityContractID: string, chatRoomID: string): ?string {
  const candidates = Object.keys(state?.[ourIdentityContractID]?.groups || {})
    .filter((groupID) => !!state?.[groupID]?.chatRooms?.[chatRoomID])
  let earliestHeight = Infinity
  let earliest: Set<string> = new Set()
  for (const key of (Object.values(state?.[chatRoomID]?._vm?.authorizedKeys || {}): any)) {
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
// Member keys can only be used for inner signatures (older versions gave them
// no permissions at all)
const MEMBER_KEY_PERMISSIONS = [SPMessage.OP_ACTION_ENCRYPTED + '#inner']
// The `#joinKey-<id>` keys that versions from 2023 added: the name is bound
// to the key's id, and the key could only request keys. A key with such a
// name but other powers was added by someone holding the chatroom CSK.
const isLegacyJoinKey = (key: Object): boolean =>
  typeof key.name === 'string' && key.name === `#joinKey-${key.id}` &&
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
//  - 'legacy': keys that older versions added (`#joinKey-<id>`; the old
//    `groupKey` is a group key, above)
// `checkForeign` also checks that foreign keys match the contracts that they
// point to. Those that we can't check get the 'unverified' role.
// Permissions aren't checked for the chatroom's own keys: those are the most
// powerful keys anyway, and their permissions changed over time (see
// `gi.actions/chatroom/upgradeCekPermissions`). Chatrooms created before April
// 2024 have them at ring level 1.
const chatRoomKeyRole = (state: Object, groupID: string, key: Object, checkForeign: boolean): ?string => {
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
  state: ?Object, ourIdentityContractID: string, groupID: string, chatRoomID: string,
  haveSecretKey: (keyId: string) => boolean
): ClassifiedChatRoomKeys {
  if (!state || !isOurPrivateGroupChatRoom(state, ourIdentityContractID, groupID, chatRoomID)) return { kept: {}, unexpected: [], unknown: [] }
  return classifyKeys(state, groupID, chatRoomID, haveSecretKey)
}

// `classifyChatRoomKeys`, for a chatroom known to be one of our private group
// chatrooms
const classifyKeys = (
  state: Object, groupID: string, chatRoomID: string, haveSecretKey: (keyId: string) => boolean
): ClassifiedChatRoomKeys => {
  const result = { kept: {}, unexpected: [], unknown: [] }
  const keys: Object[] = (Object.values(state[chatRoomID]._vm.authorizedKeys || {}): any)
    .filter((key) => key._notAfterHeight == null)
  const roles = new Map(keys.map((key) => [key, chatRoomKeyRole(state, groupID, key, true)]))
  const groupKeys = state[groupID]._vm?.authorizedKeys || {}

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
export function nonMemberKeysRemovedSince (state: ?Object, groupID: string, chatRoomID: string, height: number): string[] {
  if (!state) return []
  const keys: Object[] = (Object.values(state[chatRoomID]?._vm?.authorizedKeys || {}): any)
  const replacements = new Set(keys
    .filter((key) => key._notAfterHeight == null || key._notAfterHeight > key._notBeforeHeight)
    .map((key) => `${key.name}|${key._notBeforeHeight}`))
  return keys.filter((key) =>
    key._notAfterHeight != null && key._notAfterHeight > height &&
    !replacements.has(`${key.name}|${key._notAfterHeight}`) &&
    chatRoomKeyRole(state, groupID, key, false) !== 'member'
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
// name both a contract and a key, and `OP_KEY_ADD` accepts them), a member who
// adds one named like these and then leaves keeps reading the channel, which
// is preferred over losing the channel's messages or sending altogether. With
// any other name, such a key never blocks anything, but it is never removed
// either: if it's a signing key with enough permissions, whoever added it can
// keep using it.
export function keysBlockingRotation (state: ?Object, chatRoomID: string, classified: ClassifiedChatRoomKeys): string[] {
  const keys = state?.[chatRoomID]?._vm?.authorizedKeys || {}
  const blocks = (keyId: string): boolean => {
    const key = keys[keyId]
    if (!ROTATED_KEY_NAMES.includes(key?.name)) return false
    return classified.kept[key.name] === keyId ? key.foreignKey != null : !isRemovableKey(key)
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
// `classified`, if given, is what `classifyChatRoomKeys` returns for the same
// state (so that callers that need it as well don't classify the keys twice).
export function chatRoomRotationReasons (
  state: ?Object, ourIdentityContractID: string, groupID: string, chatRoomID: string,
  haveSecretKey: (keyId: string) => boolean, classified?: ClassifiedChatRoomKeys
): ?ChatRoomRotationReasons {
  if (!state || !isOurPrivateGroupChatRoom(state, ourIdentityContractID, groupID, chatRoomID)) return undefined
  const classifiedKeys = classified || classifyKeys(state, groupID, chatRoomID, haveSecretKey)
  if (keysBlockingRotation(state, chatRoomID, classifiedKeys).length) return undefined
  const { kept, unexpected } = classifiedKeys
  const height = currentKeysHeight(state[chatRoomID], kept.cek, kept.csk)
  const reasons = {
    unexpected: [...unexpected].sort(),
    formerMembers: formerMembersWithCurrentKeys(state[chatRoomID], height).sort(),
    removedSince: nonMemberKeysRemovedSince(state, groupID, chatRoomID, height).sort()
  }
  return reasons.unexpected.length || reasons.formerMembers.length || reasons.removedSince.length
    ? reasons
    : undefined
}

// Whether the keys of one of our private group chatrooms must be rotated (see
// `chatRoomRotationReasons`)
export function chatRoomKeysNeedRotation (
  state: ?Object, ourIdentityContractID: string, groupID: string, chatRoomID: string,
  haveSecretKey: (keyId: string) => boolean, classified?: ClassifiedChatRoomKeys
): boolean {
  return !!chatRoomRotationReasons(state, ourIdentityContractID, groupID, chatRoomID, haveSecretKey, classified)
}

// What a membership check of a chatroom is about: the members to remove, or
// else why its keys need rotating. Checks aren't repeated for the same subject
// for a while (see the `EVENT_HANDLED` handler in
// 'frontend/controller/actions/chatroom.js'), so a rotation that doesn't
// change why the keys need rotating isn't followed by another one.
export const membershipCheckSubject = (toRemove: string[], reasons: ?ChatRoomRotationReasons): string =>
  toRemove.length ? [...toRemove].sort().join(',') : `rotate:${JSON.stringify(reasons ?? null)}`
