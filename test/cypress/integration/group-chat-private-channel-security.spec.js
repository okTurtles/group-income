import { CHATROOM_PRIVACY_LEVEL, CHATROOM_TYPES, MESSAGE_TYPES, PROFILE_STATUS } from '../../../frontend/model/contracts/shared/constants.js'
import { currentKeyByName, pendingKeyRequestsFrom, randomUserSuffix, withChatRoom } from '../support/lib.js'

// Former members of a private channel must not keep access to it:
//  - the channel keys must be rotated when a member leaves
//  - a member who re-joins the channel directly (i.e., without being added
//    through the group, which a modified client could do before the keys are
//    rotated) must be removed by the other members. For existing state, this
//    is done by a migration when logging in.
//  - keys that no legitimate operation adds (which a member could add while
//    holding the channel keys) must be removed, and the keys rotated. Keys
//    that Chelonia can't remove are only reported. KNOWN LIMITATION: until
//    Chelonia can remove them (which needs a change in Chelonia), one named
//    like the channel encryption key stops all rotations, and whoever leaves
//    the channel afterwards keeps reading it.
//  - messages that other members can't decrypt (e.g., encrypted to a key that
//    only their sender holds) mustn't stop any of this
//  - group members who aren't channel members mustn't get the channel keys
//    by asking for them
//  - members who stay in the channel must keep getting the new keys
// DMs must not be affected.

const userId = randomUserSuffix()
const groupName = 'Private Channels'
const user1 = `user1-${userId}`
const user2 = `user2-${userId}`
const user3 = `user3-${userId}`
// Joins the channel along with user2 and user3, and never leaves it
const user4 = `user4-${userId}`
const channelName = 'private-channel'
const secretMessage = `Posted after user2 was removed ${userId}`
const secretMessage2 = `Posted after user2 asked for all the keys ${userId}`
const plantedKeyMessage = `Encrypted to a key that only user2 holds ${userId}`
const afterPlantedKeyMessage = `Posted after user2 was removed despite their undecryptable message ${userId}`
const lastMessage = `Posted after user2 was removed with the channel CSK ${userId}`
const keptCSKMessage = `Posted after user2 was removed with the CSK kept ${userId}`

// Contract IDs
const ids = {}
// IDs of keys that steps add to the channels, to check what happens to them
const keyIds = {}
let invitationLinkAnyone
// `channelKeys` are the channel keys as of the last time they were looked at
let initialKeys, channelKeys, blockedChannelKeys, dmBefore

// `SPMessage` op codes (importing `SPMessage` here breaks the Cypress bundle,
// as its dependencies can't be resolved)
const OP_ACTION_ENCRYPTED = 'ae'
const OP_KEY_DEL = 'kd'
const OP_KEY_REQUEST = 'kr'
const AE_INNER = OP_ACTION_ENCRYPTED + '#inner'

const privateChannelAttributes = (name) => ({
  name,
  description: '',
  privacyLevel: CHATROOM_PRIVACY_LEVEL.PRIVATE,
  type: CHATROOM_TYPES.GROUP
})

const currentKeys = (state) => ({
  cek: currentKeyByName(state, 'cek')?.id,
  csk: currentKeyByName(state, 'csk')?.id
})

// The current channel keys, which must exist
const capturedKeys = (state) => {
  const keys = currentKeys(state)
  expect(keys.cek, 'the channel has a CEK').to.be.a('string')
  expect(keys.csk, 'the channel has a CSK').to.be.a('string')
  return keys
}

const currentKeysValidFrom = (state) => {
  const { cek, csk } = currentKeys(state)
  return Math.min(
    state._vm.authorizedKeys[cek]._notBeforeHeight,
    state._vm.authorizedKeys[csk]._notBeforeHeight
  )
}

// The CEKs added after `previousCEKid`, one per rotation since
const rotationsSince = (state, previousCEKid) => {
  const previousHeight = state._vm.authorizedKeys[previousCEKid]._notBeforeHeight
  return Object.values(state._vm.authorizedKeys)
    .filter((key) => key.name === 'cek' && key._notBeforeHeight > previousHeight)
}

const dmSnapshot = (sbp) => {
  const state = sbp('state/vuex/state')[ids.dm]
  return { members: Object.keys(state.members).sort(), keys: currentKeys(state) }
}

// The key that a member adds to a chatroom when joining
const memberKey = (sbp, memberID) => {
  const identityState = sbp('state/vuex/state')[memberID]
  const CSKid = currentKeys(identityState).csk
  return {
    foreignKey: `shelter:${memberID}?keyName=csk`,
    id: CSKid,
    data: identityState._vm.authorizedKeys[CSKid].data,
    permissions: [AE_INNER],
    allowedActions: '*',
    purpose: ['sig'],
    ringLevel: Number.MAX_SAFE_INTEGER,
    name: `${memberID}/${CSKid}`
  }
}

// Adds `keys` to a channel. Any member can, as they hold the channel CSK.
const addKeys = (sbp, chatRoomID, keys, signingKeyId) => {
  return sbp('chelonia/out/keyAdd', {
    contractID: chatRoomID,
    contractName: 'gi.contracts/chatroom',
    data: keys,
    signingKeyId
  })
}

// The public part of one of a contract's keys, to add a key to a channel
// whose secret only the owner of that contract holds
const publicKeyOf = (sbp, contractID, name) => {
  const { id, data } = currentKeyByName(sbp('state/vuex/state')[contractID], name)
  return { id, data }
}

