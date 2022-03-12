const fakeGroupLevelNotifications = [
  {
    type: 'MEMBER_ADDED',
    data: {
      username: 'greg'
    }
  },
  {
    type: 'MEMBER_ADDED',
    data: {
      username: 'kate'
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
    type: 'MEMBER_ADDED',
    data: {
      username: 'bot'
    }
  },
  {
    type: 'NEW_PROPOSAL',
    data: {
      creator: 'kate',
      subtype: 'REMOVE_MEMBER'
    }
  }
]

const fakeUserLevelNotifications = [
  {
    type: 'CONTRIBUTION_REMINDER',
    data: {
      monthstamp: '04'
    }
  },
  {
    type: 'INCOME_DETAILS_OLD'
  }
]

// Closes the notification list popup.
const closeNotificationCard = () => {
  // NOTE: `cy.getByDT('notificationBell').click()` didn't work because of `closeProfileCard` acting as an overlay.
  cy.getByDT('closeProfileCard').click()
  cy.getByDT('notificationCard').should('not.exist')
}
const openNotificationCard = () => {
  cy.getByDT('notificationBell').click()
  cy.getByDT('notificationCard').should('be.visible')
}

const cyGetDreamersBadge = () => cy.getByDT('groupBadge').eq(0)
const cyGetTurtlesBadge = () => cy.getByDT('groupBadge').eq(1)

// Using `cy.window().its('sbp').then(...)` in the following helper functions didn't work,
// likely because of async issues. So they need an explicit reference to `sbp`.

const emitFakeNotifications = async (fakeNotifications, sbp) => {
  const { currentGroupId } = sbp('state/vuex/state')

  // Don't use `Promise.all()` here to preserve item ordering.
  for (const { type, data = {} } of fakeNotifications) {
    await sbp('gi.notifications/emit', type, { ...data, groupID: currentGroupId })
  }
}

// Assuming the given group name exists and is unique.
// These assumptions do not hold in the general case,
// so this function is only suitable in controlled tests.
const switchGroupByName = (groupName, sbp) => {
  const getters = sbp('state/vuex/getters')
  // For some reason, `btn.click()` didn't work.
  const { contractID } = getters.groupsByName.find(g => g.groupName === groupName)
  sbp('state/vuex/commit', 'setCurrentGroupId', contractID)
  expect(getters.groupSettings.groupName).to.equal(groupName)
}

const dreamersGroupName = 'Dreamers'
const turtlesGroupName = 'Turtles'
const username = `user1-${Math.floor(Math.random() * 10000)}`

describe('Notifications - single group', () => {
  it('creates a user and a group', () => {
    cy.visit('/').its('sbp').then(async sbp => {
      if (sbp('state/vuex/state').loggedIn) {
        await sbp('gi.actions/identity/logout')
      }
    })
    cy.giSignup(username, { bypassUI: true })
    cy.giCreateGroup(dreamersGroupName, { bypassUI: true })
  })

  it('should not display the red badge yet', () => {
    cy.getByDT('dashboardBadge').should('not.exist')
  })

  it('should initially display an empty notification list with a placeholder', () => {
    openNotificationCard()
    cy.getByDT('notificationCard').should('contain', 'Nothing to see here... yet!')
    cy.get('.c-item-content').should('have.length', 0)
  })

  it('should update the badge counter upon notification', () => {
    cy.window().its('sbp').then(async sbp => {
      const getters = sbp('state/vuex/getters')
      const expectedNotificationCount = fakeGroupLevelNotifications.length

      // Add our fake group-level notifications.
      await emitFakeNotifications(fakeGroupLevelNotifications, sbp)

      expect(getters.currentGroupUnreadNotificationCount).to.equal(expectedNotificationCount)

      cy.getByDT('alertNotification').each(elem => {
        cy.wrap(elem).should('have.text', expectedNotificationCount)
      })
      cy.getByDT('dashboardBadge').should('have.text', expectedNotificationCount)

      it('should display the correct number of notifications', () => {
        cy.get('.c-item-content').should('have.length', expectedNotificationCount)
      })
    })
  })

  it('should only display the NEW subtitle', () => {
    cy.get('.is-subtitle').should('have.length', 1)
    cy.get('.is-subtitle').should('have.text', 'NEW')
  })

  it.skip('should display correct category titles', () => {
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

  after(() => {
    closeNotificationCard()
  })
})

describe('Notifications - multiple groups', () => {
  it('creates another group with two user-specific notifications', () => {
    cy.giCreateGroup(turtlesGroupName, { bypassUI: true })
    // Two group buttons and one "add group" button.
    cy.getByDT('groupsList').find('button').should('have.length', 3)

    cy.window().its('sbp').then(async sbp => {
      const getters = sbp('state/vuex/getters')

      expect(getters.currentGroupUnreadNotificationCount).to.equal(0)

      await emitFakeNotifications(fakeUserLevelNotifications, sbp)

      // However they should increase the bell icon's badge counter.
      expect(getters.currentUnreadNotificationCount).to.equal(fakeUserLevelNotifications.length)
    })
  })

  it('user-specific notifications should not affect group badges', () => {
    cy.window().its('sbp').then(sbp => {
      const getters = sbp('state/vuex/getters')

      // User-level notifications should not increase the group's notification count.
      expect(getters.currentGroupUnreadNotificationCount).to.equal(0)
      cyGetTurtlesBadge().should('not.exist')
    })
  })

  it('should update all the badges correctly', () => {
    cy.window().its('sbp').then(async sbp => {
      const getters = sbp('state/vuex/getters')
      const newFakeNotification = {
        type: 'MEMBER_REMOVED',
        data: {
          username: 'bot'
        }
      }
      await emitFakeNotifications([newFakeNotification], sbp)
      // Now the group should have one unread group-level notification.
      expect(getters.currentGroupUnreadNotificationCount).to.equal(1)
      // We previously added fake user-level items that are still unread.
      expect(getters.currentUnreadNotificationCount).to.equal(1 + fakeUserLevelNotifications.length)
      cyGetTurtlesBadge().should('have.text', 1)
    })
  })

  it('switches back to the first group', () => {
    cy.window().its('sbp').then(sbp => {
      const getters = sbp('state/vuex/getters')

      switchGroupByName(dreamersGroupName, sbp)

      expect(getters.currentGroupUnreadNotificationCount).to.equal(5)

      cyGetDreamersBadge().should('have.text', 5)
    })
  })

  it('should decrease the badge counter when marking an unread notification as read', () => {
    cy.window().its('sbp').then(async sbp => {
      // const getters = sbp('state/vuex/getters')
      const { notifications } = sbp('state/vuex/state')
      const mostRecentItem = notifications[0]

      await sbp('gi.notifications/markAsRead', mostRecentItem)
    })
  })
})
