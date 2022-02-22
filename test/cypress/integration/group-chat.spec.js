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
        }
      })
    })
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
      cy.get('ul').children().should('have.length', 1 + additionalChatRooms.filter(c => !c.isPrivate).length)
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

  it('user2 leaves two public channels by himself', () => {
    // Forward, General, Top 10, Utility Players
    switchChannel()

    cy.giLogout()
  })

  it('leaving a group means leaving all the channels of the group', () => {

  })

  it('users can see all messages of any public channels', () => {

  })

  it('closing channel means leaving and make it unaccessible and unvisible', () => {

  })
})
