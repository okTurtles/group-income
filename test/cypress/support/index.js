// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

import './commands.js'

// Abort all tests specs on first fail

before(function () {
  cy.getCookie('FAILED_TEST').then(cookie => {
    if (cookie && typeof cookie === 'object' && cookie.value === 'true') {
      Cypress.runner.stop()
    }
  })
})

afterEach(function () {
  if (this.currentTest.state === 'failed') {
    cy.setCookie('FAILED_TEST', 'true')
    Cypress.runner.stop()
  }
})
