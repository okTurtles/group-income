/* eslint-env mocha */

import { CURVE25519XSALSA20POLY1305, keygen, serializeKey } from '@chelonia/crypto'
import { encryptedOutgoingData } from '@chelonia/lib/encryptedData'
import { SPMessage } from '@chelonia/lib/SPMessage'
import { chatRoomGroupID, chatRoomKeysNeedRotation, chatRoomRotationReasons, classifyChatRoomKeys, currentKeysHeight, formerMemberKeyIdsToRemove, formerMembersWithCurrentKeys, isKeyRequestFromRemovedMember, isOurPrivateGroupChatRoom, isRemovableKey, keyRemovalEntries, keysBlockingRotation, lookupsReturnKeptKeys, membersMissingFromGroup, membershipCheckSubject, missingLegitimateKeyIds, nonMemberKeysRemovedSince, ourPrivateGroupChatRoomMembersToRemove, ourPrivateGroupChatRoomsWithMembersToRemove, privateGroupChatRoomsToCheck, removableForeignKeysOf, removalSigningKey } from './privateChatRoomSecurity.js'
import { CHATROOM_PRIVACY_LEVEL, CHATROOM_TYPES, PROFILE_STATUS } from '~/frontend/model/contracts/shared/constants.js'
import { GROUP_CEK_ALLOWED_ACTIONS, GROUP_CEK_PERMISSIONS, GROUP_CSK_ALLOWED_ACTIONS, GROUP_CSK_PERMISSIONS, MEMBER_KEY_PERMISSIONS } from './keyShapes.js'
const should = require('should')

const MAX = Number.MAX_SAFE_INTEGER
const me = 'me'
const byId = (...keys) => Object.fromEntries(keys.map((key) => [key.id, key]))
// A member's CSK, as added to a chatroom when they join (encrypted with the
// chatroom's `group-cek`, so Chelonia records that key as `_private`)
const memberCSK = (memberID, overrides = {}) => ({
  id: `${memberID}-csk`,
  name: `${memberID}/${memberID}-csk`,
  foreignKey: `shelter:${memberID}?keyName=csk`,
  ringLevel: MAX,
  purpose: ['sig'],
  permissions: [SPMessage.OP_ACTION_ENCRYPTED + '#inner'],
  allowedActions: '*',
  data: `${memberID}-data`,
  _private: 'gcek',
  _notBeforeHeight: 1,
  ...overrides
})
// The same, by ID, removed at height `removed` if given
const memberKey = (memberID, { removed } = {}) => byId(memberCSK(memberID, removed != null ? { _notAfterHeight: removed } : {}))
// A chatroom whose current CEK and CSK became valid at height 10
const chatRoom = (members, ...keys) => ({
  members,
  _vm: {
    authorizedKeys: Object.assign({
      cek: { id: 'cek', name: 'cek', _notBeforeHeight: 10 },
      csk: { id: 'csk', name: 'csk', _notBeforeHeight: 10 }
    }, ...keys)
  }
})
// A group's record of one of its chatrooms, with the members' statuses in
// the chatroom (by member ID)
const chatRoomRecord = (privacyLevel, statuses, { deletedDate = null } = {}) => ({
  privacyLevel,
  deletedDate,
  members: Object.fromEntries(Object.entries(statuses).map(([memberID, status]) => [memberID, { status }]))
})
// A chatroom's own state, once synced
const syncedChatRoom = (privacyLevel, members, { type = CHATROOM_TYPES.GROUP, authorizedKeys } = {}) => ({
  _vm: authorizedKeys ? { authorizedKeys } : {},
  attributes: { type, privacyLevel },
  members
})

describe('formerMembersWithCurrentKeys', () => {
  it('is empty when nobody has left', () => {
    should(formerMembersWithCurrentKeys(chatRoom({ a: {}, b: {} }, memberKey('a'), memberKey('b')), 10)).eql([])
  })

  // Regression test: a member who has just left still has their key, because
  // leaving and removing their key used to be separate messages. The keys must
  // be rotated regardless.
  it('includes a former member whose key has not been removed yet', () => {
    should(formerMembersWithCurrentKeys(chatRoom({ a: {}, b: { hasLeft: true } }, memberKey('a'), memberKey('b')), 10)).eql(['b'])
  })

  // A key removed at the height of the current keys was removed in the message
  // that rotated them (e.g., a leave that includes the leaver's own rotation)
  it('includes a former member whose key was removed at or after the current keys', () => {
    should(formerMembersWithCurrentKeys(chatRoom({ b: { hasLeft: true } }, memberKey('b', { removed: 12 })), 10)).eql(['b'])
    should(formerMembersWithCurrentKeys(chatRoom({ b: { hasLeft: true } }, memberKey('b', { removed: 10 })), 10)).eql(['b'])
  })

  it('excludes a former member whose key was removed before the current keys', () => {
    should(formerMembersWithCurrentKeys(chatRoom({ b: { hasLeft: true } }, memberKey('b', { removed: 8 })), 10)).eql([])
  })

  it('excludes members who re-joined', () => {
    should(formerMembersWithCurrentKeys(chatRoom({ b: {} }, memberKey('b', { removed: 12 })), 10)).eql([])
  })

  it('does not match another member whose ID starts with the former member ID', () => {
    should(formerMembersWithCurrentKeys(chatRoom({ u1: { hasLeft: true }, u10: {} }, memberKey('u1', { removed: 8 }), memberKey('u10')), 10)).eql([])
  })

  // Chatroom contract versions 2.0.0 and 2.0.1 deleted members who left
  // instead of marking them as having left
  it('includes members who were deleted from `members` and still hold the keys', () => {
    should(formerMembersWithCurrentKeys(chatRoom({ a: {} }, memberKey('a'), memberKey('b')), 10)).eql(['b'])
    should(formerMembersWithCurrentKeys(chatRoom({ a: {} }, memberKey('b', { removed: 12 })), 10)).eql(['b'])
    should(formerMembersWithCurrentKeys(chatRoom({ a: {} }, memberKey('b', { removed: 8 })), 10)).eql([])
  })

  it('counts every former member who ever had a key when the key height is unknown', () => {
    const state = chatRoom({ b: { hasLeft: true } }, memberKey('b', { removed: 3 }))
    delete state._vm.authorizedKeys.csk._notBeforeHeight
    should(formerMembersWithCurrentKeys(state, currentKeysHeight(state, 'cek', 'csk'))).eql(['b'])
  })

  it('ignores keys that are not foreign keys', () => {
    const state = chatRoom({ b: { hasLeft: true } }, { x: { id: 'x', name: 'b/x', _notBeforeHeight: 1 } })
    should(formerMembersWithCurrentKeys(state, 10)).eql([])
    should(formerMemberKeyIdsToRemove(state)).eql([])
  })

  it('ignores keys whose name does not match the contract that they point to', () => {
    const state = chatRoom({ b: { hasLeft: true } }, { x: { id: 'x', name: 'b/x', foreignKey: 'shelter:c?keyName=csk', _notBeforeHeight: 1 } })
    should(formerMembersWithCurrentKeys(state, 10)).eql([])
    should(formerMemberKeyIdsToRemove(state)).eql([])
  })

  it('handles a missing state or missing members', () => {
    should(formerMembersWithCurrentKeys(undefined, 10)).eql([])
    should(formerMembersWithCurrentKeys({ _vm: { authorizedKeys: memberKey('b') } }, 10)).eql([])
  })

  // Rotating can't remove them, so counting them would rotate the keys again
  // and again
  it('ignores keys that cannot be removed', () => {
    // Both point to `b`, so that only `isRemovableKey` leaves them out
    for (const foreignKey of ['shelter:b', 'shelter:b?keyName=']) {
      const state = chatRoom({ b: { hasLeft: true } }, byId(memberCSK('b', { id: 'x', name: 'b/x', foreignKey })))
      should(formerMembersWithCurrentKeys(state, 10)).eql([])
      should(formerMemberKeyIdsToRemove(state)).eql([])
    }
    // Unless they have another key that can be removed
    const state = chatRoom({ b: { hasLeft: true } }, memberKey('b'), byId(memberCSK('b', { id: 'x', name: 'b/x', foreignKey: 'shelter:b' })))
    should(formerMembersWithCurrentKeys(state, 10)).eql(['b'])
    should(formerMemberKeyIdsToRemove(state)).eql(['b-csk'])
  })

  it('lists each former member once', () => {
    const state = chatRoom({ b: { hasLeft: true } }, memberKey('b'), byId(memberCSK('b', { id: 'b-csk2', name: 'b/b-csk2' })))
    should(formerMembersWithCurrentKeys(state, 10)).eql(['b'])
    should(formerMemberKeyIdsToRemove(state)).eql(['b-csk', 'b-csk2'])
  })
})

