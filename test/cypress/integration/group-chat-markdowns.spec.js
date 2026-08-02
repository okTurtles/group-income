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

  it('Setup: user1 creates a group and invites user2', () => {
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

  it('1. Verify markdown headings', () => {
    // cy.giSwitchUser(user1, { firstLoginAfterJoinGroup: true })
    cy.giRedirectToGroupChat()

    // Headings only
    const headingMarkdownSimple = '# Heading 1\n' +
      '## Heading 2\n' +
      '### Heading 3\n' +
      '#### Heading 4\n' +
      '##### Heading 5\n' +
      '###### Heading 6'
    // Headings that contain inline markdown elements
    const headingMarkdownComplex = '#### Heading with a [link](https://www.google.com)\n' +
      '#### Heading with an _italic text_, an **bold text**, and a `code` text'

    sendMarkdownMessage(user1, headingMarkdownSimple)
    cy.log('Check markdown headings are rendered correctly - simple structure')
    cy.getByDT('conversationWrapper').within(() => {
      // The markdown headings should be rendered as <h1>Heading 1</h1>, <h2>Heading 2</h2>, ... <h6>Heading 6</h6>
      cy.get(lastSentMessageSelector).within(() => {
        for (let level = 1; level <= 6; level++) {
          cy.get(`h${level}`).should('have.text', `Heading ${level}`)
        }
      })
    })

    sendMarkdownMessage(user1, headingMarkdownComplex)
    cy.log('Check markdown headings are rendered correctly - complex structure')
    cy.getByDT('conversationWrapper').within(() => {
      cy.get(lastSentMessageSelector).within(() => {
        cy.get('h4').eq(0).should('have.text', 'Heading with a link')
        cy.get('h4').eq(1).should('have.text', 'Heading with an italic text, an bold text, and a code text')
        cy.get('a').should('have.attr', 'href', 'https://www.google.com')
        cy.get('em').should('have.text', 'italic text')
        cy.get('strong').should('have.text', 'bold text')
        cy.get('code').should('have.text', 'code')
      })
    })
  })

  it('2. Verify various inline markdown elements', () => {
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
