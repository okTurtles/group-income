// ***********************************************
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Get element by data-test attribute
Cypress.Commands.add('getByDT', (element) => {
  return cy.get(`[data-test="${element}"]`)
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

  // Check if user as a group
  if (cy.get('#app').find('[data-test="welcomeHomeLoggedIn"]')) {
    cy.getByDT('welcomeHomeLoggedIn').should('contain', 'Let’s get this party started')
  } else {
    // For the case if the user has displayName
    const elName = cy.getByDT('userProfile').find('[data-test="profileName"]')
      ? 'profileName'
      : 'profileDisplayName'

    cy.getByDT(elName).should('contain', userName)
  }
})

Cypress.Commands.add('giLogOut', () => {
  cy.get('#app').then(($app) => {
    if ($app.find('[data-test="logout"]').length) {
      cy.getByDT('logout').click()
    } else {
      cy.getByDT('settingsBtn').click()
      cy.getByDT('link-logout').click()
    }
    cy.getByDT('welcomeHome').should('contain', 'Welcome to GroupIncome')
  })
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

  cy.get('input[name="incomeProvided"]').type(income)

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
