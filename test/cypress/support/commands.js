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

// NOTE: We can go a step further and not use UI to do repetitive tasks.
// https://docs.cypress.io/guides/getting-started/testing-your-app.html#Fully-test-the-login-flow-%E2%80%93-but-only-once
Cypress.Commands.add('giSignup', (userName, {
  password = '123456789',
  isInvitation = false,
  groupName,
  displayName
} = {}) => {
  if (!isInvitation) {
    cy.getByDT('signupBtn').click()
  }
  cy.getByDT('signName').clear().type(userName)
  cy.getByDT('signEmail').clear().type(`${userName}@email.com`)
  cy.getByDT('password').type(password)

  cy.getByDT('signSubmit').click()
  cy.getByDT('closeModal').should('not.exist')
  if (isInvitation) {
    cy.getByDT('welcomeGroup').should('contain', `Welcome to ${groupName}!`)
  } else {
    cy.getByDT('welcomeHomeLoggedIn').should('contain', 'Let’s get this party started')
  }
})

Cypress.Commands.add('giLogin', (userName, password = '123456789') => {
  cy.getByDT('loginBtn').click()
  cy.getByDT('loginName').clear().type(userName)
  cy.getByDT('password').clear().type(password)

  cy.getByDT('loginSubmit').click()
  cy.getByDT('closeModal').should('not.exist')

  // We changed pages (to dashboard or create group)
  // so there's no login button anymore
  cy.getByDT('loginBtn').should('not.exist')

  // make giLogin wait for contracts to finish syncing
  cy.getByDT('app').then(([el]) => {
    cy.wrap(el.getAttribute('data-logged-in')).should('eq', 'yes')
    cy.wrap(el.getAttribute('data-sync')).should('be.empty')
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
  cy.giLogin(user)
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
  values = 'Testing group values',
  income = 200
} = {}) => {
  cy.getByDT('createGroup').click()
  cy.getByDT('groupName').type(name)

  cy.fixture(image, 'base64').then(fileContent => {
    cy.get('[data-test="groupPicture"]').upload({ fileContent, fileName: image, mimeType: 'image/png' }, { subjectType: 'input' })
  })

  cy.getByDT('nextBtn').click()

  cy.get('textarea[name="sharedValues"]').type(values)
  cy.getByDT('nextBtn').click()

  cy.get('input[name="mincomeAmount"]').type(income)

  cy.getByDT('nextBtn').click()

  // TODO - It seems we are not testing the Percentages Rules ATM.
  // so, let's just move on...

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
  displayName
}) => {
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

  if (displayName) {
    cy.giSetDisplayName(displayName)
  }
  cy.giLogout()
})
