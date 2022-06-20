// ***********************************************
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

import 'cypress-file-upload'

import { CHATROOM_GENERAL_NAME } from '../../../frontend/model/contracts/shared/constants.js'

/* Get element by data-test attribute and other attributes
 ex:
 cy.getByDT('login')            //  cy.get([data-test="login"])
 cy.getByDT('login', 'button')  //  cy.get('button[data-test="login"]')
 cy.getByDT('login', '.error')  //  cy.get('.error[data-test="login"]')
*/
Cypress.Commands.add('getByDT', (element, otherSelector = '') => {
  return cy.get(`${otherSelector}[data-test="${element}"]`)
})

function checkIfJoinedGeneralChannel (groupName, username) {
  cy.getByDT('groupChatLink').click()
  cy.getByDT('channelName').should('contain', CHATROOM_GENERAL_NAME)

  cy.getByDT('messageInputWrapper').within(() => {
    cy.get('textarea').should('exist')
  })
  cy.getByDT('conversationWapper').within(() => {
    if (username) {
      cy.get('div.c-message:last-child .c-who > span:first-child').should('contain', username)
    }
    cy.get('div.c-message:last-child .c-notification').should('contain', `Joined ${CHATROOM_GENERAL_NAME}`)
  })

  cy.getByDT('channelsList').within(() => {
    cy.get('ul > li:first-child').should('contain', CHATROOM_GENERAL_NAME)
    cy.get('ul > li:first-child i').should('have.class', 'icon-hashtag')
  })

  cy.getByDT('dashboard').click()
  cy.getByDT('groupName').should('contain', groupName)
}

Cypress.Commands.add('giSignup', (username, {
  password = '123456789',
  isInvitation = false,
  groupName,
  bypassUI = false
} = {}) => {
  const email = `${username}@email.com`

  if (bypassUI) {
    // this is a hack to wait for main.js to finish loading before we begin to use sbp,
    // as main needs to finish loading contracts before we can use it
    cy.getByDT('signupBtn').should('exist')
    cy.window().its('sbp').then(async sbp => {
      await sbp('gi.actions/identity/signupAndLogin', { username, email, password })
      await sbp('controller/router').push({ path: '/' }).catch(e => {})
    })
  } else {
    if (!isInvitation) {
      cy.getByDT('signupBtn').click()
    }
    cy.getByDT('signName').clear().type(username)
    cy.getByDT('signEmail').clear().type(email)
    cy.getByDT('password').type(password)

    cy.getByDT('signSubmit').click()
    cy.getByDT('closeModal').should('not.exist')
  }

  if (isInvitation) {
    cy.getByDT('welcomeGroup').should('contain', `Welcome to ${groupName}!`)
  } else {
    cy.getByDT('welcomeHomeLoggedIn').should('contain', 'Let’s get this party started')
  }
})

Cypress.Commands.add('giLogin', (username, {
  password = '123456789',
  bypassUI
} = {}) => {
  if (bypassUI) {
    cy.window().its('sbp').then(async sbp => {
      const ourUsername = sbp('state/vuex/getters').ourUsername
      if (ourUsername === username) {
        throw Error(`You're loggedin as '${username}'. Logout first and re-run the tests.`)
      }
      await sbp('gi.actions/identity/login', { username, password })
      await sbp('controller/router').push({ path: '/' }).catch(e => {})
    })
    cy.get('nav').within(() => {
      cy.getByDT('dashboard').click()
    })
  } else {
    cy.getByDT('loginBtn').click()
    cy.getByDT('loginName').clear().type(username)
    cy.getByDT('password').clear().type(password)

    cy.getByDT('loginSubmit').click()
    cy.getByDT('closeModal').should('not.exist')
  }

  // We changed pages (to dashboard or create group)
  // so there's no login button anymore
  cy.getByDT('loginBtn').should('not.exist')

  // wait for contracts to finish syncing
  cy.getByDT('app').then(([el]) => {
    cy.get(el).should('have.attr', 'data-logged-in', 'yes')
    cy.get(el).should('have.attr', 'data-sync', '')
  })
})

Cypress.Commands.add('giLogout', ({ hasNoGroup = false } = {}) => {
  if (hasNoGroup) {
    cy.window().its('sbp').then(sbp => sbp('gi.actions/identity/logout'))
  } else {
    cy.getByDT('settingsBtn').click()
    cy.getByDT('link-logout').click()
    cy.getByDT('closeModal').should('not.exist')
  }
  cy.url().should('eq', 'http://localhost:8000/app/')
  cy.getByDT('welcomeHome').should('contain', 'Welcome to Group Income')
})

