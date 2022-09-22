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
const userId = Math.floor(Math.random() * 10000)
const user1 = `user1${userId}`
const user2 = `user2${userId}`
const user3 = `user3${userId}`
let invitationLinkAnyone
let me

describe('Send/edit/remove messages & add/remove emoticons inside group chat', () => {
  function switchUser (username) {
    cy.giSwitchUser(username)
    me = username
  }

  function checkIfJoined (channelName, inviter, invitee) {
    // Attention: need to check just after joined
    // not after making other activities
    inviter = inviter || me
    invitee = invitee || me
    const selfJoin = inviter === invitee
    const selfCheck = me === invitee
    if (selfCheck) {
      cy.getByDT('messageInputWrapper').within(() => {
        cy.get('textarea').should('exist')
      })
    }
    cy.getByDT('conversationWrapper').within(() => {
      cy.get('.c-message:last-child .c-who > span:first-child').should('contain', inviter)
      const message = selfJoin ? `Joined ${channelName}` : `Added a member to ${channelName}: ${invitee}`
      cy.get('.c-message:last-child .c-notification').should('contain', message)
    })
  }

  function sendMessage (message) {
    cy.getByDT('messageInputWrapper').within(() => {
      cy.get('textarea').clear().type(`${message}{enter}`)
      cy.get('textarea').should('be.empty')
    })
    cy.getByDT('conversationWrapper').within(() => {
      cy.get('.c-message:last-child .c-who > span:first-child').should('contain', me)
      cy.get('.c-message.sent:last-child .c-text').should('contain', message)
    })
  }

  function editMessage (nth, message) {
    cy.getByDT('conversationWrapper').find(`.c-message:nth-child(${nth})`).within(() => {
      cy.get('.c-menu>.c-actions').invoke('attr', 'style', 'display: flex').invoke('show')
      cy.get('.c-menu>.c-actions button[aria-label="Edit"]').click()
      cy.getByDT('messageInputWrapper').within(() => {
        cy.get('textarea').clear().type(`${message}{enter}`)
      })
      cy.get('.c-text').should('contain', message)
      cy.get('.c-edited').should('contain', '(edited)')
    })
    cy.getByDT('conversationWrapper').find(`.c-message.sent:nth-child(${nth})`).should('exist')
  }

  function deleteMessage (nth, countAfter) {
    cy.getByDT('conversationWrapper').find(`.c-message:nth-child(${nth})`).within(() => {
      cy.get('.c-menu>.c-actions').invoke('attr', 'style', 'display: flex').invoke('show')
      cy.get('.c-menu').within(() => {
        cy.getByDT('menuTrigger').click()
        cy.getByDT('menuContent').within(() => {
          cy.getByDT('deleteMessage').click()
        })
      })
    })

    cy.getByDT('conversationWrapper').within(() => {
      cy.get('.c-message').should('have.length', countAfter)
    })
  }

  function sendEmoticon (nth, emojiCode, emojiCount) {
    const emojiWrapperSelector = '.c-picker-wrapper .emoji-mart .vue-recycle-scroller__item-wrapper .vue-recycle-scroller__item-view:first-child .emoji-mart-category'
    cy.getByDT('conversationWrapper').find(`.c-message:nth-child(${nth})`).within(() => {
      cy.get('.c-menu>.c-actions').invoke('attr', 'style', 'display: flex').invoke('show')
      cy.get('.c-menu>.c-actions button[aria-label="Add reaction"]').click()
      cy.get('.c-menu>.c-actions').invoke('hide')
    })
    cy.get(`${emojiWrapperSelector} span[data-title="${emojiCode}"]`).eq(0).click()

    cy.getByDT('conversationWrapper').within(() => {
      cy.get(`.c-message:nth-child(${nth}) .c-emoticons-list`).should('exist')
      cy.get(`.c-message:nth-child(${nth}) .c-emoticons-list>.c-emoticon-wrapper`).should('have.length', emojiCount + 1)
    })
  }

  function deleteEmotion (nthMesage, nthEmoji, emojiCount) {
    const expectedEmojiCount = !emojiCount ? 0 : emojiCount + 1
    cy.getByDT('conversationWrapper').find(`.c-message:nth-child(${nthMesage})`).within(() => {
      cy.get('.c-emoticons-list').should('exist')
      cy.get('.c-emoticons-list>.c-emoticon-wrapper').should('have.length', emojiCount + 2)
      cy.get(`.c-emoticons-list>.c-emoticon-wrapper:nth-child(${nthEmoji})`).click()
    })

    cy.getByDT('conversationWrapper').within(() => {
      cy.get(`.c-message:nth-child(${nthMesage}) .c-emoticons-list>.c-emoticon-wrapper`).should('have.length', expectedEmojiCount)
    })
  }

  function checkMessageBySender (index, sender, message) {
    cy.getByDT('conversationWrapper').within(() => {
      cy.get('.c-message').eq(index).find('.c-who > span:first-child').should('contain', sender)
      cy.get('.c-message').eq(index).find('.c-text').should('contain', message)
    })
  }

  it(`user1 creats '${groupName}' group and joins "${CHATROOM_GENERAL_NAME}" channel by default`, () => {
    cy.visit('/')
    cy.giSignup(user1)
    me = user1

    cy.giCreateGroup(groupName, { bypassUI: true })
    cy.giGetInvitationAnyone().then(url => {
      invitationLinkAnyone = url
    })
    cy.giRedirectToGroupChat()
    cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
    cy.getByDT('channelsList').within(() => {
      cy.get('ul').children().should('have.length', 1)
    })
    checkIfJoined(CHATROOM_GENERAL_NAME)

    cy.giLogout()
  })

  it(`user2 joins ${groupName} group`, () => {
    cy.giAcceptGroupInvite(invitationLinkAnyone, {
      username: user2,
      groupName: groupName,
      shouldLogoutAfter: false,
      bypassUI: true
    })
    me = user2
    cy.giRedirectToGroupChat()

    cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
    checkIfJoined(CHATROOM_GENERAL_NAME)

    cy.getByDT('channelsList').find('ul>li:first-child').within(() => {
      cy.get('[data-test]').should('contain', CHATROOM_GENERAL_NAME)
    })
  })

  it('user2 sends greetings and asks to have meeting this morning', () => {
    sendMessage(`Hello ${user1}. How are you? Thanks for inviting me to this awesome group.`)
    sendMessage('Can we have a meeting this morning?')
  })

  it('user1 sends greetings and edits', () => {
    switchUser(user1)
    cy.giRedirectToGroupChat()

    sendMessage('Hi')

    editMessage(7, `Hi ${user2}. I am fine thanks.`)
  })

  it('user2 edits and deletes message', () => {
    switchUser(user2)
    cy.giRedirectToGroupChat()

    editMessage(5, 'Can we have a meeting this evening?')

    deleteMessage(4, 4)
  })

  it('user1 sees the edited message but he is not able to see the deleted message', () => {
    switchUser(user1)
    cy.giRedirectToGroupChat()

    cy.getByDT('conversationWrapper').within(() => {
      cy.get('.c-message').should('have.length', 4)
    })

    checkMessageBySender(0, user1, `Joined ${CHATROOM_GENERAL_NAME}`)
    checkMessageBySender(1, user2, `Joined ${CHATROOM_GENERAL_NAME}`)
    checkMessageBySender(2, user2, 'Can we have a meeting this evening?')
    checkMessageBySender(3, user1, `Hi ${user2}. I am fine thanks.`)
  })

  it('user1 adds 4 emojis and removes 1 emoji', () => {
    sendEmoticon(4, '+1', 1)
    sendEmoticon(4, 'joy', 2)
    sendEmoticon(4, 'grinning', 3)

    sendEmoticon(5, 'joy', 1)

    deleteEmotion(4, 2, 2)
  })

  it('user2 sees the emojis user1 created and adds his emoji', () => {
    switchUser(user2)
    cy.giRedirectToGroupChat()

    cy.getByDT('conversationWrapper').within(() => {
      cy.get('.c-message:nth-child(4) .c-emoticons-list>.c-emoticon-wrapper').should('have.length', 3)
      cy.get('.c-message:nth-child(5) .c-emoticons-list>.c-emoticon-wrapper').should('have.length', 2)
    })

    sendEmoticon(5, '+1', 1)

    cy.getByDT('conversationWrapper').within(() => {
      cy.get('.c-message:nth-child(5) .c-emoticons-list>.c-emoticon-wrapper').should('have.length', 3)
      cy.get('.c-message:nth-child(5) .c-emoticons-list>.c-emoticon-wrapper.is-user-emoticon').should('have.length', 1)
    })
    cy.giLogout()
  })

  it(`user3 joins ${groupName} group and mentions user1 and all`, () => {
    cy.giAcceptGroupInvite(invitationLinkAnyone, {
      username: user3,
      groupName: groupName,
      shouldLogoutAfter: false,
      bypassUI: true
    })
    me = user3
    cy.giRedirectToGroupChat()

    cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
    checkIfJoined(CHATROOM_GENERAL_NAME)

    cy.getByDT('channelsList').find('ul>li:first-child').within(() => {
      cy.get('[data-test]').should('contain', CHATROOM_GENERAL_NAME)
    })

    sendMessage(`Hi ${makeMentionFromUsername(user1).all}. Hope you are doing well.`)
    sendMessage(`I am a friend of ${makeMentionFromUsername(user1).me}. Let's work together.`)
  })

  it('user2 and user1 check mentions for themselves', () => {
    switchUser(user2)

    cy.getByDT('groupChatLink').get('.c-badge.is-compact[aria-label="1 new notifications"]').contains('1')
    cy.giRedirectToGroupChat()
    cy.getByDT(`channel-${CHATROOM_GENERAL_NAME}-in`).get('.c-unreadcount-wrapper').contains('1')

    switchUser(user1)

    cy.getByDT('groupChatLink').get('.c-badge.is-compact[aria-label="2 new notifications"]').contains('2')
    cy.giRedirectToGroupChat()
    cy.getByDT(`channel-${CHATROOM_GENERAL_NAME}-in`).get('.c-unreadcount-wrapper').contains('2')

    cy.giLogout()
  })
})
