import { CHATROOM_PRIVACY_LEVEL, CHATROOM_TYPES, MESSAGE_TYPES } from '../../../frontend/model/contracts/shared/constants.js'
import { randomUserSuffix } from '../support/lib.js'

// Former members of a private channel must not keep access to it:
//  - the channel keys must be rotated when a member leaves
//  - a member who re-joins the channel directly (i.e., without being added
//    through the group, which a modified client could do before the keys are
//    rotated) must be removed by the other members. For existing state, this
//    is done by a migration when logging in.
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

const currentKeys = (state) => {
  const current = (name) => Object.values(state._vm.authorizedKeys)
    .find((key) => key.name === name && key._notAfterHeight == null)?.id
  return { cek: current('cek'), csk: current('csk') }
}

const dmSnapshot = (sbp) => {
  const state = sbp('state/vuex/state')[ids.dm]
  return { members: Object.keys(state.members).sort(), keys: currentKeys(state) }
}

// Reads a chatroom that we're not subscribed to (e.g., after leaving it)
const readChatRoom = async (sbp, chatRoomID, readFn) => {
  await sbp('chelonia/contract/retain', chatRoomID, { ephemeral: true })
  try {
    await sbp('chelonia/contract/sync', chatRoomID)
    return await readFn(await sbp('chelonia/contract/state', chatRoomID))
  } finally {
    await sbp('chelonia/contract/release', chatRoomID, { ephemeral: true })
  }
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

    // Nobody else is online, so the channel keys haven't been rotated yet.
    // A modified client can use them to re-add its own key and re-join.
    cy.window().its('sbp').then(sbp => readChatRoom(sbp, ids.channel, (state) => {
      const ownCSKid = currentKeys(sbp('state/vuex/state')[ids.user2]).csk
      expect(state.members[ids.user2].hasLeft, 'user2 left the channel').to.equal(true)
      expect(state._vm.authorizedKeys[ownCSKid]._notAfterHeight, 'leaving removed user2\'s key').to.be.a('number')
      expect(currentKeys(state)).to.deep.equal(initialKeys)
    }))
    cy.window().its('sbp').then(sbp => readChatRoom(sbp, ids.channel, async (state) => {
      const identityState = sbp('state/vuex/state')[ids.user2]
      const ownCSKid = currentKeys(identityState).csk
      const { csk, cek } = currentKeys(state)
      await sbp('chelonia/out/keyAdd', {
        contractID: ids.channel,
        contractName: 'gi.contracts/chatroom',
        data: [{
          foreignKey: `shelter:${ids.user2}?keyName=csk`,
          id: ownCSKid,
          data: identityState._vm.authorizedKeys[ownCSKid].data,
          permissions: ['ae#inner'],
          allowedActions: '*',
          purpose: ['sig'],
          ringLevel: Number.MAX_SAFE_INTEGER,
          name: `${ids.user2}/${ownCSKid}`
        }],
        signingKeyId: csk
      })
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
      expect(groupRecord.members[ids.user2].status, 'the group lists user2 as removed').to.equal('removed')
    }))
  })

  it('user1 logs in: user2 is removed and the channel keys are rotated', () => {
    cy.giSwitchUser(user1)

    cy.giChatRoomKeysRotated(ids.channel, initialKeys.cek)
    cy.window().its('sbp').then(sbp => {
      const state = sbp('state/vuex/state')[ids.channel]
      expect(state.members[ids.user2].hasLeft, 'user2 was removed from the channel').to.equal(true)
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
      expect(await sbp('chelonia/haveSecretKey', rotatedKeys.cek), 'user2 has the new channel key').to.equal(false)
      const canRead = await readChatRoom(sbp, ids.channel, (state) => {
        return (state.messages || []).some((message) => message.text === secretMessage)
      })
      expect(canRead, 'user2 can read the new message').to.equal(false)
    })
  })

  it('user3 can read new messages and the DM is untouched', () => {
    cy.giSwitchUser(user3)

    cy.giChatRoomHasMessage(ids.channel, secretMessage)
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
      const state = sbp('state/vuex/state')
      const user3CSKid = currentKeys(state[ids.user3]).csk
      ids.user3CSK = user3CSKid
      return sbp('chelonia/out/keyAdd', {
        contractID: ids.channel,
        contractName: 'gi.contracts/chatroom',
        data: [{
          foreignKey: `shelter:${ids.user3}?keyName=csk`,
          id: user3CSKid,
          data: state[ids.user3]._vm.authorizedKeys[user3CSKid].data,
          permissions: ['ae#inner'],
          allowedActions: '*',
          purpose: ['sig'],
          ringLevel: Number.MAX_SAFE_INTEGER,
          name: `${ids.user3}/${user3CSKid}`
        }],
        signingKeyId: rotatedKeys.csk
      })
    })
    cy.window().its('sbp').should(sbp => {
      const key = sbp('state/vuex/state')[ids.channel]._vm.authorizedKeys[ids.user3CSK]
      expect(key._notAfterHeight, 'user3\'s key is current again').to.equal(undefined)
    })

    // The migration runs when logging in
    cy.giSwitchUser(user1)
    cy.giChatRoomKeysRotated(ids.channel, rotatedKeys.cek)
    cy.window().its('sbp').should(sbp => {
      const state = sbp('state/vuex/state')[ids.channel]
      const key = state._vm.authorizedKeys[ids.user3CSK]
      const newKeys = currentKeys(state)
      const newKeysHeight = Math.min(
        state._vm.authorizedKeys[newKeys.cek]._notBeforeHeight,
        state._vm.authorizedKeys[newKeys.csk]._notBeforeHeight
      )
      expect(key._notAfterHeight, 'user3\'s key was removed').to.be.a('number')
      // Removed before the rotation, so the former member doesn't hold the
      // new keys and no further rotations are needed
      expect(key._notAfterHeight, 'user3\'s key was removed before the rotation').to.be.below(newKeysHeight)
    })
    cy.giLogout({ bypassUI: true })
  })
})