Cypress.Commands.add('giSwitchUser', (user) => {
  cy.giLogout()
  cy.giLogin(user, { bypassUI: true })
})

Cypress.Commands.add('closeModal', () => {
  cy.getByDT('closeModal').click()
  cy.getByDT('closeModal').should('not.exist')
})

Cypress.Commands.add('giSetDisplayName', (name) => {
  cy.getByDT('settingsBtn').click()
  cy.getByDT('displayName').clear().type(name)
  cy.getByDT('saveAccount').click()
  cy.getByDT('profileMsg').should('contain', 'Your changes were saved!')
  cy.closeModal()
})

Cypress.Commands.add('giCreateGroup', (name, {
  image = 'imageTest.png',
  sharedValues = 'Testing group values',
  mincome = 200,
  ruleName = 'percentage',
  ruleThreshold = 0.8,
  bypassUI = false
} = {}) => {
  if (bypassUI) {
    cy.window().its('sbp').then(async sbp => {
      await sbp('gi.actions/group/createAndSwitch', {
        data: {
          name,
          sharedValues,
          mincomeAmount: mincome,
          mincomeCurrency: 'USD',
          ruleName,
          ruleThreshold
        }
      })
      await sbp('controller/router').push({ path: '/dashboard' }).catch(e => {})
    })
    cy.url().should('eq', 'http://localhost:8000/app/dashboard')
    cy.getByDT('groupName').should('contain', name)
    cy.getByDT('app').then(([el]) => {
      cy.get(el).should('have.attr', 'data-sync', '')
    })
    return
  }

  cy.getByDT('createGroup').click()

  cy.getByDT('groupCreationModal').within(() => {
    cy.getByDT('groupName').type(name)
    cy.fixture(image, 'base64').then(fileContent => {
      cy.getByDT('groupPicture').attachFile({ fileContent, fileName: image, mimeType: 'image/png' }, { subjectType: 'input' })
    })
    cy.getByDT('nextBtn').click()

    if (sharedValues) {
      cy.get('textarea[name="sharedValues"]').type(sharedValues)
    } else {
      // Make sure this step is in the DOM...
      cy.get('textarea[name="sharedValues"]')
    }
    // ...so that it catches correctly the next "Next" button.
    cy.getByDT('nextBtn').click()

    // Make sure that attempting to submit the form without providing a mincome amount doesn't throw (see #1026).
    cy.get('input[name="mincomeAmount"]').type('{enter}')
    cy.get('input[name="mincomeAmount"]').type(mincome)
    cy.getByDT('nextBtn').click()

    cy.getByDT('rulesStep').within(() => {
      const threshold = ruleName === 'percentage' ? ruleThreshold * 100 : ruleThreshold
      cy.getByDT(ruleName, 'label').click()

      cy.get(`input[type='range']#range${ruleName}`)
        .invoke('val', threshold)
        .trigger('input')
      // Verify the input value has really changed
      cy.get(`input[type='range']#range${ruleName}`).should('have.value', threshold.toString())
    })
    cy.getByDT('finishBtn').click()

    cy.getByDT('welcomeGroup').should('contain', `Welcome to ${name}!`)
    cy.getByDT('toDashboardBtn').click()
  })
  cy.url().should('eq', 'http://localhost:8000/app/dashboard')
  cy.getByDT('app').then(([el]) => {
    cy.get(el).should('have.attr', 'data-sync', '')
  })

  checkIfJoinedGeneralChannel(name)
})

function inviteUser (invitee, index) {
  cy.getByDT('invitee').eq(index).within(() => {
    cy.get('input').clear().type(invitee)
  })
}

Cypress.Commands.add('giGetInvitationAnyone', () => {
  cy.getByDT('inviteButton').click()
  cy.getByDT('invitationLink').invoke('text').then(text => {
    const urlAt = text.indexOf('http://')
    const url = text.substr(urlAt)
    assert.isOk(url, 'invitation link is found')
    cy.closeModal()
    return cy.wrap(url)
  })
})

Cypress.Commands.add('giInviteMember', (
  invitees,
  {
    reason = 'Because they are great people!'
  } = {}
) => {
  cy.getByDT('inviteButton').click()

  invitees.forEach((invitee, index) => {
    if (index > 0) {
      cy.getByDT('addInviteeSlot').click()
    }
    inviteUser(invitee, index)
  })

  cy.getByDT('nextBtn').click()
  cy.getByDT('reason', 'textarea').clear().type(reason)
  cy.getByDT('submitBtn').click()
  cy.getByDT('finishBtn').click()
  cy.getByDT('closeModal').should('not.exist')
})

