import { CHATROOM_GENERAL_NAME } from '../../../frontend/model/contracts/constants.js'

const groupName1 = 'Dreamers'
const groupName2 = 'Footballers'
const userId = Math.floor(Math.random() * 10000)
const user1 = `user1-${userId}`
const user2 = `user2-${userId}`
const user3 = `user3-${userId}`
let invitationLinkAnyone
let me

// Attention: Do not use same channel name in test cases
// since we are differentiate channels by their names in test mode
// of course, we can create same name in production
const chatRooms = [
  { name: 'Channel12', description: 'Description for Channel12', isPrivate: false, users: [user1, user2] },
  { name: 'Channel14', description: 'Description for Channel14', isPrivate: true, users: [user1] },
  { name: 'Channel13', description: '', isPrivate: true, users: [user1, user2] },
  { name: 'Channel11', description: '', isPrivate: false, users: [user1] },
  { name: 'Channel15', description: '', isPrivate: false, users: [user1, user2] },
  { name: 'Channel23', description: 'Description for Channel23', isPrivate: false, users: [user2] },
  { name: 'Channel22', description: 'Description for Channel22', isPrivate: true, users: [user2, user1, user3] },
  { name: 'Channel24', description: '', isPrivate: true, users: [user2, user3] },
  { name: 'Channel21', description: '', isPrivate: false, users: [user2, user1] }
]
const channelsOf1For2 = chatRooms.filter(c => c.name.startsWith('Channel1') && c.users.includes(user2)).map(c => c.name)
const channelsOf2For1 = chatRooms.filter(c => c.name.startsWith('Channel2') && c.users.includes(user1)).map(c => c.name)
const channelsOf2For3 = chatRooms.filter(c => c.name.startsWith('Channel2') && c.users.includes(user3)).map(c => c.name)

