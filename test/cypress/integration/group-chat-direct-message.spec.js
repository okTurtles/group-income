import { CHATROOM_GENERAL_NAME } from '../../../frontend/model/contracts/shared/constants.js'

const groupName = 'Dreamers'
const userId = performance.now().toFixed(20).replace('.', '')
const user1 = `user1${userId}`
const user2 = `user2${userId}`
const user3 = `user3${userId}`
const user4 = `user4${userId}`
let invitationLinkAnyone
let me

describe('Create/Join direct messages and orders of direct message channels', () => {
  function switchUser (username, firstLoginAfterJoinGroup = false) {
    cy.giSwitchUser(username, { firstLoginAfterJoinGroup })
    me = username
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
        cy.getByDT('users-selector').type('{enter}')
      })
    } else {
      cy.getByDT('modal').within(() => {
        cy.getByDT('users-selector').type(`${partner}{enter}`)
      })
    }
    cy.getByDT('closeModal').should('not.exist')
    cy.getByDT('channelName').should('contain', `${partner}`)

    cy.giWaitUntilMessagesLoaded(false)
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
      cy.getByDT('closeModal').should('not.exist')
    } else {
      cy.getByDT('chatMembers').find('ul').get(`span[data-test="${title}"`).click()
    }
    cy.getByDT('channelName').should('contain', `${title}`)

    cy.giWaitUntilMessagesLoaded(false)
  }

  it(`user1 creates "${groupName}" group and joins "${CHATROOM_GENERAL_NAME}" channel by default`, () => {
    cy.visit('/')
    cy.giSignup(user1, { bypassUI: true })
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

  it('user2, user3, user4 join the group', () => {
    cy.giAcceptMultipleGroupInvites(invitationLinkAnyone, {
      usernames: [user2, user3, user4],
      existingMemberUsername: user1,
      groupName,
      bypassUI: true
    })
  })

  it('user2 creates a direct message channel with user1 and sends two messages', () => {
    cy.giLogin(user2, { firstLoginAfterJoinGroup: true })
    me = user2

    cy.giRedirectToGroupChat()

    cy.getByDT('chatMembers').find('ul').children().should('have.length', 0)

    cy.getByDT('chatMembers').within(() => {
      cy.getByDT('inviteButton').click()
    })

    cy.getByDT('modal').within(() => {
      cy.getByDT('users-selector').should('be.focused')
      cy.getByDT('recentConversations').children().should('have.length', 0)
      cy.getByDT('others').children().should('have.length', 2)
    })
    cy.closeModal()

    createPrivateDM(user1)

    cy.getByDT('chatMembers').find('ul').children().should('have.length', 1)
    cy.getByDT('channelName').should('contain', user1)

    cy.giSendMessage(me, 'Hi! Nice to meet you.')
    cy.giSendMessage(me, 'Hope you are doing well.')
  })

  it('user1 checks direct messages from user2 and replies', () => {
    switchUser(user1)
    cy.giRedirectToGroupChat()

    // NOTE: In another device, unread mentions are not saved, so no mentions here
    // cy.getByDT('chatMembers').find('ul > li:nth-child(0)').get('.c-unreadcount-wrapper').contains('2')
    openDMByMembers([user2])

    cy.getByDT('conversationWrapper').invoke('attr', 'data-length').should('eq', '2')

    cy.giSendMessage(me, 'I am fine. Thanks.')
  })

  it('user3 creates a direct message channel with user1 and sends greetings', () => {
    switchUser(user3, true)

    cy.giRedirectToGroupChat()
    createPrivateDM(user1)

    cy.getByDT('chatMembers').find('ul').children().should('have.length', 1)
    cy.getByDT('conversationWrapper').invoke('attr', 'data-length').should('eq', '0')

    cy.giSendMessage(me, 'Hello. How are you?')
  })

  it('user1 checks the direct messages from user3 and replies', () => {
    switchUser(user1)
    cy.giRedirectToGroupChat()

    openDMByMembers([user3])

    cy.getByDT('chatMembers').find('ul').children().should('have.length', 2)
    cy.getByDT('conversationWrapper').invoke('attr', 'data-length').should('eq', '1')
    cy.getByDT('channelName').should('contain', user3)

    cy.giSendMessage(me, 'Fine. You?')
  })

  it('direct message channels should be sorted by name and the latest message', () => {
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
  })

  it('user4 adds user1 to DM which is with user3', () => {
    const message = 'Good morning!'
    switchUser(user4, true)
    cy.giRedirectToGroupChat()

    createPrivateDM(user3)

    cy.getByDT('channelName').within(() => {
      cy.getByDT('menuTrigger').click()
    })
    cy.getByDT('addPeople').click()
    cy.getByDT('unjoinedChannelMembersList').within(() => {
      cy.getByDT('addToChannel-' + user1).click()
    })
    cy.getByDT('closeModal').should('not.exist')

    cy.getByDT('channelName').should('contain', `${user3}, ${user1}`)
    // NOTE: no notification messages in DM
    cy.getByDT('conversationWrapper').invoke('attr', 'data-length').should('eq', '0')
    cy.giSendMessage(me, message)

    cy.url().then(url => url).as('groupMessageLink')

    openDMByMembers([user3])

    // This is a fix for a heisenbug: https://github.com/okTurtles/group-income/issues/2931
    cy.wait(4 * 1000) // eslint-disable-line cypress/no-unnecessary-waiting

    cy.getByDT('channelName').within(() => {
      cy.getByDT('menuTrigger').click()
    })
    cy.getByDT('addPeople').click()
    cy.getByDT('unjoinedChannelMembersList').within(() => {
      cy.getByDT('addToChannel-' + user1).click()
    })

    cy.getByDT('channelName').should('contain', `${user3}, ${user1}`)
    cy.giWaitUntilMessagesLoaded(false)
    cy.url().then(url => {
      cy.get('@groupMessageLink').should('eq', url) // NOTE: this checks the possibility to create gm for same users
    })
    cy.getByDT('conversationWrapper').within(() => {
      cy.get('.c-message:last-child').should('contain', message)
    })
  })

  it('user3 adds user2 to the DM, so all group members are in the same DM', () => {
    switchUser(user3)
    cy.giRedirectToGroupChat()

    openDMByMembers([user4, user1])

    cy.getByDT('channelName').within(() => {
      cy.getByDT('menuTrigger').click()
    })
    cy.getByDT('addPeople').click()
    cy.getByDT('unjoinedChannelMembersList').within(() => {
      cy.getByDT('addToChannel-' + user2).click()
    })

    cy.getByDT('channelName').should('contain', `${user4}, ${user1}, ${user2}`)
    cy.giWaitUntilMessagesLoaded(false)
    // NOTE: no notification messages in DM
    cy.getByDT('conversationWrapper').invoke('attr', 'data-length').should('eq', '0')

    cy.giLogout({ bypassUI: true })
  })
})
