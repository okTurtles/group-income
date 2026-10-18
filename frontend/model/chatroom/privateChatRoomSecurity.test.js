/* eslint-env mocha */

import { SPMessage } from '@chelonia/lib/SPMessage'
import { chatRoomKeysNeedRotation, classifyChatRoomKeys, currentKeysHeight, formerMemberKeyIdsToRemove, formerMembersWithCurrentKeys, groupIDForChatRoom, isKeyRequestFromRemovedMember, isOurPrivateGroupChatRoom, isRemovableKey, keysBlockingRotation, membersMissingFromGroup, ourPrivateGroupChatRoomMembersToRemove, privateGroupChatRoomsToCheck, unexpectedKeysRemovedSince } from './privateChatRoomSecurity.js'
import { CHATROOM_PRIVACY_LEVEL, CHATROOM_TYPES, PROFILE_STATUS } from '~/frontend/model/contracts/shared/constants.js'
const should = require('should')

const MAX = Number.MAX_SAFE_INTEGER
const byId = (...keys) => Object.fromEntries(keys.map((key) => [key.id, key]))
// A member's CSK, as added to a chatroom when they join
const memberCSK = (memberID, overrides = {}) => ({
  id: `${memberID}-csk`,
  name: `${memberID}/${memberID}-csk`,
  foreignKey: `shelter:${memberID}?keyName=csk`,
  ringLevel: MAX,
  purpose: ['sig'],
  permissions: [SPMessage.OP_ACTION_ENCRYPTED + '#inner'],
  allowedActions: '*',
  data: `${memberID}-data`,
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

  it('handles a missing state', () => {
    should(formerMembersWithCurrentKeys(undefined, 10)).eql([])
    should(formerMembersWithCurrentKeys({ _vm: { authorizedKeys: memberKey('b') } }, 10)).eql([])
  })

  // Rotating can't remove them, so counting them would rotate the keys again
  // and again
  it('ignores keys that cannot be removed', () => {
    for (const foreignKey of ['shelter:b', 'not a URL']) {
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
  const me = 'me'
  const record = (privacyLevel, { status = PROFILE_STATUS.ACTIVE, deletedDate = null } = {}) => ({
    privacyLevel, deletedDate, members: { [me]: { status } }
  })
  const synced = (type, privacyLevel, members = { [me]: {} }) => ({
    _vm: {}, attributes: { type, privacyLevel }, members
  })
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

  it('skips a chatroom while its group, or the chatroom itself, has events we could not decrypt', () => {
    for (const contractID of ['g1', 'priv']) {
      const incomplete = { ...state, contracts: { [contractID]: { missingDecryptionKeyIds: ['k'] } } }
      should(isOurPrivateGroupChatRoom(incomplete, me, 'g1', 'priv')).be.false()
      should(privateGroupChatRoomsToCheck(incomplete, me)).eql([])
    }
    const complete = { ...state, contracts: { g1: { missingDecryptionKeyIds: [] }, priv: {} } }
    should(privateGroupChatRoomsToCheck(complete, me)).eql([{ groupID: 'g1', chatRoomID: 'priv' }])
  })
})

describe('ourPrivateGroupChatRoomMembersToRemove', () => {
  const me = 'me'
  const state = (contracts = {}) => ({
    contracts,
    [me]: { groups: { g1: {} } },
    g1: {
      chatRooms: {
        priv: {
          privacyLevel: CHATROOM_PRIVACY_LEVEL.PRIVATE,
          deletedDate: null,
          members: { [me]: { status: PROFILE_STATUS.ACTIVE }, a: { status: PROFILE_STATUS.ACTIVE }, b: { status: PROFILE_STATUS.REMOVED } }
        },
        pub: {
          privacyLevel: CHATROOM_PRIVACY_LEVEL.GROUP,
          deletedDate: null,
          members: { [me]: { status: PROFILE_STATUS.ACTIVE }, b: { status: PROFILE_STATUS.REMOVED } }
        }
      }
    },
    priv: { _vm: {}, attributes: { type: CHATROOM_TYPES.GROUP, privacyLevel: CHATROOM_PRIVACY_LEVEL.PRIVATE }, members: { [me]: {}, a: {}, b: {} } },
    pub: { _vm: {}, attributes: { type: CHATROOM_TYPES.GROUP, privacyLevel: CHATROOM_PRIVACY_LEVEL.GROUP }, members: { [me]: {}, b: {} } }
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

  it('is empty while the group, or the chatroom, has events we could not decrypt', () => {
    should(ourPrivateGroupChatRoomMembersToRemove(state({ g1: { missingDecryptionKeyIds: ['k'] } }), me, 'g1', 'priv')).eql([])
    should(ourPrivateGroupChatRoomMembersToRemove(state({ priv: { missingDecryptionKeyIds: ['k'] } }), me, 'g1', 'priv')).eql([])
  })
})

describe('groupIDForChatRoom and isKeyRequestFromRemovedMember', () => {
  const me = 'me'
  const state = {
    [me]: { groups: { g1: {}, g2: {} } },
    g1: { chatRooms: { pub: { privacyLevel: CHATROOM_PRIVACY_LEVEL.GROUP, members: { b: { status: PROFILE_STATUS.REMOVED } } } } },
    g2: {
      chatRooms: {
        priv: {
          privacyLevel: CHATROOM_PRIVACY_LEVEL.PRIVATE,
          members: { a: { status: PROFILE_STATUS.ACTIVE }, b: { status: PROFILE_STATUS.REMOVED } }
        }
      }
    }
  }

  it('finds the group that lists a chatroom', () => {
    should(groupIDForChatRoom(state, me, 'priv')).equal('g2')
    should(groupIDForChatRoom(state, me, 'pub')).equal('g1')
    should(groupIDForChatRoom(state, me, 'dm')).be.undefined()
    should(groupIDForChatRoom(undefined, me, 'priv')).be.undefined()
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
  const me = 'me'
  // The key of a member's identity contract that the chatroom key mirrors
  const identity = (memberID) => ({
    _vm: { authorizedKeys: { [`${memberID}-csk`]: { id: `${memberID}-csk`, name: 'csk', data: `${memberID}-data` } } }
  })
  const ownKeys = [
    { id: 'csk1', name: 'csk', ringLevel: 0, purpose: ['sig'], permissions: '*', allowedActions: '*', _notBeforeHeight: 10 },
    { id: 'cek1', name: 'cek', ringLevel: 0, purpose: ['enc'], permissions: [SPMessage.OP_ACTION_ENCRYPTED], allowedActions: '*', _notBeforeHeight: 10 },
    { id: 'sak1', name: '#sak', ringLevel: 0, purpose: ['sak'], permissions: [], allowedActions: [], _notBeforeHeight: 1 }
  ]
  const groupKey = (id, name, overrides = {}) => ({
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
  const groupKeys = [groupKey('gcsk', 'group-csk'), groupKey('gcek', 'group-cek')]
  // One of our private group chatrooms, with the keys that it's created with,
  // the keys of its members (us and `a`), and `extraKeys` added last.
  // `firstKeys` are added first, and replace the keys with the same IDs.
  const state = ({ firstKeys = [], extraKeys = [], privacyLevel = CHATROOM_PRIVACY_LEVEL.PRIVATE } = {}) => ({
    [me]: { groups: { g1: {} }, ...identity(me) },
    a: identity('a'),
    g1: {
      _vm: {
        authorizedKeys: {
          gcsk: { id: 'gcsk', name: 'csk', data: 'gcsk-data', _notBeforeHeight: 5 },
          gcek: { id: 'gcek', name: 'cek', data: 'gcek-data', _notBeforeHeight: 5 },
          'gcsk-old': { id: 'gcsk-old', name: 'csk', data: 'gcsk-old-data', _notBeforeHeight: 1, _notAfterHeight: 5 }
        }
      },
      chatRooms: {
        priv: {
          privacyLevel,
          deletedDate: null,
          members: { [me]: { status: PROFILE_STATUS.ACTIVE }, a: { status: PROFILE_STATUS.ACTIVE } }
        }
      }
    },
    priv: {
      _vm: {
        authorizedKeys: byId(
          ...firstKeys,
          ...[...ownKeys, ...groupKeys, memberCSK(me), memberCSK('a')].filter((key) => !firstKeys.some(({ id }) => id === key.id)),
          ...extraKeys
        )
      },
      attributes: { type: CHATROOM_TYPES.GROUP, privacyLevel },
      members: { [me]: {}, a: {} }
    }
  })
  const always = () => true
  const classify = (s, haveSecretKey = always) => classifyChatRoomKeys(s, me, 'g1', 'priv', haveSecretKey)
  const backdoor = (overrides = {}) => ({
    id: 'bd', name: 'r8-backdoor', ringLevel: 0, purpose: ['sig'], permissions: '*', allowedActions: '*', data: 'bd-data', _notBeforeHeight: 11, ...overrides
  })

  describe('classifyChatRoomKeys', () => {
    it('accepts the keys that a private group chatroom is created with, and its members\' keys', () => {
      should(classify(state())).eql({
        kept: { csk: 'csk1', cek: 'cek1', '#sak': 'sak1', 'group-csk': 'gcsk', 'group-cek': 'gcek' },
        unexpected: [],
        unknown: []
      })
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
    })

    it('flags chatroom keys with another shape', () => {
      for (const changes of [{ ringLevel: 2 }, { purpose: ['sig', 'enc'] }, { foreignKey: 'shelter:a?keyName=csk' }]) {
        should(classify(state({ firstKeys: [{ ...ownKeys[0], id: 'odd', ...changes }] })).unexpected).eql(['odd'])
      }
    })

    it('accepts the chatroom\'s own keys at ring level 1, as created before April 2024', () => {
      const ring1 = ownKeys.slice(0, 2).map((key) => ({ ...key, ringLevel: 1 }))
      const s = state({ firstKeys: ring1 })
      should(classify(s)).eql({
        kept: { csk: 'csk1', cek: 'cek1', '#sak': 'sak1', 'group-csk': 'gcsk', 'group-cek': 'gcek' },
        unexpected: [],
        unknown: []
      })
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
      const s = state({ firstKeys: [groupKey('gcsk', 'group-csk', { permissions: '*' })] })
      should(classify(s).unexpected).eql(['gcsk'])
      should(classify(s).kept['group-csk']).be.undefined()
    })

    it('keeps the group key that matches the group\'s current key', () => {
      const old = groupKey('gcsk-old', 'group-csk')
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
        should(classify(state({ firstKeys: [groupKey('gcsk', 'group-csk', changes)] })).unexpected).eql(['gcsk'])
      }
    })

    it('accepts group keys with the fewer permissions of older versions', () => {
      const older = groupKey('gcsk', 'group-csk', { permissions: [SPMessage.OP_ACTION_ENCRYPTED] })
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
      const joinKey = backdoor({ id: 'jk', name: '#joinKey-jk' })
      const groupKeyOfOldVersions = groupKey('gk', 'groupKey')
      const result = classify(state({ extraKeys: [joinKey, groupKeyOfOldVersions] }))
      should(result.unexpected).eql([])
      should(result.unknown).eql(['jk', 'gk'])
    })

    it('reports foreign keys missing from the contract that they point to without flagging them, unless they are duplicates', () => {
      // E.g., keys that were just rotated, while our copies of the group and of
      // the member's identity contract are behind
      const rotated = state({
        firstKeys: [groupKey('gcsk', 'group-csk', { _notAfterHeight: 12 }), memberCSK('a', { _notAfterHeight: 12 })],
        extraKeys: [groupKey('gcsk2', 'group-csk'), memberCSK('a', { id: 'a-csk2' })]
      })
      should(classify(rotated)).eql({
        kept: { csk: 'csk1', cek: 'cek1', '#sak': 'sak1', 'group-csk': 'gcsk2', 'group-cek': 'gcek' },
        unexpected: [],
        unknown: ['gcsk2', 'a-csk2']
      })
      const duplicate = classify(state({ extraKeys: [groupKey('gcsk2', 'group-csk')] }))
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
      should(result.kept).eql({ csk: 'csk1', cek: 'cek1', '#sak': 'sak1', 'group-csk': 'gcsk', 'group-cek': 'gcek' })
      should(result.unexpected).eql([])
      should(result.unknown).eql(['nokn', 'nourl', 'nocid', 'csk2', 'a-x'])
      // Those that can be removed are still flagged
      should(classify(state({ extraKeys: [...unremovable, backdoor()] })).unexpected).eql(['bd'])
    })

    it('returns nothing for chatrooms that are not our private group chatrooms', () => {
      should(classify(state({ extraKeys: [backdoor()], privacyLevel: CHATROOM_PRIVACY_LEVEL.GROUP }))).eql({ kept: {}, unexpected: [], unknown: [] })
      should(classifyChatRoomKeys(undefined, me, 'g1', 'priv', always)).eql({ kept: {}, unexpected: [], unknown: [] })
    })
  })

  describe('unexpectedKeysRemovedSince', () => {
    it('includes unexpected keys removed after the current keys became valid', () => {
      should(unexpectedKeysRemovedSince(state({ extraKeys: [backdoor({ _notAfterHeight: 12 })] }), 'g1', 'priv', 10)).eql(['bd'])
    })

    it('excludes keys removed before, or in the message that rotated the keys', () => {
      should(unexpectedKeysRemovedSince(state({ extraKeys: [backdoor({ _notAfterHeight: 9 })] }), 'g1', 'priv', 10)).eql([])
      should(unexpectedKeysRemovedSince(state({ extraKeys: [backdoor({ _notAfterHeight: 10 })] }), 'g1', 'priv', 10)).eql([])
    })

    it('excludes keys replaced in the same message, and member keys', () => {
      const rotated = { ...ownKeys[0], id: 'csk0', _notBeforeHeight: 1, _notAfterHeight: 12 }
      const replacement = { ...ownKeys[0], id: 'csk2', _notBeforeHeight: 12 }
      should(unexpectedKeysRemovedSince(state({ firstKeys: [rotated], extraKeys: [replacement] }), 'g1', 'priv', 10)).eql([])
      should(unexpectedKeysRemovedSince(state({ extraKeys: [memberCSK('b', { _notAfterHeight: 12 })] }), 'g1', 'priv', 10)).eql([])
      should(unexpectedKeysRemovedSince(undefined, 'g1', 'priv', 10)).eql([])
    })

    it('excludes a group key replaced by an update', () => {
      const s = state({
        firstKeys: [groupKey('gcsk', 'group-csk', { _notAfterHeight: 12 })],
        extraKeys: [groupKey('gcsk2', 'group-csk', { _notBeforeHeight: 12 })]
      })
      should(unexpectedKeysRemovedSince(s, 'g1', 'priv', 10)).eql([])
    })

    // A key's name and height are up to whoever adds it, so the exception for
    // replaced keys mustn't hide the replacement
    it('still requires a rotation when an unexpected key is replaced by another one with the same name', () => {
      const s = state({ extraKeys: [backdoor({ _notAfterHeight: 12 }), backdoor({ id: 'bd2', _notBeforeHeight: 12 })] })
      should(unexpectedKeysRemovedSince(s, 'g1', 'priv', 10)).eql([])
      should(classify(s).unexpected).eql(['bd2'])
      should(chatRoomKeysNeedRotation(s, me, 'g1', 'priv', always)).be.true()
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
          groupKey('gcsk2', 'group-csk', { foreignKey: 'shelter:g1' })
        ]
      })
      should(keysBlockingRotation(s, 'priv', classify(s))).eql([])
      // The only key with a name is kept, even if it can't be removed
      const onlyCSK = state({ firstKeys: [{ ...ownKeys[0], foreignKey: 'shelter:a' }] })
      should(classify(onlyCSK).kept.csk).equal('csk1')
      should(keysBlockingRotation(onlyCSK, 'priv', classify(onlyCSK))).eql([])
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
      const s = state({ extraKeys: [memberCSK('b')] })
      s.priv.members.b = { hasLeft: true }
      should(needsRotation(s)).be.true()
    })

    it('is false for keys from older versions, which are only reported', () => {
      should(needsRotation(state({ extraKeys: [backdoor({ id: 'jk', name: '#joinKey-jk' })] }))).be.false()
    })

    it('is false for keys that cannot be removed, which are only reported', () => {
      should(needsRotation(state({ extraKeys: [backdoor({ foreignKey: 'shelter:a' })] }))).be.false()
    })

    it('is false while a key blocks rotations, even if a former member holds the current keys', () => {
      const s = state({ extraKeys: [memberCSK('b'), { ...ownKeys[1], id: 'cek2', foreignKey: 'shelter:a', _notBeforeHeight: 11 }] })
      s.priv.members.b = { hasLeft: true }
      should(needsRotation(s)).be.false()
      delete s.priv._vm.authorizedKeys.cek2
      should(needsRotation(s)).be.true()
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
})
