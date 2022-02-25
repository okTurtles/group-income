import { CHATROOM_GENERAL_NAME } from '../../../frontend/model/contracts/constants.js'

const groupName = 'Footballers'
const userId = Math.floor(Math.random() * 10000)
const user1 = `user1-${userId}`
const user2 = `user2-${userId}`
let invitationLinkAnyone

const additionalChatRooms = [
  { name: 'Mid Fielders', description: '', isPrivate: false },
  { name: 'Utility Players', description: 'Footballers who are suitable to playing at several positions.', isPrivate: false },
  { name: 'Forwards', description: '', isPrivate: false },
  { name: 'Top 10', description: '10 players in any position having highest ratings.', isPrivate: true }
]

describe('Group Chat Basic Features (Create & Join & Leave & Close)', () => {
  function checkIfJoinedChannel (username, channelName, checkMe, selfJoin) {
    if (checkMe) {
      cy.getByDT('messageInputWrapper').within(() => {
        cy.get('textarea').should('exist')
      })
    }
    cy.getByDT('conversationWapper').within(() => {
      if (selfJoin) {
        cy.get('div.c-message:last-child .c-who > span:first-child').should('contain', username)
        cy.get('div.c-message:last-child .c-notification').should('contain', `Joined ${channelName}`)
      } else {
        cy.get('div.c-message:last-child .c-notification').should('contain', `Added a member to this channel: ${username}`)
      }
    })
  }

  function joinChannel (username, channelName) {
    cy.getByDT('joinChannel').click()
    checkIfJoinedChannel(username, channelName, true, true)
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

  function leaveChannel (channelName, selfLeave = true) {
    switchChannel(channelName)
    if (selfLeave) {
      cy.getByDT('channelName').within(() => {
        cy.getByDT('menuTrigger').click()
      })
      cy.getByDT('leaveChannel').click()
      cy.getByDT('leaveChannelSubmit').click()
      cy.getByDT('closeModal').should('not.exist')
      cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
    } else {
      // Leave other from the channel
    }
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

  function closeMenu (joined = true) {
    // TODO: need to remove cy.wait. Dropdown menu can not closable for a few seconds
    cy.wait(1000) // eslint-disable-line
    cy.getByDT('messageInputWrapper').within(() => {
      cy.get('textarea').should('exist')
      cy.get('textarea').click()
    })
    cy.getByDT('notificationsSettings').should('not.exist')
  }

  it(`user1 creats a group and joins "${CHATROOM_GENERAL_NAME}" channel by default`, () => {
    cy.visit('/')
    cy.giSignup(user1)

    cy.giCreateGroup(groupName, { bypassUI: true })
    cy.giGetInvitationAnyone().then(url => {
      invitationLinkAnyone = url
    })
    cy.getByDT('groupChatLink').click()
    cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
    cy.getByDT('channelsList').within(() => {
      cy.get('ul').children().should('have.length', 1)
    })
    checkIfJoinedChannel(user1, CHATROOM_GENERAL_NAME, true, true)
  })

  it('user1 creates different types of channels and logout', () => {
    for (const c of additionalChatRooms) {
      cy.giAddNewChatroom(c.name, c.description, c.isPrivate)
      cy.getByDT('channelName').should('contain', c.name)
      checkIfJoinedChannel(user1, c.name, true, true)
    }
    cy.giLogout()
  })

  it('user2 joins the group and joins two public channels by himself', () => {
    cy.giAcceptGroupInvite(invitationLinkAnyone, {
      username: user2,
      groupName,
      shouldLogoutAfter: false,
      bypassUI: true
    })
    cy.getByDT('groupChatLink').click()
    cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
    // Joins 'Forwards' channel
    switchChannel('Forwards')
    joinChannel(user2, 'Forwards')
    // Joins 'Utility Players' channel
    switchChannel('Utility Players')
    joinChannel(user2, 'Utility Players')
  })

  it('user2 checks visibilities and channel orders inside the group', () => {
    cy.getByDT('channelsList').within(() => {
      cy.get('ul').children().should('have.length', 4)
      cy.get('ul').within(([list]) => {
        const visibleChatRoomNames = ['Forwards', CHATROOM_GENERAL_NAME, 'Utility Players', 'Mid Fielders']
        visibleChatRoomNames.forEach((chatRoomName, index) => {
          cy.get(list).children().eq(index)
            .invoke('text')
            .should('contain', chatRoomName)
        })
      })
    })
  })

  it('user1 adds user2 to a private channel', () => {
    cy.giSwitchUser(user1)
    cy.getByDT('groupChatLink').click()

    switchChannel('Top 10')
    cy.getByDT('channelMembers').click()
    cy.getByDT('unjoinedChannelMembersList').within(() => {
      cy.getByDT('addToChannel').click()
    })
    cy.getByDT('closeModal').click()
    checkIfJoinedChannel(user2, 'Top 10', false, false)

    cy.giSwitchUser(user2)
    cy.getByDT('groupChatLink').click()
    switchChannel('Top 10')
    checkIfJoinedChannel(user2, 'Top 10', true, false)
  })

  it('user2 has limitations to leave, delete, rename, update description', () => {
    cy.log(`Any users can not leave, rename, delete "${CHATROOM_GENERAL_NAME}" channel`)
    switchChannel(CHATROOM_GENERAL_NAME)
    cy.getByDT('channelName').within(() => {
      cy.getByDT('menuTrigger').click()
    })
    cy.getByDT('menuContent').within(() => {
      cy.getByDT('leaveChannel').should('not.exist')
      cy.getByDT('deleteChannel').should('not.exist')
      cy.getByDT('renameChannel').should('not.exist')
    })
    closeMenu(true)

    cy.log('Users can not delete channel unless they are not creators')
    switchChannel('Forwards')
    cy.getByDT('channelName').within(() => {
      cy.getByDT('menuTrigger').click()
    })
    cy.getByDT('menuContent').within(() => {
      cy.getByDT('deleteChannel').should('not.exist')
    })
    closeMenu(true)
  })

  it('user2 leaves two public channels by himself', () => {
    leaveChannel('Forwards', true)
    leaveChannel('Utility Players', true)

    cy.giSwitchUser(user1)
    cy.getByDT('groupChatLink').click()
    // Check user2 if joined in 'Forwards' channel
    switchChannel('Forwards')
    cy.getByDT('channelMembers').click()
    cy.getByDT('unjoinedChannelMembersList').within(() => {
      cy.getByDT('username').should('contain', user2)
    })
    cy.getByDT('closeModal').click()
    cy.getByDT('closeModal').should('not.exist')
    // Check user2 if joined in 'Utility Players' channel
    switchChannel('Utility Players')
    cy.getByDT('channelMembers').click()
    cy.getByDT('unjoinedChannelMembersList').within(() => {
      cy.getByDT('username').should('contain', user2)
    })
    cy.getByDT('closeModal').click()
    cy.getByDT('closeModal').should('not.exist')
  })

  it('user1 deletes two channels and makes it unvisible, unaccessible', () => {
    deleteChannel('Forwards')
    deleteChannel('Mid Fielders')
    cy.getByDT('channelsList').within(() => {
      cy.get('ul').children().should('have.length', 3)
    })
  })

  it('user1 rename channel and update description too', () => {
    switchChannel('Top 10')
    updateName('Heros')
    updateDescription('World-class players around the world')
  })

  it('user2 leaves group and leaves all the channel inside the group', () => {
    const channels = [CHATROOM_GENERAL_NAME, 'Heros', 'Utility Players']
    cy.giSwitchUser(user2)

    cy.getByDT('groupSettingsLink').click()
    cy.getByDT('leaveModalBtn').click()

    cy.getByDT('leaveGroup', 'form').within(() => {
      cy.getByDT('username').clear().type(user2)
      cy.getByDT('password').type('123456789')
      cy.getByDT('confirmation').clear().type(`LEAVE ${groupName.toUpperCase()}`)

      cy.getByDT('btnSubmit').click()
    })

    cy.getByDT('closeModal').should('not.exist')
    // TODO: need to remove cy.wait. Waits for the contracts being removed.
    cy.wait(2000) // eslint-disable-line
    cy.giLogout({ hasNoGroup: true })
    cy.giLogin(user1)

    // Check how many members are joined to each channel
    cy.getByDT('groupChatLink').click()
    for (const name of channels) {
      switchChannel(name)
      cy.getByDT('channelMembers').should('contain', '1 members')
    }

    cy.giLogout()
  })
})
