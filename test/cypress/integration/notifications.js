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
const groupName = 'Dreamers'
const username = `user1-${Math.floor(Math.random() * 10000)}`

describe('Notifications - single group', () => {
  it('should create a group', () => {
    cy.visit('/').its('sbp').then(async sbp => {
      if (sbp('state/vuex/state').loggedIn) {
        await sbp('gi.actions/identity/logout')
      }
    })
    cy.giSignup(username, { bypassUI: true })
    cy.giCreateGroup(groupName, { bypassUI: true })
  })

  it('should not display the red badge yet', () => {
    cy.getByDT('dashboardBadge').should('not.exist')
  })

  it('should first display an empty notification list', () => {
    cy.getByDT('notificationBell').click()
    cy.getByDT('notificationCard').should('be.visible')
    cy.getByDT('notificationCard').should('contain', 'Nothing to see here... yet!')
    cy.get('.c-item-content').should('have.length', 0)
  })

  it('should increment the badge counter', () => {
    cy.window().its('sbp').then(async sbp => {
      const { currentGroupId } = sbp('state/vuex/state')
      const getters = sbp('state/vuex/getters')
      const notificationCount = fakeDB.length

      for (const [index, { type, data = {} }] of fakeDB.entries()) {
        await sbp('gi.notifications/emit', type, { ...data, groupID: currentGroupId })

        expect(getters.currentGroupUnreadNotificationCount).to.equal(index + 1)
      }
      cy.getByDT('dashboardBadge').should('have.text', notificationCount)
      cy.getByDT('alertNotification').each(elem => {
        cy.wrap(elem).should('have.text', notificationCount)
      })
    })
  })

  it('should display the correct number of notifications', () => {
    cy.get('.c-item-content').should('have.length', fakeDB.length)
  })

  it('should only display the NEW subtitle', () => {
    cy.get('.is-subtitle').should('have.length', 1)
    cy.get('.is-subtitle').should('have.text', 'NEW')
  })

  it('should display correct category titles', () => {
    cy.clock(Date.now())
    cy.visit('/')
    // Skip two hours.
    cy.tick(2 * 60 * 60 * 1e3)

    // Re-open the notification list popup.
    cy.getByDT('notificationBell').click()
    cy.getByDT('notificationCard').should('be.visible')

    // No subtitle should be displayed when all notifications are older.
    cy.get('.is-subtitle').should('have.length', 0)

    cy.window().its('sbp').then(async sbp => {
      const { currentGroupId } = sbp('state/vuex/state')

      await sbp('gi.notifications/emit', 'MEMBER_ADDED', {
        groupID: currentGroupId,
        username
      })
      cy.get('.is-subtitle').should('have.length', 2)
      cy.get('.is-subtitle').eq(0).should('have.text', 'NEW')
      cy.get('.is-subtitle').eq(1).should('have.text', 'OLDER')
    })
  })
})
