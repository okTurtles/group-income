const u1Username = 'u1'
const passwordCommon = '123456789'
const g1GroupName = 'g1'
const g2GroupName = 'g2'

const fakeNotifications = [
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

// util functions
const switchGroup = (groupName, sbp) => {
  const getters = sbp('state/vuex/getters')
  const { contractID } = getters.groupsByName.find(g => g.groupName === groupName)

  sbp('state/vuex/commit', 'setCurrentGroupId', contractID)
  expect(getters.groupSettings.groupName).to.equal(groupName)
}

const emitGroupNotifications = (notifications, sbp) => {
  const { currentGroupId } = sbp('state/vuex/state')

  for (const { type, data = {} } of notifications) {
    sbp('gi.notifications/emit', type, { ...data, groupID: currentGroupId })
  }
}

const cyCheckBellsBadge = (expectedCount) => {
  if (expectedCount) {
    cy.getByDT('alertNotification').each(elem => {
      cy.wrap(elem).should('have.text', expectedCount)
    })
  } else {
    cy.getByDT('alertNotification').should('not.exist')
  }
}

describe('Prepare task-1312', () => {
  it('create a user and two groups', () => {
    // 1. make sure to log out first if signed-in.
    cy.visit('/') // yeilds the window object
      .its('sbp')
      .then(async sbp => {
        if (sbp('state/vuex/state').loggedIn) {
          await sbp('gi.actions/identity/logout')
        }
      })

    // 2. sign-up for u1
    cy.giSignup(u1Username, {
      bypassUI: true,
      password: passwordCommon
    })
    // 3. create a group named 'g1'
    cy.giCreateGroup(g1GroupName, { bypassUI: true })
    // 4. create another group named 'g2'
    cy.giCreateGroup(g2GroupName, { bypassUI: true })
  })

  it('add notifications to the group "g1"', () => {
    cy.window().its('sbp').then(sbp => {
      switchGroup(g1GroupName, sbp)

      emitGroupNotifications(fakeNotifications, sbp)
      cyCheckBellsBadge(fakeNotifications.length)
    })
  })

  it('register sbp selector to emit fake-notifications to the current group', () => {
    cy.window().its('sbp').then(sbp => {
      const emissionSelector = 'sebin/fake-notifications/emit'

      const ret = sbp('sbp/selectors/register', {
        [emissionSelector]: function () {
          const { currentGroupId } = sbp('state/vuex/state')

          for (const { type, data = {} } of fakeNotifications) {
            sbp('gi.notifications/emit', type, { ...data, groupID: currentGroupId })
          }
        }
      })

      expect(ret).to.contain(emissionSelector)
    })
  })
})