describe('formerMemberKeyIdsToRemove', () => {
  it('includes keys of former members that have not been removed', () => {
    should(formerMemberKeyIdsToRemove(chatRoom({ a: {}, b: { hasLeft: true } }, memberKey('a'), memberKey('b')))).eql(['b-csk'])
  })

  it('includes keys of members who were deleted from `members`', () => {
    should(formerMemberKeyIdsToRemove(chatRoom({ a: {} }, memberKey('a'), memberKey('b')))).eql(['b-csk'])
  })

  it('excludes keys that were already removed, and keys of current members', () => {
    should(formerMemberKeyIdsToRemove(chatRoom({ a: {}, b: { hasLeft: true } }, memberKey('a'), memberKey('b', { removed: 12 })))).eql([])
  })

  it('does not match another member whose ID starts with the former member ID', () => {
    should(formerMemberKeyIdsToRemove(chatRoom({ u1: { hasLeft: true }, u10: {} }, memberKey('u1', { removed: 8 }), memberKey('u10')))).eql([])
  })

  // After removing the keys and then rotating, the former member no longer
  // holds the current keys, so no further rotations are needed
  it('leaves nothing to rotate once removed before a rotation', () => {
    const state = chatRoom({ b: { hasLeft: true } }, memberKey('b', { removed: 11 }))
    state._vm.authorizedKeys.cek._notBeforeHeight = 12
    state._vm.authorizedKeys.csk._notBeforeHeight = 12
    should(formerMemberKeyIdsToRemove(state)).eql([])
    should(formerMembersWithCurrentKeys(state, 12)).eql([])
  })

  it('handles a missing state', () => {
    should(formerMemberKeyIdsToRemove(undefined)).eql([])
    should(formerMemberKeyIdsToRemove({})).eql([])
  })
})

describe('isRemovableKey', () => {
  // Same checks as Chelonia's when processing `OP_KEY_DEL`
  it('is true for keys that are not foreign keys, and foreign keys with a contract and a key name', () => {
    should(isRemovableKey({ id: 'k' })).be.true()
    should(isRemovableKey({ id: 'k', foreignKey: '' })).be.true()
    should(isRemovableKey({ id: 'k', foreignKey: 'shelter:a?keyName=csk' })).be.true()
    should(isRemovableKey({ id: 'k', foreignKey: 'sp:a?keyName=csk' })).be.true()
    should(isRemovableKey(undefined)).be.true()
  })

  it('is false for foreign keys without a contract or a key name, or that are not URLs', () => {
    should(isRemovableKey({ id: 'k', foreignKey: 'shelter:a' })).be.false()
    should(isRemovableKey({ id: 'k', foreignKey: 'shelter:a?keyName=' })).be.false()
    should(isRemovableKey({ id: 'k', foreignKey: 'shelter:?keyName=csk' })).be.false()
    should(isRemovableKey({ id: 'k', foreignKey: 'not a URL' })).be.false()
    should(isRemovableKey({ id: 'k', foreignKey: { url: 'shelter:a?keyName=csk' } })).be.false()
  })
})

describe('membersMissingFromGroup', () => {
  it('includes a chatroom member that the group records as removed from the chatroom', () => {
    should(membersMissingFromGroup(
      { members: { a: {}, b: {} } },
      { members: { a: { status: PROFILE_STATUS.ACTIVE }, b: { status: PROFILE_STATUS.REMOVED } } }
    )).eql(['b'])
  })

  it('includes a chatroom member that the group has no record of', () => {
    should(membersMissingFromGroup(
      { members: { a: {}, b: {} } },
      { members: { a: { status: PROFILE_STATUS.ACTIVE } } }
    )).eql(['b'])
  })

  it('excludes members who left the chatroom, and members of both', () => {
    should(membersMissingFromGroup(
      { members: { a: {}, b: { hasLeft: true } } },
      { members: { a: { status: PROFILE_STATUS.ACTIVE }, b: { status: PROFILE_STATUS.REMOVED } } }
    )).eql([])
  })

  it('does nothing without a synced chatroom or a group record', () => {
    should(membersMissingFromGroup(undefined, { members: {} })).eql([])
    should(membersMissingFromGroup({ members: { a: {} } }, undefined)).eql([])
  })
})

describe('currentKeysHeight', () => {
  const keys = (cekHeight, cskHeight) => ({
    _vm: { authorizedKeys: { cek: { _notBeforeHeight: cekHeight }, csk: { _notBeforeHeight: cskHeight } } }
  })

  it('is the earliest height of the CEK and the CSK', () => {
    should(currentKeysHeight(keys(12, 15), 'cek', 'csk')).equal(12)
    should(currentKeysHeight(keys(15, 12), 'cek', 'csk')).equal(12)
  })

  it('is 0 when a height, a key or the state is missing', () => {
    should(currentKeysHeight(keys(undefined, 12), 'cek', 'csk')).equal(0)
    should(currentKeysHeight(keys(12, 15), 'cek', 'missing')).equal(0)
    should(currentKeysHeight(keys(12, 15), 'cek', undefined)).equal(0)
    should(currentKeysHeight({}, 'cek', 'csk')).equal(0)
    should(currentKeysHeight(undefined, 'cek', 'csk')).equal(0)
  })
})

describe('privateGroupChatRoomsToCheck', () => {
  const record = (privacyLevel, { status = PROFILE_STATUS.ACTIVE, deletedDate } = {}) => chatRoomRecord(privacyLevel, { [me]: status }, { deletedDate })
  const synced = (type, privacyLevel, members = { [me]: {} }) => syncedChatRoom(privacyLevel, members, { type })
  const state = {
    [me]: {
      groups: { g1: {}, g2: { hasLeft: true } }
    },
    g1: {
      chatRooms: {
        priv: record(CHATROOM_PRIVACY_LEVEL.PRIVATE),
        pub: record(CHATROOM_PRIVACY_LEVEL.GROUP),
        deleted: record(CHATROOM_PRIVACY_LEVEL.PRIVATE, { deletedDate: '2026-01-01T00:00:00.000Z' }),
        notOurs: record(CHATROOM_PRIVACY_LEVEL.PRIVATE, { status: PROFILE_STATUS.REMOVED }),
        leftChatRoom: record(CHATROOM_PRIVACY_LEVEL.PRIVATE),
        unsynced: record(CHATROOM_PRIVACY_LEVEL.PRIVATE),
        // A DM that the group lists as a private chatroom of its own (which
        // shouldn't happen), to check that the chatroom's own type is checked
        dm: record(CHATROOM_PRIVACY_LEVEL.PRIVATE)
      }
    },
    g2: { chatRooms: { formerGroupPriv: record(CHATROOM_PRIVACY_LEVEL.PRIVATE) } },
    priv: synced(CHATROOM_TYPES.GROUP, CHATROOM_PRIVACY_LEVEL.PRIVATE),
    pub: synced(CHATROOM_TYPES.GROUP, CHATROOM_PRIVACY_LEVEL.GROUP),
    deleted: synced(CHATROOM_TYPES.GROUP, CHATROOM_PRIVACY_LEVEL.PRIVATE),
    notOurs: synced(CHATROOM_TYPES.GROUP, CHATROOM_PRIVACY_LEVEL.PRIVATE),
    leftChatRoom: synced(CHATROOM_TYPES.GROUP, CHATROOM_PRIVACY_LEVEL.PRIVATE, { [me]: { hasLeft: true } }),
    formerGroupPriv: synced(CHATROOM_TYPES.GROUP, CHATROOM_PRIVACY_LEVEL.PRIVATE),
    dm: synced(CHATROOM_TYPES.DIRECT_MESSAGE, CHATROOM_PRIVACY_LEVEL.PRIVATE)
  }

  it('selects only synced, non-deleted private chatrooms that we are in, of groups that we are in', () => {
    should(privateGroupChatRoomsToCheck(state, me)).eql([{ groupID: 'g1', chatRoomID: 'priv' }])
  })

  it('never selects DMs', () => {
    should(isOurPrivateGroupChatRoom(state, me, 'g1', 'dm')).be.false()
    should(privateGroupChatRoomsToCheck(state, me).some(({ chatRoomID }) => chatRoomID === 'dm')).be.false()
  })

  it('does not select a chatroom that does not list us, even if the group does', () => {
    const withoutUs = { ...state, priv: synced(CHATROOM_TYPES.GROUP, CHATROOM_PRIVACY_LEVEL.PRIVATE, { a: {} }) }
    should(isOurPrivateGroupChatRoom(withoutUs, me, 'g1', 'priv')).be.false()
    should(privateGroupChatRoomsToCheck(withoutUs, me)).eql([])
  })

  it('handles missing state', () => {
    should(privateGroupChatRoomsToCheck({}, me)).eql([])
    should(privateGroupChatRoomsToCheck(undefined, me)).eql([])
    should(isOurPrivateGroupChatRoom(undefined, me, 'g1', 'priv')).be.false()
  })

  // Rotations don't need complete state (see `chatRoomRotationReasons`)
  it('still selects a chatroom while its group, or the chatroom itself, has events we could not decrypt', () => {
    const cek = { _vm: { authorizedKeys: { cek: { id: 'cek', name: 'cek', purpose: ['enc'], _notBeforeHeight: 0 } } } }
    for (const contractID of ['g1', 'priv']) {
      const incomplete = {
        ...state,
        g1: { ...state.g1, ...cek },
        priv: { ...state.priv, _vm: cek._vm },
        contracts: { [contractID]: { missingDecryptionKeyIds: ['cek'] } }
      }
      should(missingLegitimateKeyIds(incomplete, contractID, 'g1')).eql(['cek'])
      should(isOurPrivateGroupChatRoom(incomplete, me, 'g1', 'priv')).be.true()
      should(privateGroupChatRoomsToCheck(incomplete, me)).eql([{ groupID: 'g1', chatRoomID: 'priv' }])
    }
  })
})

