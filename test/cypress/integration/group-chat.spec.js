import { CHATROOM_GENERAL_NAME } from '../../../frontend/model/contracts/constants.js'

const userIdGenerator = () => Math.floor(Math.random() * 10000)
const user1 = `user1-${userIdGenerator()}`
// const user2 = `user2-${userIdGenerator()}`
// const user3 = `user3-${userIdGenerator()}`

describe('Group Chat Basic Features (Create & Join & Leave & Close)', () => {
  it(`creating a group means creating and joining a "${CHATROOM_GENERAL_NAME}" chatroom`, () => {
    cy.visit('/')
    cy.giSignup(user1)

    cy.giCreateGroup('Footballers', { bypassUI: true })

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
    cy.giLogout()
  })

  it('create private and public chatrooms and check their visibility', () => {

  })

  it('users can easily join any public chatrooms by themselves', () => {

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