describe('Group Chat Basic Features (Create & Join & Leave & Close)', () => {
  function switchUser (username) {
    cy.giSwitchUser(username)
    me = username
  }

  function switchChannel (channelName) {
    cy.getByDT('channelsList').within(() => {
      cy.get('ul > li').each(($el, index, $list) => {
        if ($el.text() === channelName) {
          cy.wrap($el).click()
          return false
        }
      })
    })
    cy.getByDT('channelName').should('contain', channelName)
  }

  function checkIfJoined (channelName, inviter, invitee) {
    // Attention: need to check just after joined
    // not after making other activities
    inviter = inviter || me
    invitee = invitee || me
    const selfJoin = inviter === invitee
    const selfCheck = me === invitee
    if (selfCheck) {
      cy.getByDT('messageInputWrapper').within(() => {
        cy.get('textarea').should('exist')
      })
    }
    cy.getByDT('conversationWapper').within(() => {
      cy.get('div.c-message:last-child .c-who > span:first-child').should('contain', inviter)
      const message = selfJoin ? `Joined ${channelName}` : `Added a member to ${channelName}: ${invitee}`
      cy.get('div.c-message:last-child .c-notification').should('contain', message)
    })
  }

  function checkIfLeaved (channelName, kicker, leaver) {
    // Attention: to check if other member is left
    // me needs to be logged in that channel
    kicker = kicker || me
    leaver = leaver || me
    const selfLeave = kicker === leaver
    const selfCheck = me === leaver
    if (selfCheck) {
      cy.getByDT('channelsList').within(() => {
        cy.getByDT(`channel-${channelName}-out`).should('exist')
      })
      // do not switch to the channel to check notifications
      // considering it sync the chatroom contract from the beginning
    } else {
      cy.get('div.c-message:last-child .c-who > span:first-child').should('contain', kicker)
      const message = selfLeave ? `Left ${channelName}` : `Kicked a member from ${channelName}: ${leaver}`
      cy.get('div.c-message:last-child .c-notification').should('contain', message)
    }
  }

  function joinChannel (channelName) {
    cy.getByDT('joinChannel').click()
    checkIfJoined(channelName)
  }

  function addMemberToChannel (channelName, username) {
    switchChannel(channelName)
    cy.getByDT('channelMembers').click()
    cy.getByDT('unjoinedChannelMembersList').within(() => {
      cy.getByDT('addToChannel-' + username).click()
    })
    cy.getByDT('closeModal').click()
    cy.getByDT('closeModal').should('not.exist')
    checkIfJoined(channelName, null, username)
  }

  function leaveChannel (channelName) {
    switchChannel(channelName)
    cy.getByDT('channelName').within(() => {
      cy.getByDT('menuTrigger').click()
    })
    cy.getByDT('leaveChannel').click()
    cy.getByDT('leaveChannelSubmit').click()
    cy.getByDT('closeModal').should('not.exist')
    cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
    checkIfLeaved(channelName)
  }

  function kickMemberFromChannel (channelName, username) {
    switchChannel(channelName)
    cy.getByDT('channelMembers').click()
    cy.getByDT('joinedChannelMembersList').within(() => {
      cy.getByDT('removeMember-' + username).click()
    })
    cy.getByDT('closeModal').click()
    cy.getByDT('closeModal').should('not.exist')
    checkIfLeaved(channelName, null, username)
  }

  function openRemoveMemberModal (username, nth) {
    cy.getByDT('groupMembers').find(`ul>li:nth-child(${nth})`).within(() => {
      cy.getByDT('username').should('contain', username)

      cy.getByDT('openMemberProfileCard').click()
    })

    cy.getByDT('memberProfileCard').within(() => {
      cy.getByDT('buttonRemoveMember').should('contain', 'Remove member').click()
    })
  }

  function deleteChannel (channelName) {
    switchChannel(channelName)
    cy.getByDT('channelName').within(() => {
      cy.getByDT('menuTrigger').click()
    })
    cy.getByDT('deleteChannel').click()
    cy.getByDT('deleteChannelConfirmation').click()
    cy.getByDT('deleteChannelSubmit').click()
    cy.getByDT('closeModal').should('not.exist')
    cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
    cy.getByDT('conversationWapper').within(() => {
      cy.get('div.c-message:last-child .c-who > span:first-child').should('contain', me)
      cy.get('div.c-message:last-child .c-notification').should('contain', `Deleted the channel: ${channelName}`)
    })
  }

  function updateName (name) {
    cy.getByDT('channelName').within(() => {
      cy.getByDT('menuTrigger').click()
    })
    cy.getByDT('renameChannel').click()
    cy.getByDT('updateChannelName').clear()
    cy.getByDT('updateChannelName').type(name)
    cy.getByDT('updateChannelNameSubmit').click()
    cy.getByDT('closeModal').should('not.exist')
    cy.getByDT('conversationWapper').within(() => {
      cy.get('div.c-message:last-child .c-notification').should('contain', `Updated the channel name to: ${name}`)
    })
  }

  function updateDescription (description) {
    cy.getByDT('updateDescription').click()
    cy.getByDT('updateChannelDescription').clear()
    cy.getByDT('updateChannelDescription').type(description)
    cy.getByDT('updateChannelDescriptionSubmit').click()
    cy.getByDT('closeModal').should('not.exist')
    cy.getByDT('conversationWapper').within(() => {
      cy.get('div.c-message:last-child .c-notification').should('contain', `Updated the channel description to: ${description}`)
    })
  }

  it(`user1 creats '${groupName1}' group and joins "${CHATROOM_GENERAL_NAME}" channel by default`, () => {
    cy.visit('/')
    cy.giSignup(user1)
    me = user1

    cy.giCreateGroup(groupName1, { bypassUI: true })
    cy.giGetInvitationAnyone().then(url => {
      invitationLinkAnyone = url
    })
    cy.getByDT('groupChatLink').click()
    cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
    cy.getByDT('channelsList').within(() => {
      cy.get('ul').children().should('have.length', 1)
    })
    checkIfJoined(CHATROOM_GENERAL_NAME)
  })

  it('user1 creates several channels and logout', () => {
    for (const c of chatRooms.filter(cr => cr.name.startsWith('Channel1'))) {
      cy.giAddNewChatroom(c.name, c.description, c.isPrivate)
      checkIfJoined(c.name)
    }
    cy.giLogout()
  })

  it(`user3 joins ${groupName1} group and logout`, () => {
    cy.giAcceptGroupInvite(invitationLinkAnyone, {
      username: user3,
      groupName: groupName1,
      shouldLogoutAfter: false,
      bypassUI: true
    })
    me = user3
    cy.getByDT('groupChatLink').click()

    cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
    checkIfJoined(CHATROOM_GENERAL_NAME)

    cy.getByDT('channelsList').find('ul>li:first-child').within(() => {
      cy.get('[data-test]').should('contain', CHATROOM_GENERAL_NAME)
    })
    cy.giLogout()
  })

  it(`user2 joins ${groupName1} group and joins two public channels by himself`, () => {
    cy.giAcceptGroupInvite(invitationLinkAnyone, {
      username: user2,
      groupName: groupName1,
      shouldLogoutAfter: false,
      bypassUI: true
    })
    me = user2

    cy.getByDT('groupChatLink').click()

    cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
    checkIfJoined(CHATROOM_GENERAL_NAME)

    cy.getByDT('channelsList').find('ul>li:first-child').within(() => {
      cy.get('[data-test]').should('contain', CHATROOM_GENERAL_NAME)
    })

    const publicUser1Channels = chatRooms.filter(c => c.name.startsWith('Channel1') && !c.isPrivate).map(c => c.name)
    const channels = channelsOf1For2.filter(cn => publicUser1Channels.includes(cn))
    for (const cn of channels) {
      switchChannel(cn)
      joinChannel(cn)
    }
  })

  it('user2 creates several channels', () => {
    for (const c of chatRooms.filter(cr => cr.name.startsWith('Channel2'))) {
      cy.giAddNewChatroom(c.name, c.description, c.isPrivate)
      checkIfJoined(c.name)
    }
  })

  it('user2 invites user1 and user3 to several channels he created', () => {
    for (const cn of channelsOf2For1) {
      addMemberToChannel(cn, user1)
    }
    for (const cn of channelsOf2For3) {
      addMemberToChannel(cn, user3)
    }
  })

  it('user1 checks the visibilities, sort order and permissions', () => {
    switchUser(user1)
    cy.getByDT('groupChatLink').click()
    cy.log('ssers can update details(name, description) of the channels they created.')
    const undetailedChannel = chatRooms.filter(c => c.name.startsWith('Channel1') && !c.description)[0]
    const detailedChannel = chatRooms.filter(c => c.name.startsWith('Channel1') && c.description)[0]
    const notUpdatableChannel = chatRooms.filter(c => !c.name.startsWith('Channel1') && !c.description && c.users.includes(me))[0]
    const notJoinedChannel = chatRooms.filter(c => !c.name.startsWith('Channel1') && !c.users.includes(me))[0]

    cy.log(`user1 can add description of ${undetailedChannel.name} chatroom because he is the creator`)
    cy.log('"Add Description" button is visible because no description is added')
    switchChannel(undetailedChannel.name)
    cy.getByDT('conversationWapper').within(() => {
      cy.getByDT('addDescription').should('exist')
    })
    const newName1 = 'Updated-' + undetailedChannel.name
    updateName(newName1)
    undetailedChannel.name = newName1
    const newDescription1 = 'Description for ' + undetailedChannel.name
    updateDescription(newDescription1)
    undetailedChannel.description = newDescription1

    cy.log('"Add Description" button is invisible because description is already added')
    cy.log('but user1 can update description because he is creator')
    switchChannel(detailedChannel.name)
    cy.getByDT('conversationWapper').within(() => {
      cy.getByDT('addDescription').should('not.exist')
    })
    const newDescription2 = 'Updated description for ' + detailedChannel.name
    updateDescription(newDescription2)
    detailedChannel.description = newDescription2

    cy.log(`user1 can not update details of ${notUpdatableChannel.name} chatroom because he is not creator`)
    switchChannel(notUpdatableChannel.name)
    cy.getByDT('conversationWapper').within(() => {
      cy.getByDT('addDescription').should('not.exist')
    })
    cy.getByDT('updateDescription').should('not.have.class', 'c-link')
    cy.getByDT('updateDescription').click()
    cy.getByDT('closeModal').should('not.exist')
    cy.getByDT('channelName').within(() => {
      cy.getByDT('menuTrigger').click()
    })
    cy.getByDT('renameChannel').should('not.exist')

    cy.log('users can not add members to the channels they are not part of. Users can only see members inside.')
    switchChannel(notJoinedChannel.name)
    cy.log('users can view the messages inside the visible channels even though they are not part of')
    cy.getByDT('channelMembers').click()
    cy.get('[data-test^="addToChannel-"]').should('not.exist')
    cy.get('[data-test^="removeMember-"]').should('not.exist')
    cy.getByDT('closeModal').click()
    cy.getByDT('closeModal').should('not.exist')

    cy.log(`users can not change name of "${CHATROOM_GENERAL_NAME}" chatroom even creator`)
    switchChannel(CHATROOM_GENERAL_NAME)
    cy.getByDT('channelName').within(() => {
      cy.getByDT('menuTrigger').click()
    })
    cy.getByDT('renameChannel').should('not.exist')

    cy.log('users can not see the private channels they are not part of.')
    cy.log('joined-channels are always in front of unjoined-channels. It means the channels order are different for each user.')
    const joinedChannels = chatRooms.filter(c => c.users.includes(me)).map(c => c.name)
      .concat([CHATROOM_GENERAL_NAME]).sort()
    const unjoinedChannels = chatRooms.filter(c => !c.users.includes(me) && !c.isPrivate).map(c => c.name).sort()
    const visibleChatRooms = joinedChannels.concat(unjoinedChannels)

    cy.getByDT('channelsList').within(() => {
      cy.get('ul').children().should('have.length', visibleChatRooms.length)
      cy.get('ul').within(([list]) => {
        visibleChatRooms.forEach((chatRoomName, index) => {
          cy.get(list).children().eq(index).invoke('text').should('contain', chatRoomName)
        })
      })
    })
  })

  it('user1 sees that each group has it\'s current chatroom state individually', () => {
    cy.giCreateGroup(groupName2, { bypassUI: true })
    cy.getByDT('groupChatLink').click()
    cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
    cy.getByDT('channelsList').within(() => {
      cy.get('ul').children().should('have.length', 1)
    })
    checkIfJoined(CHATROOM_GENERAL_NAME)

    // Change from group2 to group1 group chat page
    cy.getByDT('groupsList').find('li:first-child button').click()
    switchChannel(channelsOf2For1[0])

    // Change from group1 to group2 group chat page
    cy.getByDT('groupsList').find('li:nth-child(2) button').click()
    cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)

    // Change from group2 to group1 group chat page
    cy.getByDT('groupsList').find('li:first-child button').click()
    cy.getByDT('channelName').should('contain', channelsOf2For1[0])
  })

  it('user1 kicks user2 from a channel and user2 leaves a group by himself', () => {
    const leavingChannels = chatRooms
      .filter(c => c.name.includes('Channel1') && c.users.includes(user2) && !c.isPrivate).map(c => c.name)

    // User1 kicks user2
    kickMemberFromChannel(leavingChannels[0], user2)

    // Leave channel by himself
    switchUser(user2)

    cy.getByDT('groupChatLink').click()
    leaveChannel(leavingChannels[1])
  })

  it('user2 creates a proposal to remove user3', () => {
    // Create proposal to let user3 leave the group
    cy.getByDT('dashboard').click()

    openRemoveMemberModal(user3, 3)

    cy.getByDT('modalProposal').within(() => {
      cy.getByDT('description').should('contain', `Remove ${user3} from the group`)
      cy.getByDT('nextBtn').click()
      cy.getByDT('reason', 'textarea').clear().type('Leaving group by proposal to test leaving chatroom')
      cy.getByDT('submitBtn').click()
      cy.getByDT('finishBtn').click()
      cy.getByDT('closeModal').should('not.exist')
    })

    cy.getByDT('proposalsWidget', 'ul').find('li').within(() => {
      cy.getByDT('typeDescription').should('contain', `Remove ${user3} from the group.`)
      cy.getByDT('statusDescription').should('contain', '1 out of 2 members voted.') // 1 out of 2 - user3 can't vote.
    })
  })

  it('user1 approves the proposal and removes user3 and logout', () => {
    switchUser(user1)

    cy.getByDT('proposalsWidget', 'ul').find('li').within(() => {
      cy.getByDT('typeDescription').should('contain', `Remove ${user3} from the group.`)
      cy.getByDT('voteFor').click()
      cy.getByDT('statusDescription')
        .should('contain', 'Proposal accepted')
    })

    cy.getByDT('groupChatLink').click()

    switchChannel(CHATROOM_GENERAL_NAME)
    checkIfLeaved(CHATROOM_GENERAL_NAME, user3, user3)

    cy.giLogout()
  })

  // TODO: this test case is not necesasry but it is here
  // because of the issue #1176
  it('user3 tries to login and noticed that he was removed from the group as well as all the channels inside', () => {
    cy.giLogin(user3)
    me = user3

    cy.getByDT('welcomeHomeLoggedIn').should('contain', 'Let’s get this party started')

    cy.giLogout({ hasNoGroup: true })
  })

  it('user2 leaves the group by himself', () => {
    cy.giLogin(user2)
    me = user2

    cy.getByDT('groupSettingsLink').click()
    cy.getByDT('leaveModalBtn').click()

    cy.getByDT('leaveGroup', 'form').within(() => {
      cy.getByDT('username').clear().type(user2)
      cy.getByDT('password').type('123456789')
      cy.getByDT('confirmation').clear().type(`LEAVE ${groupName1.toUpperCase()}`)

      cy.getByDT('btnSubmit').click()
    })

    cy.getByDT('closeModal').should('not.exist')
    cy.getByDT('app').then(([el]) => {
      cy.get(el).should('have.attr', 'data-sync', '')
    })
    cy.getByDT('welcomeHomeLoggedIn').should('contain', 'Let’s get this party started')

    cy.giLogout({ hasNoGroup: true })
  })

  it(`user1 checks if user2 and user3 are removed from all the channels including ${CHATROOM_GENERAL_NAME}`, () => {
    cy.giLogin(user1, { bypassUI: true })
    me = user1

    cy.getByDT('groupChatLink').click()

    switchChannel(CHATROOM_GENERAL_NAME)
    cy.getByDT('channelMembers').should('contain', '1 members')
  })

  it('user1 delete a channel and logout', () => {
    const channel = chatRooms.filter(c => c.name.startsWith('Channel1')).map(c => c.name)[0]
    deleteChannel(channel)

    cy.giLogout()
  })

  // TODO: can not rejoin the group by himself unless he uses the link made by proposal
  // so the scenario could be updated later when e2e protocol would be ready
  it(`user3 joins the ${groupName1} group and ${CHATROOM_GENERAL_NAME} channel again`, () => {
    cy.giLogin(user3)
    me = user3
    cy.giAcceptGroupInvite(invitationLinkAnyone, {
      username: user3,
      groupName: groupName1,
      shouldLogoutAfter: false,
      isLoggedIn: true
    })

    cy.getByDT('groupChatLink').click()

    checkIfJoined(CHATROOM_GENERAL_NAME)
    cy.getByDT('channelMembers').should('contain', '2 members')
  })

  it(`user2 joins the ${groupName1} group and ${CHATROOM_GENERAL_NAME} again and logout`, () => {
    cy.giLogout()
    cy.giLogin(user2)
    me = user2

    cy.giAcceptGroupInvite(invitationLinkAnyone, {
      username: user2,
      groupName: groupName1,
      shouldLogoutAfter: false,
      isLoggedIn: true
    })

    cy.getByDT('groupChatLink').click()

    checkIfJoined(CHATROOM_GENERAL_NAME)
    cy.getByDT('channelMembers').should('contain', '3 members')

    cy.giLogout()
  })
})