describe('ourPrivateGroupChatRoomMembersToRemove', () => {
  const state = (contracts = {}) => ({
    contracts,
    [me]: { groups: { g1: {} } },
    g1: {
      chatRooms: {
        priv: chatRoomRecord(CHATROOM_PRIVACY_LEVEL.PRIVATE, { [me]: PROFILE_STATUS.ACTIVE, a: PROFILE_STATUS.ACTIVE, b: PROFILE_STATUS.REMOVED }),
        pub: chatRoomRecord(CHATROOM_PRIVACY_LEVEL.GROUP, { [me]: PROFILE_STATUS.ACTIVE, b: PROFILE_STATUS.REMOVED })
      }
    },
    priv: syncedChatRoom(CHATROOM_PRIVACY_LEVEL.PRIVATE, { [me]: {}, a: {}, b: {} }),
    pub: syncedChatRoom(CHATROOM_PRIVACY_LEVEL.GROUP, { [me]: {}, b: {} })
  })

  it('is the same as membersMissingFromGroup for one of our private group chatrooms', () => {
    const s = state()
    should(ourPrivateGroupChatRoomMembersToRemove(s, me, 'g1', 'priv')).eql(['b'])
    should(ourPrivateGroupChatRoomMembersToRemove(s, me, 'g1', 'priv')).eql(membersMissingFromGroup(s.priv, s.g1.chatRooms.priv))
  })

  it('is empty for chatrooms that are not our private group chatrooms', () => {
    should(ourPrivateGroupChatRoomMembersToRemove(state(), me, 'g1', 'pub')).eql([])
    should(ourPrivateGroupChatRoomMembersToRemove(state(), me, 'g1', 'unknown')).eql([])
    should(ourPrivateGroupChatRoomMembersToRemove(state(), me, 'g2', 'priv')).eql([])
    should(ourPrivateGroupChatRoomMembersToRemove(undefined, me, 'g1', 'priv')).eql([])
  })

  it('is empty while the group has events encrypted with one of its CEKs that we could not decrypt', () => {
    const s = state({ g1: { missingDecryptionKeyIds: ['gcek'] } })
    s.g1._vm = { authorizedKeys: { gcek: { id: 'gcek', name: 'cek', purpose: ['enc'], _notBeforeHeight: 0 } } }
    should(ourPrivateGroupChatRoomMembersToRemove(s, me, 'g1', 'priv')).eql([])
  })

  // We could have missed their leave, but removing them again only fails
  it('is not affected by chatroom events that we could not decrypt', () => {
    const s = state({ priv: { missingDecryptionKeyIds: ['cek'] } })
    s.priv._vm = { authorizedKeys: { cek: { id: 'cek', name: 'cek', purpose: ['enc'], _notBeforeHeight: 0 } } }
    should(missingLegitimateKeyIds(s, 'priv', 'g1')).eql(['cek'])
    should(ourPrivateGroupChatRoomMembersToRemove(s, me, 'g1', 'priv')).eql(['b'])
  })

  // Anyone in the group can send events encrypted with keys that don't exist
  it('is not affected by events encrypted with keys that are not CEKs of the contract', () => {
    should(ourPrivateGroupChatRoomMembersToRemove(state({ g1: { missingDecryptionKeyIds: ['k'] } }), me, 'g1', 'priv')).eql(['b'])
    should(ourPrivateGroupChatRoomMembersToRemove(state({ priv: { missingDecryptionKeyIds: ['k'] } }), me, 'g1', 'priv')).eql(['b'])
  })

  // What group events check (see 'frontend/controller/actions/chatroom.js')
  describe('ourPrivateGroupChatRoomsWithMembersToRemove', () => {
    it('lists the private chatrooms of the group that have members to remove, and those members', () => {
      const s = state()
      should(ourPrivateGroupChatRoomsWithMembersToRemove(s, me, 'g1')).eql([{ chatRoomID: 'priv', toRemove: ['b'] }])
      s.g1.chatRooms.priv.members.b.status = PROFILE_STATUS.ACTIVE
      should(ourPrivateGroupChatRoomsWithMembersToRemove(s, me, 'g1')).eql([])
    })

    it('skips chatrooms that the group lists as deleted, as not private or as not having us, and incomplete groups', () => {
      for (const change of [
        (s) => { s.g1.chatRooms.priv.deletedDate = '2026-01-01T00:00:00.000Z' },
        (s) => { s.g1.chatRooms.priv.privacyLevel = CHATROOM_PRIVACY_LEVEL.GROUP },
        (s) => { s.g1.chatRooms.priv.members[me].status = PROFILE_STATUS.REMOVED },
        (s) => { s.priv.attributes.privacyLevel = CHATROOM_PRIVACY_LEVEL.GROUP },
        (s) => {
          s.contracts = { g1: { missingDecryptionKeyIds: ['gcek'] } }
          s.g1._vm = { authorizedKeys: { gcek: { id: 'gcek', name: 'cek', purpose: ['enc'], _notBeforeHeight: 0 } } }
        }
      ]) {
        const s = state()
        change(s)
        should(ourPrivateGroupChatRoomsWithMembersToRemove(s, me, 'g1')).eql([])
      }
    })

    it('handles missing state', () => {
      should(ourPrivateGroupChatRoomsWithMembersToRemove(state(), me, 'g2')).eql([])
      should(ourPrivateGroupChatRoomsWithMembersToRemove(undefined, me, 'g1')).eql([])
      const s = state()
      delete s.priv
      should(ourPrivateGroupChatRoomsWithMembersToRemove(s, me, 'g1')).eql([])
    })
  })
})

describe('chatRoomGroupID without group keys, and isKeyRequestFromRemovedMember', () => {
  const state = {
    [me]: { groups: { g1: {}, g2: {} } },
    g1: { chatRooms: { pub: chatRoomRecord(CHATROOM_PRIVACY_LEVEL.GROUP, { b: PROFILE_STATUS.REMOVED }) } },
    g2: { chatRooms: { priv: chatRoomRecord(CHATROOM_PRIVACY_LEVEL.PRIVATE, { a: PROFILE_STATUS.ACTIVE, b: PROFILE_STATUS.REMOVED }) } }
  }

  it('finds the group that lists a chatroom', () => {
    should(chatRoomGroupID(state, me, 'priv')).equal('g2')
    should(chatRoomGroupID(state, me, 'pub')).equal('g1')
    should(chatRoomGroupID(state, me, 'dm')).be.undefined()
    should(chatRoomGroupID(undefined, me, 'priv')).be.undefined()
  })

  // Without the chatroom's keys to tell which group it belongs to (see the
  // tests with keys below), there's no way to choose
  it('finds none if several of our groups list a chatroom without keys', () => {
    const listedTwice = { ...state, g1: { chatRooms: { ...state.g1.chatRooms, priv: state.g2.chatRooms.priv } } }
    should(chatRoomGroupID(listedTwice, me, 'priv')).be.undefined()
    should(isKeyRequestFromRemovedMember(listedTwice, me, 'priv', 'b')).be.false()
  })

  it('is true only for someone the group lists as removed from a private chatroom', () => {
    should(isKeyRequestFromRemovedMember(state, me, 'priv', 'b')).be.true()
    should(isKeyRequestFromRemovedMember(state, me, 'priv', 'a')).be.false()
    // A new member whose addition we may not have received yet
    should(isKeyRequestFromRemovedMember(state, me, 'priv', 'c')).be.false()
    should(isKeyRequestFromRemovedMember(state, me, 'pub', 'b')).be.false()
    should(isKeyRequestFromRemovedMember(state, me, 'dm', 'b')).be.false()
    should(isKeyRequestFromRemovedMember(undefined, me, 'priv', 'b')).be.false()
  })
})

