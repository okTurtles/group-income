import { CHATROOM_GENERAL_NAME, CHATROOM_PRIVACY_LEVEL } from '../../../frontend/model/contracts/shared/constants.js'

const groupName1 = 'Dreamers'
const groupName2 = 'Footballers'
const userId = performance.now().toFixed(20).replace('.', '')
const user1 = `user1-${userId}`
const user2 = `user2-${userId}`
const user3 = `user3-${userId}`
let invitationLinkAnyone
let me

// Attention: Do not use same channel name in test cases
// since we are differentiate channels by their names in test mode
// of course, we can create same name in production
const chatRooms = [
  { name: 'channel12', description: 'Description for channel12', isPrivate: false, members: [user1, user2] },
  { name: 'channel14', description: 'Description for channel14', isPrivate: true, members: [user1] },
  { name: 'channel13', description: '', isPrivate: true, members: [user1, user2] },
  { name: 'channel11', description: '', isPrivate: false, members: [user1] },
  { name: 'channel15', description: '', isPrivate: false, members: [user1, user2] },
  { name: 'channel23', description: 'Description for channel23', isPrivate: false, members: [user2] },
  { name: 'channel22', description: 'Description for channel22', isPrivate: true, members: [user2, user1, user3] },
  { name: 'channel24', description: '', isPrivate: true, members: [user2, user3] },
  { name: 'channel21', description: '', isPrivate: false, members: [user2, user1] }
]
const channelsOf1For2 = chatRooms.filter(c => c.name.startsWith('channel1') && c.members.includes(user2)).map(c => c.name)
const channelsOf2For1 = chatRooms.filter(c => c.name.startsWith('channel2') && c.members.includes(user1)).map(c => c.name)
const channelsOf2For3 = chatRooms.filter(c => c.name.startsWith('channel2') && c.members.includes(user3)).map(c => c.name)

function getProposalItems () {
  return cy.getByDT('proposalsWidget').children()
}

