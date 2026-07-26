// import { CHATROOM_GENERAL_NAME } from '../../../frontend/model/contracts/shared/constants.js'
import { randomUserSuffix } from '../support/lib.js'

const groupName = 'Dreamers'
const user1 = `user1${randomUserSuffix()}`
// const user2 = `user2${randomUserSuffix()}`

describe('Check basic markdown features - one feature per message', () => {
  function sendMarkdownMessage(sender, message) {
    cy.giSendMessage(sender, message, { instantInput: true, checkMessage: false })
  }
  it('user1 creates a group and invites user2', () => {
    // let invitationLinkAnyone

    cy.visit('/')
    cy.giSignup(user1, { bypassUI: true })
    cy.giCreateGroup(groupName, { bypassUI: true })
    // cy.giGetInvitationAnyone().then(url => {
    //   invitationLinkAnyone = url

    //   cy.giRedirectToGroupChat()
    //   cy.giCheckIfJoinedChatroom(CHATROOM_GENERAL_NAME, user1)
    //   cy.giLogout()

    //   cy.giAcceptGroupInvite(invitationLinkAnyone, {
    //     username: user2,
    //     existingMemberUsername: user1,
    //     groupName,
    //     bypassUI: true
    //   })
    // })
  })

  it('user1 sends various simple markdown messages - meaning markdown with no nested structures', () => {
    // cy.giSwitchUser(user1, { firstLoginAfterJoinGroup: true })
    cy.giRedirectToGroupChat()

    // 1. verifying markdownheadings
    const headingMarkdownMsg = '# Heading 1\n' +
    '## Heading 2\n' +
    '### Heading 3\n' +
    '#### Heading 4\n' +
    '##### Heading 5\n' +
    '###### Heading 6'

    sendMarkdownMessage(user1, headingMarkdownMsg)
    cy.getByDT('conversationWrapper').within(() => {
      // The markdown headings should be rendered as <h1>Heading 1</h1>, <h2>Heading 2</h2>, ... <h6>Heading 6</h6>
      cy.get('.c-message:last-child .c-text').within(() => {
        for (let level = 1; level <= 6; level++) {
          cy.get(`h${level}`).should('have.text', `Heading ${level}`)
        }
      })
    })
  })
})