describe('chatroom key checks', () => {
  // The key of a member's identity contract that the chatroom key mirrors
  const identity = (memberID) => ({
    _vm: { authorizedKeys: { [`${memberID}-csk`]: { id: `${memberID}-csk`, name: 'csk', data: `${memberID}-data` } } }
  })
  const ownKeys = [
    { id: 'csk1', name: 'csk', ringLevel: 0, purpose: ['sig'], permissions: '*', allowedActions: '*', _notBeforeHeight: 10 },
    { id: 'cek1', name: 'cek', ringLevel: 0, purpose: ['enc'], permissions: [SPMessage.OP_ACTION_ENCRYPTED], allowedActions: '*', _notBeforeHeight: 10 },
    { id: 'sak1', name: '#sak', ringLevel: 0, purpose: ['sak'], permissions: [], allowedActions: [], _notBeforeHeight: 1 }
  ]
  const groupKeyOf = (id, name, overrides = {}) => ({
    id,
    name,
    foreignKey: `shelter:g1?keyName=${name === 'group-csk' ? 'csk' : 'cek'}`,
    ringLevel: 2,
    purpose: [name === 'group-csk' ? 'sig' : 'enc'],
    permissions: name === 'group-csk'
      ? [SPMessage.OP_ATOMIC, SPMessage.OP_KEY_DEL, SPMessage.OP_ACTION_ENCRYPTED, SPMessage.OP_KEY_REQUEST]
      : [SPMessage.OP_ATOMIC, SPMessage.OP_KEY_ADD, SPMessage.OP_KEY_DEL, SPMessage.OP_ACTION_ENCRYPTED],
    allowedActions: name === 'group-csk' ? ['gi.contracts/chatroom/leave'] : ['gi.contracts/chatroom/join', 'gi.contracts/chatroom/leave'],
    data: `${id}-data`,
    _notBeforeHeight: 1,
    ...overrides
  })
  const groupKeys = [groupKeyOf('gcsk', 'group-csk'), groupKeyOf('gcek', 'group-cek')]
  // The keys that `classifyChatRoomKeys` keeps in the chatroom below
  const KEPT = { csk: 'csk1', cek: 'cek1', '#sak': 'sak1', 'group-csk': 'gcsk', 'group-cek': 'gcek' }
  // A `#joinKey-<id>` key with the shape that the versions from 2023 gave it:
  // it can only request keys
  const legacyJoinKey = (overrides = {}) => ({
    id: 'jk',
    name: '#joinKey-jk',
    ringLevel: MAX,
    purpose: ['sig'],
    permissions: [SPMessage.OP_KEY_REQUEST],
    data: 'jk-data',
    _notBeforeHeight: 11,
    ...overrides
  })
  // One of our private group chatrooms, with the keys that it's created with,
  // the keys of its members (us and `a`), and `extraKeys` added last.
  // `firstKeys` are added first, and replace the keys with the same IDs.
  // Keys are copied, so that tests can change them. `formerMembers` are
  // listed by the chatroom as having left (their keys go in `extraKeys`).
  const state = ({ firstKeys = [], extraKeys = [], formerMembers = [], privacyLevel = CHATROOM_PRIVACY_LEVEL.PRIVATE } = {}) => ({
    [me]: { groups: { g1: {} }, ...identity(me) },
    a: identity('a'),
    g1: {
      _vm: {
        authorizedKeys: {
          gcsk: { id: 'gcsk', name: 'csk', purpose: ['sig'], data: 'gcsk-data', _notBeforeHeight: 5 },
          gcek: { id: 'gcek', name: 'cek', purpose: ['enc'], data: 'gcek-data', _notBeforeHeight: 5 },
          'gcsk-old': { id: 'gcsk-old', name: 'csk', purpose: ['sig'], data: 'gcsk-old-data', _notBeforeHeight: 1, _notAfterHeight: 5 }
        }
      },
      chatRooms: {
        priv: chatRoomRecord(privacyLevel, { [me]: PROFILE_STATUS.ACTIVE, a: PROFILE_STATUS.ACTIVE })
      }
    },
    priv: syncedChatRoom(
      privacyLevel,
      { [me]: {}, a: {}, ...Object.fromEntries(formerMembers.map((memberID) => [memberID, { hasLeft: true }])) },
      {
        authorizedKeys: byId(
          ...[
            ...firstKeys,
            ...[...ownKeys, ...groupKeys, memberCSK(me), memberCSK('a')].filter((key) => !firstKeys.some(({ id }) => id === key.id)),
            ...extraKeys
          ].map((key) => ({ ...key }))
        )
      }
    )
  })
  const always = () => true
  const classify = (s, haveSecretKey = always) => classifyChatRoomKeys(s, me, 'g1', 'priv', haveSecretKey)
  const backdoor = (overrides = {}) => ({
    id: 'bd', name: 'r8-backdoor', ringLevel: 0, purpose: ['sig'], permissions: '*', allowedActions: '*', data: 'bd-data', _notBeforeHeight: 11, ...overrides
  })

  describe('classifyChatRoomKeys', () => {
    it('accepts the keys that a private group chatroom is created with, and its members\' keys', () => {
      should(classify(state())).eql({ kept: KEPT, unexpected: [], unknown: [] })
    })

    it('flags a key that a member added with the chatroom CSK under another name', () => {
      should(classify(state({ extraKeys: [backdoor()] })).unexpected).eql(['bd'])
      should(classify(state({ extraKeys: [backdoor({ purpose: ['enc'], permissions: [] })] })).unexpected).eql(['bd'])
    })

    it('flags a second key with the name of a chatroom key, keeping the one whose secret we hold', () => {
      const dup = { ...ownKeys[0], id: 'csk2', _notBeforeHeight: 11 }
      const keptFirst = classify(state({ firstKeys: [dup] }), (id) => id !== 'csk2')
      should(keptFirst.kept.csk).equal('csk1')
      should(keptFirst.unexpected).eql(['csk2'])
      const keptSecond = classify(state({ extraKeys: [dup] }), (id) => id !== 'csk1')
      should(keptSecond.kept.csk).equal('csk2')
      should(keptSecond.unexpected).eql(['csk1'])
      // If we hold both (or neither), the first one is kept, as Chelonia's
      // lookups by name return it
      const both = classify(state({ extraKeys: [dup] }))
      should(both.kept.csk).equal('csk1')
      should(both.unexpected).eql(['csk2'])
      const neither = classify(state({ extraKeys: [dup] }), () => false)
      should(neither.kept.csk).equal('csk1')
      should(neither.unexpected).eql(['csk2'])
    })

    it('flags chatroom keys with another shape', () => {
      for (const changes of [{ ringLevel: 2 }, { purpose: ['sig', 'enc'] }, { foreignKey: 'shelter:a?keyName=csk' }]) {
        should(classify(state({ firstKeys: [{ ...ownKeys[0], id: 'odd', ...changes }] })).unexpected).eql(['odd'])
      }
    })

    it('accepts the chatroom\'s own keys at ring level 1, as created before April 2024', () => {
      const ring1 = ownKeys.slice(0, 2).map((key) => ({ ...key, ringLevel: 1 }))
      const s = state({ firstKeys: ring1 })
      should(classify(s)).eql({ kept: KEPT, unexpected: [], unknown: [] })
      should(chatRoomKeysNeedRotation(s, me, 'g1', 'priv', always)).be.false()
    })

    it('keeps and reports, without flagging, a chatroom key with another shape if it is the only one with its name', () => {
      // Rotating doesn't change the shape of keys, so flagging it would rotate
      // the keys again and again
      const odd = { ...ownKeys[0], ringLevel: 2 }
      const s = state({ firstKeys: [odd] })
      const result = classify(s)
      should(result.kept.csk).equal('csk1')
      should(result.unexpected).eql([])
      should(result.unknown).eql(['csk1'])
      should(chatRoomKeysNeedRotation(s, me, 'g1', 'priv', always)).be.false()
      // A second one with the expected shape is kept instead
      const withExpected = classify(state({ firstKeys: [odd], extraKeys: [{ ...ownKeys[0], id: 'csk2', _notBeforeHeight: 11 }] }))
      should(withExpected.kept.csk).equal('csk2')
      should(withExpected.unexpected).eql(['csk1'])
      should(withExpected.unknown).eql([])
    })

    it('flags the only group key with a name if it does not have the expected shape', () => {
      const s = state({ firstKeys: [groupKeyOf('gcsk', 'group-csk', { permissions: '*' })] })
      should(classify(s).unexpected).eql(['gcsk'])
      should(classify(s).kept['group-csk']).be.undefined()
    })

    it('keeps the group key that matches the group\'s current key', () => {
      const old = groupKeyOf('gcsk-old', 'group-csk')
      const result = classify(state({ firstKeys: [old] }))
      should(result.kept['group-csk']).equal('gcsk')
      should(result.unexpected).eql(['gcsk-old'])
    })

    it('flags group keys with more permissions, another ring level, or another group', () => {
      for (const changes of [
        { permissions: '*' },
        { permissions: [SPMessage.OP_KEY_ADD] },
        { allowedActions: '*' },
        { ringLevel: 0 },
        { foreignKey: 'shelter:g2?keyName=csk' },
        { foreignKey: 'shelter:g1?keyName=cek' },
        { data: 'other' }
      ]) {
        should(classify(state({ firstKeys: [groupKeyOf('gcsk', 'group-csk', changes)] })).unexpected).eql(['gcsk'])
      }
    })

    // The group's CEK is the group key that can add keys
    it('flags group CEKs with another shape', () => {
      for (const changes of [
        { purpose: ['sig'] },
        { permissions: [SPMessage.OP_KEY_UPDATE] },
        { permissions: '*' },
        { allowedActions: ['gi.contracts/chatroom/addMessage'] },
        { ringLevel: 1 },
        { foreignKey: 'shelter:g1?keyName=csk' }
      ]) {
        should(classify(state({ firstKeys: [groupKeyOf('gcek', 'group-cek', changes)] })).unexpected).eql(['gcek'])
      }
    })

    // Its foreign key names the key that it claims to be, but it's a copy of
    // another key of the group
    it('flags a group key that is a copy of another key of the group', () => {
      const s = state({ firstKeys: [groupKeyOf('gcek', 'group-csk')] })
      delete s.priv._vm.authorizedKeys.gcsk
      should(s.g1._vm.authorizedKeys.gcek.data).equal(s.priv._vm.authorizedKeys.gcek.data)
      const result = classify(s)
      should(result.unexpected).eql(['gcek'])
      should(result.kept['group-csk']).be.undefined()
    })

    it('accepts group keys with the fewer permissions of older versions', () => {
      const older = groupKeyOf('gcsk', 'group-csk', { permissions: [SPMessage.OP_ACTION_ENCRYPTED] })
      should(classify(state({ firstKeys: [older] })).unexpected).eql([])
    })

    it('flags member keys with more than inner-signing permissions or another shape', () => {
      for (const changes of [
        { ringLevel: 0 },
        { permissions: '*' },
        { permissions: [SPMessage.OP_KEY_ADD] },
        { purpose: ['enc'] },
        { foreignKey: 'shelter:a?keyName=pek' },
        { data: 'other' }
      ]) {
        should(classify(state({ firstKeys: [memberCSK('a', changes)] })).unexpected).eql(['a-csk'])
      }
    })

    it('accepts member keys of older versions, and keys of members whose identity contract is not loaded', () => {
      const older = memberCSK('a', { permissions: [], foreignKey: 'sp:a?keyName=csk' })
      should(classify(state({ firstKeys: [older] })).unexpected).eql([])
      should(classify(state({ extraKeys: [memberCSK('b')] })).unexpected).eql([])
    })

    it('reports keys from older versions without flagging them', () => {
      // `groupKey` mirrors the group's CSK, with the shape of that time. It
      // takes the place of the `group-csk`.
      const groupKeyOfOldVersions = {
        id: 'gcsk',
        name: 'groupKey',
        foreignKey: 'shelter:g1?keyName=csk',
        ringLevel: 2,
        purpose: ['sig'],
        permissions: [SPMessage.OP_ACTION_ENCRYPTED],
        allowedActions: ['gi.contracts/chatroom/leave'],
        data: 'gcsk-data',
        _notBeforeHeight: 1
      }
      should(classify(state({ firstKeys: [groupKeyOfOldVersions], extraKeys: [legacyJoinKey()] }))).eql({
        kept: { csk: 'csk1', cek: 'cek1', '#sak': 'sak1', 'group-cek': 'gcek', groupKey: 'gcsk' },
        unexpected: [],
        unknown: ['jk']
      })
    })

    it('flags keys with the names of older versions\' keys but other powers', () => {
      // Anyone holding the chatroom CSK can add a key with such a name; only
      // the recorded shapes are accepted as those keys
      const joinKey = backdoor({ id: 'jk', name: '#joinKey-jk', ringLevel: MAX, permissions: [SPMessage.OP_KEY_REQUEST] })
      // Pointing to the group's CSK, so that only its powers are wrong
      const groupKeyOfOldVersions = backdoor({ id: 'gk', name: 'groupKey', ringLevel: 2, foreignKey: 'shelter:g1?keyName=csk' })
      should(classify(state({ extraKeys: [joinKey, groupKeyOfOldVersions] })).unexpected).eql(['jk', 'gk'])
    })

    it('reports foreign keys missing from the contract that they point to without flagging them, unless they are duplicates', () => {
      // E.g., keys that were just rotated, while our copies of the group and of
      // the member's identity contract are behind
      const rotated = state({
        firstKeys: [groupKeyOf('gcsk', 'group-csk', { _notAfterHeight: 12 }), memberCSK('a', { _notAfterHeight: 12 })],
        extraKeys: [groupKeyOf('gcsk2', 'group-csk'), memberCSK('a', { id: 'a-csk2' })]
      })
      should(classify(rotated)).eql({
        kept: { ...KEPT, 'group-csk': 'gcsk2' },
        unexpected: [],
        unknown: ['gcsk2', 'a-csk2']
      })
      const duplicate = classify(state({ extraKeys: [groupKeyOf('gcsk2', 'group-csk')] }))
      should(duplicate.kept['group-csk']).equal('gcsk')
      should(duplicate.unexpected).eql(['gcsk2'])
    })

    it('ignores keys that were removed', () => {
      should(classify(state({ extraKeys: [backdoor({ _notAfterHeight: 12 })] })).unexpected).eql([])
    })

    // Removing them would make the message invalid (e.g., the rotation that
    // removes unexpected keys)
    it('reports keys that Chelonia cannot remove instead of flagging them', () => {
      const unremovable = [
        backdoor({ id: 'nokn', foreignKey: 'shelter:a' }),
        backdoor({ id: 'nourl', foreignKey: 'not a URL' }),
        backdoor({ id: 'nocid', foreignKey: 'shelter:?keyName=csk' }),
        { ...ownKeys[0], id: 'csk2', foreignKey: 'shelter:a', _notBeforeHeight: 11 },
        memberCSK('a', { id: 'a-x', name: 'a/a-x', foreignKey: 'shelter:a' })
      ]
      const s = state({ extraKeys: unremovable })
      const result = classify(s)
      should(result.kept).eql(KEPT)
      should(result.unexpected).eql([])
      should(result.unknown).eql(['nokn', 'nourl', 'nocid', 'csk2', 'a-x'])
      // Those that can be removed are still flagged
      should(classify(state({ extraKeys: [...unremovable, backdoor()] })).unexpected).eql(['bd'])
    })

    it('returns nothing for chatrooms that are not our private group chatrooms', () => {
      should(classify(state({ extraKeys: [backdoor()], privacyLevel: CHATROOM_PRIVACY_LEVEL.GROUP }))).eql({ kept: {}, unexpected: [], unknown: [] })
      should(classifyChatRoomKeys(undefined, me, 'g1', 'priv', always)).eql({ kept: {}, unexpected: [], unknown: [] })
    })

    // Any member of the group can change the group's record of the chatroom
    it('returns nothing if only the group lists the chatroom as private', () => {
      const s = state({ extraKeys: [backdoor()] })
      s.priv.attributes.privacyLevel = CHATROOM_PRIVACY_LEVEL.GROUP
      should(s.g1.chatRooms.priv.privacyLevel).equal(CHATROOM_PRIVACY_LEVEL.PRIVATE)
      should(isOurPrivateGroupChatRoom(s, me, 'g1', 'priv')).be.false()
      should(classify(s)).eql({ kept: {}, unexpected: [], unknown: [] })
    })

    // As 'gi.actions/chatroom/create' and 'gi.actions/chatroom/join' add them
    const withAddedShapes = () => state({
      firstKeys: [
        groupKeyOf('gcsk', 'group-csk', { permissions: [...GROUP_CSK_PERMISSIONS], allowedActions: [...GROUP_CSK_ALLOWED_ACTIONS] }),
        groupKeyOf('gcek', 'group-cek', { permissions: [...GROUP_CEK_PERMISSIONS], allowedActions: [...GROUP_CEK_ALLOWED_ACTIONS] }),
        memberCSK('a', { permissions: [...MEMBER_KEY_PERMISSIONS], allowedActions: '*' })
      ]
    })

    it('accepts the shapes that group keys and member keys are added with', () => {
      should(classify(withAddedShapes())).eql({ kept: KEPT, unexpected: [], unknown: [] })
    })

    // Otherwise, a change to how keys are added, without the same change to
    // these checks, would get the group's keys removed by the next rotation
    it('accepts the shapes that keys are added with even after they are given more powers', () => {
      const added = [
        [GROUP_CSK_PERMISSIONS, SPMessage.OP_KEY_SHARE],
        [GROUP_CSK_ALLOWED_ACTIONS, 'gi.contracts/chatroom/join'],
        [GROUP_CEK_PERMISSIONS, SPMessage.OP_KEY_SHARE],
        [GROUP_CEK_ALLOWED_ACTIONS, 'gi.contracts/chatroom/addMessage'],
        [MEMBER_KEY_PERMISSIONS, SPMessage.OP_KEY_REQUEST]
      ]
      for (const [values, value] of added) values.push(value)
      try {
        should(classify(withAddedShapes())).eql({ kept: KEPT, unexpected: [], unknown: [] })
      } finally {
        for (const [values] of added) values.pop()
      }
    })
  })

  // What a rotation does to the chatroom keys at `height`: the CEK and CSK
  // kept are removed, and new ones are added last
  const rotate = (s, height) => {
    const keys = s.priv._vm.authorizedKeys
    const { cek, csk } = classify(s).kept
    for (const keyId of [cek, csk]) {
      const newId = `${keyId}-${height}`
      keys[newId] = { ...keys[keyId], id: newId, _notBeforeHeight: height }
      keys[keyId]._notAfterHeight = height
    }
  }

  // Any member of another group of ours can list our chatroom in that group,
  // and add us to it there, without holding any of the chatroom's keys
  describe('the group that a chatroom belongs to', () => {
    const listedByAnotherGroup = (s) => ({
      ...s,
      [me]: { ...s[me], groups: { g0: {}, ...s[me].groups } },
      g0: {
        _vm: { authorizedKeys: { g0csk: { id: 'g0csk', name: 'csk', data: 'g0csk-data', _notBeforeHeight: 1 } } },
        chatRooms: {
          priv: chatRoomRecord(CHATROOM_PRIVACY_LEVEL.PRIVATE, { [me]: PROFILE_STATUS.ACTIVE })
        }
      }
    })

    it('is the group that the chatroom\'s earliest group key points to, not the first group listing it', () => {
      // `b` re-joined directly, and the group that the chatroom belongs to
      // lists them as removed
      const s = listedByAnotherGroup(state({ extraKeys: [memberCSK('b')] }))
      s.priv.members.b = {}
      s.g1.chatRooms.priv.members.b = { status: PROFILE_STATUS.REMOVED }
      should(Object.keys(s[me].groups)[0]).equal('g0')
      should(chatRoomGroupID(s, me, 'priv')).equal('g1')
      should(chatRoomGroupID(s, me, 'priv')).equal('g1')
      should(privateGroupChatRoomsToCheck(s, me)).eql([{ groupID: 'g1', chatRoomID: 'priv' }])
      should(ourPrivateGroupChatRoomMembersToRemove(s, me, 'g1', 'priv')).eql(['b'])
      should(isKeyRequestFromRemovedMember(s, me, 'priv', 'b')).be.true()
    })

    // Otherwise, every member that the other group doesn't list would be
    // removed, and the chatroom's group keys would be flagged
    it('does not check the chatroom against another group\'s members or keys', () => {
      const s = listedByAnotherGroup(state())
      should(isOurPrivateGroupChatRoom(s, me, 'g0', 'priv')).be.false()
      should(ourPrivateGroupChatRoomMembersToRemove(s, me, 'g0', 'priv')).eql([])
      should(classifyChatRoomKeys(s, me, 'g0', 'priv', always)).eql({ kept: {}, unexpected: [], unknown: [] })
      should(chatRoomKeysNeedRotation(s, me, 'g0', 'priv', always)).be.false()
    })

    it('is not changed by group keys added later, even after the group keys are replaced', () => {
      // Someone holding the chatroom CSK adds the other group's CSK
      const planted = groupKeyOf('g0csk', 'group-csk', { foreignKey: 'shelter:g0?keyName=csk', data: 'g0csk-data', _notBeforeHeight: 11 })
      const s = listedByAnotherGroup(state({
        firstKeys: [groupKeyOf('gcsk', 'group-csk', { _notAfterHeight: 12 })],
        extraKeys: [planted, groupKeyOf('gcsk2', 'group-csk', { _notBeforeHeight: 12 })]
      }))
      should(chatRoomGroupID(s, me, 'priv')).equal('g1')
      should(classify(s).unexpected).eql(['g0csk'])
    })

    it('is the one of our groups that the earliest group keys point to, if they disagree', () => {
      const s = listedByAnotherGroup(state({
        firstKeys: [groupKeyOf('g0csk', 'group-csk', { foreignKey: 'shelter:g0?keyName=csk', _notBeforeHeight: 1 })]
      }))
      should(chatRoomGroupID(s, me, 'priv')).be.undefined()
      delete s[me].groups.g0
      should(chatRoomGroupID(s, me, 'priv')).equal('g1')
    })

    it('ignores group keys whose foreign key cannot be parsed, and treats unknown heights as the latest', () => {
      const unparsable = groupKeyOf('gx', 'group-csk', { foreignKey: 'not a URL', _notBeforeHeight: 0 })
      const unknownHeight = groupKeyOf('g0csk', 'group-csk', { foreignKey: 'shelter:g0?keyName=csk', _notBeforeHeight: undefined })
      should(chatRoomGroupID(listedByAnotherGroup(state({ firstKeys: [unparsable, unknownHeight] })), me, 'priv')).equal('g1')
    })

    it('is none if the group that the chatroom belongs to is not one of ours', () => {
      const s = listedByAnotherGroup(state())
      delete s[me].groups.g1
      should(chatRoomGroupID(s, me, 'priv')).be.undefined()
      should(privateGroupChatRoomsToCheck(s, me)).eql([])
    })
  })

  describe('nonMemberKeysRemovedSince', () => {
    it('includes unexpected keys removed after the current keys became valid', () => {
      should(nonMemberKeysRemovedSince(state({ extraKeys: [backdoor({ _notAfterHeight: 12 })] }), 'g1', 'priv', 10)).eql(['bd'])
    })

    it('excludes keys removed before, or in the message that rotated the keys', () => {
      should(nonMemberKeysRemovedSince(state({ extraKeys: [backdoor({ _notAfterHeight: 9 })] }), 'g1', 'priv', 10)).eql([])
      should(nonMemberKeysRemovedSince(state({ extraKeys: [backdoor({ _notAfterHeight: 10 })] }), 'g1', 'priv', 10)).eql([])
    })

    it('excludes keys replaced in the same message, and member keys', () => {
      const rotated = { ...ownKeys[0], id: 'csk0', _notBeforeHeight: 1, _notAfterHeight: 12 }
      const replacement = { ...ownKeys[0], id: 'csk2', _notBeforeHeight: 12 }
      should(nonMemberKeysRemovedSince(state({ firstKeys: [rotated], extraKeys: [replacement] }), 'g1', 'priv', 10)).eql([])
      should(nonMemberKeysRemovedSince(state({ extraKeys: [memberCSK('b', { _notAfterHeight: 12 })] }), 'g1', 'priv', 10)).eql([])
      should(nonMemberKeysRemovedSince(undefined, 'g1', 'priv', 10)).eql([])
    })

    // Only actual member keys are covered by `formerMembersWithCurrentKeys`
    it('includes a key named like a member key but with more powers', () => {
      should(nonMemberKeysRemovedSince(state({ extraKeys: [memberCSK('b', { permissions: '*', _notAfterHeight: 12 })] }), 'g1', 'priv', 10)).eql(['b-csk'])
    })

    it('excludes a group key replaced by an update', () => {
      const s = state({
        firstKeys: [groupKeyOf('gcsk', 'group-csk', { _notAfterHeight: 12 })],
        extraKeys: [groupKeyOf('gcsk2', 'group-csk', { _notBeforeHeight: 12 })]
      })
      should(nonMemberKeysRemovedSince(s, 'g1', 'priv', 10)).eql([])
    })

    // A key's name and height are up to whoever adds it, so the exception for
    // replaced keys mustn't hide the replacement
    it('still requires a rotation when an unexpected key is replaced by another one with the same name', () => {
      const s = state({ extraKeys: [backdoor({ _notAfterHeight: 12 }), backdoor({ id: 'bd2', _notBeforeHeight: 12 })] })
      should(nonMemberKeysRemovedSince(s, 'g1', 'priv', 10)).eql([])
      should(classify(s).unexpected).eql(['bd2'])
      should(chatRoomKeysNeedRotation(s, me, 'g1', 'priv', always)).be.true()
    })

    // Otherwise, it would count as the replacement of any key with its name
    // removed in that message, including itself
    it('does not count a key added and removed in the same message as a replacement', () => {
      const s = state({ extraKeys: [backdoor({ _notAfterHeight: 12 }), backdoor({ id: 'bd2', _notBeforeHeight: 12, _notAfterHeight: 12 })] })
      should(nonMemberKeysRemovedSince(s, 'g1', 'priv', 10)).eql(['bd', 'bd2'])
      should(chatRoomKeysNeedRotation(s, me, 'g1', 'priv', always)).be.true()
    })

    it('includes legitimate keys removed without being replaced, which only costs a rotation', () => {
      should(nonMemberKeysRemovedSince(state({ extraKeys: [legacyJoinKey({ _notAfterHeight: 12 })] }), 'g1', 'priv', 10)).eql(['jk'])
      should(nonMemberKeysRemovedSince(state({ firstKeys: [groupKeyOf('gcek', 'group-cek', { _notAfterHeight: 12 })] }), 'g1', 'priv', 10)).eql(['gcek'])
    })
  })

  describe('keysBlockingRotation', () => {
    // A key with the name of the CEK or the CSK that can't be removed would
    // come before the new key after a rotation, and be used instead of it
    it('includes keys named like the rotated keys that cannot be removed', () => {
      const dupCEK = { ...ownKeys[1], id: 'cek2', foreignKey: 'shelter:a', _notBeforeHeight: 11 }
      const dupCSK = { ...ownKeys[0], id: 'csk2', foreignKey: 'not a URL', _notBeforeHeight: 11 }
      const s = state({ extraKeys: [dupCEK, dupCSK] })
      should(keysBlockingRotation(s, 'priv', classify(s))).eql(['cek2', 'csk2'])
    })

    it('excludes keys that can be removed, keys with other names, and the keys kept', () => {
      const s = state({
        extraKeys: [
          { ...ownKeys[0], id: 'csk2', _notBeforeHeight: 11 },
          backdoor({ foreignKey: 'shelter:a' }),
          groupKeyOf('gcsk2', 'group-csk', { foreignKey: 'shelter:g1' })
        ]
      })
      should(keysBlockingRotation(s, 'priv', classify(s))).eql([])
    })

    // A rotation keeps the `foreignKey` of the key that it replaces (see
    // `keysBlockingRotation`), so that rule applies even to a `foreignKey`
    // that can be removed
    it('includes the key kept if it has a foreign key', () => {
      const onlyCSK = state({ firstKeys: [{ ...ownKeys[0], foreignKey: 'shelter:a?keyName=csk' }] })
      should(isRemovableKey(onlyCSK.priv._vm.authorizedKeys.csk1)).be.true()
      should(classify(onlyCSK).kept.csk).equal('csk1')
      should(keysBlockingRotation(onlyCSK, 'priv', classify(onlyCSK))).eql(['csk1'])
    })
  })

  describe('chatRoomKeysNeedRotation', () => {
    const needsRotation = (s) => chatRoomKeysNeedRotation(s, me, 'g1', 'priv', always)

    it('is false for a chatroom with only legitimate keys and no former members', () => {
      should(needsRotation(state())).be.false()
    })

    it('is true while an unexpected key is current, or if it was removed while the current keys were valid', () => {
      should(needsRotation(state({ extraKeys: [backdoor()] }))).be.true()
      should(needsRotation(state({ extraKeys: [backdoor({ _notAfterHeight: 12 })] }))).be.true()
      should(needsRotation(state({ extraKeys: [backdoor({ _notAfterHeight: 10 })] }))).be.false()
    })

    it('is true while a former member holds the current keys', () => {
      should(needsRotation(state({ extraKeys: [memberCSK('b')], formerMembers: ['b'] }))).be.true()
    })

    // Otherwise, the keys would be rotated on every event after a member left
    it('is false once a former member\'s key was removed before the current keys', () => {
      const s = state({ extraKeys: [memberCSK('b', { _notAfterHeight: 8 })], formerMembers: ['b'] })
      should(needsRotation(s)).be.false()
      s.priv._vm.authorizedKeys['b-csk']._notAfterHeight = 12
      should(needsRotation(s)).be.true()
    })

    it('is false for keys from older versions, which are only reported', () => {
      should(needsRotation(state({ extraKeys: [legacyJoinKey()] }))).be.false()
      // A key with such a name but other powers is flagged (see
      // `classifyChatRoomKeys`)
      should(needsRotation(state({ extraKeys: [backdoor({ id: 'jk', name: '#joinKey-jk' })] }))).be.true()
    })

    it('is false for keys that cannot be removed, which are only reported', () => {
      should(needsRotation(state({ extraKeys: [backdoor({ foreignKey: 'shelter:a' })] }))).be.false()
    })

    it('is false while a key blocks rotations, even if a former member holds the current keys', () => {
      const s = state({ extraKeys: [memberCSK('b'), { ...ownKeys[1], id: 'cek2', foreignKey: 'shelter:a', _notBeforeHeight: 11 }], formerMembers: ['b'] })
      should(needsRotation(s)).be.false()
      delete s.priv._vm.authorizedKeys.cek2
      should(needsRotation(s)).be.true()
    })

    // Such members must be removed instead. If that fails, e.g., because
    // someone weakened the `group-csk` that removals are signed with (which
    // still counts as the group's key), the keys must be rotated without them,
    // which this doesn't call for (see `enforceChatRoomMembership`)
    it('is false for members that the group lists as removed but who are still in the chatroom', () => {
      const weakened = groupKeyOf('gcsk', 'group-csk', { permissions: [SPMessage.OP_ACTION_ENCRYPTED, SPMessage.OP_KEY_REQUEST] })
      const s = state({ firstKeys: [weakened], extraKeys: [memberCSK('b')] })
      s.priv.members.b = {}
      s.g1.chatRooms.priv.members.b = { status: PROFILE_STATUS.REMOVED }
      should(ourPrivateGroupChatRoomMembersToRemove(s, me, 'g1', 'priv')).eql(['b'])
      should(classify(s).kept['group-csk']).equal('gcsk')
      should(needsRotation(s)).be.false()
      should(keysBlockingRotation(s, 'priv', classify(s))).eql([])
    })

    it('uses the classification given, if any', () => {
      const s = state({ extraKeys: [backdoor()] })
      should(chatRoomKeysNeedRotation(s, me, 'g1', 'priv', always, { kept: classify(s).kept, unexpected: [], unknown: [] })).be.false()
      should(chatRoomKeysNeedRotation(s, me, 'g1', 'priv', always, classify(s))).be.true()
    })

    it('is false for chatrooms that are not our private group chatrooms', () => {
      should(needsRotation(state({ extraKeys: [backdoor()], privacyLevel: CHATROOM_PRIVACY_LEVEL.GROUP }))).be.false()
      should(needsRotation(undefined)).be.false()
    })
  })

  describe('chatRoomRotationReasons', () => {
    const reasons = (s) => chatRoomRotationReasons(s, me, 'g1', 'priv', always)

    it('is nothing when the keys need no rotating', () => {
      should(reasons(state())).be.undefined()
      should(reasons(undefined)).be.undefined()
    })

    it('lists why the keys need rotating, sorted', () => {
      const s = state({
        extraKeys: [
          backdoor({ id: 'z' }),
          backdoor({ id: 'y', name: 'other' }),
          memberCSK('c'),
          memberCSK('b'),
          backdoor({ id: 'x', name: 'removed', _notAfterHeight: 12 })
        ],
        formerMembers: ['b', 'c']
      })
      should(reasons(s)).eql({ unexpected: ['y', 'z'], formerMembers: ['b', 'c'], removedSince: ['x'] })
    })
  })

  describe('membershipCheckSubject', () => {
    const reasons = (s) => chatRoomRotationReasons(s, me, 'g1', 'priv', always)

    // A rotation that doesn't change why the keys need rotating didn't help,
    // and the check that requests rotations isn't repeated for the same
    // reasons for a while. The CEK's ID, which was used instead, changes with
    // every rotation, so nothing stopped the keys from being rotated over and
    // over.
    it('stays the same across a rotation that does not change why the keys need rotating', () => {
      for (const s of [state({ extraKeys: [backdoor()] }), state({ extraKeys: [memberCSK('b')], formerMembers: ['b'] })]) {
        const before = membershipCheckSubject([], reasons(s))
        rotate(s, 12)
        should(classify(s).kept.cek).equal('cek1-12')
        should(reasons(s)).not.be.undefined()
        should(membershipCheckSubject([], reasons(s))).equal(before)
      }
    })

    it('is not the subject of a check while there are members to remove', () => {
      const s = state({ extraKeys: [backdoor()] })
      should(membershipCheckSubject(['c', 'b'], reasons(s))).equal('b,c')
      should(membershipCheckSubject([], reasons(s))).not.equal(membershipCheckSubject([], undefined))
    })
  })

  // Chelonia records the ID of any key that an event was encrypted with and
  // that we don't hold, including made-up ones and keys added by whoever sent
  // the event. An event that we couldn't decrypt can only hold back a change,
  // so only the decisions that a missed event could turn against someone wait
  // for the missing keys.
  describe('incomplete state', () => {
    // Our copy of `contractID` misses events encrypted with `keyIds`
    const missing = (s, contractID, ...keyIds) => {
      s.contracts = { ...s.contracts, [contractID]: { missingDecryptionKeyIds: keyIds } }
      return s
    }
    // `b` left and still holds the current keys, `c` re-joined directly, and
    // `bd` is a key that no legitimate operation adds
    const attacked = () => {
      const s = state({ extraKeys: [memberCSK('b'), memberCSK('c'), backdoor()], formerMembers: ['b'] })
      s.priv.members.c = {}
      s.g1.chatRooms.priv.members.c = { status: PROFILE_STATUS.REMOVED }
      return s
    }
    const decisions = (s) => ({
      toRemove: ourPrivateGroupChatRoomMembersToRemove(s, me, 'g1', 'priv'),
      reasons: chatRoomRotationReasons(s, me, 'g1', 'priv', always)
    })
    const ALL = { toRemove: ['c'], reasons: { unexpected: ['bd'], formerMembers: ['b'], removedSince: [] } }

    it('decides everything with complete state', () => {
      should(decisions(attacked())).eql(ALL)
    })

    it('ignores keys that do not exist, on the chatroom and on the group', () => {
      for (const contractID of ['priv', 'g1']) {
        const s = missing(attacked(), contractID, 'made-up')
        should(missingLegitimateKeyIds(s, contractID, 'g1')).eql([])
        should(isOurPrivateGroupChatRoom(s, me, 'g1', 'priv')).be.true()
        should(decisions(s)).eql(ALL)
        should(classify(s).unexpected).eql(['bd'])
        should(privateGroupChatRoomsToCheck(s, me)).eql([{ groupID: 'g1', chatRoomID: 'priv' }])
      }
    })

    // E.g., a member who added a key of their own to the chatroom (or to the
    // group, which any group member can) and encrypted a message with it
    it('ignores keys with other names that legitimate events are not encrypted with', () => {
      const planted = backdoor({ id: 'planted', name: 'planted', purpose: ['enc'], permissions: [], foreignKey: 'shelter:c?keyName=cek' })
      const s = missing(attacked(), 'priv', 'planted')
      s.priv._vm.authorizedKeys.planted = planted
      should(missingLegitimateKeyIds(s, 'priv', 'g1')).eql([])
      should(decisions(s)).eql({ ...ALL, reasons: { ...ALL.reasons, unexpected: ['bd', 'planted'] } })
      const g = missing(attacked(), 'g1', 'planted')
      g.g1._vm.authorizedKeys.planted = { ...planted, foreignKey: undefined }
      should(missingLegitimateKeyIds(g, 'g1')).eql([])
      should(decisions(g)).eql(ALL)
    })

    it('ignores a CEK added while another one was current, even once it has been removed', () => {
      const s = missing(attacked(), 'priv', 'cek2')
      s.priv._vm.authorizedKeys.cek2 = { ...ownKeys[1], id: 'cek2', _notBeforeHeight: 11 }
      should(missingLegitimateKeyIds(s, 'priv', 'g1')).eql([])
      should(decisions(s).reasons.formerMembers).eql(['b'])
      rotate(s, 12)
      s.priv._vm.authorizedKeys.cek2._notAfterHeight = 12
      should(missingLegitimateKeyIds(missing(s, 'priv', 'cek2', 'cek1-12'), 'priv', 'g1')).eql(['cek1-12'])
      const g = missing(attacked(), 'g1', 'gcek2')
      g.g1._vm.authorizedKeys.gcek2 = { id: 'gcek2', name: 'cek', purpose: ['enc'], data: 'gcek2-data', _notBeforeHeight: 6 }
      should(missingLegitimateKeyIds(g, 'g1')).eql([])
      should(decisions(g)).eql(ALL)
    })

    // A join that we missed would make a member's key look like a former
    // member's, which would be removed before rotating
    it('does not look for former members while the chatroom misses events encrypted with one of its CEKs, and decides the rest', () => {
      for (const keyId of ['cek0', 'gcek']) {
        const s = missing(attacked(), 'priv', keyId)
        s.priv._vm.authorizedKeys.cek0 = { ...ownKeys[1], id: 'cek0', _notBeforeHeight: 1, _notAfterHeight: 10 }
        should(missingLegitimateKeyIds(s, 'priv', 'g1')).eql([keyId])
        should(decisions(s)).eql({ ...ALL, reasons: { ...ALL.reasons, formerMembers: [] } })
        should(classify(s).unexpected).eql(['bd'])
      }
    })

    // An event adding someone back that we missed would otherwise get them
    // removed
    it('does not remove members while the group misses events encrypted with one of its CEKs, and decides the rest', () => {
      const s = missing(attacked(), 'g1', 'gcek')
      should(missingLegitimateKeyIds(s, 'g1')).eql(['gcek'])
      should(decisions(s)).eql({ ...ALL, toRemove: [] })
      should(classify(s)).eql({ kept: KEPT, unexpected: ['bd'], unknown: [] })
    })

    it('counts a missing group-cek only if it is one of the CEKs of the group', () => {
      const s = missing(attacked(), 'priv', 'gcek', 'gcek2')
      s.priv._vm.authorizedKeys.gcek2 = groupKeyOf('gcek2', 'group-cek', { _notBeforeHeight: 11 })
      should(missingLegitimateKeyIds(s, 'priv', 'g1')).eql(['gcek'])
      should(missingLegitimateKeyIds(s, 'priv')).eql([])
    })

    it('handles missing state', () => {
      should(missingLegitimateKeyIds(undefined, 'priv', 'g1')).eql([])
      should(missingLegitimateKeyIds({ contracts: { priv: { missingDecryptionKeyIds: ['cek1'] } } }, 'priv', 'g1')).eql([])
    })
  })

  describe('removalSigningKey', () => {
    it('is the first current group CSK, or else CSK, if we hold it, which is what leaves pick', () => {
      const s = state()
      should(removalSigningKey(s.priv, classify(s), always)).eql({ signingKeyId: 'gcsk', keepSigningKey: false })
      should(removalSigningKey(s.priv, classify(s), (id) => id !== 'gcsk')).eql({ signingKeyId: 'csk1', keepSigningKey: false })
    })

    // E.g., in a chatroom without a group CSK, a CSK that nobody holds, added
    // before a rotation, comes before the new CSK
    it('is the CSK kept, which the leave must keep, if we do not hold the first current one', () => {
      const s = state({ extraKeys: [{ ...ownKeys[0], id: 'csk2', _notBeforeHeight: 11 }] })
      rotate(s, 12)
      delete s.priv._vm.authorizedKeys.gcsk
      const haveSecretKey = (id) => id !== 'csk2'
      const classified = classify(s, haveSecretKey)
      should(classified.kept.csk).equal('csk1-12')
      should(classified.unexpected).eql(['csk2'])
      should(removalSigningKey(s.priv, classified, haveSecretKey)).eql({ signingKeyId: 'csk1-12', keepSigningKey: true })
    })

    it('is nothing if we hold none of these keys', () => {
      const s = state()
      should(removalSigningKey(s.priv, classify(s), () => false)).be.undefined()
      should(removalSigningKey(undefined, classify(s), always)).be.undefined()
    })
  })

  describe('lookupsReturnKeptKeys', () => {
    it('is true when the first current CEK and CSK are the ones kept', () => {
      const s = state()
      should(lookupsReturnKeptKeys(s.priv, classify(s))).be.true()
    })

    // Rotating adds the new keys last, so another CEK added before a rotation
    // comes before the new one
    it('is false when another key with the same name comes first', () => {
      const s = state({ extraKeys: [{ ...ownKeys[1], id: 'dup', _notBeforeHeight: 11 }] })
      rotate(s, 12)
      const classified = classify(s, (id) => id !== 'dup')
      should(classified.kept.cek).equal('cek1-12')
      should(lookupsReturnKeptKeys(s.priv, classified)).be.false()
      should(lookupsReturnKeptKeys(undefined, classified)).be.false()
    })
  })

  describe('removableForeignKeysOf', () => {
    const withKeys = (...keys) => ({ _vm: { authorizedKeys: byId(...keys) } })
    const withForeignKey = (id, fk, overrides = {}) => ({
      id, name: 'x', foreignKey: fk, ringLevel: 5, purpose: ['sig'], permissions: '*', allowedActions: '*', _notBeforeHeight: 1, ...overrides
    })

    it('returns the current string foreign keys that point to the member and that the signing ring can remove', () => {
      const chatRoomState = withKeys(
        withForeignKey('k1', 'shelter:b?keyName=csk', { name: 'b/k1' }),
        withForeignKey('k2', 'shelter:b?keyName=csk', { name: 'b/k2', _notAfterHeight: 9 }),
        withForeignKey('k3', 'shelter:c?keyName=csk', { name: 'c/k3' }),
        withForeignKey('k4', 'shelter:b', { name: 'b/k4' }),
        withForeignKey('k5', 'not a URL', { name: 'b/k5' }),
        withForeignKey('k6', 123, { name: 'b/k6' }),
        { id: 'k7', name: 'b/k7', ringLevel: 5, purpose: ['sig'], permissions: '*', allowedActions: '*', _notBeforeHeight: 1 },
        withForeignKey('k8', 'shelter:b?keyName=csk', { name: 'b/k8', ringLevel: 4 }),
        withForeignKey('k9', 'shelter:b?keyName=csk', { name: 'b/k9', ringLevel: 3.5 }),
        withForeignKey('k10', 'shelter:b?keyName=csk', { name: 'b/k10', ringLevel: 3 }),
        // Matches Chelonia's `foreignKey.includes(memberID)`, but isn't a URL
        withForeignKey('k11', 'b', { name: 'b/k11' })
      )
      should(removableForeignKeysOf(chatRoomState, 'b', 4)).eql(['k1', 'k8'])
      should(removableForeignKeysOf(chatRoomState, 'b', 3)).eql(['k1', 'k8', 'k10'])
      should(removableForeignKeysOf(undefined, 'b', 0)).eql([])
      should(removableForeignKeysOf(withKeys(), 'b', 0)).eql([])
    })
  })

  describe('parsing foreign keys', () => {
    // These checks run for every chatroom event
    it('parses each key\'s foreign key at most once, however many checks look at it', () => {
      const s = state({ extraKeys: [memberCSK('b'), memberCSK('c'), backdoor()], formerMembers: ['b'] })
      const foreignKeys = Object.values(s.priv._vm.authorizedKeys).filter((key) => key.foreignKey).length
      const RealURL = global.URL
      let parses = 0
      global.URL = class extends RealURL {
        constructor (...args) {
          super(...args)
          parses++
        }
      }
      try {
        should(chatRoomKeysNeedRotation(s, me, 'g1', 'priv', always)).be.true()
        // So that this test can't pass without counting anything
        should(parses).be.above(0)
        should(parses).be.belowOrEqual(foreignKeys)
        const afterFirst = parses
        chatRoomKeysNeedRotation(s, me, 'g1', 'priv', always)
        formerMemberKeyIdsToRemove(s.priv)
        should(parses).equal(afterFirst)
      } finally {
        global.URL = RealURL
      }
    })

    it('parses a foreign key again if it changes', () => {
      const key = { id: 'k', foreignKey: 'shelter:a' }
      should(isRemovableKey(key)).be.false()
      key.foreignKey = 'shelter:a?keyName=csk'
      should(isRemovableKey(key)).be.true()
    })
  })
})