Cypress.Commands.add('giAcceptGroupInvite', (invitationLink, {
  username,
  groupName,
  isLoggedIn,
  inviteCreator,
  displayName,
  shouldLogoutAfter = true,
  actionBeforeLogout,
  bypassUI
}) => {
  if (bypassUI) {
    if (!isLoggedIn) {
      cy.giSignup(username, { bypassUI: true })
    }
    const params = new URLSearchParams(new URL(invitationLink).search)
    const groupId = params.get('groupId')
    const inviteSecret = params.get('secret')

    cy.window().its('sbp').then(async sbp => {
      await sbp('gi.actions/group/joinAndSwitch', { contractID: groupId, data: { inviteSecret } })
      await sbp('controller/router').push({ path: '/dashboard' }).catch(e => {})
    })
  } else {
    cy.visit(invitationLink)

    if (isLoggedIn) {
      cy.getByDT('welcomeGroup').should('contain', `Welcome to ${groupName}!`)
    } else {
      cy.getByDT('groupName').should('contain', groupName)
      const inviteMessage = inviteCreator
        ? `${inviteCreator} invited you to join their group!`
        : 'You were invited to join'
      cy.getByDT('invitationMessage').should('contain', inviteMessage)
      cy.giSignup(username, { isInvitation: true, groupName })
    }

    cy.getByDT('toDashboardBtn').click()
    cy.url().should('eq', 'http://localhost:8000/app/dashboard')
    cy.getByDT('app').then(([el]) => {
      if (!isLoggedIn) {
        cy.get(el).should('have.attr', 'data-logged-in', 'yes')
      }
      cy.get(el).should('have.attr', 'data-sync', '')
    })

    checkIfJoinedGeneralChannel(groupName, username)
  }

  if (displayName) {
    cy.giSetDisplayName(displayName)
  }

  if (actionBeforeLogout) {
    actionBeforeLogout()
  }

  if (shouldLogoutAfter) {
    cy.giLogout()
  }
})

Cypress.Commands.add('giAddRandomIncome', () => {
  cy.getByDT('openIncomeDetailsModal').click()
  let salary = Math.floor(Math.random() * (600 - 20) + 20)
  let action = 'doesntNeedIncomeRadio'
  // Add randomly negative or positive income
  if (Math.random() < 0.5) {
    salary = Math.floor(Math.random() * (200 - 20) + 20)
    action = 'needsIncomeRadio'
  }
  cy.getByDT(action).click()
  cy.getByDT('inputIncomeOrPledge').type(salary)
  cy.getByDT('submitIncome').click()
})

Cypress.Commands.add('giAddNewChatroom', (
  name, description = '', isPrivate = false
) => {
  // Needs to be in 'Group Chat' page
  cy.getByDT('newChannelButton').click()
  cy.getByDT('modal') // Hack for "detached DOM" heisenbug https://on.cypress.io/element-has-detached-from-dom
  cy.getByDT('modal').within(() => {
    // cy.get('.c-modal-header h1').should('contain', 'Create a channel')
    cy.getByDT('modal-header-title').should('contain', 'Create a channel')
    cy.getByDT('createChannelName').clear().type(name)
    if (description) {
      cy.getByDT('createChannelDescription').clear().type(description)
    } else {
      cy.getByDT('createChannelDescription').clear()
    }
    if (isPrivate) {
      cy.getByDT('createChannelPrivate').check()
    } else {
      cy.getByDT('createChannelPrivate').uncheck()
    }
    cy.getByDT('createChannelSubmit').click()
    cy.getByDT('closeModal').should('not.exist')
  })
  cy.getByDT('channelName').should('contain', name)
  cy.getByDT('conversationWapper').within(() => {
    cy.get('.c-greetings .is-title-4').should('contain', 'Welcome!')
    cy.get('.c-greetings p').should('contain', `This is the beginning of ${name}.`)
    cy.get('.buttons').within(() => {
      cy.getByDT('addMembers').should('exist')
      if (!description) {
        cy.getByDT('addDescription').should('exist')
      }
    })
  })
})

Cypress.Commands.add('giForceDistributionDateToNow', () => {
  cy.window().its('sbp').then(sbp => {
    return new Promise((resolve) => {
      sbp('gi.actions/group/forceDistributionDate', {
        contractID: sbp('state/vuex/state').currentGroupId,
        hooks: {
          prepublish: (message) => {
            sbp('okTurtles.events/on', message.hash(), resolve)
          }
        }
      })
    })
  })
})
