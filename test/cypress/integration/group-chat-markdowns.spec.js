// import { CHATROOM_GENERAL_NAME } from '../../../frontend/model/contracts/shared/constants.js'
import { randomUserSuffix } from '../support/lib.js'

const groupName = 'Dreamers'
const user1 = `user1${randomUserSuffix()}`
// const user2 = `user2${randomUserSuffix()}`

describe('Check basic markdown features - one feature per message', () => {
  const lastSentMessageSelector = '.c-message.sent:last .c-text'

  function sendMarkdownMessage (sender, message) {
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
      cy.get(lastSentMessageSelector).within(() => {
        for (let level = 1; level <= 6; level++) {
          cy.get(`h${level}`).should('have.text', `Heading ${level}`)
        }
      })
    })

    // 2. Verifying various inline markdown elements
    const inlineMarkdownsToTest = {
      'strong': '**bold**',
      'em': '_italic_',
      'code': '`code`',
      'del': '~strikethrough~'
    }

    const inlineMarkdownMsg = `Testing inline markdowns: ${Object.values(inlineMarkdownsToTest).join(', ')}`
    sendMarkdownMessage(user1, inlineMarkdownMsg)

    cy.getByDT('conversationWrapper').within(() => {
      cy.get(lastSentMessageSelector).within(() => {
        for (const [tagName, val] of Object.entries(inlineMarkdownsToTest)) {
          const textVal = val.replace(/[^a-z]/g, '')
          cy.get(tagName).should('contain', textVal)
        }
      })
    })
  })
})
