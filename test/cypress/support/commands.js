// ***********************************************
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

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
Cypress.Commands.add('giSignUp', (userName, password = '123456789') => {
  cy.getByDT('signupBtn').click()
  cy.getByDT('signName').clear().type(userName)
  cy.getByDT('signEmail').clear().type(`${userName}@email.com`)
  cy.getByDT('password').type(password)

  cy.getByDT('signSubmit').click()

  cy.getByDT('welcomeHomeLoggedIn').should('contain', 'Let’s get this party started')
})

Cypress.Commands.add('giLogin', (userName, password = '123456789') => {
  cy.getByDT('loginBtn').click()
  cy.getByDT('loginName').clear().type(userName)
  cy.getByDT('password').clear().type(password)

  cy.getByDT('loginSubmit').click()

  // We changed pages (to dashboard or create group)
  // so there's no login button anymore
  cy.getByDT('loginBtn').should('not.exist')
})

Cypress.Commands.add('giLogOut', () => {
  cy.getByDT('app').then(($app) => {
    if ($app.find('[data-test="userProfile"]').length) {
      cy.getByDT('settingsBtn').click()
      cy.getByDT('link-logout').click()
    } else {
      cy.getByDT('logout').click()
    }
  })
  cy.getByDT('welcomeHome').should('contain', 'Welcome to GroupIncome')
})

Cypress.Commands.add('giCreateGroup', (name, { image = 'imageTest.png', values = 'Testing group values', income = 200 } = {}) => {
  cy.getByDT('createGroup').click()
  cy.getByDT('groupName').type(name)

  // TODO make a custom command for this
  cy.fixture(image).then((picture) =>
    // converting image to blob
    Cypress.Blob.base64StringToBlob(picture, 'image/png').then((blob) => {
      const testFile = new File([blob], 'logo.png')
      // display property is none for input[type=file] so I force trigger it
      cy.get('[data-test="groupPicture"]').trigger('change', {
        force: true,
        data: testFile
      })
    })
  )

  cy.getByDT('nextBtn').click()

  cy.get('textarea[name="sharedValues"]').type(values)
  cy.getByDT('nextBtn').click()

  cy.get('input[name="mincomeAmount"]').type(income)

  cy.getByDT('nextBtn').click()

  // TODO - It seems we are not testing the Percentages Rules ATM.
  // so, let's just move on...

  cy.getByDT('finishBtn').click()

  cy.getByDT('toDashboardBtn').click()
})

Cypress.Commands.add('giAcceptGroupInvite', (groupName) => {
  cy.getByDT('mailboxLink').click()
  cy.getByDT('inboxMessage').click()

  cy.getByDT('message').invoke('text').then(text => {
    const urlAt = text.indexOf('http://')
    const url = text.substr(urlAt)

    assert.isOk(url, 'url is found')

    cy.visit(url)
    cy.getByDT('acceptLink').click()
    cy.getByDT('groupName').should('contain', groupName)
  })
})
