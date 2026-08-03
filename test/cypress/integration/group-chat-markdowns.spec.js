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

  it('4. Verify fenced code block markdown element', () => {
    cy.log('4-1. Verify the code fence UI is rendered by the CodeFence component')

    const textBefore = 'Some plain text before the code fence'
    const textAfter = 'Some plain text after the code fence'
    // Non-javascript lines and empty lines are included on purpose: everything inside a code
    // fence must be kept as it is, instead of being rendered as markdown or collapsed.
    const codeLines = [
      'This is an example of text inside a code fence.',
      'You can write multiple lines here.',
      'Formatting like *italics* or [links](url) will not render.',
      `Mentioning @${user1} and #${CHATROOM_GENERAL_NAME} must not be rendered inside a code fence.`,
      '',
      'Some javascript code:',
      'const numbers =;',
      '',
      'const doubled = numbers.map(num => num * 2);',
      '',
      'console.log(doubled);',
      '',
      'a<b<c' // This ensures the previously resolved issue #2130 won't reappear.
    ]
    const codeFenceMarkdown = `${textBefore}\n\n` +
      '```\n' + codeLines.join('\n') + '\n```\n\n' +
      textAfter

    sendMarkdownMessage(user1, codeFenceMarkdown)
    checkLastSentMessage(() => {
      cy.get('.code-fence-block').should('have.length', 1).within(() => {
        // Ensure the ctas in CodeFence components are rendered correctly.
        cy.get('.c-line-count').should('have.text', `${codeLines.length} lines`)
        cy.get('button.c-copy-button').should('contain', 'Copy')
      })
    })

    cy.log('4-2. Verify each code line is displayed with its line number, with the markdown syntax inside it left unrendered')

    checkLastSentMessage(() => {
      cy.get('table.code-fence-table tbody tr').should('have.length', codeLines.length)
      codeLines.forEach((codeLine, index) => {
        cy.get('table.code-fence-table tbody tr').eq(index).within(() => {
          cy.get('td.line-number').should('have.text', `${index + 1}`) // Verify the line number.
          cy.get('td.code-line').should('have.text', codeLine) // Verify the raw text isn't transformed.
        })
      })

      // Ensure markdown syntaxes and mentions aren't transformed.
      cy.get('em').should('not.exist')
      cy.get('a').should('not.exist')
      cy.get('.c-member-mention').should('not.exist')
      cy.get('.c-channel-mention').should('not.exist')
    })

    cy.log('4-3. Verify the plain texts before/after the code fence are there too.')

    checkLastSentMessage(() => {
      cy.contains(textBefore).should('exist')
      cy.contains(textAfter).should('exist')
    })
  })

  it('5. Verify table markdown element', () => {
    cy.log('5-1. Verify the table is rendered with the correct structure')

    const introText = 'Below is an example table:'
    const tableHeaders = ['col1', 'col2', 'col3']
    const tableRows = [
      ['Lorem ipsum dolor', 'Lorem ipsum dolor sit amet, consectetur.', 'Abcdef Abcdef, Abcd Abcde'],
      ['Lorem ipsum', 'Lorem ipsum dolor sit amet', 'Abcd Abcdefghi, Abcdefgh Abcdef Abcd']
    ]
    // The inconsistent cell paddings below are intentional - they must not affect the rendered outcome.
    const tableMarkdown = `${introText}\n\n` +
      '| col1            | col2                            | col3                      |\n' +
      '|-----------------|---------------------------------|---------------------------|\n' +
      '| Lorem ipsum dolor | Lorem ipsum dolor sit amet, consectetur.    | Abcdef Abcdef, Abcd Abcde |\n' +
      '| Lorem ipsum   |  Lorem ipsum dolor sit amet                              | Abcd Abcdefghi, Abcdefgh Abcdef Abcd |'

    sendMarkdownMessage(user1, tableMarkdown)
    checkLastSentMessage(() => {
      cy.contains(introText).should('exist')
      // A table is wrapped in a <div.table-container> to make it horizontally scrollable.
      cy.get('.table-container > table.table').should('have.length', 1)
      cy.get('table.table thead th').should('have.length', tableHeaders.length)
      cy.get('table.table tbody tr').should('have.length', tableRows.length)
    })

    cy.log('5-2. Verify the header and the body cells display the correct contents')

    checkLastSentMessage(() => {
      tableHeaders.forEach((headerText, index) => {
        cy.get('table.table thead th').eq(index).should('have.text', headerText)
      })

      tableRows.forEach((rowCells, rowIndex) => {
        cy.get('table.table tbody tr').eq(rowIndex).within(() => {
          cy.get('td').should('have.length', rowCells.length)
          rowCells.forEach((cellText, colIndex) => {
            cy.get('td').eq(colIndex).should('have.text', cellText)
          })
        })
      })
    })
  })

  it('6. Verify blockquote markdown element', () => {
    cy.log('6-1. Verify a simple blockquote')

    const blockquoteMarkdown = '> This is a blockquote example'
    sendMarkdownMessage(user1, blockquoteMarkdown)
    checkLastSentMessage(() => {
      cy.get('blockquote').should('have.text', 'This is a blockquote example')
    })

    cy.log('6-2. Verify consecutive blockquote lines (single \\n) merge into one blockquote, terminated by a blank line')

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
