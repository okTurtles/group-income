import { CHATROOM_GENERAL_NAME } from '../../../frontend/model/contracts/constants.js'

const groupName = 'Footballers'
const userId = Math.floor(Math.random() * 10000)
const user1 = `user1-${userId}`
const user2 = `user2-${userId}`
let invitationLinkAnyone

const additionalChatRooms = [
  { name: 'Mid Fielders', description: '', isPrivate: false },
  { name: 'Utility Players', description: 'Footballers who are suitable to playing at several positions.', isPrivate: true },
  { name: 'Forwards', description: '', isPrivate: false },
  { name: 'Top 10', description: '10 players in any position having highest ratings.', isPrivate: true }
]

describe('Group Chat Basic Features (Create & Join & Leave & Close)', () => {
  it(`user1 creats a group and joins "${CHATROOM_GENERAL_NAME}" chatroom by default`, () => {
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
    cy.getByDT('conversationWapper').within(() => {
      cy.get('div.c-message').should('have.length', 1)
      cy.get('div.c-message .c-who > span:first-child').should('contain', user1)
      cy.get('div.c-message .c-notification').should('contain', `Joined ${CHATROOM_GENERAL_NAME}`)
    })
  })

  it('user1 creates different types of chatrooms and logout', () => {
    for (const c of additionalChatRooms) {
      cy.giAddNewChatroom(c.name, c.description, c.isPrivate)
    }
    // TODO: need to remove cy.wait
    cy.wait(500) // eslint-disable-line
    cy.giLogout()
  })

  it('user2 joins the group and he can easily join any public chatrooms by themselves', () => {
    cy.giAcceptGroupInvite(invitationLinkAnyone, {
      username: user2,
      groupName,
      shouldLogoutAfter: false,
      bypassUI: true
    })
    cy.getByDT('groupChatLink').click()
    cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
  })

  it('user2 checks visibilities and orders of chatrooms inside the group', () => {
    // TODO: need to set order more complex
    cy.getByDT('channelsList').within(() => {
      cy.get('ul').children().should('have.length', 3)
      cy.get('ul').within(([list]) => {
        const visibleChatRoomNames = additionalChatRooms.filter(c => !c.isPrivate).map(c => c.name).sort()
        visibleChatRoomNames.unshift(CHATROOM_GENERAL_NAME)
        visibleChatRoomNames.forEach((chatRoomName, index) => {
          cy.get(list).children().eq(index)
            .invoke('text')
            .should('contain', chatRoomName)
        })
      })
    })
    cy.giLogout()
  })

  it('invitation is the only way to join any private chatrooms', () => {

  })

  it('users can leave any types of chatrooms by themselves', () => {

  })

  it('leaving a group means leaving all the chatrooms of the group', () => {

  })

  it('users can see all messages of any public chatrooms', () => {

  })

  it('closing chatroom means leaving and make it unaccessible and unvisible', () => {

  })
})
