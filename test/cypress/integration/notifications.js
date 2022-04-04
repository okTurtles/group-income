const dreamersGroupName = 'Dreamers'
const turtlesGroupName = 'Turtles'
const username = `user-${Math.floor(Math.random() * 10000)}`

/* === Fake notifications === */

const fakeNotificationsForDreamers = [
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

const otherFakeNotificationsForDreamers = [
  {
    type: 'MEMBER_REMOVED',
    data: {
      username: 'bot'
    }
  },
  {
    type: 'MEMBER_ADDED',
    data: {
      username: 'john'
    }
  }
]

const fakeNotificationsForTurtles = [
  {
    type: 'MEMBER_ADDED',
    data: {
      username: 'alice'
    }
  },
  {
    type: 'MEMBER_ADDED',
    data: {
      username: 'bob'
    }
  },
  {
    type: 'MEMBER_ADDED',
    data: {
      username: 'john'
    }
  }
]

const fakePrivateNotifications = [
  {
    type: 'CONTRIBUTION_REMINDER',
    data: {
      monthstamp: '04'
    }
  },
  {
    type: 'INCOME_DETAILS_OLD',
    data: {
      months: 6
    }
  }
]

/* === Helper functions === */

const cyCheckBellsBadge = (expectedCount) => {
  if (expectedCount) {
    cy.getByDT('alertNotification').each(elem => {
      cy.wrap(elem).should('have.text', expectedCount)
    })
  } else {
    cy.getByDT('alertNotification').should('not.exist')
  }
}

const cyCheckDashboardsBadge = (expectedCount) => {
  if (expectedCount) {
    cy.getByDT('dashboardBadge').should('have.text', expectedCount)
  } else {
    cy.getByDT('dashboardBadge').should('not.exist')
  }
}

const cyCheckDreamersBadge = (expectedCount) => {
  if (expectedCount) {
    cy.getByDT(`groupBadge-${dreamersGroupName}`).should('have.text', expectedCount)
  } else {
    cy.getByDT(`groupBadge-${dreamersGroupName}`).should('not.exist')
  }
}

const cyCheckListLength = (expectedCount) => {
  cy.get('.c-item-content').should('have.length', expectedCount)
}

const cyCheckTurtlesBadge = (expectedCount) => {
  if (expectedCount) {
    cy.getByDT(`groupBadge-${turtlesGroupName}`).should('have.text', expectedCount)
  } else {
    cy.getByDT(`groupBadge-${turtlesGroupName}`).should('not.exist')
  }
}

// Using `cy.window().its('sbp').then(...)` in the following helper functions didn't work,
// likely because of async issues. So they need an explicit reference to `sbp`.

const emitGroupNotifications = (fakeNotifications, sbp) => {
  const { currentGroupId } = sbp('state/vuex/state')

  for (const { type, data = {} } of fakeNotifications) {
    sbp('gi.notifications/emit', type, { ...data, groupID: currentGroupId })
  }
}

const emitPrivateNotifications = (fakeNotifications, sbp) => {
  for (const { type, data = {} } of fakeNotifications) {
    sbp('gi.notifications/emit', type, data)
  }
}

// NOTE: this doesn't work if the notification card is already open.
const openNotificationCard = () => {
  cy.getByDT('notificationBell').click()
  cy.getByDT('notificationCard').should('be.visible')
}

// Switches to another group, using SBP to bypass the UI.
//
// The given group name must exist and be unique.
// These assumptions might not hold in the general case,
// so do not re-use this function outside controlled tests.
const switchGroup = (groupName, sbp) => {
  const getters = sbp('state/vuex/getters')
  const { contractID } = getters.groupsByName.find(g => g.groupName === groupName)
  sbp('state/vuex/commit', 'setCurrentGroupId', contractID)
  expect(getters.groupSettings.groupName).to.equal(groupName)
}

/* === Tests === */

describe('Notifications', () => {
  it('creates a user and two groups', () => {
    cy.visit('/').its('sbp').then(async sbp => {
      if (sbp('state/vuex/state').loggedIn) {
        await sbp('gi.actions/identity/logout')
      }
    })
    cy.giSignup(username, { bypassUI: true })
    cy.giCreateGroup(dreamersGroupName, { bypassUI: true })
    cy.giCreateGroup(turtlesGroupName, { bypassUI: true })
    // The sidebar should now be visible and have two group buttons and one "+" button.
    cy.getByDT('groupsList').find('button').should('have.length', 3)
  })

  it('should not display any red badge yet', () => {
    cyCheckBellsBadge(0)
    cyCheckDashboardsBadge(0)
    cyCheckDreamersBadge(0)
    cyCheckTurtlesBadge(0)
  })

  it('should display a placeholder in the notification list', () => {
    openNotificationCard()
    cy.getByDT('notificationCard').should('contain', 'Nothing to see here... yet!')
    cyCheckListLength(0)
  })

  it('adds notifications in the first group', () => {
    cy.window().its('sbp').then(sbp => {
      switchGroup(dreamersGroupName, sbp)

      emitGroupNotifications(fakeNotificationsForDreamers, sbp)
      const expectedCount = fakeNotificationsForDreamers.length

      cyCheckBellsBadge(expectedCount)
      cyCheckDashboardsBadge(expectedCount)
      cyCheckDreamersBadge(expectedCount)
      cyCheckTurtlesBadge(0)

      cyCheckListLength(expectedCount)
    })
  })
})

describe('Notifications - second part', () => {
  it('adds user-specific notifications', () => {
    cy.window().its('sbp').then(sbp => {
      emitPrivateNotifications(fakePrivateNotifications, sbp)

      // The bell badge's counter should have increased.
      cyCheckBellsBadge(fakeNotificationsForDreamers.length + fakePrivateNotifications.length)
      // Both group badges should be unaffected.
      cyCheckDreamersBadge(fakeNotificationsForDreamers.length)
      cyCheckTurtlesBadge(0)
    })
  })

  it('switches to the other group', () => {
    cy.window().its('sbp').then(sbp => {
      switchGroup(turtlesGroupName, sbp)
      // Note that we previously added fake user-specific items that are still unread.
      cyCheckBellsBadge(fakePrivateNotifications.length)
      cyCheckTurtlesBadge(0)
    })
  })

  it('adds group notifications in Turtles', () => {
    cy.window().its('sbp').then(sbp => {
      emitGroupNotifications(fakeNotificationsForTurtles, sbp)

      // The bell badge's counter should have increased.
      cyCheckBellsBadge(fakePrivateNotifications.length + fakeNotificationsForTurtles.length)
      // The other group's counter should be unmodified.
      cyCheckDreamersBadge(fakeNotificationsForDreamers.length)
      // Now the group should have unread notifications.
      cyCheckTurtlesBadge(fakeNotificationsForTurtles.length)
    })
  })

  it('switches back to the first group', () => {
    cy.window().its('sbp').then(sbp => {
      switchGroup(dreamersGroupName, sbp)

      cyCheckBellsBadge(fakeNotificationsForDreamers.length + fakePrivateNotifications.length)
      cyCheckDreamersBadge(fakeNotificationsForDreamers.length)
      cyCheckTurtlesBadge(fakeNotificationsForTurtles.length)
    })
  })

  it('adds remaining group notifications', () => {
    cy.window().its('sbp').then(sbp => {
      emitGroupNotifications(otherFakeNotificationsForDreamers, sbp)

      cyCheckBellsBadge(
        fakeNotificationsForDreamers.length +
        otherFakeNotificationsForDreamers.length +
        fakePrivateNotifications.length
      )
      cyCheckDreamersBadge(
        fakeNotificationsForDreamers.length +
        otherFakeNotificationsForDreamers.length
      )
      cyCheckTurtlesBadge(fakeNotificationsForTurtles.length)
    })
  })
})

describe('Notifications - category subtitles', () => {
  // Skipping this part because it doesn't pass on Travis.
  it.skip('should update category titles after skipping two hours', () => {
    // All listed notifications are currently "new". Only the 'NEW' subtitle should be visible.
    cy.get('.is-subtitle').should('have.length', 1)
    cy.get('.is-subtitle').eq(0).should('have.text', 'NEW')

    // Skip two hours.
    cy.clock(Date.now())
    cy.visit('/')
    cy.tick(2 * 60 * 60 * 1e3)

    // Re-open the notification card since `cy.visit()` closed it.
    openNotificationCard()

    // All listed notifications should now be "older". No category subtitle should be visible.
    cy.get('.is-subtitle').should('not.exist')

    cy.window().its('sbp').then(sbp => {
      // Emit a new notification.
      emitPrivateNotifications([{ type: 'INCOME_DETAILS_OLD', data: { months: 3 } }], sbp)
      // Both subtitles should now be visible since "new" as well as "older" notifications are listed.
      cy.get('.is-subtitle').should('have.length', 2)
      cy.get('.is-subtitle').eq(0).should('have.text', 'NEW')
      cy.get('.is-subtitle').eq(1).should('have.text', 'OLDER')
      // Mark the new notification as unread so as not to influence next tests according to whether this test was skipped.
      const getters = sbp('state/vuex/getters')
      const [unreadNotification] = getters.currentGroupUnreadNotifications
      sbp('gi.notifications/markAsRead', unreadNotification)
    })
  })
  // From now on, the clock has been restored.
  // Do not try adding new notifications as they would already be considered two hours too old.
})

describe('Notifications - markAsUnread and markAllAsUnread', () => {
  it('should decrease the badge counter when marking an unread notification as read', () => {
    cy.window().its('sbp').then(sbp => {
      const getters = sbp('state/vuex/getters')
      const [unreadNotification] = getters.currentGroupUnreadNotifications

      sbp('gi.notifications/markAsRead', unreadNotification)

      // Both bell's counter and current group's counter should have decreased by one.
      cyCheckBellsBadge(
        fakeNotificationsForDreamers.length +
        otherFakeNotificationsForDreamers.length +
        fakePrivateNotifications.length +
        -1
      )
      cyCheckDreamersBadge(
        fakeNotificationsForDreamers.length +
        otherFakeNotificationsForDreamers.length +
        -1
      )
      // Other group's counter shouldn't have changed.
      cyCheckTurtlesBadge(fakeNotificationsForTurtles.length)
    })
  })

  it("should clear both the bell icon's badge as well as the current group avatar's badge", () => {
    cy.window().its('sbp').then(sbp => {
      sbp('gi.notifications/markAllAsRead')

      cyCheckBellsBadge(0)
      cyCheckDreamersBadge(0)
      // Other group's counter shouldn't have changed.
      cyCheckTurtlesBadge(fakeNotificationsForTurtles.length)
    })
  })

  it('switches to the second group and mark its notifications as unread', () => {
    cy.window().its('sbp').then(sbp => {
      switchGroup(turtlesGroupName, sbp)
      sbp('gi.notifications/markAllAsRead')

      cyCheckBellsBadge(0)
      cyCheckDreamersBadge(0)
      cyCheckTurtlesBadge(0)
    })
  })
})
