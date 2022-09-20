import { CHATROOM_GENERAL_NAME } from '../../../frontend/model/contracts/shared/constants.js'

const groupName1 = 'Dreamers'
const groupName2 = 'Bulgaria Hackathon'
const userId = Math.floor(Math.random() * 10000)
const user1 = `user1-${userId}`
const user2 = `user2-${userId}`
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

    waitUntilMessageLoaded()

    cy.getByDT('conversationWrapper').within(() => {
      cy.get('.c-message:last-child .c-who > span:first-child').should('contain', inviter)
      const message = selfJoin ? `Joined ${channelName}` : `Added a member to ${channelName}: ${invitee}`
      cy.get('.c-message:last-child .c-notification').should('contain', message)
    })
  }

  function waitUntilMessageLoaded () {
    cy.getByDT('conversationWrapper').within(() => {
      cy.get('.infinite-status-prompt:first-child')
        .invoke('attr', 'style')
        .should('include', 'display: none')
    })
    cy.getByDT('conversationWrapper').find('.c-message-wrapper').its('length').should('be.gte', 1)
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

    waitUntilMessageLoaded()
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

  it(`user1 creates '${groupName1}' group and joins "${CHATROOM_GENERAL_NAME}" channel by default and sends 25 messages`, () => {
    cy.visit('/')
    cy.giSignup(user1)
    me = user1

    cy.giCreateGroup(groupName1, { bypassUI: true })
    cy.giGetInvitationAnyone().then(url => {
      invitationLinkAnyone = url
    })
    cy.giRedirectToGroupChat()
    cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)
    cy.getByDT('channelsList').within(() => {
      cy.get('ul').children().should('have.length', 1)
    })
    checkIfJoined(CHATROOM_GENERAL_NAME)

    for (let i = 0; i < 15; i++) {
      sendMessage(`Text-${i + 1}`)
    }

    cy.giLogout()
  })

  it(`user2 joins ${groupName1} group and sends another 25 messages and reply a message`, () => {
    cy.giAcceptGroupInvite(invitationLinkAnyone, {
      username: user2,
      groupName: groupName1,
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
    cy.giAddNewChatroom(groupName2, '', false)
    checkIfJoined(groupName2)

    // TODO: need to remove this cy.wait
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000)
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

    waitUntilMessageLoaded()

    cy.getByDT('conversationWrapper').scrollTo(0)

    cy.getByDT('conversationWrapper').within(() => {
      cy.get('.c-message:nth-child(2) .c-who > span:first-child').should('contain', user1)
      cy.get('.c-message:nth-child(2) .c-notification').should('contain', `Joined ${CHATROOM_GENERAL_NAME}`)
    })

    waitUntilMessageLoaded()

    cy.giLogout()
  })
})