// What a modified client could publish to re-add a former member's key and
// make them join with channel keys (`keys`) that are still current. user1
// publishes it in the steps below (inner-signing the join with its own key),
// which results in the same channel state.
const directRejoinOps = (sbp, keys, memberID = ids.user2) => [
  ['chelonia/out/keyAdd', { data: [memberKey(sbp, memberID)] }],
  ['chelonia/out/actionEncrypted', {
    action: 'gi.contracts/chatroom/join',
    data: { memberID },
    signingKeyId: keys.csk,
    innerSigningKeyId: currentKeys(sbp('state/vuex/state')[ids.user1]).csk,
    encryptionKeyId: keys.cek
  }]
]

// A key request from user2 for the channel keys, signed with the channel's
// `group-csk`, which user2 holds as a group member
const requestKeysAsUser2 = (sbp, state, options) => {
  const identityState = sbp('state/vuex/state')[ids.user2]
  return sbp('chelonia/out/keyRequest', {
    originatingContractID: ids.user2,
    originatingContractName: 'gi.contracts/identity',
    contractID: ids.channel,
    contractName: 'gi.contracts/chatroom',
    signingKeyId: currentKeyByName(state, 'group-csk').id,
    innerSigningKeyId: currentKeys(identityState).csk,
    encryptionKeyId: currentKeys(identityState).cek,
    innerEncryptionKeyId: currentKeys(state).cek,
    encryptKeyRequestMetadata: true,
    ...options
  })
}

const sendMessage = (sbp, text, chatRoomID = ids.channel) => sbp('gi.actions/chatroom/addMessage', {
  contractID: chatRoomID,
  data: { type: MESSAGE_TYPES.TEXT, text }
})

const canReadMessage = (sbp, chatRoomID, text) => withChatRoom(sbp, chatRoomID, (state) => {
  return (state.messages || []).some((message) => message.text === text)
})

// As user2: user2 doesn't hold `keys.cek` and can't read `text`. So that this
// can't pass without checking anything, the key must have been looked up,
// user2's identity contract (where keys would be shared with user2) is synced
// first, and user2's copy of the channel must be past their removal.
const cannotRead = async (sbp, chatRoomID, keys, text) => {
  expect(keys.cek, 'the key looked up exists').to.be.a('string')
  await sbp('chelonia/contract/sync', ids.user2)
  expect(await sbp('chelonia/haveSecretKey', keys.cek), 'user2 does not have the channel key').to.equal(false)
  return withChatRoom(sbp, chatRoomID, (state) => {
    expect(state.members?.[ids.user2]?.hasLeft, 'the channel was synced past user2\'s removal').to.equal(true)
    expect((state.messages || []).some((message) => message.text === text), 'user2 cannot read the message').to.equal(false)
  })
}

// Adds someone to a channel, or removes them (or ourselves, without
// `memberID`), through the group, as the app does
const addThroughGroup = (sbp, memberID, chatRoomID = ids.channel) => sbp('gi.actions/group/joinChatRoom', {
  contractID: ids.group,
  data: { chatRoomID, memberID }
})
const removeThroughGroup = (sbp, memberID, chatRoomID = ids.channel) => sbp('gi.actions/group/leaveChatRoom', {
  contractID: ids.group,
  data: memberID ? { chatRoomID, memberID } : { chatRoomID }
})

const isMember = (state, memberID) => !!state?.members?.[memberID] && !state.members[memberID].hasLeft

const readdUser2ThroughGroup = () => {
  cy.window().its('sbp').then(sbp => addThroughGroup(sbp, ids.user2))
  cy.giChatRoomCheck(ids.channel, (state) => isMember(state, ids.user2))
  cy.giChatRoomSettled(ids.channel)
}

