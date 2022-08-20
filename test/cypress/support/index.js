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

// ***********************************************
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

import 'cypress-file-upload'

import { CHATROOM_GENERAL_NAME } from '../../../frontend/model/contracts/shared/constants.js'

// util funcs
const randomFromArray = arr => arr[Math.floor(Math.random() * arr.length)] // importing giLodash.js fails for some reason.

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
  cy.giRedirectToGroupChat()
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

  if (action === 'needsIncomeRadio') {
    // it's mandatory to fill out the payment details when 'needsIncome' is selected.
    cy.randomPaymentMethodInIncomeDetails()
  }

  cy.getByDT('submitIncome').click()
})

Cypress.Commands.add('randomPaymentMethodInIncomeDetails', () => {
  const digits = () => Math.floor(Math.random() * 100000)
  const paymentMethod = randomFromArray(['paypal', 'bitcoin', 'venmo', 'other'])
  const detailMap = {
    'paypal': `abc-${digits()}@abc.com`,
    'bitcoin': `h4sh-t0-b3-s4ved-${digits()}`,
    'venmo': [digits(), digits(), digits()].join('-'),
    'other': [digits(), digits(), digits()].join('-')
  }

  cy.getByDT('paymentMethods').within(() => {
    cy.getByDT('method').last().within(() => {
      cy.get('select').select(paymentMethod)
      cy.get('input').type(detailMap[paymentMethod])
    })
  })
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

Cypress.Commands.add('giRedirectToGroupChat', () => {
  cy.getByDT('groupChatLink').click()
  cy.getByDT('conversationWapper').within(() => {
    cy.get('.infinite-status-prompt:first-child')
      .invoke('attr', 'style')
      .should('include', 'display: none')
  })
  cy.getByDT('conversationWapper').find('.c-message-wrapper').its('length').should('be.gte', 1)
})

// ***********
// Output App logs in case a test fails!
// Copied directly from: https://github.com/cypress-io/cypress/issues/3199#issuecomment-466593084
// ***********

const APPLICATION_NAME = require('../../../package.json').name
console.log('application name:', APPLICATION_NAME)

let logs = ''

Cypress.on('window:before:load', (window) => {
  // Only output app logs when running headless.
  if (!Cypress.browser.isHeadless) {
    return
  }
  // Get your apps iframe by id.
  const docIframe = window.parent.document.getElementById(`Your App: '${APPLICATION_NAME}'`)

  if (!docIframe) {
    throw new Error('Cannot find app iframe: `docIframe` is null. Make sure the given app name is correct.')
  }
  // Get the window object inside of the iframe.
  const appWindow = docIframe.contentWindow;

  // This is where I overwrite all of the console methods.
  ['log', 'info', 'error', 'warn', 'debug'].forEach((consoleProperty) => {
    appWindow.console[consoleProperty] = function (...args) {
      /*
         * The args parameter will be all of the values passed as arguments to
         * the console method. ( If your not using es6 then you can use `arguments`)
         * Example:
         *       If your app uses does `console.log('argument1', 'arument2');`
         *       Then args will be `[ 'argument1', 'arument2' ]`
         */
      // Save everything passed into a variable or any other solution
      // you make to keep track of the logs
      // Use JSON.stringify to avoid [object, object] in the output
      // logs += JSON.stringify(args.join(' ')) + '\n'
      try {
        logs += JSON.stringify([consoleProperty, ...args]) + ',\n'
      } catch (e) {
        // sometimes stringify will fail because of a circular reference
        const argsCopy = []
        for (const arg of args) {
          try {
            argsCopy.push(JSON.stringify(arg))
          } catch (e) {
            argsCopy.push('[circular reference]')
          }
        }
        logs += JSON.stringify([
          'ERROR(CYPRESS)',
          `couldn't stringify ${consoleProperty} message in app test due to ${e.name}: '${e.message}'`,
          'original message (with cycle removed):',
          ...argsCopy
        ]) + ',\n'
      }
    }
  })
})

// Cypress doesn't have a each test event
// so I'm using mochas events to clear log state after every test.
Cypress.mocha.getRunner().on('test', () => {
  // Every test reset your logs to be empty
  // This will make sure only logs from that test suite will be logged if a error happens
  logs = ''
})

// On a cypress fail. I add the console logs, from the start of test or after the last test fail to the
// current fail, to the end of the error.stack property.
Cypress.on('fail', (error) => {
  error.stack += '\nConsole Logs:\n========================\n'
  error.stack += '[' + logs + ' null]'
  // clear logs after fail so we dont see duplicate logs
  logs = ''
  // still need to throw the error so tests wont be marked as a pass
  throw error
})

before(function () {
  cy.clearCookies()
  cy.clearLocalStorage()
  indexedDB.deleteDatabase('Group Income')
})

// Abort tests on first fail
afterEach(function () {
  if (this.currentTest.state === 'failed') {
    Cypress.runner.stop()
  }
})

// Prevent errors when English is not the current OS locale language.
Cypress.on('window:before:load', window => {
  Object.defineProperty(window.navigator, 'language', { value: 'en-US' })
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
