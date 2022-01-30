const userId = Math.floor(Math.random() * 10000)
const groupName = 'Dreamers'

const fakeDB = [
  {
    type: 'MEMBER_ADDED',
    data: {
      username: 'kate'
    }
  },
  {
    type: 'CONTRIBUTION_REMINDER',
    data: {
      monthstamp: '04'
    }
  },
  {
    type: 'NEW_PROPOSAL',
    data: {
      creator: 'greg',
      subtype: 'CHANGE_MINCOME',
      value: '$1000'
    }
  },
  {
    type: 'MEMBER_REMOVED',
    data: {
      username: 'bot'
    }
  },
  {
    type: 'MEMBER_ADDED',
    data: {
      username: 'bot'
    }
  },
  {
    type: 'MEMBER_ADDED',
    data: {
      username: 'greg'
    }
  },
  {
    type: 'INCOME_DETAILS_OLD'
  }
]

describe('Notifications - single group', () => {
  const invitationLinks = {}

  it('user1 creates a group', () => {
    cy.visit('/')

    cy.giSignup(`user1-${userId}`, { bypassUI: true })
    cy.giCreateGroup(groupName, { bypassUI: true })
    cy.giGetInvitationAnyone().then(url => {
      invitationLinks.anyone = url
    })
  })

  it('should not display the red badge yet', () => {
    cy.getByDT('dashboardBadge').should('not.exist')
  })

  it('should increment the badge counter', () => {
    cy.window().its('sbp').then(async sbp => {
      const { currentGroupId } = sbp('state/vuex/state')
      const getters = sbp('state/vuex/getters')

      for (const [index, { type, data = {} }] of fakeDB.entries()) {
        await sbp('gi.notifications/emit', type, { ...data, groupID: currentGroupId })

        expect(getters.currentGroupUnreadNotificationCount).to.equal(index + 1)
      }
      cy.getByDT('dashboardBadge').should('contain', String(fakeDB.length))
    })
  })
})
