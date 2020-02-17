// ***********************************************
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

import 'cypress-file-upload'

/* Get element by data-test attribute and other attributes
 ex:
 cy.getByDT('login')            //  cy.get([data-test="login"])
 cy.getByDT('login', 'button')  //  cy.get('button[data-test="login"]')
 cy.getByDT('login', '.error')  //  cy.get('.error[data-test="login"]')
*/
Cypress.Commands.add('getByDT', (element, otherSelector = '') => {
  return cy.get(`${otherSelector}[data-test="${element}"]`)
})

function cyBypassUI (action, params) {
  const query = Object.keys(params).reduce((query, param) => {
    return query + `&${param}=${params[param]}`
  }, `?action=${action}`)

  cy.log(`Bypassing UI ::: ${action}`)

  // Navigate to /bypass-ui using Vue instead of cy.visit!
  // There's some issue between cypress and forageStorage (indexedDB).
  // If we go to a page using cy.visit a refresh is caused
  // (because we are changing pages the old fashion way).
  // This refresh seems to happen too soon and the indexedDB is somehow lost.
  // On page load, when we try to auto-login the user (from the indexedDB), it fails.
  // But if we navigate without refreshing the page (a.k.a using Vue),
  // the state is preserved and we don't lose any data.
  cy.getByDT('cy_bypassUI')
    .then(([$link]) => {
      $link.setAttribute('data-url', `/bypass-ui${query}`)
    }).click()
    .then(([$link]) => {
      // Reset data-url to allow manual click while debugging cypress
      $link.setAttribute('data-url', '')
    })

  cy.getByDT('actionName').should('text', action)
  cy.getByDT('feedbackMsg').should('text', `${action} succeded!`)

  cy.getByDT('finalizeBtn').click()
}

Cypress.Commands.add('giSignup', (username, {
  password = '123456789',
  isInvitation = false,
  groupName,
  bypassUI = false
} = {}) => {
  const email = `${username}@email.com`

  if (bypassUI) {
    cyBypassUI('user_signup', { username, email, password })
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
    cyBypassUI('user_login', { username, password })
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
    cy.getByDT('logout').click()
  } else {
    cy.getByDT('settingsBtn').click()
    cy.getByDT('link-logout').click()
    cy.getByDT('closeModal').should('not.exist')
  }
  cy.url().should('eq', 'http://localhost:8000/app/')
  cy.getByDT('welcomeHome').should('contain', 'Welcome to GroupIncome')
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
  bypassUI = false
} = {}) => {
  if (bypassUI) {
    cyBypassUI('group_create', {
      name,
      sharedValues,
      mincomeAmount: mincome,
      mincomeCurrency: 'USD',
      thresholdChange: 0.8,
      thresholdMemberApproval: 0.8,
      thresholdMemberRemoval: 0.8
    })

    cy.url().should('eq', 'http://localhost:8000/app/dashboard')
    cy.getByDT('groupName').should('contain', name)
    return
  }

  cy.getByDT('createGroup').click()
  cy.getByDT('groupName').type(name)

  cy.fixture(image, 'base64').then(fileContent => {
    cy.get('[data-test="groupPicture"]').upload({ fileContent, fileName: image, mimeType: 'image/png' }, { subjectType: 'input' })
  })

  cy.getByDT('nextBtn').click()

  cy.get('textarea[name="sharedValues"]').type(sharedValues)
  cy.getByDT('nextBtn').click()

  cy.get('input[name="mincomeAmount"]').type(mincome)

  cy.getByDT('nextBtn').click()

  // TODO - It seems we are not testing the Percentages Rules ATM, so, let's just move on...

  cy.getByDT('finishBtn').click()

  cy.getByDT('welcomeGroup').should('contain', `Welcome to ${name}!`)
  cy.getByDT('toDashboardBtn').click()

  cy.url().should('eq', 'http://localhost:8000/app/dashboard')
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
    cyBypassUI('group_join', { groupId, inviteSecret })
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
  }

  if (displayName) {
    cy.giSetDisplayName(displayName)
  }

  if (actionBeforeLogout) {
    actionBeforeLogout()
  }
  cy.giLogout()
})

Cypress.Commands.add('giAddRandomIncome', () => {
  cy.getByDT('openIncomeDetailsModal').click()
  let salary = Math.floor(Math.random() * (600 - 20) + 20)
  let action = 'dontNeedsIncomeRadio'
  // Add randomly negative or positive income
  if (Math.random() < 0.5) {
    salary = Math.floor(Math.random() * (200 - 20) + 20)
    action = 'needsIncomeRadio'
  }
  cy.getByDT(action).click()
  cy.getByDT('inputIncomeOrPledge').type(salary)
  cy.getByDT('submitIncome').click()
})