describe('Group Chat Basic Features (Create & Join & Leave & Close)', () => {
  function switchUser (username) {
    cy.giSwitchUser(username, { bypassUI: true })
    me = username
  }

  function checkIfLeaved (channelName, kicker, leaver, byProposal = false) {
    // Attention: to check if other member is left me needs to be logged in that channel
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
      const message = selfLeave ? `Left ${channelName}` : `Kicked a member from ${channelName}: ${leaver}`
      const messageSelectors = {
        last: 'div.c-message:last-child',
        secondLast: 'div.c-message:nth-last-child(2)'
      }
      const assertKickerAndMessageContent = (msgSelector) => {
        cy.get(`${msgSelector} .c-who > span:first-child`).should('contain', kicker)
        cy.get(`${msgSelector} .c-notification`).should('contain', message)
      }

      if (byProposal) {
        // NOTE: when the member is kicked from the from by proposal
        //       two messages will be created in general chatroom; INTERACTIVE, and NOTIFICATION
        //       INTERACTIVE message should be created before the NOTIFICATION message
        //       but sometimes (mostly in Cypress) NOTIFICATION message could be created earlier
        //       and the order of two messages could be changed and it could cause the heisenbug.
        //       the below block is to handle that heisenbug
        cy.get(messageSelectors.last).invoke('attr', 'class').then(classNames => {
          const isLastMsgTypeNotification = classNames.includes('is-type-notification')
          assertKickerAndMessageContent(
            isLastMsgTypeNotification ? messageSelectors.last : messageSelectors.secondLast
          )
        })
      } else {
        assertKickerAndMessageContent(messageSelectors.last)
      }
    }
  }

  function joinChannel (channelName) {
    cy.getByDT('joinChannel').click()
    cy.getByDT('joinChannel').should('not.exist')
    cy.giWaitUntilMessagesLoaded()
    cy.giCheckIfJoinedChatroom(channelName, me)
  }

  function addMemberToChannel (channelName, username) {
    cy.giSwitchChannel(channelName)
    cy.getByDT('channelMembers').click()
    cy.getByDT('unjoinedChannelMembersList').within(() => {
      cy.getByDT('addToChannel-' + username).click()
    })
    cy.closeModal()
    cy.giCheckIfJoinedChatroom(channelName, me, null, username)
  }

  function leaveChannel (channelName, submitButtonTitle) {
    submitButtonTitle = submitButtonTitle || 'Leave Channel'
    cy.giSwitchChannel(channelName)
    cy.getByDT('channelName').within(() => {
      cy.getByDT('menuTrigger').click()
    })
    cy.getByDT('leaveChannel').click()
    cy.getByDT('leaveChannelSubmit').should('contain', submitButtonTitle)
    cy.getByDT('leaveChannelSubmit').click()
    cy.getByDT('closeModal').should('not.exist')
    cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)

    cy.giWaitUntilMessagesLoaded()

    checkIfLeaved(channelName)
  }

  function kickMemberFromChannel (channelName, username) {
    cy.giSwitchChannel(channelName)
    cy.getByDT('channelMembers').click()
    cy.getByDT('joinedChannelMembersList').within(() => {
      cy.getByDT('removeMember-' + username).click()
    })
    cy.closeModal()
    checkIfLeaved(channelName, null, username)
  }

  function openRemoveMemberModal (username, nth) {
    cy.getByDT('groupMembers').find(`ul>li:nth-child(${nth})`).within(() => {
      cy.getByDT('username').should('contain', username)

      cy.getByDT('openMemberProfileCard', 'img').click()
    })

    cy.getByDT('memberProfileCard').within(() => {
      cy.getByDT('buttonRemoveMember').should('contain', 'Remove member').click()
    })
  }

  function deleteChannel (channelName) {
    cy.giSwitchChannel(channelName)
    cy.getByDT('channelName').within(() => {
      cy.getByDT('menuTrigger').click()
    })
    cy.getByDT('deleteChannel').click()
    cy.getByDT('deleteChannelConfirmation').click()
    cy.getByDT('deleteChannelSubmit').click()
    cy.getByDT('closeModal').should('not.exist')
    cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)

    cy.giWaitUntilMessagesLoaded()
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
    cy.getByDT('conversationWrapper').within(() => {
      cy.get('div.c-message:last-child .c-notification').should('contain', `Updated the channel name to: ${name}`)
    })
  }

  function updateDescription (description) {
    cy.getByDT('updateDescription').click()
    cy.getByDT('updateChannelDescription').clear()
    cy.getByDT('updateChannelDescription').type(description)
    cy.getByDT('updateChannelDescriptionSubmit').click()
    cy.getByDT('closeModal').should('not.exist')
    cy.getByDT('conversationWrapper').within(() => {
      cy.get('div.c-message:last-child .c-notification').should('contain', `Updated the channel description to: ${description}`)
    })
  }

  it(`user1 creates '${groupName1}' group and joins "${CHATROOM_GENERAL_NAME}" channel by default`, () => {
    cy.visit('/')
    cy.giSignup(user1, { bypassUI: true })
    me = user1

    cy.giCreateGroup(groupName1, { bypassUI: true })
    cy.giGetInvitationAnyone().then(url => {
      invitationLinkAnyone = url
    })
    cy.giRedirectToGroupChat()
    cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
    cy.getByDT('channelsList').within(() => {
      cy.get('ul').children().should('have.length', 1)
    })
    cy.giCheckIfJoinedChatroom(CHATROOM_GENERAL_NAME, me)
  })

  it.skip('user1 tries to open incorrect chatroom URL and it redirects to the previous/general chatroom', () => {
    cy.url().then(url => {
      cy.visit(url)
      cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
      cy.visit(url + 'incorrect-suffix')
      cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
    })
    cy.giWaitUntilMessagesLoaded()
  })

  it('user1 creates several channels and logout', () => {
    for (const c of chatRooms.filter(cr => cr.name.startsWith('channel1'))) {
      cy.giAddNewChatroom({
        name: c.name,
        description: c.description,
        isPrivate: c.isPrivate,
        bypassUI: true
      })
      cy.giCheckIfJoinedChatroom(c.name, me)
    }
    cy.giLogout({ bypassUI: true })
  })

  it(`user3 joins ${groupName1} group and logout`, () => {
    cy.giAcceptGroupInvite(invitationLinkAnyone, {
      username: user3,
      existingMemberUsername: user1,
      groupName: groupName1,
      shouldLogoutAfter: true,
      bypassUI: true
    })
    me = undefined
  })

  it(`user2 joins ${groupName1} group and joins two public channels by himself`, () => {
    cy.giAcceptGroupInvite(invitationLinkAnyone, {
      username: user2,
      existingMemberUsername: user1,
      groupName: groupName1,
      shouldLogoutAfter: false,
      bypassUI: true
    })
    me = user2
    cy.giRedirectToGroupChat()

    const publicUser1Channels = chatRooms.filter(c => c.name.startsWith('channel1') && !c.isPrivate).map(c => c.name)
    const channels = channelsOf1For2.filter(cn => publicUser1Channels.includes(cn))
    for (const cn of channels) {
      cy.giSwitchChannel(cn)
      joinChannel(cn)
    }
  })

  it('user2 creates several channels', () => {
    for (const c of chatRooms.filter(cr => cr.name.startsWith('channel2'))) {
      cy.giAddNewChatroom({
        name: c.name,
        description: c.description,
        isPrivate: c.isPrivate,
        bypassUI: true
      })
      cy.giCheckIfJoinedChatroom(c.name, me)
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
    cy.giRedirectToGroupChat()
    cy.log('Users can update details(name, description) of the channels they created.')
    const undetailedChannel = chatRooms.filter(c => c.name.startsWith('channel1') && !c.description)[0]
    const detailedChannel = chatRooms.filter(c => c.name.startsWith('channel1') && c.description)[0]
    const notUpdatableChannel = chatRooms.filter(c => !c.name.startsWith('channel1') && !c.description && c.members.includes(me))[0]
    const notJoinedChannel = chatRooms.filter(c => !c.name.startsWith('channel1') && !c.members.includes(me))[0]

    cy.log(`user1 can add description of ${undetailedChannel.name} chatroom because he is the creator`)
    cy.log('"Add Description" button is visible because no description is added')
    cy.giSwitchChannel(undetailedChannel.name)
    cy.getByDT('conversationWrapper').within(() => {
      cy.getByDT('addDescription').should('exist')
    })
    const newName1 = 'updated-' + undetailedChannel.name
    updateName(newName1)
    undetailedChannel.name = newName1
    const newDescription1 = 'Description for ' + undetailedChannel.name
    updateDescription(newDescription1)
    undetailedChannel.description = newDescription1

    cy.log('"Add Description" button is invisible because description is already added')
    cy.log('but user1 can update description because he is creator')
    cy.giSwitchChannel(detailedChannel.name)
    cy.getByDT('conversationWrapper').within(() => {
      cy.getByDT('addDescription').should('not.exist')
    })
    const newDescription2 = 'Updated description for ' + detailedChannel.name
    updateDescription(newDescription2)
    detailedChannel.description = newDescription2

    cy.log(`user1 can not update details of ${notUpdatableChannel.name} chatroom because he is not creator`)
    cy.giSwitchChannel(notUpdatableChannel.name)
    cy.getByDT('conversationWrapper').within(() => {
      cy.getByDT('addDescription').should('not.exist')
    })
    cy.getByDT('updateDescription').should('not.exist')
    cy.getByDT('channelName').within(() => {
      cy.getByDT('menuTrigger').click()
    })
    cy.getByDT('renameChannel').should('not.exist')

    cy.log('users can not add members to the channels they are not part of. Users can only see members inside.')
    cy.giSwitchChannel(notJoinedChannel.name)
    cy.log('users can view the messages inside the visible channels even though they are not part of')
    cy.getByDT('channelMembers').click()
    cy.get('[data-test^="addToChannel-"]').should('not.exist')
    cy.get('[data-test^="removeMember-"]').should('not.exist')
    cy.closeModal()

    cy.log(`users can not change name of "${CHATROOM_GENERAL_NAME}" chatroom even creator`)
    cy.giSwitchChannel(CHATROOM_GENERAL_NAME)
    cy.getByDT('channelName').within(() => {
      cy.getByDT('menuTrigger').click()
    })
    cy.getByDT('renameChannel').should('not.exist')

    cy.log('users can not see the private channels they are not part of.')
    cy.log('joined-channels are always in front of unjoined-channels. It means the channels order are different for each user.')
    const joinedChannels = chatRooms.filter(c => c.members.includes(me)).map(c => c.name)
      .concat([CHATROOM_GENERAL_NAME]).sort()
    const unjoinedChannels = chatRooms.filter(c => !c.members.includes(me) && !c.isPrivate).map(c => c.name).sort()
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
    cy.giRedirectToGroupChat()
    cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
    cy.getByDT('channelsList').within(() => {
      cy.get('ul').children().should('have.length', 1)
    })
    cy.giCheckIfJoinedChatroom(CHATROOM_GENERAL_NAME, me)

    // Switch from group2 to group1 on the group chat page
    cy.getByDT('groupsList').find('li:nth-child(2) button').click()
    cy.giWaitUntilMessagesLoaded()
    cy.giCheckIfJoinedChatroom(CHATROOM_GENERAL_NAME, user2)
    cy.giSwitchChannel(channelsOf2For1[0])

    // Switch from group1 to group2 on the group chat page
    cy.getByDT('groupsList').find('li:nth-child(3) button').click()
    cy.giWaitUntilMessagesLoaded()
    cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)

    // Switch from group2 to group1 on the group chat page
    cy.getByDT('groupsList').find('li:nth-child(2) button').click()
    cy.giWaitUntilMessagesLoaded()
    cy.getByDT('channelName').should('contain', channelsOf2For1[0])
  })

  it('user2 sends a message to a private channel and user1 sees a badge for it', () => {
    switchUser(user2)
    cy.giRedirectToGroupChat()
    cy.giSwitchChannel('channel22')
    cy.giSendMessage(user2, 'Hi, There!')

    switchUser(user1)
    cy.getByDT('groupChatLink').get('.c-badge.is-compact[aria-label="1 new notifications"]').contains('1')
    cy.giRedirectToGroupChat()
  })

  it('user1 kicks user2 from a channel and user2 leaves a channel by himself', () => {
    const leavingChannels = chatRooms
      .filter(c => c.name.includes('channel1') && c.members.includes(user2) && !c.isPrivate).map(c => c.name)

    // User1 kicks user2
    kickMemberFromChannel(leavingChannels[0], user2)

    // Leave channel by himself
    switchUser(user2)

    cy.giRedirectToGroupChat()
    leaveChannel(leavingChannels[1])
  })

  it('user2 creates a proposal to remove user3', () => {
    // Create proposal to let user3 leave the group
    cy.getByDT('dashboard').click()

    openRemoveMemberModal(user3, 3)

    cy.getByDT('modalProposal').within(() => {
      cy.getByDT('description').should('contain', `Remove ${user3} from the group`)
      cy.getByDT('nextBtn').click()
      cy.getByDT('reason', 'textarea').type('{selectall}{del}Leaving group by proposal to test leaving chatroom')
      cy.getByDT('submitBtn').click()
      cy.getByDT('finishBtn').click()
      cy.getByDT('closeModal').should('not.exist')
    })

    getProposalItems().within(() => {
      cy.getByDT('typeDescription').should('contain', `Remove ${user3} from the group.`)
      cy.getByDT('statusDescription').should('contain', '1 out of 2 members voted') // 1 out of 2 - user3 can't vote.
    })
  })

  it('user1 approves the proposal and removes user3 and logout', () => {
    switchUser(user1)

    getProposalItems().within(() => {
      cy.getByDT('typeDescription').should('contain', `Remove ${user3} from the group.`)
      cy.getByDT('voteFor').click()
    })
    // see explanatory comment in group-proposals.spec.js for this .pipe() thing
    cy.get('body')
      .pipe($el => $el.find('[data-test="proposalsWidget"]').find('[data-test="statusDescription"]'))
      .should('contain', 'Proposal accepted')

    cy.getByDT('groupMembers').find('ul>li').should('have.length', 2) // user1 & user2

    // NOTE: this check is to wait until 2 INTERACTIVE mesages are created
    //       one for creating proposal and another is for proposal approval
    cy.getByDT('groupChatLink').get('.c-badge.is-compact[aria-label="2 new notifications"]').contains('2')

    cy.giRedirectToGroupChat()

    cy.giSwitchChannel(CHATROOM_GENERAL_NAME)
    checkIfLeaved(CHATROOM_GENERAL_NAME, user3, user3, true)

    cy.giLogout({ bypassUI: true })
  })

  // TODO: this test case is not necesasry but it is here because of the issue #1176
  it('user3 tries to login and noticed that he was removed from the group as well as all the channels inside', () => {
    cy.giLogin(user3, {
      bypassUI: true,
      toGroupDashboardUponSuccess: false // user3 has been kicked out from the group at this point, so cannot navigate to /dashboard.
    })
    me = user3

    cy.getByDT('welcomeHomeLoggedIn').should('contain', 'Let’s get this party started')

    cy.giLogout({ hasNoGroup: true })
  })

  it('user2 leaves the group by himself', () => {
    cy.giLogin(user2, { bypassUI: true })
    me = user2

    cy.getByDT('groupSettingsLink').click()
    cy.getByDT('leaveModalBtn').click()

    cy.getByDT('leaveGroup', 'form').within(() => {
      cy.getByDT('username').type('{selectall}{del}' + user2)
      cy.getByDT('confirmation').type(`{selectall}{del}LEAVE ${groupName1.toUpperCase()}`)

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

    cy.giRedirectToGroupChat()

    cy.getByDT('channelMembers').should('contain', '1 member')
  })

  it('user1 leaves/deletes chatroom by himself and logs out', () => {
    const channelToLeave = chatRooms.filter(c => c.name.startsWith('channel1')).map(c => c.name)[0]
    leaveChannel(channelToLeave, 'Leave Channel')

    const channelToDelete = chatRooms.filter(c => c.name.startsWith('channel1')).map(c => c.name)[1]
    deleteChannel(channelToDelete)

    // TODO: this is a temporary hack, but not sure why this fixes the Cypress error
    //       https://cloud.cypress.io/projects/q6whky/runs/2663/test-results
    cy.wait(3 * 1000) // eslint-disable-line cypress/no-unnecessary-waiting
    cy.giLogout({ bypassUI: true })
  })

  // TODO: can not rejoin the group by himself unless he uses the link made by proposal
  //       so the scenario could be updated later when e2e protocol would be ready
  it(`user3 joins the ${groupName1} group and ${CHATROOM_GENERAL_NAME} channel again and logout`, () => {
    cy.giLogin(user3, { bypassUI: true, toGroupDashboardUponSuccess: false })
    me = user3

    cy.getByDT('welcomeHomeLoggedIn').should('contain', 'Let’s get this party started')
    cy.giAcceptGroupInvite(invitationLinkAnyone, {
      username: user3,
      groupName: groupName1,
      existingMemberUsername: user1,
      shouldLogoutAfter: false,
      isLoggedIn: true,
      bypassUI: true
    })

    cy.giRedirectToGroupChat()

    // cy.giCheckIfJoinedChatroom(CHATROOM_GENERAL_NAME, me) // giAcceptGroupInvite already checks this
    cy.getByDT('channelMembers').should('contain', '2 members')
    cy.giLogout({ bypassUI: true })
  })

  it(`user2 joins the ${groupName1} group and ${CHATROOM_GENERAL_NAME} channel again and logout`, () => {
    cy.giLogin(user2, { bypassUI: true, toGroupDashboardUponSuccess: false })
    me = user2

    cy.getByDT('welcomeHomeLoggedIn').should('contain', 'Let’s get this party started')
    // BUG: there is a heisenbug here: https://github.com/okTurtles/group-income/issues/2215
    cy.giAcceptGroupInvite(invitationLinkAnyone, {
      username: user2,
      groupName: groupName1,
      existingMemberUsername: user3,
      shouldLogoutAfter: false,
      isLoggedIn: true,
      bypassUI: true
    })

    cy.giRedirectToGroupChat()

    // cy.giCheckIfJoinedChatroom(CHATROOM_GENERAL_NAME, me) // giAcceptGroupInvite already checks this
    cy.getByDT('channelMembers').should('contain', '3 members')
    cy.giLogout({ bypassUI: true })
  })

  // NOTE: skip this test case temporarily since the following issue is not resolved yet
  //       https://github.com/okTurtles/group-income/issues/202
  it.skip('Only group admin can allow to create public channel', () => {
    const publicChannelName = 'bulgaria-hackathon'
    cy.getByDT('groupSettingsLink').click()
    cy.get('.p-title').should('contain', 'Group Settings')
    cy.getByDT('allowPublicChannels').should('not.exist')

    cy.giLogout({ bypassUI: true })
    cy.giLogin(user1)
    me = user1

    cy.getByDT('groupSettingsLink').click()
    cy.get('.p-title').should('contain', 'Group Settings')
    cy.get('section:nth-child(4)').within(() => {
      cy.get('h2.is-title-3').should('contain', 'public-channels')
      cy.getByDT('allowPublicChannels').within(() => {
        cy.get('.c-smaller-title').should('contain', 'Allow members to create public channels')
        cy.get('input[type=checkbox]').check()
      })
    })

    cy.giRedirectToGroupChat()

    cy.getByDT('newChannelButton').click()
    cy.getByDT('modal-header-title').should('contain', 'Create a channel')
    cy.getByDT('modal').within(() => {
      cy.getByDT('createChannelName').type('{selectall}{del}' + publicChannelName)
      cy.getByDT('createChannelPrivacyLevel').select(CHATROOM_PRIVACY_LEVEL.PUBLIC)
      cy.getByDT('createChannelSubmit').click()
      cy.getByDT('closeModal').should('not.exist')
    })
    cy.giCheckIfJoinedChatroom(publicChannelName, me)

    cy.get('.c-send-wrapper.is-public').should('exist')
    cy.get('.c-send-wrapper.is-public').within(() => {
      cy.get('.c-public-helper').should('contain', 'This channel is public and everyone on the internet can see its content.')
    })

    cy.giLogout({ bypassUI: true })
  })
})