describe('keyRemovalEntries', () => {
  const encryptionKey = () => serializeKey(keygen(CURVE25519XSALSA20POLY1305), false)
  // A chatroom in which `K` was added encrypted with `tmp`, which was then
  // removed without another key taking its name. Anyone holding the chatroom
  // CSK can do that, e.g., to keep `K` from being removed.
  const chatRoomState = () => ({
    _vm: {
      authorizedKeys: byId(
        { id: 'cek1', name: 'cek', purpose: ['enc'], data: encryptionKey(), _notBeforeHeight: 10 },
        { id: 'tmp', name: 'tmp', purpose: ['enc'], data: encryptionKey(), _notBeforeHeight: 11, _notAfterHeight: 12 },
        { id: 'K', name: 'x', purpose: ['sig'], _private: 'tmp', _notBeforeHeight: 11 },
        { id: 'plain', name: 'y', purpose: ['sig'], _notBeforeHeight: 11 }
      )
    }
  })

  it('keeps the IDs of keys that were not added encrypted', () => {
    const s = chatRoomState()
    should(keyRemovalEntries(s, s, ['plain', 'missing'], 'cek1')).eql(['plain', 'missing'])
  })

  it('encrypts the removal of keys that were added encrypted with the key given, which works after the key they were added with is removed', () => {
    const s = chatRoomState()
    // What `chelonia/out/keyDel` does for such keys, which fails
    should(() => encryptedOutgoingData(s, s._vm.authorizedKeys.K._private, 'K').serialize()).throw()
    const [entry, plain] = keyRemovalEntries(s, s, ['K', 'plain'], 'cek1')
    should(plain).equal('plain')
    should(entry.encryptionKeyId).equal('cek1')
    should(entry.valueOf()).equal('K')
    should(() => entry.serialize()).not.throw()
  })

  it('leaves the ID as is without a key to encrypt with', () => {
    const s = chatRoomState()
    should(keyRemovalEntries(s, s, ['K'], undefined)).eql(['K'])
    should(keyRemovalEntries(s, undefined, ['K'], 'cek1')).eql(['K'])
  })

  // Members' keys are added encrypted with the `group-cek`, which is replaced
  // when the group's keys are rotated, and which anyone holding the chatroom
  // CSK can remove
  it('encrypts the removal of member keys with the key given once the group CEK that they were added with is removed', () => {
    const s = chatRoomState()
    s._vm.authorizedKeys.gcek = { id: 'gcek', name: 'group-cek', purpose: ['enc'], data: encryptionKey(), _notBeforeHeight: 1, _notAfterHeight: 12 }
    s._vm.authorizedKeys['b-csk'] = memberCSK('b')
    should(() => encryptedOutgoingData(s, 'gcek', 'b-csk').serialize()).throw()
    const [entry] = keyRemovalEntries(s, s, ['b-csk'], 'cek1')
    should(entry.encryptionKeyId).equal('cek1')
    should(entry.valueOf()).equal('b-csk')
    should(() => entry.serialize()).not.throw()
  })
})
