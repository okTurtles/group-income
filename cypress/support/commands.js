// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

Cypress.Commands.add('giSignUp', (userName, password = '123456789') => {
  cy.getByDataTest('signupBtn').click()
  cy.getByDataTest('signName').clear().type(userName)
  cy.getByDataTest('signEmail').clear().type(`${userName}@email.com`)
  cy.getByDataTest('password').type(password)

  cy.getByDataTest('signSubmit').click()

  // cy.wait(300)

  cy.getByDataTest('profileDisplayName')
})

Cypress.Commands.add('giLogin', (userName, password = '123456789') => {
  cy.getByDataTest('loginBtn').click()
  cy.getByDataTest('loginName').clear().type(userName)
  cy.getByDataTest('password').clear().type(password)

  cy.getByDataTest('loginSubmit').click()

  // cy.wait(300)

  cy.getByDataTest('profileDisplayName').contains(userName)
})

Cypress.Commands.add('giLogOut', () => {
  cy.getByDataTest('settingsBtn').click()
  cy.getByDataTest('link-logout').click()

  // cy.wait(300)

  cy.getByDataTest('welcomeHome').contains('Welcome to GroupIncome')
})

// Get element by data-test attribute
Cypress.Commands.add('getByDataTest', (element) => {
  return cy.get(`[data-test="${element}"]`)
})
