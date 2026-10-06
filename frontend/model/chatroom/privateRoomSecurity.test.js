/* eslint-env mocha */

import { chatRoomMembersToRemove, currentKeysHeight, formerMemberKeyIdsToRemove, formerMembersWithCurrentKeys, isOurPrivateGroupChatRoom, membersMissingFromGroup, privateGroupChatRoomsToCheck } from './privateRoomSecurity.js'
import { CHATROOM_PRIVACY_LEVEL, CHATROOM_TYPES, PROFILE_STATUS } from '~/frontend/model/contracts/shared/constants.js'
const should = require('should')

// A member's CSK, as added to a chatroom when they join
const memberKey = (memberID, { removed } = {}) => ({
  [`${memberID}-csk`]: {
    id: `${memberID}-csk`,
    name: `${memberID}/${memberID}-csk`,
    foreignKey: `shelter:${memberID}?keyName=csk`,
    _notBeforeHeight: 1,
    ...(removed != null && { _notAfterHeight: removed })
  }
})
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

  it('handles a missing state', () => {
    should(formerMembersWithCurrentKeys(undefined, 10)).eql([])
  })
})

describe('formerMemberKeyIdsToRemove', () => {
  it('includes keys of former members that have not been removed', () => {
    should(formerMemberKeyIdsToRemove(chatRoom({ a: {}, b: { hasLeft: true } }, memberKey('a'), memberKey('b')))).eql(['b-csk'])
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

describe('chatRoomMembersToRemove', () => {
  it('includes members missing from the group, except ourselves', () => {
    should(chatRoomMembersToRemove(
      { members: { me: {}, a: {}, b: {} } },
      { members: { a: { status: PROFILE_STATUS.ACTIVE }, b: { status: PROFILE_STATUS.REMOVED } } },
      'me'
    )).eql(['b'])
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

  it('is 0 when a height is missing', () => {
    should(currentKeysHeight(keys(undefined, 12), 'cek', 'csk')).equal(0)
  })
})

describe('privateGroupChatRoomsToCheck', () => {
  const me = 'me'
  const record = (privacyLevel, { status = PROFILE_STATUS.ACTIVE, deletedDate = null } = {}) => ({
    privacyLevel, deletedDate, members: { [me]: { status } }
  })
  const synced = (type, privacyLevel, members = { [me]: {} }) => ({
    _vm: {}, attributes: { type, privacyLevel }, members
  })
  const state = {
    [me]: {
      groups: { g1: {}, g2: { hasLeft: true } },
      chatRooms: { dm: { visible: true } }
    },
    g1: {
      chatRooms: {
        priv: record(CHATROOM_PRIVACY_LEVEL.PRIVATE),
        pub: record(CHATROOM_PRIVACY_LEVEL.GROUP),
        deleted: record(CHATROOM_PRIVACY_LEVEL.PRIVATE, { deletedDate: '2026-01-01T00:00:00.000Z' }),
        notOurs: record(CHATROOM_PRIVACY_LEVEL.PRIVATE, { status: PROFILE_STATUS.REMOVED }),
        leftChatRoom: record(CHATROOM_PRIVACY_LEVEL.PRIVATE),
        unsynced: record(CHATROOM_PRIVACY_LEVEL.PRIVATE),
        dmLike: record(CHATROOM_PRIVACY_LEVEL.PRIVATE)
      }
    },
    g2: { chatRooms: { formerGroupPriv: record(CHATROOM_PRIVACY_LEVEL.PRIVATE) } },
    priv: synced(CHATROOM_TYPES.GROUP, CHATROOM_PRIVACY_LEVEL.PRIVATE),
    pub: synced(CHATROOM_TYPES.GROUP, CHATROOM_PRIVACY_LEVEL.GROUP),
    deleted: synced(CHATROOM_TYPES.GROUP, CHATROOM_PRIVACY_LEVEL.PRIVATE),
    notOurs: synced(CHATROOM_TYPES.GROUP, CHATROOM_PRIVACY_LEVEL.PRIVATE),
    leftChatRoom: synced(CHATROOM_TYPES.GROUP, CHATROOM_PRIVACY_LEVEL.PRIVATE, { [me]: { hasLeft: true } }),
    formerGroupPriv: synced(CHATROOM_TYPES.GROUP, CHATROOM_PRIVACY_LEVEL.PRIVATE),
    dm: synced(CHATROOM_TYPES.DIRECT_MESSAGE, CHATROOM_PRIVACY_LEVEL.PRIVATE),
    dmLike: synced(CHATROOM_TYPES.DIRECT_MESSAGE, CHATROOM_PRIVACY_LEVEL.PRIVATE)
  }

  it('selects only synced, non-deleted private chatrooms that we are in, of groups that we are in', () => {
    should(privateGroupChatRoomsToCheck(state, me)).eql([{ groupID: 'g1', chatRoomID: 'priv' }])
  })

  it('never selects DMs', () => {
    should(isOurPrivateGroupChatRoom(state, me, 'g1', 'dmLike')).be.false()
    should(privateGroupChatRoomsToCheck(state, me).some(({ chatRoomID }) => ['dm', 'dmLike'].includes(chatRoomID))).be.false()
  })

  it('handles missing state', () => {
    should(privateGroupChatRoomsToCheck({}, me)).eql([])
  })
})
