import { CHATROOM_PRIVACY_LEVEL, CHATROOM_TYPES, MESSAGE_TYPES, PROFILE_STATUS } from '../../../frontend/model/contracts/shared/constants.js'
import { currentKeyByName, randomUserSuffix, readChatRoom } from '../support/lib.js'

// Former members of a private channel must not keep access to it:
//  - the channel keys must be rotated when a member leaves
//  - a member who re-joins the channel directly (i.e., without being added
//    through the group, which a modified client could do before the keys are
//    rotated) must be removed by the other members. For existing state, this
//    is done by a migration when logging in.
//  - keys that no legitimate operation adds (which a member could add while
//    holding the channel keys) must be removed, and the keys rotated
// DMs must not be affected.

const userId = randomUserSuffix()
const groupName = 'Private Channels'
const user1 = `user1-${userId}`
const user2 = `user2-${userId}`
const user3 = `user3-${userId}`
const channelName = 'private-channel'
const secretMessage = `Posted after user2 was removed ${userId}`

const ids = {}
let invitationLinkAnyone
let initialKeys, rotatedKeys, dmBefore

// SPMessage.OP_ACTION_ENCRYPTED + '#inner' (importing `SPMessage` here breaks
// the Cypress bundle, as its dependencies can't be resolved)
const AE_INNER = 'ae#inner'

const currentKeys = (state) => ({
  cek: currentKeyByName(state, 'cek')?.id,
  csk: currentKeyByName(state, 'csk')?.id
})

const currentKeysValidFrom = (state) => {
  const { cek, csk } = currentKeys(state)
  return Math.min(
    state._vm.authorizedKeys[cek]._notBeforeHeight,
    state._vm.authorizedKeys[csk]._notBeforeHeight
  )
}

const dmSnapshot = (sbp) => {
  const state = sbp('state/vuex/state')[ids.dm]
  return { members: Object.keys(state.members).sort(), keys: currentKeys(state) }
}

const addMemberKey = (sbp, chatRoomID, memberID, signingKeyId) => {
  const identityState = sbp('state/vuex/state')[memberID]
  const CSKid = currentKeys(identityState).csk
  return sbp('chelonia/out/keyAdd', {
    contractID: chatRoomID,
    contractName: 'gi.contracts/chatroom',
    data: [{
      foreignKey: `shelter:${memberID}?keyName=csk`,
      id: CSKid,
      data: identityState._vm.authorizedKeys[CSKid].data,
      permissions: [AE_INNER],
      allowedActions: '*',
      purpose: ['sig'],
      ringLevel: Number.MAX_SAFE_INTEGER,
      name: `${memberID}/${CSKid}`
    }],
    signingKeyId
  })
}

