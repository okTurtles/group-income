import { CHATROOM_GENERAL_NAME } from '../../../frontend/model/contracts/shared/constants.js'

/**
 * Should import from this function from '../../../frontend/model/contracts/shared/functions.js'
 * But Cypress doesn't render files using Flowtype annotations
 * So copied that function and use it here
 * TODO: figure out how to import functions with type annotations in Cypress
 */
function makeMentionFromUsername (username) {
  return {
    me: `@${username}`,
    all: '@all'
  }
}

const groupName = 'Dreamers'
const additionalChannelName = 'bulgaria-hackathon'
const userId = performance.now().toFixed(20).replace('.', '')
const user1 = `user1${userId}`
const user2 = `user2${userId}`
const pollData = {
  question: 'What is your favourite coin?',
  options: ['Bitcoin', 'Ethereum', 'Solana', 'Not mentioned here']
}
let invitationLinkAnyone
let me

describe('Send/edit/remove/reply/pin/unpin messages & add/remove reactions inside group chat', () => {
  function switchUser (username) {
    cy.giSwitchUser(username)
    me = username
  }

  function editMessage (nth, message) {
    cy.getByDT('conversationWrapper').find(`[data-index="${nth - 1}"] > .c-message`).within(() => {
      cy.get('.c-message-menu').within(() => {
        cy.get('.c-actions').invoke('attr', 'style', 'display: flex').invoke('show').should('be.visible')
        cy.get('.c-actions button[aria-label="Edit"]').click()
      })
      cy.getByDT('messageInputWrapper').within(() => {
        cy.get('textarea').type(`{selectall}{del}${message}{enter}`)
      })
      cy.get('.c-text').should('contain', message)
      cy.get('.c-edited').should('contain', '(edited)')
    })
    cy.getByDT('conversationWrapper').find(`[data-index="${nth - 1}"] > .c-message.sent`).should('exist')
  }

  function deleteMessage (nth, countAfter) {
    cy.getByDT('conversationWrapper').within(() => {
      // cy.get(`[data-index="${nth - 1}"]:visible > .c-message .c-message-menu .c-actions`).invoke('attr', 'style', 'display: flex').invoke('show')
      // cy.get(`[data-index="${nth - 1}"] > .c-message .c-message-menu .c-actions:visible`).getByDT('menuTrigger').click({ force: true })
      cy.get(`[data-index="${nth - 1}"]:visible > .c-message .c-message-menu .c-actions`).getByDT('menuContent').getByDT('deleteMessage').eq(0).click({ force: true })
      // cy.get(`[data-index="${nth - 1}"]:visible > .c-message .c-message-menu .c-actions`).invoke('hide').should('be.hidden')
    })

    cy.getByDT('modal').within(() => {
      cy.getByDT('modal-header-title').should('contain', 'Delete message')
      cy.getByDT('submitPrompt').click()
    })

    cy.getByDT('conversationWrapper').within(() => {
      cy.get(`[data-index="${nth - 1}"] > .c-message`).should('have.class', 'c-disappeared')
    })

    cy.getByDT('conversationWrapper').invoke('attr', 'data-length').should('eq', String(countAfter))
  }

  function pinMessage (nth) {
    cy.getByDT('conversationWrapper').find(`[data-index="${nth - 1}"] > .c-message .c-actions [data-test="menuContent"] [data-test="pinToChannel"]`).click({ force: true })
    cy.getByDT('conversationWrapper').find(`[data-index="${nth - 1}"] > .c-message .c-pinned-wrapper`).should('contain', 'Pinned by you')
    /* cy.getByDT('conversationWrapper').find(`[data-index="${nth - 1}"] > .c-message`).within(() => {
      cy.get('.c-message-menu').within(() => {
        cy.get('.c-actions').invoke('attr', 'style', 'display: flex').invoke('show').should('be.visible').within(() => {
          cy.getByDT('menuTrigger').click()
        })
        cy.getByDT('menuContent').within(() => {
          cy.getByDT('pinToChannel').click()
        })
        cy.get('.c-actions').invoke('hide').should('be.hidden')
      })
      cy.get('.c-pinned-wrapper').should('contain', 'Pinned by you')
    }) */
  }

  function unpinMessage (nth) {
    cy.getByDT('numberOfPinnedMessages').click()
    cy.getByDT('pinnedMessages').find(`.c-body>.c-pinned-message:nth-child(${nth})`).within(() => {
      cy.getByDT('unpinFromChannel').click()
    })

    cy.getByDT('modal').within(() => {
      cy.getByDT('modal-header-title').should('contain', 'Remove pinned message')
      cy.getByDT('submitPrompt').click()
    })
  }

  function sendEmoticon (nth, emojiCode, emojiCount) {
    const emojiWrapperSelector = '.c-picker-wrapper .emoji-mart .vue-recycle-scroller__item-wrapper .vue-recycle-scroller__item-view:first-child .emoji-mart-category'
    cy.getByDT('conversationWrapper').find(`[data-index="${nth - 1}"] > .c-message`).within(() => {
      cy.get('.c-message-menu').within(() => {
        cy.get('.c-actions').invoke('attr', 'style', 'display: flex').invoke('show').should('be.visible')
        cy.get('.c-actions button[aria-label="Add reaction"]').click()
        cy.get('.c-actions').invoke('hide').should('be.hidden')
      })
    })
    cy.get(`${emojiWrapperSelector} span[data-title="${emojiCode}"]`).eq(0).click()

    cy.getByDT('conversationWrapper').within(() => {
      cy.get(`[data-index="${nth - 1}"] > .c-message .c-emoticons-list`).should('exist')
      cy.get(`[data-index="${nth - 1}"] > .c-message .c-emoticons-list>.c-emoticon-wrapper`).should('have.length', emojiCount + 1)
    })
  }

  function deleteEmotion (nthMesage, nthEmoji, emojiCount) {
    const expectedEmojiCount = !emojiCount ? 0 : emojiCount + 1
    cy.getByDT('conversationWrapper').find(`[data-index="${nthMesage - 1}"] > .c-message`).within(() => {
      cy.get('.c-emoticons-list').should('exist')
      cy.get('.c-emoticons-list>.c-emoticon-wrapper').should('have.length', emojiCount + 2)
      cy.get(`.c-emoticons-list>.c-emoticon-wrapper:nth-child(${nthEmoji})`).click()
    })

    cy.getByDT('conversationWrapper').within(() => {
      cy.get(`[data-index="${nthMesage - 1}"] > .c-message .c-emoticons-list>.c-emoticon-wrapper`).should('have.length', expectedEmojiCount)
    })
  }

  function checkMessageBySender (index, sender, message) {
    cy.getByDT('conversationWrapper').within(() => {
      cy.get('.c-message').eq(index).find('.c-who > span:first-child').should('contain', sender)
      cy.get('.c-message').eq(index).find('.c-text').should('contain', message)
    })
  }

  function replyToMessage (nth, message) {
    cy.get(`[data-test="conversationWrapper"] [data-index="${nth - 1}"] > .c-message .c-message-menu .c-actions button[aria-label="Reply"]`).click({ force: true })

    cy.getByDT('messageInputWrapper').within(() => {
      cy.get('textarea').should('exist')
      cy.get('.c-reply-wrapper').should('exist')
    })

    cy.giSendMessage(me, message)
  }

  function votePoll (nthForMessage, nthForOption) {
    cy.get(`[data-index="${nthForMessage - 1}"] > .c-message`).within(() => {
      cy.get('fieldset').within(() => {
        cy.get(`label.c-poll-option:nth-child(${nthForOption})`).click()
      })

      cy.get('.c-buttons-container').within(() => {
        cy.getByDT('submit').click()
      })
    })
  }

  function changeVote (nthForMessage, nthForOption) {
    cy.get(`[data-index=${nthForMessage - 1}] > .c-message`).within(() => {
      cy.get('.c-poll-container .c-poll-menu').within(() => {
        cy.getByDT('menuTrigger').click()
        cy.getByDT('menuContent').should('be.visible').within(() => {
          cy.getByDT('changeVote').click()
        })
      })
    })

    votePoll(nthForMessage, nthForOption, true)
  }

  it(`user1 creates '${groupName}' group and sends/edits messages in "${CHATROOM_GENERAL_NAME}"`, () => {
    cy.visit('/')
    cy.giSignup(user1, { bypassUI: true })
    me = user1

    cy.giCreateGroup(groupName, { bypassUI: true })

    cy.giRedirectToGroupChat()
    cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
    cy.getByDT('channelsList').within(() => {
      cy.get('ul').children().should('have.length', 1)
    })
    cy.giCheckIfJoinedChatroom(CHATROOM_GENERAL_NAME, me)

    cy.giSendMessage(me, `Welcome to the ${groupName}!`)
    cy.giSendMessage(me, 'We are going to make the world better!')
    editMessage(3, 'We are helping each other to make the world better!')

    cy.getByDT('dashboard').click()
    cy.giGetInvitationAnyone().then(url => {
      invitationLinkAnyone = url
    })

    cy.giLogout()
  })

  it(`user2 joins ${groupName} group and sends/deletes/edits messages in "${CHATROOM_GENERAL_NAME}"`, () => {
    cy.giAcceptGroupInvite(invitationLinkAnyone, {
      username: user2,
      existingMemberUsername: user1,
      groupName: groupName,
      shouldLogoutAfter: false,
      bypassUI: true
    })
    me = user2

    cy.giRedirectToGroupChat()
    cy.giSendMessage(me, 'Oh, yes. I have joined the group now.')
    deleteMessage(5, 4)
    cy.giSendMessage(me, 'Anyone here?')
    editMessage(5, 'Hello everyone. Thanks for inviting me to this group.')
  })

  it('user2 sees totally 5 messages', () => {
    cy.getByDT('conversationWrapper').invoke('attr', 'data-length').should('eq', '5')

    checkMessageBySender(0, user1, `Joined ${CHATROOM_GENERAL_NAME}`)
    checkMessageBySender(1, user1, `Welcome to the ${groupName}!`)
    checkMessageBySender(2, user1, 'We are helping each other to make the world better!')
    checkMessageBySender(3, user2, `Joined ${CHATROOM_GENERAL_NAME}`)
    checkMessageBySender(4, user2, 'Hello everyone. Thanks for inviting me to this group.')
  })

  it('user2 mentions user1 and adds/removes reactions to the message', () => {
    cy.giSendMessage(me, `Hi ${makeMentionFromUsername(user1).me}. When is the best time for you to help me with learning more about this group?`)

    sendEmoticon(3, '+1', 1)
    sendEmoticon(3, 'joy', 2)
    sendEmoticon(3, 'grinning', 3)

    sendEmoticon(6, 'joy', 1)

    deleteEmotion(3, 2, 2)
  })

  it('user1 sees a mention and three reactions, and he sends two mentions and one reaction too', () => {
    switchUser(user1)
    cy.getByDT('groupChatLink').get('.c-badge.is-compact[aria-label="1 new notifications"]').contains('1')
    cy.giRedirectToGroupChat()
    cy.giSendMessage(me, `Hi ${makeMentionFromUsername(user2).me}. Anytime!`)
    cy.giSendMessage(me, `Hi ${makeMentionFromUsername(user2).all}. No matter what, I will always be by your side.`)
    cy.get('[data-test="groupChatLink"] .c-badge.is-compact').should('not.exist')

    cy.getByDT('conversationWrapper').within(() => {
      cy.get('[data-index="2"] > .c-message .c-emoticons-list>.c-emoticon-wrapper').should('have.length', 3)
      cy.get('[data-index="5"] > .c-message .c-emoticons-list>.c-emoticon-wrapper').should('have.length', 2)
    })

    sendEmoticon(6, '+1', 2)

    cy.getByDT('conversationWrapper').within(() => {
      cy.get('[data-index="5"] > .c-message .c-emoticons-list>.c-emoticon-wrapper').should('have.length', 3)
      cy.get('[data-index="5"] > .c-message .c-emoticons-list>.c-emoticon-wrapper.is-user-emoticon').should('have.length', 1)
    })
  })

  it('user2 checks two mentions and sends/deletes attachments', () => {
    switchUser(user2)
    cy.getByDT('groupChatLink').get('.c-badge.is-compact[aria-label="2 new notifications"]').contains('2')
    cy.giRedirectToGroupChat()
    cy.get('[data-test="groupChatLink"] .c-badge.is-compact').should('not.exist')

    const fileNames = [
      ['1.png', '2.png', '3.png'], // Prefix Path: cypress/fixtures/
      ['imageTest.png', 'test.json']
    ]

    cy.getByDT('attachments').attachFile(fileNames[0])
    cy.giSendMessage(me, 'Sending three profile pictures which are designed by Apple. Cute, right?')

    cy.getByDT('attachments').attachFile(fileNames[1])
    cy.giSendMessage(me, 'Sending two files; one is image, and the other is JSON file.')

    cy.getByDT('conversationWrapper').within(() => {
      cy.get('[data-index="8"] > .c-message .c-attachment-container').find('.c-attachment-preview:nth-child(2)').within(() => {
        cy.get('.c-attachment-actions-wrapper').invoke('attr', 'style', 'display: flex').invoke('show')
        cy.get('.c-attachment-actions span[aria-label="Delete"]').click()
        cy.get('.c-attachment-actions-wrapper').invoke('hide')
      })
    })

    cy.getByDT('modal').within(() => {
      cy.getByDT('modal-header-title').should('contain', 'Delete file')
      cy.get('legend.label').should('contain', 'Are you sure you want to delete this file permanently?')
      cy.getByDT('submitPrompt').click()
    })

    cy.getByDT('conversationWrapper').find('[data-index="8"] >.c-message').within(() => {
      cy.get('.c-attachment-container').find('.c-attachment-preview').should('have.length', 2)
    })
  })

  it('user2 pins 3 messages and unpins 1 message', () => {
    pinMessage(9)
    pinMessage(8)
    pinMessage(10)
    cy.getByDT('numberOfPinnedMessages').should('contain', '3 Pinned')
    unpinMessage(1)
    cy.getByDT('numberOfPinnedMessages').should('contain', '2 Pinned')
  })

  it('user2 creates a poll', () => {
    const { question, options } = pollData
    cy.getByDT('messageInputWrapper').within(() => {
      cy.getByDT('createPoll').click()
    })

    cy.getByDT('createPollWrapper').within(() => {
      cy.getByDT('question').within(() => {
        cy.get('input').type(`${question}{enter}`)
      })

      cy.getByDT('options').within(() => {
        for (let i = 1; i <= options.length; i++) {
          cy.getByDT('addOption').click()
          cy.get('.c-option-list > .c-option-item').should('have.length', i + 1)
        }
        cy.get('.c-option-list > .c-option-item:last-child').within(() => {
          cy.get('button[aria-label="Remove option"]').click()
        })
        cy.get('.c-option-list > .c-option-item').should('have.length', options.length)

        for (let i = 1; i <= options.length; i++) {
          cy.get(`.c-option-list > .c-option-item:nth-child(${i})`).within(() => {
            cy.get('input').type(`${options[i - 1]}{enter}`)
          })
        }
      })

      cy.get('.c-btns-container').within(() => {
        cy.getByDT('submit').click()
      })
    })

    cy.getByDT('createPollWrapper').should('not.visible')

    cy.getByDT('conversationWrapper').within(() => {
      cy.get('.c-message:last-child').should('have.class', 'is-type-poll')
      cy.get('.c-message:last-child .c-poll-container').within(() => {
        cy.get('.c-poll-title').should('contain', question)
        cy.get('fieldset').within(() => {
          cy.get('.c-poll-option').should('have.length', options.length)
          for (let i = 1; i <= options.length; i++) {
            cy.get(`.c-poll-option:nth-child(${i})`).should('contain', options[i - 1])
          }
        })
      })
    })
  })

  it('user2 votes the poll he created', () => {
    votePoll(11, 1)
  })

  it('pinned messages should be sorted by the created date of original messages', () => {
    cy.getByDT('numberOfPinnedMessages').click()
    cy.getByDT('pinnedMessages').within(() => {
      cy.get('.c-body>.c-pinned-message:first-child .c-pinned-message-content')
        .should('contain', 'Sending three profile pictures which are designed by Apple. Cute, right?')
      cy.get('.c-body>.c-pinned-message:last-child .c-pinned-message-content')
        .should('contain', 'Hi @all. No matter what, I will always be by your side.')
    })
  })

  it('user2 clicks the first pinned message to highlight the original message', () => {
    cy.getByDT('pinnedMessages').within(() => {
      // NOTE: Clicking on the center(which is the default position) leads to spawning 'image-viewer' modal which is not something we are checking here. So specifying 'top' instead.
      cy.get('.c-body>.c-pinned-message:first-child').click('top')
    })

    cy.getByDT('conversationWrapper').within(() => {
      cy.get('[data-index="8"] > .c-message').should('have.class', 'c-focused')
    })
  })

  it('user1 checks 2 pinned messages and the last position where he was', () => {
    switchUser(user1)

    cy.giRedirectToGroupChat()
    cy.getByDT('numberOfPinnedMessages').should('contain', '2 Pinned')
    cy.contains('Hi @all. No matter what, I will always be by your side.').should('be.visible')
  })

  it('user1 votes the poll, updates his vote, and pins it', () => {
    votePoll(11, 2)
    changeVote(11, 3)
    pinMessage(11)
    cy.getByDT('numberOfPinnedMessages').should('contain', '3 Pinned')
  })

  it('user1 sends 20 messages', () => {
    for (let i = 1; i <= 20; i++) {
      cy.giSendMessage(me, `Text-${i}`)
    }
  })

  it('user1 replies message', () => {
    cy.getByDT('conversationWrapper').scrollTo(0, 500)
    replyToMessage(9, 'Yeah, they are pretty!') // 'Sending three profile pictures which are designed by Apple. Cute, right?'

    cy.getByDT('conversationWrapper').within(() => {
      cy.get('.c-message').last().find('.c-who > span:first-child').should('contain', user1)
      cy.get('.c-message').last().find('.c-text').should('contain', 'Yeah, they are pretty!')
      cy.get('.c-message').last().should('be.visible').within(() => {
        cy.get('.c-replying').should('be.visible').click()
      })

      // HACK: scrollIntoView() should not be there
      // But cy.get('.c-reply').click() doesn't scroll to the target message
      // Because of this can not move forward to the next stages, so just used HACK
      cy.get('[data-index="8"] > .c-message')
        .should('contain', 'Sending three profile pictures which are designed by Apple. Cute, right?')
        .scrollIntoView()
        .should('be.visible')
      cy.get('.c-reply').should('not.exist')
    })
  })

  it('user1 creates a new channel and checks how the scroll position is saved for each channel', () => {
    cy.giAddNewChatroom({
      name: additionalChannelName,
      isPrivate: false,
      bypassUI: true
    })
    cy.giCheckIfJoinedChatroom(additionalChannelName, me)

    cy.giSwitchChannel(CHATROOM_GENERAL_NAME)

    cy.getByDT('conversationWrapper').within(() => {
      cy.contains('Sending three profile pictures which are designed by Apple. Cute, right?').should('be.visible')
    })

    cy.getByDT('messageInputWrapper').within(() => {
      cy.get('.c-jump-to-latest').should('exist').click()
    })

    cy.getByDT('conversationWrapper').within(() => {
      cy.get('.c-message').last().should('be.visible')
    })

    cy.getByDT('messageInputWrapper').within(() => {
      cy.get('.c-jump-to-latest').should('not.exist')
    })
  })

  it('user1 checks how the infinite scroll works', () => {
    cy.giSwitchChannel(additionalChannelName)
    cy.giSwitchChannel(CHATROOM_GENERAL_NAME)

    cy.getByDT('conversationWrapper').within(() => {
      cy.contains('Yeah, they are pretty!').should('be.visible')
    })

    cy.getByDT('conversationWrapper').scrollTo('top')
    cy.giWaitUntilMessagesLoaded()

    cy.getByDT('conversationWrapper').within(() => {
      cy.get('[data-index="0"] > .c-message .c-who > span:first-child').should('contain', user1)
      cy.get('[data-index="0"] > .c-message .c-notification').should('contain', `Joined ${CHATROOM_GENERAL_NAME}`)
    })

    cy.giLogout()
  })
})
