/* eslint-env mocha */
import { findGroupIdForContract } from './groupScope.js'
const should = require('should')

describe('findGroupIdForContract', function () {
  const groupA = 'groupA-contractID'
  const groupB = 'groupB-contractID'
  const chatRoomOfGroupA = 'chatroom-of-A'
  const identityContract = 'identity-contractID'

  const rootState = {
    contracts: {
      [groupA]: { type: 'gi.contracts/group' },
      [groupB]: { type: 'gi.contracts/group' },
      [chatRoomOfGroupA]: { type: 'gi.contracts/chatroom' },
      [identityContract]: { type: 'gi.contracts/identity' }
    },
    [groupA]: { chatRooms: { [chatRoomOfGroupA]: {} } },
    [groupB]: { chatRooms: {} }
  }

  it('returns the contractID itself when it is a group contract', () => {
    should(findGroupIdForContract(rootState, groupA)).equal(groupA)
  })

  it('returns the owning group when the contract is one of its chat rooms', () => {
    should(findGroupIdForContract(rootState, chatRoomOfGroupA)).equal(groupA)
  })

  it('returns undefined for a contract that belongs to no group (e.g. an identity contract)', () => {
    should(findGroupIdForContract(rootState, identityContract)).equal(undefined)
  })

  it('returns undefined for an unknown contractID', () => {
    should(findGroupIdForContract(rootState, 'does-not-exist')).equal(undefined)
  })

  it('returns undefined when contractID is missing', () => {
    should(findGroupIdForContract(rootState, undefined)).equal(undefined)
    should(findGroupIdForContract(rootState, '')).equal(undefined)
  })

  it('does not throw when rootState is sparse (no chatRooms on a group yet)', () => {
    const sparseState = { contracts: { [groupA]: { type: 'gi.contracts/group' } } }
    should(findGroupIdForContract(sparseState, 'anything')).equal(undefined)
  })
})