describe('Private channels - former members lose access', () => {
  it('user1 creates a group', () => {
    cy.visit('/')
    cy.giSignup(user1, { bypassUI: true })
    cy.window().its('sbp').then(sbp => {
      ids.user1 = sbp('state/vuex/state').loggedIn.identityContractID
    })
    cy.giCreateGroup(groupName, { bypassUI: true })
    cy.window().its('sbp').then(sbp => {
      ids.group = sbp('state/vuex/state').currentGroupId
    })
    cy.giGetInvitationAnyone().then(url => {
      invitationLinkAnyone = url
    })
    cy.giLogout({ bypassUI: true })
  })

  it('user2 and user3 join the group', () => {
    const saveOwnId = (name) => () => {
      cy.window().its('sbp').then(sbp => {
        ids[name] = sbp('state/vuex/state').loggedIn.identityContractID
      })
    }
    cy.giAcceptMultipleGroupInvites(invitationLinkAnyone, {
      usernames: [user2, user3],
      existingMemberUsername: user1,
      groupName,
      actionBeforeLogout: [saveOwnId('user2'), saveOwnId('user3')],
      bypassUI: true
    })
  })

  it('user1 starts a DM with user3 and creates a private channel with user2 and user3', () => {
    cy.giLogin(user1, { bypassUI: true })

    cy.window().its('sbp').then(async sbp => {
      await sbp('gi.actions/identity/createDirectMessage', {
        contractID: ids.user1,
        data: { currentGroupId: ids.group, memberIDs: [ids.user3] }
      })
      ids.channel = await sbp('gi.actions/group/addAndJoinChatRoom', {
        contractID: ids.group,
        data: {
          attributes: {
            name: channelName,
            description: '',
            privacyLevel: CHATROOM_PRIVACY_LEVEL.PRIVATE,
            type: CHATROOM_TYPES.GROUP
          }
        }
      })
    })
    cy.giEmptyInvocationQueue()
    cy.window().its('sbp').then(async sbp => {
      for (const memberID of [ids.user2, ids.user3]) {
        await sbp('gi.actions/group/joinChatRoom', {
          contractID: ids.group,
          data: { chatRoomID: ids.channel, memberID }
        })
      }
    })
    cy.giEmptyInvocationQueue()

    cy.window().its('sbp').should(sbp => {
      const state = sbp('state/vuex/state')
      ids.dm = Object.keys(state[ids.user1]?.chatRooms || {})[0]
      expect(ids.dm).to.be.a('string')
      expect(Object.keys(state[ids.dm]?.members || {})).to.have.length(2)
      const members = state[ids.channel]?.members || {}
      expect(members).to.have.all.keys(ids.user1, ids.user2, ids.user3)
      dmBefore = dmSnapshot(sbp)
      initialKeys = currentKeys(state[ids.channel])
    })
  })

  it('user2 leaves the channel and re-joins it directly, without going through the group', () => {
    cy.giSwitchUser(user2)

    cy.window().its('sbp').then(sbp => {
      return sbp('gi.actions/group/leaveChatRoom', {
        contractID: ids.group,
        data: { chatRoomID: ids.channel }
      })
    })
    cy.giEmptyInvocationQueue()
    cy.giChatRoomCheck(ids.channel, (state, sbp) => {
      const ownCSKid = currentKeys(sbp('state/vuex/state')[ids.user2]).csk
      return state?.members?.[ids.user2]?.hasLeft === true &&
        typeof state._vm.authorizedKeys[ownCSKid]?._notAfterHeight === 'number'
    })

    // Nobody else is online, so the channel keys haven't been rotated yet.
    // A modified client can use them to re-add its own key and re-join.
    cy.window().its('sbp').then(sbp => readChatRoom(sbp, ids.channel, (state) => {
      expect(currentKeys(state)).to.deep.equal(initialKeys)
    }))
    cy.window().its('sbp').then(sbp => readChatRoom(sbp, ids.channel, async (state) => {
      const ownCSKid = currentKeys(sbp('state/vuex/state')[ids.user2]).csk
      const { csk, cek } = currentKeys(state)
      await addMemberKey(sbp, ids.channel, ids.user2, csk)
      await sbp('chelonia/contract/sync', ids.channel)
      await sbp('chelonia/out/actionEncrypted', {
        contractID: ids.channel,
        contractName: 'gi.contracts/chatroom',
        action: 'gi.contracts/chatroom/join',
        data: {},
        signingKeyId: csk,
        innerSigningKeyId: ownCSKid,
        encryptionKeyId: cek
      })
    }))
    cy.window().its('sbp').then(sbp => readChatRoom(sbp, ids.channel, (state) => {
      const groupRecord = sbp('state/vuex/state')[ids.group].chatRooms[ids.channel]
      expect(state.members[ids.user2].hasLeft, 'user2 is a member of the channel again').to.equal(undefined)
      expect(groupRecord.members[ids.user2].status, 'the group lists user2 as removed').to.equal(PROFILE_STATUS.REMOVED)
    }))
    // While a member again, user2 asks for the channel keys, as members who
    // are missing them do. Other members mustn't answer, as the group lists
    // user2 as removed.
    cy.window().its('sbp').then(sbp => readChatRoom(sbp, ids.channel, async (state) => {
      const identityState = sbp('state/vuex/state')[ids.user2]
      await sbp('chelonia/out/keyRequest', {
        originatingContractID: ids.user2,
        originatingContractName: 'gi.contracts/identity',
        contractID: ids.channel,
        contractName: 'gi.contracts/chatroom',
        reference: identityState.groups[ids.group].hash + '/' + ids.channel,
        signingKeyId: currentKeyByName(state, 'group-csk').id,
        innerSigningKeyId: currentKeys(identityState).csk,
        encryptionKeyId: currentKeys(identityState).cek,
        request: 'missing',
        skipInviteAccounting: true,
        innerEncryptionKeyId: currentKeys(state).cek,
        encryptKeyRequestMetadata: true
      })
    }))
  })

  it('user1 logs in: user2 is removed and the channel keys are rotated', () => {
    cy.giSwitchUser(user1)

    cy.giChatRoomKeysRotated(ids.channel, initialKeys.cek)
    cy.giEmptyInvocationQueue()
    cy.window().its('sbp').then(sbp => {
      const state = sbp('state/vuex/state')[ids.channel]
      expect(state.members[ids.user2].hasLeft, 'user2 was removed from the channel').to.equal(true)
      const keyRequests = Object.values(state._vm.pendingKeyshares || {}).filter((entry) => entry[3]?.[0] === ids.user2)
      expect(keyRequests, 'user2\'s key request was not answered').to.have.length(1)
      rotatedKeys = currentKeys(state)
      expect(rotatedKeys.csk).not.to.equal(initialKeys.csk)
      return sbp('gi.actions/chatroom/addMessage', {
        contractID: ids.channel,
        data: { type: MESSAGE_TYPES.TEXT, text: secretMessage }
      })
    })
    cy.giEmptyInvocationQueue()
  })

  it('user2 cannot read new messages in the channel', () => {
    cy.giSwitchUser(user2)

    cy.window().its('sbp').then(async sbp => {
      expect(await sbp('chelonia/haveSecretKey', rotatedKeys.cek), 'user2 does not have the new channel key').to.equal(false)
      const canRead = await readChatRoom(sbp, ids.channel, (state) => {
        return (state.messages || []).some((message) => message.text === secretMessage)
      })
      expect(canRead, 'user2 cannot read the new message').to.equal(false)
    })
  })

  it('user3 can read new messages and the DM is untouched', () => {
    cy.giSwitchUser(user3)

    cy.giChatRoomHasMessage(ids.channel, secretMessage)
    // Contracts are loaded into the tab one at a time after logging in, so
    // the DM may not be there yet when the channel is
    cy.window().its('sbp').should(sbp => {
      expect(sbp('state/vuex/state')[ids.dm]?.members, 'the DM is loaded').to.be.an('object')
    })
    cy.window().its('sbp').then(sbp => {
      expect(dmSnapshot(sbp)).to.deep.equal(dmBefore)
    })
  })

  it('user3 leaves the channel and its keys are rotated when user1 logs in', () => {
    cy.window().its('sbp').then(sbp => {
      return sbp('gi.actions/group/leaveChatRoom', {
        contractID: ids.group,
        data: { chatRoomID: ids.channel }
      })
    })
    cy.giEmptyInvocationQueue()
    // Make sure that the leave was published before logging out
    cy.giChatRoomCheck(ids.channel, (state) => state?.members?.[ids.user3]?.hasLeft === true)

    cy.giSwitchUser(user1)
    cy.giChatRoomKeysRotated(ids.channel, rotatedKeys.cek)
    cy.window().its('sbp').then(sbp => {
      rotatedKeys = currentKeys(sbp('state/vuex/state')[ids.channel])
    })
  })

  it('a key still held by a former member is removed and the keys are rotated, once', () => {
    // Simulate a channel where a former member's key was never removed, by
    // adding user3's key back
    cy.window().its('sbp').then(sbp => {
      ids.user3CSK = currentKeys(sbp('state/vuex/state')[ids.user3]).csk
      return addMemberKey(sbp, ids.channel, ids.user3, rotatedKeys.csk)
    })
    cy.window().its('sbp').should(sbp => {
      const key = sbp('state/vuex/state')[ids.channel]._vm.authorizedKeys[ids.user3CSK]
      expect(key._notAfterHeight, 'user3\'s key is current again').to.equal(undefined)
    })

    // The check that runs when the channel's events are processed handles it,
    // without logging in again
    cy.giChatRoomKeysRotated(ids.channel, rotatedKeys.cek)
    cy.window().its('sbp').should(sbp => {
      const state = sbp('state/vuex/state')[ids.channel]
      const key = state._vm.authorizedKeys[ids.user3CSK]
      expect(key._notAfterHeight, 'user3\'s key was removed').to.be.a('number')
      // Removed before the rotation, so the former member doesn't hold the
      // new keys and no further rotations are needed
      expect(key._notAfterHeight, 'user3\'s key was removed before the rotation').to.be.below(currentKeysValidFrom(state))
    })
    cy.giEmptyInvocationQueue()
    // A one-time check is enough once the keys have been rotated:
    //  - The same keys can't be rotated twice. The rotation's `preSendCheck`
    //    drops a rotation whose keys are no longer current, and Chelonia runs it
    //    before every publish attempt, including after the 409 conflict that a
    //    concurrent publish of the same rotation gets.
    //  - Nothing in this step can start a rotation of the new keys. Nobody
    //    leaves, nobody adds keys, and the second assertion below confirms that
    //    no former member holds the current keys.
    cy.window().its('sbp').then(sbp => {
      const state = sbp('state/vuex/state')[ids.channel]
      const keys = Object.values(state._vm.authorizedKeys)
      const previousHeight = state._vm.authorizedKeys[rotatedKeys.cek]._notBeforeHeight
      expect(
        keys.filter((key) => key.name === 'cek' && key._notBeforeHeight > previousHeight),
        'the keys were rotated once'
      ).to.have.length(1)
      const formerMembers = Object.keys(state.members).filter((id) => state.members[id].hasLeft)
      const height = currentKeysValidFrom(state)
      expect(
        keys.filter((key) => formerMembers.some((id) => key.name.startsWith(`${id}/`)) &&
          (key._notAfterHeight == null || key._notAfterHeight >= height)),
        'no former member holds the current keys'
      ).to.have.length(0)
      rotatedKeys = currentKeys(state)
    })
  })

  it('a key that no legitimate operation adds is removed by a rotation, without logging in again', () => {
    // A member holding the channel CSK can add any key, e.g., to keep access
    // after leaving
    cy.window().its('sbp').then(sbp => {
      const state = sbp('state/vuex/state')
      const key = currentKeyByName(state[ids.user1], 'dmk')
      ids.unexpectedKey = key.id
      return sbp('chelonia/out/keyAdd', {
        contractID: ids.channel,
        contractName: 'gi.contracts/chatroom',
        data: [{
          id: key.id,
          name: 'x-unexpected',
          data: key.data,
          permissions: '*',
          allowedActions: '*',
          purpose: ['sig'],
          ringLevel: 0
        }],
        signingKeyId: rotatedKeys.csk
      })
    })
    cy.giChatRoomCheck(ids.channel, (state) => {
      const key = state._vm.authorizedKeys[ids.unexpectedKey]
      // Removed in the same message as the rotation
      return currentKeys(state).cek !== rotatedKeys.cek &&
        key?._notAfterHeight != null && key._notAfterHeight === currentKeysValidFrom(state)
    })
    cy.giEmptyInvocationQueue()
    cy.window().its('sbp').then(sbp => {
      rotatedKeys = currentKeys(sbp('state/vuex/state')[ids.channel])
    })
  })

  it('a leave that does not remove the member\'s key still rotates the keys, without logging in again', () => {
    // user2 is added back through the group
    cy.window().its('sbp').then(sbp => sbp('gi.actions/group/joinChatRoom', {
      contractID: ids.group,
      data: { chatRoomID: ids.channel, memberID: ids.user2 }
    }))
    cy.giEmptyInvocationQueue()
    cy.giChatRoomCheck(ids.channel, (state) => state?.members?.[ids.user2] && !state.members[ids.user2].hasLeft)

    // Older clients removed members without removing their key
    cy.window().its('sbp').then(sbp => {
      const state = sbp('state/vuex/state')[ids.channel]
      ids.user2CSK = currentKeys(sbp('state/vuex/state')[ids.user2]).csk
      rotatedKeys = currentKeys(state)
      return sbp('chelonia/out/actionEncrypted', {
        contractID: ids.channel,
        contractName: 'gi.contracts/chatroom',
        action: 'gi.contracts/chatroom/leave',
        data: { memberID: ids.user2 },
        signingKeyId: rotatedKeys.csk,
        encryptionKeyId: currentKeyByName(state, 'group-cek')?.id || rotatedKeys.cek
      })
    })
    // The keys are rotated, and user2's key is removed (before the last
    // rotation, so that user2 doesn't count as holding the current keys)
    cy.giChatRoomCheck(ids.channel, (state) => {
      const key = state._vm.authorizedKeys[ids.user2CSK]
      return state.members[ids.user2]?.hasLeft === true &&
        currentKeys(state).cek !== rotatedKeys.cek &&
        key?._notAfterHeight != null && key._notAfterHeight < currentKeysValidFrom(state)
    })
    cy.giEmptyInvocationQueue()
  })

  it('a member re-added directly is removed while we are online, and the keys are rotated', () => {
    // user2 is removed through the group, so that it doesn't list them
    cy.window().its('sbp').then(sbp => {
      const record = sbp('state/vuex/state')[ids.group].chatRooms[ids.channel].members[ids.user2]
      return sbp('gi.actions/group/leaveChatRoom', {
        contractID: ids.group,
        data: { chatRoomID: ids.channel, memberID: ids.user2, joinedHeight: record.joinedHeight }
      })
    })
    cy.giEmptyInvocationQueue()
    cy.window().its('sbp').should(sbp => {
      const record = sbp('state/vuex/state')[ids.group].chatRooms[ids.channel]
      expect(record.members[ids.user2].status, 'the group lists user2 as removed').to.equal(PROFILE_STATUS.REMOVED)
    })

    // A modified client could re-add a former member's key and make them
    // join with keys that are still current. Here, user1 publishes that
    // (inner-signing the join with its own key), which results in the same
    // channel state.
    cy.window().its('sbp').then(sbp => {
      const state = sbp('state/vuex/state')
      rotatedKeys = currentKeys(state[ids.channel])
      return sbp('chelonia/out/atomic', {
        contractID: ids.channel,
        contractName: 'gi.contracts/chatroom',
        signingKeyId: rotatedKeys.csk,
        data: [
          ['chelonia/out/keyAdd', {
            data: [{
              foreignKey: `shelter:${ids.user2}?keyName=csk`,
              id: ids.user2CSK,
              data: state[ids.user2]._vm.authorizedKeys[ids.user2CSK].data,
              permissions: [AE_INNER],
              allowedActions: '*',
              purpose: ['sig'],
              ringLevel: Number.MAX_SAFE_INTEGER,
              name: `${ids.user2}/${ids.user2CSK}`
            }]
          }],
          ['chelonia/out/actionEncrypted', {
            action: 'gi.contracts/chatroom/join',
            data: { memberID: ids.user2 },
            signingKeyId: rotatedKeys.csk,
            innerSigningKeyId: currentKeys(state[ids.user1]).csk,
            encryptionKeyId: rotatedKeys.cek
          }]
        ]
      })
    })

    cy.giChatRoomCheck(ids.channel, (state) => {
      return state.members[ids.user2]?.hasLeft === true && currentKeys(state).cek !== rotatedKeys.cek
    })
    cy.giEmptyInvocationQueue()
    cy.window().its('sbp').then(sbp => {
      const state = sbp('state/vuex/state')[ids.channel]
      rotatedKeys = currentKeys(state)
      // Only the keys that the channel was created with and the keys of its
      // members remain
      const keyNames = Object.values(state._vm.authorizedKeys)
        .filter((key) => key._notAfterHeight == null)
        .map((key) => key.name.split('/')[0])
      const members = Object.keys(state.members).filter((id) => !state.members[id].hasLeft)
      expect(keyNames.sort()).to.deep.equal(['#sak', 'cek', 'csk', 'group-cek', 'group-csk', ...members].sort())
    })
  })

  it('user2 does not have the new channel keys', () => {
    cy.giSwitchUser(user2)

    cy.window().its('sbp').then(async sbp => {
      expect(await sbp('chelonia/haveSecretKey', rotatedKeys.cek), 'user2 does not have the new channel key').to.equal(false)
    })
    cy.giLogout({ bypassUI: true })
  })
})
