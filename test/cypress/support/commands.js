// ***********************************************
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Get element by data-test attribute
Cypress.Commands.add('getByDT', (element) => {
  return cy.get(`[data-test="${element}"]`)
})

const closeModalDelay = 300

// NOTE: We can go a step further and not use UI to do repetitive tasks.
// https://docs.cypress.io/guides/getting-started/testing-your-app.html#Fully-test-the-login-flow-%E2%80%93-but-only-once
Cypress.Commands.add('giSignUp', (userName, password = '123456789') => {
  cy.wait(closeModalDelay) // TODO: Find a way to get event from sbp
  cy.getByDT('signupBtn').click()
  cy.getByDT('signName').clear().type(userName)
  cy.getByDT('signEmail').clear().type(`${userName}@email.com`)
  cy.getByDT('password').type(password)

  cy.getByDT('signSubmit').click()

  cy.getByDT('profileName').should('contain', userName)
})

Cypress.Commands.add('giLogin', (userName, password = '123456789') => {
  cy.wait(closeModalDelay) // TODO: Find a way to get event from sbp
  cy.getByDT('loginBtn').click()
  cy.getByDT('loginName').clear().type(userName)
  cy.getByDT('password').clear().type(password)

  cy.getByDT('loginSubmit').click()

  // For the case if the user has displayName
  const elName = cy.getByDT('userProfile').find('[data-test="profileName"]')
    ? 'profileName'
    : 'profileDisplayName'

  cy.getByDT(elName).should('contain', userName)
})

Cypress.Commands.add('giLogOut', () => {
  cy.getByDT('settingsBtn').click()
  cy.getByDT('link-logout').click()

  cy.getByDT('welcomeHome').should('contain', 'Welcome to GroupIncome')
})
