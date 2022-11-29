import { CHATROOM_GENERAL_NAME } from '../../../frontend/model/contracts/shared/constants.js'

const groupName = 'Dreamers'
const userId = Math.floor(Math.random() * 10000)
const user1 = `user1${userId}`
const user2 = `user2${userId}`
const user3 = `user3${userId}`
let invitationLinkAnyone
let me

describe('Create/Join/Leave direct messages and orders of direct message channels', () => {
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

  function leaveDirectMessage (partner) {
    switchDirectMessageChannel(partner)
    cy.getByDT('channelName').within(() => {
      cy.getByDT('menuTrigger').click()
    })
    cy.getByDT('leaveChannel').click()
    cy.getByDT('leaveChannelSubmit').click()
    cy.getByDT('closeModal').should('not.exist')
    cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
  }

  function joinDirectMessage (partner) {
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
    cy.getByDT('chatMembers').find('ul').children().each(($el, index, $list) => {
      if ($el.text() === partner) {
        cy.wrap($el).click()
        return false
      }
    })
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
    checkIfJoined(CHATROOM_GENERAL_NAME)

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
    checkIfJoined(CHATROOM_GENERAL_NAME)

    cy.getByDT('channelsList').find('ul>li:first-child').within(() => {
      cy.get('[data-test]').should('contain', CHATROOM_GENERAL_NAME)
    })

    cy.getByDT('chatMembers').find('ul').children().should('have.length', 0)

    cy.getByDT('chatMembers').within(() => {
      cy.getByDT('inviteButton').click()
    })

    cy.getByDT('modal').within(() => {
      cy.getByDT('search').should('be.focused')
      cy.getByDT('memberCount').should('contain', '1 members')
      cy.getByDT('recentConversations').children().should('have.length', 0)
      cy.getByDT('others').children().should('have.length', 1)
    })
    cy.getByDT('closeModal').click()

    createDirectMessage(user1)

    cy.getByDT('chatMembers').find('ul').children().should('have.length', 1)
    cy.getByDT('channelName').should('contain', user1)

    sendMessage('Hi! Nice to meet you.')
    sendMessage('Hope you are doing well.')

    cy.giLogout()
  })

  it(`user3 joins "${groupName}" group`, () => {
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

  it('user3 leaves direct messages with user1 and rejoin', () => {
    leaveDirectMessage(user1)

    cy.getByDT('chatMembers').find('ul').children().should('have.length', 0)

    joinDirectMessage(user1)

    cy.getByDT('channelName').should('contain', user1)
    cy.getByDT('conversationWrapper').find('.c-message').should('have.length', 2)
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
    cy.getByDT('closeModal').click()

    cy.giLogout()
  })
})
