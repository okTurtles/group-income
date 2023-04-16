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
const user4 = `user4${userId}`
const user5 = `user5${userId}`
let invitationLinkAnyone
let me

describe('Sending messages and Create DMs ', () => {
  function switchUser (username) {
    cy.giSwitchUser(username)
    me = username
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

  describe('Send/Edit/Remove messages & Add/Remove emoticons', () => {
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
      cy.giCheckIfJoinedChatroom(CHATROOM_GENERAL_NAME, me)

      cy.giLogout()
    })

<<<<<<< HEAD
    it(`user2 joins ${groupName} group`, () => {
      cy.giAcceptGroupInvite(invitationLinkAnyone, {
        username: user2,
        groupName: groupName,
        shouldLogoutAfter: false,
        bypassUI: true
      })
      me = user2
      cy.giRedirectToGroupChat()
=======
    cy.getByDT('conversationWrapper').within(() => {
      cy.get(`.c-message:nth-child(${nth})`).should('have.class', 'c-disappeared')
    })

    cy.getByDT('conversationWrapper').within(() => {
      cy.get('.c-message').should('have.length', countAfter)
    })
  }
>>>>>>> master

      cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
      cy.giCheckIfJoinedChatroom(CHATROOM_GENERAL_NAME, me)

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

      sendEmoticon(5, '+1', 2)

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
      cy.giCheckIfJoinedChatroom(CHATROOM_GENERAL_NAME, me)

      cy.getByDT('channelsList').find('ul>li:first-child').within(() => {
        cy.get('[data-test]').should('contain', CHATROOM_GENERAL_NAME)
      })

      sendMessage(`Hi ${makeMentionFromUsername(user1).all}. Hope you are doing well.`)
      sendMessage(`I am a friend of ${makeMentionFromUsername(user1).me}. Let's work together.`)
    })

    it('user2 and user1 check mentions for themselves', () => {
      // NOTE: test assertions are commented here
      // That's because we don't display notifications if user signs in another device
      switchUser(user2)

      // cy.getByDT('groupChatLink').get('.c-badge.is-compact[aria-label="1 new notifications"]').contains('1')
      cy.giRedirectToGroupChat()
      // cy.getByDT(`channel-${CHATROOM_GENERAL_NAME}-in`).get('.c-unreadcount-wrapper').contains('1')

      switchUser(user1)

      // cy.getByDT('groupChatLink').get('.c-badge.is-compact[aria-label="2 new notifications"]').contains('2')
      cy.giRedirectToGroupChat()
      // cy.getByDT(`channel-${CHATROOM_GENERAL_NAME}-in`).get('.c-unreadcount-wrapper').contains('2')

      cy.giLogout()
    })
  })

  describe('Create/Join direct messages', () => {
    function createDirectMessage (partner) {
      cy.getByDT('chatMembers').within(() => {
        cy.getByDT('inviteButton').click()
      })

      cy.getByDT('modal').within(() => {
        cy.getByDT('others').children().each(($el, index, $list) => {
          if ($el.text().includes(`@${partner}`)) {
            cy.wrap($el).click()
            return false
          }
        })
      })
    }

    function switchDirectMessageChannel (partner) {
      cy.getByDT('chatMembers').find('ul').get('span[data-test="title"], span[data-test="username"]').each(($el, index, $list) => {
        if ($el.text() === partner) {
          cy.wrap($el).click()
          return false
        }
      })
    }

    function joinUser (username, shouldLogoutAfter = true) {
      cy.giAcceptGroupInvite(invitationLinkAnyone, {
        username: username,
        groupName: groupName,
        shouldLogoutAfter: false,
        bypassUI: true
      })
      me = username
      cy.giRedirectToGroupChat()

      cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
      cy.giCheckIfJoinedChatroom(CHATROOM_GENERAL_NAME, me)

      cy.getByDT('channelsList').find('ul>li:first-child').within(() => {
        cy.get('[data-test]').should('contain', CHATROOM_GENERAL_NAME)
      })

      if (shouldLogoutAfter) {
        cy.giLogout()
      }
    }

    it('user2 creates a direct message channel with user1 and sends two messages', () => {
      cy.log('/')
      cy.giLogin(user2)
      me = user2
      cy.giRedirectToGroupChat()

      cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)

      cy.getByDT('channelsList').find('ul>li:first-child').within(() => {
        cy.get('[data-test]').should('contain', CHATROOM_GENERAL_NAME)
      })

      cy.getByDT('chatMembers').find('ul').children().should('have.length', 0)

      cy.getByDT('chatMembers').within(() => {
        cy.getByDT('inviteButton').click()
      })

      cy.getByDT('modal').within(() => {
        cy.getByDT('search').should('be.focused')
        cy.getByDT('memberCount').should('contain', '2 members')
        cy.getByDT('recentConversations').children().should('have.length', 0)
        cy.getByDT('others').children().should('have.length', 2)
      })
      cy.closeModal()

      createDirectMessage(user1)

      cy.getByDT('chatMembers').find('ul').children().should('have.length', 1)
      cy.getByDT('channelName').should('contain', user1)

      sendMessage('Hi! Nice to meet you.')
      sendMessage('Hope you are doing well.')
    })

    it('user1 checks direct messages from user2 and replies', () => {
      switchUser(user1)
      cy.giRedirectToGroupChat()

      // NOTE: In another device, unread mentions are not saved, so no mentions here
      // cy.getByDT('chatMembers').find('ul > li:nth-child(0)').get('.c-unreadcount-wrapper').contains('2')
      switchDirectMessageChannel(user2)

      cy.getByDT('conversationWrapper').find('.c-message').should('have.length', 2)

      sendMessage('I am fine. Thanks.')
    })

    it('user1 creates a direct message channel with user3 and sends greetings', () => {
      createDirectMessage(user3)

      cy.getByDT('chatMembers').find('ul').children().should('have.length', 2)
      cy.getByDT('channelName').should('contain', user3)

      sendMessage('Hello. How are you?')
    })

    it('user3 checks the direct messages from user1 and replies', () => {
      switchUser(user3)
      cy.giRedirectToGroupChat()

      switchDirectMessageChannel(user1)

      cy.getByDT('chatMembers').find('ul').children().should('have.length', 1)
      cy.getByDT('conversationWrapper').find('.c-message').should('have.length', 1)

      sendMessage('Fine. You?')
    })

    it('direct message channels should be sorted by name and the latest message', () => {
      switchUser(user1)
      cy.giRedirectToGroupChat()

      // NOTE: thie list is sorted by name
      cy.getByDT('chatMembers').find('ul>li:first-child').should('contain', user2)
      cy.getByDT('chatMembers').find('ul>li:last-child').should('contain', user3)

      cy.getByDT('chatMembers').within(() => {
        cy.getByDT('inviteButton').click()
      })

      cy.getByDT('modal').within(() => {
        cy.getByDT('recentConversations').children().should('have.length', 2)

        // NOTE: this list is sorted by the latest message
        cy.getByDT('recentConversations').find('li:first-child').should('contain', user3)
        cy.getByDT('recentConversations').find('li:last-child').should('contain', user2)
      })
      cy.closeModal()

      cy.giLogout()
    })

    it(`user4 and user5 joins the "${groupName}"`, () => {
      joinUser(user4)
      joinUser(user5, false)
    })

    it('user1 adds user4 to DM which is with user3', () => {
      switchUser(user1)
      cy.giRedirectToGroupChat()

      cy.getByDT('channelName').within(() => {
        cy.getByDT('menuTrigger').click()
      })
      cy.getByDT('addPeople').click()
      cy.getByDT('unjoinedChannelMembersList').within(() => {
        cy.getByDT('addToChannel-' + user4).click()
      })

      cy.getByDT('channelName').should('contain', `${user3}, ${user4}`)
      cy.getByDT('conversationWrapper').find('.c-message').should('have.length', 3) // 3 means user1, user3, user4

      cy.url().then(url => url).as('groupMessageLink')

      switchDirectMessageChannel(user3)

      cy.getByDT('channelName').within(() => {
        cy.getByDT('menuTrigger').click()
      })
      cy.getByDT('addPeople').click()
      cy.getByDT('unjoinedChannelMembersList').within(() => {
        cy.getByDT('addToChannel-' + user4).click()
      })

      cy.getByDT('channelName').should('contain', `${user3}, ${user4}`)
      cy.url().then(url => {
        cy.get('@groupMessageLink').should('eq', url) // NOTE: this checks the possibility to create gm for same users
      })
    })

    it('user3 adds user5 to the channel again', () => {
      switchUser(user3)
      cy.giRedirectToGroupChat()

      switchDirectMessageChannel(`${user1}, ${user4}`)

      cy.getByDT('channelName').within(() => {
        cy.getByDT('menuTrigger').click()
      })
      cy.getByDT('addPeople').click()
      cy.getByDT('unjoinedChannelMembersList').within(() => {
        cy.getByDT('addToChannel-' + user5).click()
      })
      cy.getByDT('closeModal').click()

      cy.getByDT('channelName').should('contain', `${user1}, ${user4}, ${user5}`)
      cy.getByDT('conversationWrapper').find('.c-message').should('have.length', 4) // 3 means user1, user3, user4, user5

      cy.giLogout()
    })
  })
})
