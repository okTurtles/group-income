describe('SignUp, Profile and Login', () => {
  // NOTE: Create a uniqueId to avoid duplicated users on DB during crypress watch mode (during dev)
  const userId = new Date().getMilliseconds()
  const userName = `user1-${userId}`

  it('successfully loads homepage', () => {
    cy.visit('/')
  })

  it('sign up new user1', () => {
    cy.giSignUp(userName)
  })

  it('Create group for new user1', () => {
    const group = {
      name: 'Dreamers 2',
      image: 'imageTest.png',
      values: 'Testing group values 2',
      income: 1255
    }
    cy.giCreateGroup(group)
    cy.getByDT('profileName').should('contain', userName)
  })

  it('user1 changes profile settings', () => {
    const profilePicture = 'imageTest.png' // at fixtures/imageTest

    cy.getByDT('settingsBtn').click()
    cy.getByDT('bio').clear().type('Born in a test case')
    cy.getByDT('displayName').clear().type('I am a bot')

    // TODO make a custom command for this
    cy.fixture(profilePicture).then((picture) =>
      // converting image to blob
      Cypress.Blob.base64StringToBlob(picture, 'image/png').then((blob) => {
        const testFile = new File([blob], 'logo.png')
        // display property is none for input[type=file] so I force trigger it
        cy.get('[data-test="profilePicture"]').trigger('change', {
          force: true,
          data: testFile
        })
      })
    )

    cy.getByDT('profileEmail').clear().type(`${userName}@new-email.com`)

    cy.getByDT('saveAccount').click()
    cy.getByDT('profileSaveSuccess').should('contain', 'Profile saved successfully!')

    // Close Modal and verify the new profile names
    cy.get('.c-modal-close').click()

    cy.getByDT('profileDisplayName').should('contain', 'I am a bot')
    cy.getByDT('profileName').should('contain', userName)
  })

  it('user1 logout and login again', () => {
    cy.giLogOut()
    cy.giLogin(userName)
  })

  it('user1 logout one last time', () => {
    // NOTE: Logout a last time so when tests restart they start
    // from starting point. TODO - find a better way to do this
    /// https://stackoverflow.com/questions/50711829/cypress-browser-state-maintains-log-in-how-do-i-stop-this-from-occurring
    cy.giLogOut()
  })

  it('cannot login a non existent user', () => {
    cy.getByDT('loginBtn').click()

    cy.getByDT('loginName').clear().type('non existent')
    cy.getByDT('badUsername').should('contain', 'cannot contain spaces')

    cy.getByDT('loginName').clear().type('nonexistent')
    cy.getByDT('password').clear().type('987654321')

    cy.getByDT('loginSubmit').click()
    cy.getByDT('loginError').should('contain', 'Invalid username or password')

    cy.getByDT('closeModal').click()
  })

  it('cannot signup existing user1 twice', () => {
    cy.getByDT('signupBtn').click()

    cy.getByDT('signName').clear().type('new user')
    cy.getByDT('badUsername').should('contain', 'cannot contain spaces')

    cy.getByDT('signName').clear().type(userName)
    cy.getByDT('badUsername').should('contain', 'name is unavailable')

    // TODO: When email verification is implemented
    // cy.getByDT('signEmail').clear().type(`${userName}@email.com`)
    // cy.getByDT('badUsername').should('contain', 'email is unavailable')

    cy.getByDT('closeModal').click()
  })

  it('switch directly between login to signup modals', () => {
    cy.getByDT('loginBtn').click()

    cy.getByDT('goToSignup').click()
    cy.getByDT('signName').should('exist')

    cy.getByDT('goToLogin').click()
    cy.getByDT('loginName').should('exist')

    cy.getByDT('closeModal').click()
  })
})
