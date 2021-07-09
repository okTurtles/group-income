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
import './output-logs.js'

// Abort tests on first fail
afterEach(function () {
  if (this.currentTest.state === 'failed') {
    Cypress.runner.stop()
  }
})

Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test.
  if (err.name === 'NavigationDuplicated' || err.message.includes('navigation')) {
    return false
  }
})

/* Some Notes / Best Practices about writing Cypress tests:
- After performing an action that changes the view, look for ways to assert it
  before looking for the new element that migh not exist yet.
  For ex:, check the new URL. A common action at GI is to close the modal.
  Use cy.closeModal() - it closes and waits for the modal to be closed
  (URL changed) before moving on...
- ...
*/
