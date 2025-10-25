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

import 'cypress-pipe'
import './commands.js'
import './output-logs.js'

before(function () {
  console.log('[cypress] `before`: cleaning up')

  if (typeof navigator === 'object' && navigator.serviceWorker) {
    cy.wrap(navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        console.log('[cypress] Service worker registrations', registrations)
        return Promise.all(registrations.map((registration) => {
          // Shut down and unregister any existing service workers
          registration.active?.postMessage({ type: 'shutdown' })
          registration.installing?.postMessage({ type: 'shutdown' })
          registration.waiting?.postMessage({ type: 'shutdown' })
          return registration.unregister()
        }))
      })
    )
  }

  cy.clearCookies()
  cy.clearLocalStorage()
  if (typeof indexedDB === 'object') {
    cy.wrap(indexedDB.databases().then((db) => {
      console.log('[cypress] Registered DBs', db)
      return Promise.all(db.map(({ name }) => indexedDB.deleteDatabase(name)))
    }
    ))
  }
  // This cy.wrap().then() line is used to ensure the log is queued and emitted
  // at the end of this function
  cy.wrap(undefined).then(() => console.log('[cypress] Finished `before`'))
})

// Abort tests on first fail
afterEach(function () {
  if (this.currentTest.state === 'failed') {
    Cypress.runner.stop()
  }
})

// Prevent errors when English is not the current OS locale language.
Cypress.on('window:before:load', window => {
  // We use defineProperty because the property may be read-only, and thus
  // setting it directly may not work
  // Also, `configurable` is set to true so that running this code multiple
  // times doesn't raise an error. Otherwise, the property is marked as
  // non-configurable and if this code runs more than once, an error with be
  // thrown.
  Object.defineProperty(window.navigator, 'language', { value: 'en-US', configurable: true })
  Object.defineProperty(window.navigator, 'languages', { value: ['en-US', 'en'], configurable: true })
  // Remove `Notification` object, since we're not currently testing push events
  // or native notifications on Cypress. Setting up a push subscription will
  // also fail on Cypress.
  delete window.Notification
})

Cypress.on('uncaught:exception', (err, runnable, promise) => {
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
