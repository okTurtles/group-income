import { CHATROOM_GENERAL_NAME } from '../../../frontend/model/contracts/shared/constants.js'
import { randomUserSuffix } from '../support/lib.js'

const groupName = 'Dreamers'
const user1 = `user1${randomUserSuffix()}`

describe('Check basic markdown features - one feature per message', () => {
  const lastSentMessageSelector = '.c-message.sent:last .c-text'

  // helper functions
  function sendMarkdownMessage (sender, message) {
    cy.giSendMessage(sender, message, { instantInput: true, checkMessage: false })
  }

  function checkLastSentMessage (assertions = () => {}) {
    cy.getByDT('conversationWrapper').within(() => {
      cy.get(lastSentMessageSelector).within(assertions)
    })
  }

  it('Test setup: user1 creates a group and goes to the group chat', () => {
    cy.visit('/')
    cy.giSignup(user1, { bypassUI: true })
    cy.giCreateGroup(groupName, { bypassUI: true })
    cy.giRedirectToGroupChat()
  })

  it('1. Verify markdown headings - simple & complex', () => {
    cy.log('1-1. Verify simple markdown headings (headings only, 1-6 levels)')

    // Simple headings (headings only, 1-6 levels)
    const headingMarkdownSimple = '# Heading 1\n' +
      '## Heading 2\n' +
      '### Heading 3\n' +
      '#### Heading 4\n' +
      '##### Heading 5\n' +
      '###### Heading 6'

    sendMarkdownMessage(user1, headingMarkdownSimple)
    // The markdown headings should be rendered as <h1>Heading 1</h1>, <h2>Heading 2</h2>, ... <h6>Heading 6</h6>
    checkLastSentMessage(() => {
      for (let level = 1; level <= 6; level++) {
        cy.get(`h${level}`).should('have.text', `Heading ${level}`)
      }
    })

    cy.log('1-2.Verify complex headings (headings with inline markdowns inside)')

    // Complex headings (headings with inline markdowns inside)
    const headingMarkdownComplex = '#### Heading with a [link](https://www.google.com)\n' +
      '#### Heading with an _italic text_, an **bold text**, and a `code` text'

    sendMarkdownMessage(user1, headingMarkdownComplex)
    checkLastSentMessage(() => {
      cy.get('h4').eq(0).should('have.text', 'Heading with a link')
      cy.get('h4').eq(1).should('have.text', 'Heading with an italic text, an bold text, and a code text')
      cy.get('a').should('have.attr', 'href', 'https://www.google.com')
      cy.get('em').should('have.text', 'italic text')
      cy.get('strong').should('have.text', 'bold text')
      cy.get('code').should('have.text', 'code')
    })
  })

  it('2. Verify horizontal rule markdown element', () => {
    const horizontalRuleMarkdown = '---'
    sendMarkdownMessage(user1, horizontalRuleMarkdown)
    checkLastSentMessage(() => {
      cy.get('hr').should('exist')
    })
  })

  it('3. Verify various inline markdown elements', () => {
    cy.log('3-1. Verify bold, italic, code, and strikethrough inline markdowns are rendered correctly')

    const inlineMarkdownsToTest = {
      'strong': '**bold**',
      'em': '_italic_',
      'code': '`code`',
      'del': '~strikethrough~'
    }
    const inlineMarkdownMsg = `Testing inline markdowns: ${Object.values(inlineMarkdownsToTest).join(', ')}`

    sendMarkdownMessage(user1, inlineMarkdownMsg)
    checkLastSentMessage(() => {
      for (const [tagName, val] of Object.entries(inlineMarkdownsToTest)) {
        const textVal = val.replace(/[^a-z]/g, '')
        cy.get(tagName).should('contain', textVal)
      }
    })

    cy.log('3-2. Inline code must render channel/user mentions as plain text')

    // inline code must not render channel/user mentions
    const inlineCodeWithMention1 = `Mentioning user1 must not be rendered inside inline code: \`@${user1}\``
    const inlineCodeWithMention2 = `Likewise Mentioning the channel must not be rendered inside inline code: \`#${CHATROOM_GENERAL_NAME}\``

    sendMarkdownMessage(user1, inlineCodeWithMention1)
    checkLastSentMessage(() => {
      cy.get('code').should('have.text', `@${user1}`)
    })

    sendMarkdownMessage(user1, inlineCodeWithMention2)
    checkLastSentMessage(() => {
      cy.get('code').should('have.text', `#${CHATROOM_GENERAL_NAME}`)
    })

    // Reference issue: https://github.com/okTurtles/group-income/issues/3116
    cy.log('3-3. An inline code segment inside a link must render correctly - issue #3116')

    const linkWithInlineCode = 'a [`link with code` in it](#foo)'
    sendMarkdownMessage(user1, linkWithInlineCode)
    checkLastSentMessage(() => {
      cy.get('a').should('have.attr', 'href', '#foo').within(() => {
        cy.get('code').should('have.text', 'link with code')
      })
    })
  })

  it('4. Verify blockquote markdown element', () => {
    cy.log('4-1. Verify a simple blockquote')

    const blockquoteMarkdown = '> This is a blockquote example'
    sendMarkdownMessage(user1, blockquoteMarkdown)
    checkLastSentMessage(() => {
      cy.get('blockquote').should('have.text', 'This is a blockquote example')
    })

    cy.log('4-2. Verify consecutive blockquote lines (single \\n) merge into one blockquote, terminated by a blank line')

    const multipleBlockquotesMarkdown = 'Some plain text before\n' +
      '> First blockquote line\n' +
      '> Second blockquote line\n\n' +
      'Some plain text after'

    sendMarkdownMessage(user1, multipleBlockquotesMarkdown)
    checkLastSentMessage(() => {
      // Both lines are rendered inside one blockquote, separated by a line-break.
      cy.get('blockquote').should('have.length', 1)
        .should('contain', 'First blockquote line')
        .and('contain', 'Second blockquote line')
      cy.contains('Some plain text before').should('exist')
      cy.contains('Some plain text after').should('exist')
    })
  })
})
