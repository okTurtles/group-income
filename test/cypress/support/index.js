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

// NOTE: Create a unique Id to avoid duplicated users on DB during crypress tests
// We need to find a cleaner way to handle multiple
// users and groups that are created along the tests...
Cypress.env('sessionId', new Date().getMilliseconds())

// Abort tests on first fail
afterEach(function () {
  if (this.currentTest.state === 'failed') {
    Cypress.runner.stop()
  }
})