// As user2, a member of the channel: user2 leaves the channel through the
// group, and, as nobody else is online to rotate the channel keys, uses them
// to re-add its own key and re-join directly, as a modified client could
const user2LeavesAndRejoinsDirectly = () => {
  let keysBefore
  cy.giChatRoomCheck(ids.channel, async (state, sbp) => {
    return isMember(state, ids.user2) && await sbp('chelonia/haveSecretKey', currentKeys(state).csk)
  })
  cy.giChatRoomSettled(ids.channel)
  cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, (state) => {
    keysBefore = capturedKeys(state)
  }))

  cy.window().its('sbp').then(sbp => removeThroughGroup(sbp))
  cy.giChatRoomCheck(ids.channel, (state, sbp) => {
    const ownCSKid = currentKeys(sbp('state/vuex/state')[ids.user2]).csk
    return state?.members?.[ids.user2]?.hasLeft === true &&
      typeof state._vm.authorizedKeys[ownCSKid]?._notAfterHeight === 'number'
  })

  // Nobody else is online, so the channel keys haven't been rotated yet.
  // A modified client can use them to re-add its own key and re-join.
  cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, async (state) => {
    expect(currentKeys(state), 'the channel keys were not rotated').to.deep.equal(keysBefore)
    const ownCSKid = currentKeys(sbp('state/vuex/state')[ids.user2]).csk
    const { csk, cek } = currentKeys(state)
    await addKeys(sbp, ids.channel, [memberKey(sbp, ids.user2)], csk)
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
  // The group's state in the service worker, which the checks use: right after
  // logging in, the tab's copy can lag behind by several seconds
  cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, async (state) => {
    const groupRecord = (await sbp('chelonia/contract/state', ids.group)).chatRooms[ids.channel]
    expect(state.members[ids.user2].hasLeft, 'user2 is a member of the channel again').to.equal(undefined)
    expect(groupRecord.members[ids.user2].status, 'the group lists user2 as removed').to.equal(PROFILE_STATUS.REMOVED)
  }))
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

  it('user2, user3 and user4 join the group', () => {
    const saveOwnId = (name) => () => {
      cy.window().its('sbp').then(sbp => {
        ids[name] = sbp('state/vuex/state').loggedIn.identityContractID
      })
    }
    cy.giAcceptMultipleGroupInvites(invitationLinkAnyone, {
      usernames: [user2, user3, user4],
      existingMemberUsername: user1,
      groupName,
      actionBeforeLogout: [saveOwnId('user2'), saveOwnId('user3'), saveOwnId('user4')],
      bypassUI: true
    })
  })

  it('user1 starts a DM with user3 and creates a private channel with user2, user3 and user4', () => {
    cy.giLogin(user1, { bypassUI: true })

    cy.window().its('sbp').then(async sbp => {
      await sbp('gi.actions/identity/createDirectMessage', {
        contractID: ids.user1,
        data: { currentGroupId: ids.group, memberIDs: [ids.user3] }
      })
      ids.channel = await sbp('gi.actions/group/addAndJoinChatRoom', {
        contractID: ids.group,
        data: { attributes: privateChannelAttributes(channelName) }
      })
      for (const memberID of [ids.user2, ids.user3, ids.user4]) {
        await addThroughGroup(sbp, memberID)
      }
    })

    cy.window().its('sbp').should(sbp => {
      const state = sbp('state/vuex/state')
      ids.dm = Object.keys(state[ids.user1]?.chatRooms || {})[0]
      expect(ids.dm).to.be.a('string')
      expect(Object.keys(state[ids.dm]?.members || {})).to.have.length(2)
      const members = state[ids.channel]?.members || {}
      expect(members).to.have.all.keys(ids.user1, ids.user2, ids.user3, ids.user4)
      dmBefore = dmSnapshot(sbp)
      initialKeys = capturedKeys(state[ids.channel])
    })
  })

  it('user2 leaves the channel and re-joins it directly, without going through the group', () => {
    cy.giSwitchUser(user2)

    user2LeavesAndRejoinsDirectly()
    // While a member again, user2 asks for the channel keys, as members who
    // are missing them do. Other members mustn't answer, as the group lists
    // user2 as removed.
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, (state) => {
      return requestKeysAsUser2(sbp, state, {
        reference: sbp('state/vuex/state')[ids.user2].groups[ids.group].hash + '/' + ids.channel,
        request: 'missing',
        skipInviteAccounting: true
      })
    }))
  })

  it('user1 logs in: user2 is removed and the channel keys are rotated', () => {
    cy.giSwitchUser(user1)

    cy.giChatRoomKeysRotated(ids.channel, initialKeys.cek)
    cy.giChatRoomSettled(ids.channel)
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, (state) => {
      expect(state.members[ids.user2].hasLeft, 'user2 was removed from the channel').to.equal(true)
      expect(pendingKeyRequestsFrom(state, ids.user2), 'user2\'s key request was not answered').to.have.length(1)
      channelKeys = capturedKeys(state)
      expect(channelKeys.csk).not.to.equal(initialKeys.csk)
      return sendMessage(sbp, secretMessage)
    }))
    cy.giChatRoomSettled(ids.channel)
  })

  it('user2 cannot read new messages in the channel', () => {
    cy.giSwitchUser(user2)

    cy.window().its('sbp').then(sbp => cannotRead(sbp, ids.channel, channelKeys, secretMessage))
  })

  it('user2 cannot get the channel keys by asking for all keys', () => {
    // Chelonia answers key requests that aren't of a specific kind ('*', the
    // default) with every key it can share, without asking the contract.
    // user2 can sign one with the channel's `group-csk`, as a group member.
    // `skipInviteAccounting` isn't set, as Chelonia would then fail to answer
    // anyway. The reference differs from the earlier request's, as Chelonia
    // doesn't send a request while one with the same reference is pending.
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, async (state) => {
      const sent = await requestKeysAsUser2(sbp, state, { reference: `${ids.channel}/all-keys` })
      expect(sent, 'the key request was sent').not.to.equal(undefined)
    }))

    // user1 receives the request when logging in, as the channel is synced.
    // It must stay pending, along with user2's earlier request.
    cy.giSwitchUser(user1)
    cy.giChatRoomSettled(ids.channel)
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, (state) => {
      expect(pendingKeyRequestsFrom(state, ids.user2), 'user2\'s key requests were not answered').to.have.length(2)
      channelKeys = capturedKeys(state)
      return sendMessage(sbp, secretMessage2)
    }))
    cy.giChatRoomSettled(ids.channel)

    cy.giSwitchUser(user2)
    cy.window().its('sbp').then(sbp => cannotRead(sbp, ids.channel, channelKeys, secretMessage2))
  })

  it('user4 and user3 can read new messages and leave user2\'s key requests unanswered, and the DM is untouched', () => {
    // Every member who logs in processes user2's requests
    for (const user of [user4, user3]) {
      cy.giSwitchUser(user)
      cy.giChatRoomHasMessage(ids.channel, secretMessage)
      cy.giChatRoomHasMessage(ids.channel, secretMessage2)
      cy.giChatRoomSettled(ids.channel)
      cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, (state) => {
        expect(pendingKeyRequestsFrom(state, ids.user2), `user2's key requests were not answered by ${user}`).to.have.length(2)
      }))
    }

    // Contracts are loaded into the tab one at a time after logging in, so
    // the DM may not be there yet when the channel is
    cy.window().its('sbp').should(sbp => {
      expect(sbp('state/vuex/state')[ids.dm]?.members, 'the DM is loaded').to.be.an('object')
    })
    cy.window().its('sbp').then(sbp => {
      expect(dmSnapshot(sbp)).to.deep.equal(dmBefore)
    })
  })

  it('user3 leaves the channel and the channel keys are rotated when user1 logs in', () => {
    cy.window().its('sbp').then(sbp => removeThroughGroup(sbp))
    cy.giChatRoomSettled(ids.channel)
    // Make sure that the leave was published before logging out
    cy.giChatRoomCheck(ids.channel, (state) => state?.members?.[ids.user3]?.hasLeft === true)

    cy.giSwitchUser(user1)
    cy.giChatRoomKeysRotated(ids.channel, channelKeys.cek)
    cy.giChatRoomSettled(ids.channel)
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, (state) => {
      channelKeys = capturedKeys(state)
    }))
  })

  it('a key still held by a former member is removed and the keys are rotated exactly once', () => {
    // Simulate a channel where a former member's key was never removed, by
    // adding user3's key back
    cy.window().its('sbp').then(sbp => {
      keyIds.user3CSK = currentKeys(sbp('state/vuex/state')[ids.user3]).csk
      return addKeys(sbp, ids.channel, [memberKey(sbp, ids.user3)], channelKeys.csk)
    })

    // The check that runs when the channel's events are processed handles it,
    // without logging in again
    cy.giChatRoomCheck(ids.channel, (state) => {
      const key = state._vm.authorizedKeys[keyIds.user3CSK]
      // Removed before the rotation, so the former member doesn't hold the
      // new keys and no further rotations are needed
      return currentKeys(state).cek !== channelKeys.cek &&
        key?._notAfterHeight != null && key._notAfterHeight < currentKeysValidFrom(state)
    })
    // Once the check and whatever it started are done, there's nothing else:
    //  - The same keys can't be rotated twice. The rotation's `preSendCheck`
    //    drops a rotation whose keys are no longer current, and Chelonia runs it
    //    before every publish attempt, including after the 409 conflict that a
    //    concurrent publish of the same rotation gets.
    //  - Nothing in this step can start a rotation of the new keys. Nobody
    //    leaves, nobody adds keys, and the second assertion below confirms that
    //    no former member holds the current keys.
    cy.giChatRoomSettled(ids.channel)
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, (state) => {
      expect(rotationsSince(state, channelKeys.cek), 'the keys were rotated once').to.have.length(1)
      const formerMembers = Object.keys(state.members).filter((id) => state.members[id].hasLeft)
      const height = currentKeysValidFrom(state)
      expect(
        Object.values(state._vm.authorizedKeys).filter((key) => formerMembers.some((id) => key.name.startsWith(`${id}/`)) &&
          (key._notAfterHeight == null || key._notAfterHeight >= height)),
        'no former member holds the current keys'
      ).to.have.length(0)
      channelKeys = capturedKeys(state)
    }))
  })

  it('a key that no legitimate operation adds is removed by a rotation, without logging in again', () => {
    // A member holding the channel CSK can add any key, e.g., to keep access
    // after leaving
    cy.window().its('sbp').then(sbp => {
      const key = currentKeyByName(sbp('state/vuex/state')[ids.user1], 'dmk')
      keyIds.unexpected = key.id
      return addKeys(sbp, ids.channel, [{
        id: key.id,
        name: 'x-unexpected',
        data: key.data,
        permissions: '*',
        allowedActions: '*',
        purpose: ['sig'],
        ringLevel: 0
      }], channelKeys.csk)
    })
    cy.giChatRoomCheck(ids.channel, (state) => {
      const key = state._vm.authorizedKeys[keyIds.unexpected]
      // Removed in the same message as the rotation
      return currentKeys(state).cek !== channelKeys.cek &&
        key?._notAfterHeight != null && key._notAfterHeight === currentKeysValidFrom(state)
    })
    cy.giChatRoomSettled(ids.channel)
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, (state) => {
      channelKeys = capturedKeys(state)
    }))
  })

  it('a second channel CSK is removed and the keys are rotated, and messages can still be sent', () => {
    // Chelonia's lookups by name return the first current key with a name,
    // and rotating puts the new key after the others. A member holding the
    // channel CSK can add another key named `csk` whose secret nobody else
    // holds; it must be removed, and the keys that we hold must be used.
    // (For the case where the other key comes first, see the step where a
    // member re-added directly is removed although the first channel CSK is
    // one that we don't hold.)
    cy.window().its('sbp').then(sbp => {
      const { id, data } = publicKeyOf(sbp, ids.user3, 'cek')
      keyIds.duplicateCSK = id
      return addKeys(sbp, ids.channel, [{ id, name: 'csk', data, permissions: '*', allowedActions: '*', purpose: ['sig'], ringLevel: 0 }], channelKeys.csk)
    })
    cy.giChatRoomCheck(ids.channel, (state) => {
      const key = state._vm.authorizedKeys[keyIds.duplicateCSK]
      // Removed in its own message, strictly before the rotation (a rotation
      // that removed it in the same message was the earlier behavior)
      return currentKeys(state).cek !== channelKeys.cek &&
        key?._notAfterHeight != null && key._notAfterHeight < currentKeysValidFrom(state)
    })
    cy.giChatRoomSettled(ids.channel)
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, async (state) => {
      channelKeys = capturedKeys(state)
      expect(channelKeys.csk).not.to.equal(keyIds.duplicateCSK)
      expect(await sbp('chelonia/haveSecretKey', channelKeys.csk), 'we hold the current channel CSK').to.equal(true)
      return sendMessage(sbp, `After removing the second CSK ${userId}`)
    }))
    cy.giChatRoomHasMessage(ids.channel, `After removing the second CSK ${userId}`)
  })

  it('a leave that does not remove the member\'s key still rotates the keys, without logging in again', () => {
    readdUser2ThroughGroup()

    // Older clients removed members without removing their key
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, (state) => {
      keyIds.user2CSK = currentKeys(sbp('state/vuex/state')[ids.user2]).csk
      channelKeys = capturedKeys(state)
      return sbp('chelonia/out/actionEncrypted', {
        contractID: ids.channel,
        contractName: 'gi.contracts/chatroom',
        action: 'gi.contracts/chatroom/leave',
        data: { memberID: ids.user2 },
        signingKeyId: channelKeys.csk,
        encryptionKeyId: currentKeyByName(state, 'group-cek')?.id || channelKeys.cek
      })
    }))
    // The keys are rotated, and user2's key is removed (before the last
    // rotation, so that user2 doesn't count as holding the current keys)
    cy.giChatRoomCheck(ids.channel, (state) => {
      const key = state._vm.authorizedKeys[keyIds.user2CSK]
      return state.members[ids.user2]?.hasLeft === true &&
        currentKeys(state).cek !== channelKeys.cek &&
        key?._notAfterHeight != null && key._notAfterHeight < currentKeysValidFrom(state)
    })
    cy.giChatRoomSettled(ids.channel)
  })

  it('a member re-added directly is removed while we are online, and the keys are rotated', () => {
    // user2 is removed through the group, so that it doesn't list them (the
    // previous step removed them from the channel only)
    cy.window().its('sbp').then(sbp => removeThroughGroup(sbp, ids.user2))
    cy.window().its('sbp').should(sbp => {
      const record = sbp('state/vuex/state')[ids.group].chatRooms[ids.channel]
      expect(record.members[ids.user2].status, 'the group lists user2 as removed').to.equal(PROFILE_STATUS.REMOVED)
    })
    cy.giChatRoomCheck(ids.channel, (state) => state.members[ids.user2]?.hasLeft === true)
    // So that nothing that the removal started changes the keys after they're
    // looked at below
    cy.giChatRoomSettled(ids.channel)

    // user2 was a member before, so the join must be seen to have happened:
    // it records a new `joinedHeight`
    let joinedHeightBefore
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, (state) => {
      joinedHeightBefore = state.members[ids.user2].joinedHeight
      channelKeys = capturedKeys(state)
      return sbp('chelonia/out/atomic', {
        contractID: ids.channel,
        contractName: 'gi.contracts/chatroom',
        signingKeyId: channelKeys.csk,
        data: directRejoinOps(sbp, channelKeys)
      })
    }))

    cy.giChatRoomCheck(ids.channel, (state) => {
      const member = state.members[ids.user2]
      return member?.joinedHeight > joinedHeightBefore && member.hasLeft === true &&
        currentKeys(state).cek !== channelKeys.cek
    })
    cy.giChatRoomSettled(ids.channel)
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, (state) => {
      channelKeys = capturedKeys(state)
      // Only the keys that the channel was created with and the keys of its
      // members remain
      const keyNames = Object.values(state._vm.authorizedKeys)
        .filter((key) => key._notAfterHeight == null)
        .map((key) => key.name.split('/')[0])
      const members = Object.keys(state.members).filter((id) => !state.members[id].hasLeft)
      expect(keyNames.sort()).to.deep.equal(['#sak', 'cek', 'csk', 'group-cek', 'group-csk', ...members].sort())
    }))
  })

  it('a key that Chelonia cannot remove does not stop the keys from being rotated when a member leaves', () => {
    readdUser2ThroughGroup()

    // A member holding the channel CSK can add a foreign key that doesn't name
    // a key. Chelonia accepts it, but rejects messages that remove it, so a
    // rotation (or a leave) that removed it could never be sent. This one
    // points to user2, so that it's among the keys of user2's that a leave
    // would remove.
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, (state) => {
      const { id, data } = publicKeyOf(sbp, ids.user2, 'pek')
      keyIds.unremovable = id
      channelKeys = capturedKeys(state)
      return addKeys(sbp, ids.channel, [{
        id,
        name: 'x-unremovable',
        foreignKey: `shelter:${ids.user2}`,
        data,
        permissions: [AE_INNER],
        allowedActions: '*',
        purpose: ['sig'],
        ringLevel: Number.MAX_SAFE_INTEGER
      }], channelKeys.csk)
    }))
    cy.giChatRoomCheck(ids.channel, (state) => {
      const key = state._vm.authorizedKeys[keyIds.unremovable]
      return !!key && key._notAfterHeight == null
    })
    // Rotating can't remove it, so it's only reported
    cy.giChatRoomSettled(ids.channel)
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, (state) => {
      expect(currentKeys(state), 'the keys were not rotated').to.deep.equal(channelKeys)
    }))

    cy.window().its('sbp').then(sbp => removeThroughGroup(sbp, ids.user2))
    cy.giChatRoomCheck(ids.channel, (state) => {
      return state.members[ids.user2]?.hasLeft === true &&
        state._vm.authorizedKeys[keyIds.user2CSK]?._notAfterHeight != null &&
        currentKeys(state).cek !== channelKeys.cek
    })
    cy.giChatRoomSettled(ids.channel)
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, (state) => {
      expect(state._vm.authorizedKeys[keyIds.unremovable]._notAfterHeight, 'the key that cannot be removed is kept').to.equal(undefined)
      // Rotated once: the key that can't be removed doesn't make the keys
      // need rotating again
      expect(rotationsSince(state, channelKeys.cek), 'the keys were rotated once').to.have.length(1)
      channelKeys = capturedKeys(state)
      return sendMessage(sbp, `After removing user2 again ${userId}`)
    }))
    cy.giChatRoomHasMessage(ids.channel, `After removing user2 again ${userId}`)
  })

  it('a key below the signing key\'s ring level does not stop its owner\'s removal', () => {
    readdUser2ThroughGroup()

    // A member holding the channel CSK (ring 0) can add a key pointing to any
    // member at ring 0. Removals through the group are signed with the
    // `group-csk` (ring 2), and Chelonia rejects removing a lower ring level
    // key, taking the whole leave with it: without skipping such keys, a
    // member could block their own removal, and with it every rotation.
    // (Blocking also takes a name that no legitimate operation uses, so that
    // no rotation removes the key first; such keys are flagged now, see the
    // next step.)
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, (state) => {
      const { id, data } = publicKeyOf(sbp, ids.user2, 'iek')
      keyIds.ringZero = id
      channelKeys = capturedKeys(state)
      return addKeys(sbp, ids.channel, [{
        id,
        name: `#joinKey-${id}`,
        foreignKey: `shelter:${ids.user2}?keyName=csk`,
        data,
        permissions: '*',
        allowedActions: '*',
        purpose: ['sig'],
        ringLevel: 0
      }], channelKeys.csk)
    }))

    // The leave isn't blocked, the key is removed (by a rotation, as no
    // legitimate operation adds it, or along with user2's other keys once
    // they have left, whichever comes first), and user2 is cut off
    cy.window().its('sbp').then(sbp => removeThroughGroup(sbp, ids.user2))
    cy.giChatRoomCheck(ids.channel, (state) => {
      return state.members[ids.user2]?.hasLeft === true &&
        state._vm.authorizedKeys[keyIds.ringZero]?._notAfterHeight != null &&
        currentKeys(state).cek !== channelKeys.cek
    })
    // One rotation is enough: nothing that follows needs another one
    cy.giChatRoomSettled(ids.channel)
    cy.window().its('sbp').then(sbp => Promise.all([
      sendMessage(sbp, `Storm check 1 ${userId}`),
      sendMessage(sbp, `Storm check 2 ${userId}`),
      sendMessage(sbp, `Storm check 3 ${userId}`)
    ]))
    cy.giChatRoomSettled(ids.channel)
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, (state) => {
      expect(rotationsSince(state, channelKeys.cek), 'the keys were rotated once').to.have.length(1)
      channelKeys = capturedKeys(state)
    }))
  })

  it('a key with the name of an old join key but other powers is removed by a rotation', () => {
    // Versions from 2023 added `#joinKey-<id>` keys that could only request
    // keys; those are only reported. A member holding the channel CSK can add
    // a key with such a name and any powers, which must be flagged and
    // removed like any other key that no legitimate operation adds
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, (state) => {
      const { id, data } = publicKeyOf(sbp, ids.user1, 'pek')
      keyIds.wrongJoinKey = id
      channelKeys = capturedKeys(state)
      return addKeys(sbp, ids.channel, [{
        id,
        name: `#joinKey-${id}`,
        data,
        permissions: '*',
        allowedActions: '*',
        purpose: ['sig'],
        ringLevel: 0
      }], channelKeys.csk)
    }))
    cy.giChatRoomCheck(ids.channel, (state) => {
      return state._vm.authorizedKeys[keyIds.wrongJoinKey]?._notAfterHeight != null &&
        currentKeys(state).cek !== channelKeys.cek
    })
    cy.giChatRoomSettled(ids.channel)
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, (state) => {
      channelKeys = capturedKeys(state)
    }))
  })

  it('a member who re-joined directly is removed even after posting a message that the others cannot decrypt', () => {
    // Events that we can't decrypt leave our copy of the channel incomplete,
    // which turns off the checks that a missed event could turn against
    // someone. But only events encrypted with the channel's (or the group's)
    // own keys count: anyone can encrypt a message to a key that only they
    // hold, which mustn't turn off anything.
    readdUser2ThroughGroup()
    cy.giSwitchUser(user2)
    user2LeavesAndRejoinsDirectly()

    // user2 adds a copy of its own identity CEK to the channel, and posts a
    // message encrypted to it. user2 isn't a member according to the group,
    // so its own client doesn't remove the key.
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, async (state) => {
      const { id, data } = publicKeyOf(sbp, ids.user2, 'cek')
      keyIds.planted = id
      const { csk } = currentKeys(state)
      await addKeys(sbp, ids.channel, [{
        id,
        name: 'x-planted',
        foreignKey: `shelter:${ids.user2}?keyName=cek`,
        data,
        permissions: [OP_ACTION_ENCRYPTED],
        allowedActions: '*',
        purpose: ['enc'],
        ringLevel: Number.MAX_SAFE_INTEGER
      }], csk)
      await sbp('chelonia/contract/sync', ids.channel)
      await sbp('chelonia/out/actionEncrypted', {
        contractID: ids.channel,
        contractName: 'gi.contracts/chatroom',
        action: 'gi.contracts/chatroom/addMessage',
        data: { type: MESSAGE_TYPES.TEXT, text: plantedKeyMessage },
        signingKeyId: csk,
        innerSigningKeyId: currentKeys(sbp('state/vuex/state')[ids.user2]).csk,
        encryptionKeyId: id
      })
    }))

    // user1 can't decrypt that message, but removes user2 anyway, and the
    // rotation removes the key
    cy.giSwitchUser(user1)
    cy.giChatRoomCheck(ids.channel, (state) => {
      return state.members[ids.user2]?.hasLeft === true &&
        state._vm.authorizedKeys[keyIds.planted]?._notAfterHeight != null &&
        currentKeys(state).cek !== channelKeys.cek
    })
    cy.giChatRoomSettled(ids.channel)
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, async (state) => {
      const { cheloniaState } = await sbp('chelonia/contract/fullState', ids.channel)
      expect(cheloniaState?.missingDecryptionKeyIds, 'user1 could not decrypt user2\'s message').to.include(keyIds.planted)
      expect((state.messages || []).some((message) => message.text === plantedKeyMessage), 'user1 cannot read user2\'s message').to.equal(false)
      channelKeys = capturedKeys(state)
      return sendMessage(sbp, afterPlantedKeyMessage)
    }))
    cy.giChatRoomSettled(ids.channel)

    cy.giSwitchUser(user2)
    cy.window().its('sbp').then(sbp => cannotRead(sbp, ids.channel, channelKeys, afterPlantedKeyMessage))
    cy.giSwitchUser(user1)
  })

  it('a removal that the channel\'s group key can no longer sign is signed with the channel CSK', () => {
    // A member holding the channel CSK can remove the channel's `group-csk`
    // and add it back with fewer permissions, which older versions gave it, so
    // that it still counts as the group's key. Removing members through the
    // group, which is signed with it, then fails. Here, user1 does that, and
    // re-adds user2 directly in the same message (see the steps above).
    let joinedHeightBefore
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, (state) => {
      const { _notBeforeHeight, _notAfterHeight, _private, ...groupCSK } = currentKeyByName(state, 'group-csk')
      keyIds.weakenedGroupCSK = groupCSK.id
      joinedHeightBefore = state.members[ids.user2].joinedHeight
      channelKeys = capturedKeys(state)
      return sbp('chelonia/out/atomic', {
        contractID: ids.channel,
        contractName: 'gi.contracts/chatroom',
        signingKeyId: channelKeys.csk,
        // Chelonia would otherwise leave out adding a key that is current when
        // the message is built, but a modified client can send it
        publishOptions: { disableAutoDedup: true },
        data: [
          ['chelonia/out/keyDel', { data: [groupCSK.id] }],
          ['chelonia/out/keyAdd', { data: [{ ...groupCSK, permissions: [OP_ACTION_ENCRYPTED, OP_KEY_REQUEST] }], skipExistingKeyCheck: true }],
          ...directRejoinOps(sbp, channelKeys)
        ]
      })
    }))

    // user2 is removed anyway (signed with the channel CSK), and the keys are
    // rotated once
    cy.giChatRoomCheck(ids.channel, (state) => {
      const member = state.members[ids.user2]
      return member?.joinedHeight > joinedHeightBefore && member.hasLeft === true &&
        currentKeys(state).cek !== channelKeys.cek
    })
    cy.giChatRoomSettled(ids.channel)
    cy.window().its('sbp').then(sbp => Promise.all([
      sendMessage(sbp, `Storm check 4 ${userId}`),
      sendMessage(sbp, `Storm check 5 ${userId}`)
    ]))
    cy.giChatRoomSettled(ids.channel)
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, (state) => {
      const groupCSK = currentKeyByName(state, 'group-csk')
      expect(groupCSK.id, 'the channel still has the weakened group-csk').to.equal(keyIds.weakenedGroupCSK)
      expect(groupCSK.permissions, 'removals cannot be signed with the group-csk').not.to.include(OP_KEY_DEL)
      expect(rotationsSince(state, channelKeys.cek), 'the keys were rotated once').to.have.length(1)
      channelKeys = capturedKeys(state)
      return sendMessage(sbp, lastMessage)
    }))
    cy.giChatRoomHasMessage(ids.channel, lastMessage)
  })

  it('a member re-added directly is removed even if the first channel CSK is one that we do not hold', () => {
    // Chelonia's lookups by name return the first current key with a name. A
    // member holding the channel CSK can make that a key that nobody else
    // holds: Chelonia keeps a key that is added again where it was, so adding
    // back the second CSK removed earlier (whose secret only user3 holds)
    // puts it before the current CSK. Older clients could also get there by
    // rotating the CSK while the other one is current. Here, user1 does that,
    // removes the `group-csk`, and re-adds user2 directly, all in one message.
    // The removal can then only be signed with the CSK that the
    // classification keeps.
    let joinedHeightBefore
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, async (state) => {
      const { id, data } = publicKeyOf(sbp, ids.user3, 'cek')
      expect(id, 'the key added back is the second CSK removed earlier').to.equal(keyIds.duplicateCSK)
      joinedHeightBefore = state.members[ids.user2].joinedHeight
      channelKeys = capturedKeys(state)
      await sbp('chelonia/out/atomic', {
        contractID: ids.channel,
        contractName: 'gi.contracts/chatroom',
        signingKeyId: channelKeys.csk,
        data: [
          ['chelonia/out/keyDel', { data: [currentKeyByName(state, 'group-csk').id] }],
          ['chelonia/out/keyAdd', { data: [{ id, name: 'csk', data, permissions: '*', allowedActions: '*', purpose: ['sig'], ringLevel: 0 }] }],
          ...directRejoinOps(sbp, channelKeys)
        ]
      })
      // Checked right away, before the membership check (which runs about a
      // second after the message is processed) changes anything
      await sbp('chelonia/contract/sync', ids.channel)
      const updated = await sbp('chelonia/contract/state', ids.channel)
      expect(currentKeyByName(updated, 'csk')?.id, 'lookups by name return the CSK added back').to.equal(keyIds.duplicateCSK)
      expect(currentKeyByName(updated, 'group-csk'), 'the channel has no group-csk').to.equal(undefined)
    }))

    // Nothing else could sign the removal: the channel has no `group-csk`, and
    // only user3, who is offline, holds the CSK that lookups by name return
    cy.giChatRoomCheck(ids.channel, (state) => {
      const member = state.members[ids.user2]
      return member?.joinedHeight > joinedHeightBefore && member.hasLeft === true &&
        state._vm.authorizedKeys[keyIds.duplicateCSK]?._notAfterHeight != null &&
        currentKeys(state).cek !== channelKeys.cek
    })
    cy.giChatRoomSettled(ids.channel)
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, async (state) => {
      channelKeys = capturedKeys(state)
      expect(await sbp('chelonia/haveSecretKey', channelKeys.csk), 'we hold the current channel CSK').to.equal(true)
      return sendMessage(sbp, keptCSKMessage)
    }))
    cy.giChatRoomHasMessage(ids.channel, keptCSKMessage)
  })

  it('KNOWN LIMITATION: an unremovable key named like the channel encryption key stops all rotations', () => {
    // Until Chelonia can remove such keys (which needs a change in Chelonia,
    // see the Chelonia issue "Keys that can be added to a contract but never
    // removed"). Rotating would add the new keys after it, and Chelonia's
    // lookups by name would return it instead: messages would be encrypted to
    // a key that only whoever added it holds. So rotations are refused and the
    // key is reported, which means that whoever adds one and then leaves keeps
    // reading the channel. Sending keeps working, and so do removals.
    cy.window().its('sbp').then(async sbp => {
      ids.blockedChannel = await sbp('gi.actions/group/addAndJoinChatRoom', {
        contractID: ids.group,
        data: { attributes: privateChannelAttributes('private-channel-blocked') }
      })
      await addThroughGroup(sbp, ids.user2, ids.blockedChannel)
    })
    // The commands below read `ids.blockedChannel` inside `cy.then`, once the
    // chain above has set it (Cypress reads plain arguments when the command
    // is queued, not when it runs)
    cy.then(() => {
      cy.giChatRoomCheck(ids.blockedChannel, (state) => isMember(state, ids.user2))
      cy.giChatRoomSettled(ids.blockedChannel)
    })
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.blockedChannel, (state) => {
      const { id, data } = publicKeyOf(sbp, ids.user1, 'iek')
      keyIds.blocking = id
      blockedChannelKeys = capturedKeys(state)
      return addKeys(sbp, ids.blockedChannel, [{
        id,
        name: 'cek',
        foreignKey: 'shelter:blocked',
        data,
        permissions: '*',
        allowedActions: '*',
        purpose: ['enc'],
        ringLevel: 0
      }], blockedChannelKeys.csk)
    }))

    // user2 is removed through the group: the leave is unaffected, but no
    // rotation can happen, and user2 keeps the keys
    cy.window().its('sbp').then(sbp => removeThroughGroup(sbp, ids.user2, ids.blockedChannel))
    cy.then(() => {
      cy.giChatRoomCheck(ids.blockedChannel, (state) => {
        return state.members[ids.user2]?.hasLeft === true &&
          currentKeys(state).cek === blockedChannelKeys.cek
      })
      cy.giChatRoomSettled(ids.blockedChannel)
    })
    cy.window().its('sbp').then(sbp => sendMessage(sbp, `In the blocked channel ${userId}`, ids.blockedChannel))
    // A rotation that the message caused would come after it
    cy.then(() => {
      cy.giChatRoomSettled(ids.blockedChannel)
    })
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.blockedChannel, (state) => {
      expect(currentKeys(state).cek, 'the keys were not rotated').to.equal(blockedChannelKeys.cek)
      expect(state._vm.authorizedKeys[keyIds.blocking]._notAfterHeight, 'the key that cannot be removed is kept').to.equal(undefined)
    }))
    cy.then(() => {
      cy.giChatRoomHasMessage(ids.blockedChannel, `In the blocked channel ${userId}`)
    })

    // Every rotation above left the DM alone
    cy.window().its('sbp').then(sbp => {
      expect(dmSnapshot(sbp), 'the DM is untouched').to.deep.equal(dmBefore)
    })
  })

  it('user2 does not have the current channel keys', () => {
    cy.giSwitchUser(user2)

    cy.window().its('sbp').then(async sbp => {
      for (const text of [lastMessage, keptCSKMessage]) {
        await cannotRead(sbp, ids.channel, channelKeys, text)
      }
    })
  })

  it('KNOWN LIMITATION: user2 still reads the channel whose rotations are blocked', () => {
    // Until Chelonia can remove such keys (see the step that sets it up)
    cy.window().its('sbp').then(async sbp => {
      expect(
        await canReadMessage(sbp, ids.blockedChannel, `In the blocked channel ${userId}`),
        'KNOWN LIMITATION (see the Chelonia issue "Keys that can be added to a contract but never removed"): if this fails, the limitation was fixed; update this test'
      ).to.equal(true)
    })
  })

  // Every rotation above had to share the new keys with the members who stay.
  // The channel's state only keeps its latest messages, so for older ones,
  // what's checked is that user4 holds every channel CEK and could decrypt
  // every event (other than user2's message encrypted to its own key).
  it('user4, who never left, holds every channel key and reads every message', () => {
    cy.giSwitchUser(user4)

    for (const text of [
      `Storm check 4 ${userId}`,
      `Storm check 5 ${userId}`,
      afterPlantedKeyMessage,
      lastMessage,
      keptCSKMessage
    ]) {
      cy.giChatRoomHasMessage(ids.channel, text)
    }
    cy.window().its('sbp').then(sbp => withChatRoom(sbp, ids.channel, async (state) => {
      const ceks = Object.values(state._vm.authorizedKeys).filter((key) => key.name === 'cek')
      expect(ceks.map((key) => key.id), 'the channel has its first and its latest CEK').to.include(initialKeys.cek).and.to.include(channelKeys.cek)
      for (const { id } of ceks) {
        expect(await sbp('chelonia/haveSecretKey', id), `user4 has the channel CEK ${id}`).to.equal(true)
      }
      const { cheloniaState } = await sbp('chelonia/contract/fullState', ids.channel)
      expect(cheloniaState?.missingDecryptionKeyIds || [], 'user4 could decrypt every other event of the channel').to.deep.equal([keyIds.planted])
    }))
    cy.giLogout({ bypassUI: true })
  })
})
