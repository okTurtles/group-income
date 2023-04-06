import { CHATROOM_GENERAL_NAME } from '../../../frontend/model/contracts/shared/constants.js'

const groupName = 'Dreamers'
const userId = Math.floor(Math.random() * 10000)
const user1 = `user1${userId}`
const user2 = `user2${userId}`
const user3 = `user3${userId}`
const user4 = `user4${userId}`
const user5 = `user5${userId}`
let invitationLinkAnyone
let me

describe('Create/Join direct messages and orders of direct message channels', () => {
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

  function createPrivateDM (partner) {
    cy.getByDT('chatMembers').within(() => {
      cy.getByDT('inviteButton').click()
    })

    const randBoolean = Math.random() > 0.5
    if (randBoolean) {
      cy.getByDT('modal').within(() => {
        cy.getByDT('others').children().each(($el, index, $list) => {
          if ($el.text().includes(`@${partner}`)) {
            cy.wrap($el).click()
            return false
          }
        })

        cy.getByDT('users-selector').type(`{enter}`)
      })
    } else {
      cy.getByDT('modal').within(() => {
        cy.getByDT('users-selector').type(`${partner}{enter}`)
      })
    }
  }

  function openDMByMembers (members) {
    const randBoolean = Math.random() > 0.5
    const title = members.join(', ')
    if (members.length === 1 && randBoolean) {
      cy.getByDT('chatMembers').within(() => {
        cy.getByDT('inviteButton').click()
      })
      cy.getByDT('modal').within(() => {
        cy.getByDT('users-selector').type(`${title}{enter}`)
      })
    } else {
      cy.getByDT('chatMembers')
        .find('ul')
        .get('span[data-test="title"], span[data-test="username"]')
        .each(($el, index, $list) => {
        if ($el.text() === title) {
          cy.wrap($el).click()
          return false
        }
      })
    }
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

  it(`user1 creats "${groupName}"" group and joins "${CHATROOM_GENERAL_NAME}" channel by default`, () => {
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

  it(`user2 joins "${groupName}" group and create a direct message channel with user1 and sends two messages`, () => {
    cy.giAcceptGroupInvite(invitationLinkAnyone, {
      username: user2,
      groupName: groupName,
      shouldLogoutAfter: false,
      bypassUI: true
    })
    me = user2
    cy.giRedirectToGroupChat()

    cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
    cy.giCheckIfJoinedChatroom(CHATROOM_GENERAL_NAME, me)

    cy.getByDT('channelsList').find('ul>li:first-child').within(() => {
      cy.get('[data-test]').should('contain', CHATROOM_GENERAL_NAME)
    })

    cy.getByDT('chatMembers').find('ul').children().should('have.length', 0)

    cy.getByDT('chatMembers').within(() => {
      cy.getByDT('inviteButton').click()
    })

    cy.getByDT('modal').within(() => {
      cy.getByDT('users-selector').should('be.focused')
      cy.getByDT('recentConversations').children().should('have.length', 0)
      cy.getByDT('others').children().should('have.length', 1)
    })
    cy.closeModal()

    createPrivateDM(user1)

    cy.getByDT('chatMembers').find('ul').children().should('have.length', 1)
    cy.getByDT('channelName').should('contain', user1)

    sendMessage('Hi! Nice to meet you.')
    sendMessage('Hope you are doing well.')

    cy.giLogout()
  })

  it(`user3 joins "${groupName}" group`, () => {
    joinUser(user3, false)
  })

  it('user1 checks direct messages from user2 and replies', () => {
    switchUser(user1)
    cy.giRedirectToGroupChat()

    // NOTE: In another device, unread mentions are not saved, so no mentions here
    // cy.getByDT('chatMembers').find('ul > li:nth-child(0)').get('.c-unreadcount-wrapper').contains('2')
    openDMByMembers([user2])

    cy.getByDT('conversationWrapper').find('.c-message').should('have.length', 2)

    sendMessage('I am fine. Thanks.')
  })

  it('user1 creates a direct message channel with user3 and sends greetings', () => {
    createPrivateDM(user3)

    cy.getByDT('chatMembers').find('ul').children().should('have.length', 2)
    cy.getByDT('channelName').should('contain', user3)

    sendMessage('Hello. How are you?')
  })

  it('user3 checks the direct messages from user1 and replies', () => {
    switchUser(user3)
    cy.giRedirectToGroupChat()

    openDMByMembers([user1])

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

    openDMByMembers([user3])

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

    openDMByMembers([user1, user4])

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
