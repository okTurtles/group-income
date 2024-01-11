import { CHATROOM_GENERAL_NAME } from '../../../frontend/model/contracts/shared/constants.js'

const groupName = 'Dreamers'
const additionalChannelName = 'Bulgaria Hackathon'
const userId = performance.now().toFixed(20).replace('.', '')
const user1 = `user1-${userId}`
const user2 = `user2-${userId}`
let invitationLinkAnyone
let me

describe('Send/edit/remove messages & add/remove emoticons inside group chat', () => {
  function switchUser (username) {
    cy.giSwitchUser(username)
    me = username
  }

  function switchChannel (channelName) {
    cy.getByDT('channelsList').within(() => {
      cy.get('ul > li').each(($el, index, $list) => {
        if ($el.text() === channelName) {
          cy.wrap($el).click()
          return false
        }
      })
    })
    cy.getByDT('channelName').should('contain', channelName)

    cy.giWaitUntilMessagesLoaded()
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

  function replyMessage (nth, message) {
    cy.getByDT('conversationWrapper').find(`.c-message:nth-child(${nth})`).within(() => {
      cy.get('.c-menu>.c-actions')
        .invoke('attr', 'style', 'display: flex')
        .invoke('show')
        .scrollIntoView()
        .should('be.visible')
      cy.get('.c-menu>.c-actions button[aria-label="Reply"]').click({ force: true })
      cy.get('.c-menu>.c-actions')
        .should('be.visible')
        .invoke('hide')
        .should('be.hidden')
    })
    cy.get('.c-tooltip.is-active').invoke('hide')

    cy.getByDT('messageInputWrapper').within(() => {
      cy.get('textarea').should('exist')
      cy.get('.c-replying-wrapper').should('exist')
    })

    sendMessage(message)
  }

  it(`user1 creates '${groupName}' group and joins "${CHATROOM_GENERAL_NAME}" channel by default and sends 15 messages`, () => {
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

    for (let i = 0; i < 15; i++) {
      sendMessage(`Text-${i + 1}`)
    }

    cy.giLogout()
  })

  it(`user2 joins ${groupName} group and sends another 15 messages and reply a message`, () => {
    cy.giAcceptGroupInvite(invitationLinkAnyone, {
      username: user2,
      existingMemberUsername: user1,
      groupName: groupName,
      shouldLogoutAfter: false,
      bypassUI: true
    })
    me = user2
    cy.giRedirectToGroupChat()

    for (let i = 15; i < 30; i++) {
      sendMessage(`Text-${i + 1}`)
    }

    replyMessage(5, 'Three') // Message with 'Text-3'

    cy.getByDT('conversationWrapper').within(() => {
      cy.contains('Three').should('be.visible')

      cy.get('.c-message').last().should('be.visible').within(() => {
        cy.get('.c-replying').should('exist').should('be.visible').click()
      })

      // HACK: scrollIntoView() should not be there
      // But cy.get('.c-replying').click() doesn't scroll to the target message
      // Because of this can not move forward to the next stages, so just used HACK
      cy.get('.c-message:nth-child(5)').should('contain', 'Text-3').scrollIntoView().should('be.visible')
      cy.get('.c-replying').should('not.be.visible')
    })
  })

  it('user2 creates a new channel and check how the scroll position is saved for each channel', () => {
    cy.giAddNewChatroom(additionalChannelName, '', false)
    cy.giCheckIfJoinedChatroom(additionalChannelName, me)

    switchChannel(CHATROOM_GENERAL_NAME)

    cy.getByDT('conversationWrapper').within(() => {
      cy.contains('Three').should('not.be.visible')
      cy.contains('Text-3').should('be.visible')
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

  it('user1 checks how infinite scrolls works', () => {
    switchUser(user1)
    cy.giRedirectToGroupChat()

    cy.getByDT('conversationWrapper').scrollTo(0)

    cy.getByDT('conversationWrapper').within(() => {
      cy.get('.c-message:nth-child(2) .c-who > span:first-child').should('contain', user1)
      cy.get('.c-message:nth-child(2) .c-notification').should('contain', `Joined ${CHATROOM_GENERAL_NAME}`)
    })

    cy.giLogout()
  })
})
