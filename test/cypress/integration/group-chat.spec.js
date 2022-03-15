import { CHATROOM_GENERAL_NAME } from '../../../frontend/model/contracts/constants.js'

const groupName = 'Dreamers'
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

  // function checkIfLeaved (channelName, kicker, leaver) {
  //   // Attention: to check if other member is left
  //   // me needs to be logged in that channel
  //   kicker = kicker || me
  //   leaver = leaver || me
  //   const selfLeave = kicker === leaver
  //   const selfCheck = me === leaver
  //   if (selfCheck) {
  //     cy.getByDT('channelsList').within(() => {
  //       cy.getByDT(`channel-${channelName}-out`).should('exist')
  //     })
  //     // do not switch to the channel to check notifications
  //     // considering it sync the chatroom contract from the beginning
  //   } else {
  //     cy.get('div.c-message:last-child .c-who > span:first-child').should('contain', kicker)
  //     const message = selfLeave ? `Leaved ${channelName}` : `Kicked a member to ${channelName}: ${leaver}`
  //     cy.get('div.c-message:last-child .c-notification').should('contain', message)
  //   }
  // }

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

  // function leaveChannel (channelName) {
  //   switchChannel(channelName)
  //   cy.getByDT('channelName').within(() => {
  //     cy.getByDT('menuTrigger').click()
  //   })
  //   cy.getByDT('leaveChannel').click()
  //   cy.getByDT('leaveChannelSubmit').click()
  //   cy.getByDT('closeModal').should('not.exist')
  //   cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
  // }

  // function kickMemberFromChannel (channelName, username) {
  //   switchChannel(channelName)
  //   cy.getByDT('channelMembers').click()
  //   cy.getByDT('joinedChannelMembersList').within(() => {
  //     cy.getByDT('removeMember-' + username).click()
  //   })
  //   cy.getByDT('closeModal').click()
  //   cy.getByDT('closeModal').should('not.exist')
  // }

  // function deleteChannel (channelName) {
  //   switchChannel(channelName)
  //   cy.getByDT('channelName').within(() => {
  //     cy.getByDT('menuTrigger').click()
  //   })
  //   cy.getByDT('deleteChannel').click()
  //   cy.getByDT('deleteChannelConfirmation').click()
  //   cy.getByDT('deleteChannelSubmit').click()
  //   cy.getByDT('closeModal').should('not.exist')
  //   cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
  //   cy.getByDT('conversationWapper').within(() => {
  //     cy.get('div.c-message:last-child .c-notification').should('contain', `Deleted the channel: ${channelName}`)
  //   })
  // }

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

  // function closeMenu (joined = true) {
  //   // TODO: need to remove cy.wait. Dropdown menu can not closable for a few seconds
  //   cy.wait(1000) // eslint-disable-line
  //   cy.getByDT('messageInputWrapper').within(() => {
  //     cy.get('textarea').should('exist')
  //     cy.get('textarea').click()
  //   })
  //   cy.getByDT('notificationsSettings').should('not.exist')
  // }

  it(`user1 creats '${groupName}' group and joins "${CHATROOM_GENERAL_NAME}" channel by default`, () => {
    cy.visit('/')
    cy.giSignup(user1)
    me = user1

    cy.giCreateGroup(groupName, { bypassUI: true })
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

  it(`user3 joins ${groupName} group and logout`, () => {
    cy.giAcceptGroupInvite(invitationLinkAnyone, {
      username: user3,
      groupName,
      shouldLogoutAfter: true,
      bypassUI: true
    })
    // do not need to update me
  })

  it(`user2 joins ${groupName} group and joins two public channels by himself`, () => {
    cy.giAcceptGroupInvite(invitationLinkAnyone, {
      username: user2,
      groupName,
      shouldLogoutAfter: false,
      bypassUI: true
    })
    me = user2
    cy.getByDT('groupChatLink').click()
    cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
    checkIfJoined(CHATROOM_GENERAL_NAME)
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

  it('user2 invites user1 to several channels he created', () => {
    for (const cn of channelsOf2For1) {
      addMemberToChannel(cn, user1)
    }
    for (const cn of channelsOf2For3) {
      addMemberToChannel(cn, user3)
    }
  })

  it('user1 checks the visibilities, sort order and permissions', () => {
    cy.giSwitchUser(user1)
    me = user1
    cy.getByDT('groupChatLink').click()
    cy.log('Users can update details(name, description) of the channels they created.')
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
    const newDescription2 = 'Description for Updated-' + detailedChannel.name
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

    cy.log('Users can not add members to the channels they are not part of. Users can only see members inside.')
    switchChannel(notJoinedChannel.name)
    cy.getByDT('channelMembers').click()
    cy.get('[data-test^="addToChannel-"]').should('not.exist')
    cy.get('[data-test^="removeMember-"]').should('not.exist')
    cy.getByDT('closeModal').click()
    cy.getByDT('closeModal').should('not.exist')

    cy.log('Users can not see the private channels they are not part of.')
    // TODO

    cy.log('Joined-channels are always in front of unjoined-channels. It means the channels order are different for each user.')
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
    cy.giLogout()
  })
})
