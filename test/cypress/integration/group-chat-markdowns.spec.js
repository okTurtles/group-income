import { CHATROOM_GENERAL_NAME } from '../../../frontend/model/contracts/shared/constants.js'
import { randomUserSuffix } from '../support/lib.js'

const groupName = 'Dreamers'
const user1 = `user1${randomUserSuffix()}`

describe('Check basic markdown features - one feature per message', () => {
  const lastSentMessageSelector = '.c-message.sent:last .c-text'

  // helper functions
  function sendMarkdownMessage (sender, message) {
    cy.getByDT('conversationWrapper').then(wrapperEl => {
      const sentMessageCount = wrapperEl.find('.c-message.sent').length

      // 'checkMessage: false' is used here because giSendMessage compares the raw markdown text
      // against the rendered message, which never matches once the markdown is transformed.
      cy.giSendMessage(sender, message, { instantInput: true, checkMessage: false })

      // A message is rendered with the 'pending' variant first and only becomes 'sent' once it's
      // confirmed, so wait for the new message to show up. Without this, the assertions that
      // follow can run against the previously sent message.
      cy.getByDT('conversationWrapper').find('.c-message.sent').should('have.length', sentMessageCount + 1)
    })
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
        // Ensure the fix for #2976(An external link should open in a new tab) isn't regressed.
        .and('have.attr', 'target', '_blank')

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

    cy.log('5-3. Verify inline markdowns and mentions inside the table cells are rendered correctly')

    const linkText = 'groupincome.org'
    const linkHref = 'http://groupincome.org'
    const tableWithInlineMarkdowns = '| col1            | col2                            |\n' +
      '|-----------------|---------------------------------|\n' +
      `| **bold** _italic_ ~strikethrough~ \`code\` | A link: [${linkText}](${linkHref}) |\n` +
      `| User mention: @${user1}    |  Channel mention: #${CHATROOM_GENERAL_NAME} |`

    sendMarkdownMessage(user1, tableWithInlineMarkdowns)
    checkLastSentMessage(() => {
      cy.get('table.table tbody tr').should('have.length', 2)

      // The first row contains inline markdown elements and a link.
      cy.get('table.table tbody tr').eq(0).within(() => {
        cy.get('td').eq(0).within(() => {
          cy.get('strong').should('have.text', 'bold')
          cy.get('em').should('have.text', 'italic')
          cy.get('del').should('have.text', 'strikethrough')
          cy.get('code').should('have.text', 'code')
        })
        cy.get('td').eq(1).within(() => {
          cy.get('a').should('have.text', linkText).and('have.attr', 'href', linkHref)
        })
      })

      // The second row contains a user mention and a channel mention.
      cy.get('table.table tbody tr').eq(1).within(() => {
        cy.get('td').eq(0).find('.c-member-mention').should('have.text', `@${user1}`)
        // A channel mention displays the channel name preceded by a hashtag icon.
        cy.get('td').eq(1).find('.c-channel-mention').should('have.text', CHATROOM_GENERAL_NAME)
      })
    })
  })

  it('6. Verify ordered/unordered list markdown elements', () => {
    cy.log('6-1. Verify simple ordered/unordered lists inserted in between plain text paragraphs')

    const sentence1 = 'Here are the steps to get started:'
    const orderedItems = ['Create an account', 'Create or join a group', 'Set your income details']
    const sentence2 = 'And these are the things you can do in a group:'
    const unorderedItems = ['Send messages in the group chat', 'Vote on group proposals', 'Check the group dashboard']
    const sentence3 = 'That is all for now!'

    const listMarkdown = `${sentence1}\n\n` +
      orderedItems.map((item, index) => `${index + 1}. ${item}`).join('\n') + '\n\n' +
      `${sentence2}\n\n` +
      unorderedItems.map(item => `- ${item}`).join('\n') + '\n\n' +
      sentence3

    sendMarkdownMessage(user1, listMarkdown)
    checkLastSentMessage(() => {
      cy.contains(sentence1).should('exist')
      cy.contains(sentence2).should('exist')
      cy.contains(sentence3).should('exist')

      cy.get('ol').should('have.length', 1)
      cy.get('ol > li').should('have.length', orderedItems.length)
      orderedItems.forEach((itemText, index) => {
        cy.get('ol > li').eq(index).should('have.text', itemText)
      })

      cy.get('ul').should('have.length', 1)
      cy.get('ul > li').should('have.length', unorderedItems.length)
      unorderedItems.forEach((itemText, index) => {
        cy.get('ul > li').eq(index).should('have.text', itemText)
      })
    })

    cy.log('6-2. Verify a nested list structure - an unordered list that contains ordered lists')

    const nestedListIntro = 'My grocery list for this week:'
    const nestedListItems = [
      { category: 'Fruits', items: ['Apples', 'Bananas'] },
      { category: 'Vegetables', items: ['Carrots', 'Onions'] }
    ]
    const nestedListMarkdown = `${nestedListIntro}\n\n` +
      // The items of an inner list are indented by 2 spaces so they are nested under their parent item.
      nestedListItems.map(({ category, items }) => {
        return `- ${category}\n` + items.map((item, index) => `  ${index + 1}. ${item}`).join('\n')
      }).join('\n')

    sendMarkdownMessage(user1, nestedListMarkdown)
    checkLastSentMessage(() => {
      cy.contains(nestedListIntro).should('exist')

      // Only the outer list is unordered, and each of its items nests an ordered list.
      cy.get('ul').should('have.length', 1)
      cy.get('ul > li').should('have.length', nestedListItems.length)

      nestedListItems.forEach(({ category, items }, index) => {
        // 'contain' is used here instead of 'have.text' because a parent item also contains the nested list.
        cy.get('ul > li').eq(index).should('contain', category)
        cy.get('ul > li').eq(index).within(() => {
          cy.get('ol > li').should('have.length', items.length)
          items.forEach((itemText, itemIndex) => {
            cy.get('ol > li').eq(itemIndex).should('have.text', itemText)
          })
        })
      })
    })

    cy.log('6-3. Verify a list whose items contain other markdown syntaxes')

    const guideIntro = 'Follow these steps to run the project locally:'
    const inlineCodeText = 'npm install'
    const boldText = 'contributing guide'
    const guideLinkText = 'groupincome.org'
    const guideLinkHref = 'http://groupincome.org'
    const codeFenceLines = ['grunt dev', 'grunt test']
    const tableHeaders = ['service', 'port']
    const tableRows = [['app', '8000'], ['server', '3000']]
    const outroText = 'Happy hacking!'
    // The code fence and the table are indented by 3 spaces so that they belong to their parent list item.
    const listWithMarkdowns = `${guideIntro}\n\n` +
      `1. Install the dependencies by running \`${inlineCodeText}\`.\n` +
      `2. Read the **${boldText}** at [${guideLinkText}](${guideLinkHref}).\n` +
      `3. Ask @${user1} in #${CHATROOM_GENERAL_NAME} if you get stuck.\n` +
      '4. Then start the dev server and the test runner:\n' +
      '   ```\n' +
      codeFenceLines.map(line => `   ${line}`).join('\n') + '\n' +
      '   ```\n' +
      '5. These are the ports being used:\n' +
      `   | ${tableHeaders.join(' | ')} |\n` +
      `   |${tableHeaders.map(() => '---------').join('|')}|\n` +
      tableRows.map(row => `   | ${row.join(' | ')} |`).join('\n') + '\n\n' +
      outroText

    sendMarkdownMessage(user1, listWithMarkdowns)
    checkLastSentMessage(() => {
      cy.contains(guideIntro).should('exist')
      cy.get('ol > li').should('have.length', 5)

      cy.get('ol > li').eq(0).within(() => {
        cy.get('code').should('have.text', inlineCodeText)
      })

      cy.get('ol > li').eq(1).within(() => {
        cy.get('strong').should('have.text', boldText)
        cy.get('a').should('have.text', guideLinkText).and('have.attr', 'href', guideLinkHref)
      })

      cy.get('ol > li').eq(2).within(() => {
        cy.get('.c-member-mention').should('have.text', `@${user1}`)
        cy.get('.c-channel-mention').should('have.text', CHATROOM_GENERAL_NAME)
      })

      // The code fence inside the last item is rendered by the CodeFence component too.
      cy.get('ol > li').eq(3).within(() => {
        cy.get('.code-fence-block').should('have.length', 1).within(() => {
          cy.get('.c-line-count').should('have.text', `${codeFenceLines.length} lines`)
          cy.get('table.code-fence-table tbody tr').should('have.length', codeFenceLines.length)
          codeFenceLines.forEach((codeLine, index) => {
            cy.get('table.code-fence-table tbody tr').eq(index).within(() => {
              cy.get('td.line-number').should('have.text', `${index + 1}`)
              // The indentation used to nest the code fence under the list item must be stripped.
              cy.get('td.code-line').should('have.text', codeLine)
            })
          })
        })
      })

      // A table nested in a list item is rendered as a table too.
      cy.get('ol > li').eq(4).within(() => {
        cy.get('.table-container > table.table').should('have.length', 1)
        tableHeaders.forEach((headerText, index) => {
          cy.get('table.table thead th').eq(index).should('have.text', headerText)
        })
        cy.get('table.table tbody tr').should('have.length', tableRows.length)
        tableRows.forEach((rowCells, rowIndex) => {
          cy.get('table.table tbody tr').eq(rowIndex).within(() => {
            rowCells.forEach((cellText, colIndex) => {
              cy.get('td').eq(colIndex).should('have.text', cellText)
            })
          })
        })
      })

      // The plain text after the list is rendered outside of it.
      cy.contains(outroText).should('exist')
      cy.get('ol').should('not.contain', outroText)
    })
  })

  it('7. Verify blockquote markdown element', () => {
    cy.log('7-1. Verify a simple blockquote')

    const blockquoteMarkdown = '> This is a blockquote example'
    sendMarkdownMessage(user1, blockquoteMarkdown)
    checkLastSentMessage(() => {
      cy.get('blockquote').should('have.text', 'This is a blockquote example')
    })

    cy.log('7-2. Verify consecutive blockquote lines (single \\n) merge into one blockquote, terminated by a blank line')

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

    // Reference issue: https://github.com/okTurtles/group-income/issues/2467
    cy.log('7-3. Mentions placed after a code fence inside a blockquote must still be rendered as mentions - issue #2467')

    const quotedCodeLines = ['const isFixed = true', 'console.log(isFixed)']
    const blockquoteWithCodeFence = `> Quoting @${user1} before the code fence:\n` +
      '> ```\n' +
      quotedCodeLines.map(line => `> ${line}`).join('\n') + '\n' +
      '> ```\n' +
      `> And here are @${user1} and #${CHATROOM_GENERAL_NAME} mentioned after the code fence.`

    sendMarkdownMessage(user1, blockquoteWithCodeFence)
    checkLastSentMessage(() => {
      cy.get('blockquote').should('have.length', 1).within(() => {
        // The code fence inside the blockquote is rendered by the CodeFence component,
        // with the blockquote markers stripped off from each of its lines.
        cy.get('.code-fence-block').should('have.length', 1)
        cy.get('td.code-line').should('have.length', quotedCodeLines.length)
        quotedCodeLines.forEach((codeLine, index) => {
          cy.get('td.code-line').eq(index).should('have.text', codeLine)
        })

        // The quoted texts before/after the code fence are rendered as two separate paragraphs.
        cy.get('p').should('have.length', 2)
        cy.get('p').eq(0).find('.c-member-mention').should('have.text', `@${user1}`)
        // Before the fix, the mentions in this paragraph were left as plain texts.
        cy.get('p').eq(1).within(() => {
          cy.get('.c-member-mention').should('have.text', `@${user1}`)
          cy.get('.c-channel-mention').should('have.text', CHATROOM_GENERAL_NAME)
        })
      })
    })
  })

  it('8. Verify large emoji rendering and a previous bugfix', () => {
    cy.log('8-1. Verify a message that only contains emojis is rendered with the \'has-only-emojis\' class')

    const emojis = ['🎉', '🚀', '😄']

    sendMarkdownMessage(user1, emojis.join(''))
    cy.getByDT('conversationWrapper').within(() => {
      // The class is added to the message body element itself, so it's checked outside of checkLastSentMessage.
      cy.get(lastSentMessageSelector).should('have.class', 'has-only-emojis')
    })
    checkLastSentMessage(() => {
      // Each emoji is wrapped in its own span so that it can be styled separately.
      cy.get('.chat-emoji').should('have.length', emojis.length)
      emojis.forEach((emoji, index) => {
        cy.get('.chat-emoji').eq(index).should('have.text', emoji)
      })
    })

    cy.log('8-2. Verify an emoji directly following an inline markdown is not enlarged (issue #3044)')
    // Verifying a previous bugfix related to the .has-only-emojis class isn't regressed.
    // Reference issue: https://github.com/okTurtles/group-income/issues/3044
    sendMarkdownMessage(user1, `**bold text** ${emojis[0]}`)
    cy.getByDT('conversationWrapper').within(() => {
      cy.get(lastSentMessageSelector).should('not.have.class', 'has-only-emojis')
    })
    checkLastSentMessage(() => {
      cy.get('strong').should('have.text', 'bold text')
      cy.get('.chat-emoji').should('have.length', 1)
      cy.get('.chat-emoji').should('have.text', emojis[0])
      cy.get('.has-only-emojis').should('not.exist')
    })
  })

  it('9. Verify some line break related behaviors', () => {
    cy.log('9-1. Multiple line breaks between two plain text sentences should be rendered correctly')

    const lineBreakCount = 3
    const textsWithSomeLineBreaks = `Sentence 1\n${'\n'.repeat(lineBreakCount)}Sentence 2 after multiple line breaks`
    sendMarkdownMessage(user1, textsWithSomeLineBreaks)
    checkLastSentMessage(() => {
      cy.contains('Sentence 1').should('exist')
      cy.contains('Sentence 2 after multiple line breaks').should('exist')
      // Line breaks after a sentence must map to the same number of <br> elements.
      cy.get('br').should('have.length', lineBreakCount)
    })

    cy.log('9-2. An empty line directly following a list and blockquote should not be mapped to a <br> element (issue #2529)')
    // Reference issue: https://github.com/okTurtles/group-income/issues/2529
    const blockLevelMarkdowns = {
      'blockquote': '> This is a blockquote',
      'ol': '1. Item 1\n2. Item 2',
      'ul': '- Item 1\n- Item 2'
    }
    const textAfter = 'Some plain text after'
    for (const [blockTagName, markdown] of Object.entries(blockLevelMarkdowns)) {
      // The extra \n in the middle here must not be transformed to a <br> because it's a markdown signifier for the end of the blockquote and ordered/unordered lists.
      // double \n\n is a markdown signifier for the end of blockquote and ordered/unordered lists.
      const msgToSend = `${markdown}\n\n${textAfter}`
      sendMarkdownMessage(user1, msgToSend)
      checkLastSentMessage(() => {
        cy.get(blockTagName).should('exist')
          .next().should('contain', textAfter) // .next() here is a directly sibling element and must be a text after.

        cy.get('br').should('not.exist') // Ensure no <br> is generated after the block markdown.
      })
    }
  })

  it('10. Verify path-only urls passed to link markdown work as expected', () => {
    // validateURL() in frontend/views/utils/misc.js is called with 'acceptPathOnly: true' for every link
    // markdown. Verifying the logics there are working correctly.

    cy.log('10-1. A path starting with \'/app\' is turned into an in-app router link')

    const inAppPath = '/app/dashboard'
    sendMarkdownMessage(user1, `[Go to the dashboard](${inAppPath})`)
    checkLastSentMessage(() => {
      cy.get('a').should('have.text', 'Go to the dashboard')
        .and('have.class', 'link')
        // The anchor is re-created by the vue-router, so its href is the route resolved by the app router.
        .and('have.attr', 'href', inAppPath)
        // An in-app link stays in the same tab, unlike an external one.
        .and('not.have.attr', 'target')
    })

    cy.log('10-2. A query string is attached to the app origin so the app router can handle it')

    const queryParams = ['modal=GroupMembersAllModal', 'userId=abcd123']
    sendMarkdownMessage(user1, `[Open a modal](?${queryParams.join('&')})`)
    checkLastSentMessage(() => {
      cy.get('a').should('have.text', 'Open a modal').and('have.class', 'link')
      // The resolved href is based on the current route, so only the query part is checked here.
      queryParams.forEach(param => {
        cy.get('a').should('have.attr', 'href').and('contain', param)
      })
    })

    cy.log('10-3. A bare slug without any URL-related special character is accepted as a link')

    const slug = 'contributions'
    sendMarkdownMessage(user1, `[Contributions](${slug})`)
    checkLastSentMessage(() => {
      // validateURL() adds the leading slash to a bare slug.
      cy.get('a').should('have.text', 'Contributions')
        .and('have.class', 'link')
        .and('have.attr', 'href', `/${slug}`)
        .and('not.have.attr', 'target')
    })

    cy.log('10-4. A path outside of \'/app\' and an anchor link are accepted as they are')

    const plainPath = '/to-a-path'
    const anchorLink = '#section-heading'
    sendMarkdownMessage(user1, `[A plain path](${plainPath}) and [an anchor link](${anchorLink})`)
    checkLastSentMessage(() => {
      cy.get('a').should('have.length', 2)
      cy.get('a').eq(0).should('have.text', 'A plain path')
        .and('have.class', 'link')
        .and('have.attr', 'href', plainPath)
        .and('not.have.attr', 'target')
      cy.get('a').eq(1).should('have.text', 'an anchor link')
        .and('have.class', 'link')
        .and('have.attr', 'href', anchorLink)
        .and('not.have.attr', 'target')
    })
  })

  it('11. Miscellaneous checks and verify some previous bugfixes', () => {
    cy.log('11-1. Raw html codes in a message must be displayed as plain text instead of being rendered')

    // Check if the raw html escaping logics in markdown-utils.js work correctly.

    const imgHTML = '<img src="this-image-does-not-exist.png" onerror="window.imgOnerrorExecuted = true">'
    const pHTML = '<p id="some-random-id"><strong>This is a paragraph</strong> and should be rendered as <em>plain text</em></p>'
    const rawHtmlMessage = `Sending some raw html:\n\n${imgHTML}\n\n${pHTML}`

    sendMarkdownMessage(user1, rawHtmlMessage)
    checkLastSentMessage(() => {
      // The raw html must be kept as visible text, angle brackets and all.
      cy.contains(imgHTML).should('exist')
      cy.contains(pHTML).should('exist')

      cy.get('img').should('not.exist')
      cy.get('p#some-random-id').should('not.exist')
      cy.get('strong').should('not.exist')
      cy.get('em').should('not.exist')

      cy.window().should(win => {
        // Ensure the img onerror handler did not execute.
        expect(win.imgOnerrorExecuted).to.equal(undefined)
      })
    })
  })
})
