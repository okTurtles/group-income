describe('SignUp, Profile and Login', () => {
  // NOTE: Create a uniqueId to avoid duplicated users during crypress tests
  // OPTIMIZE: We need to find a cleaner way to handle multiple
  // users and groups that are created during test...
  const userId = Math.floor(Math.random() * 10000)
  const username = `user1-${userId}`

  it('user1 signups and creates a group', () => {
    cy.visit('/')
    cy.giSignUp(username)
    cy.giCreateGroup('Dreamers 2')
    cy.getByDT('profileName').should('contain', username)
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

    cy.getByDT('profileEmail').clear().type(`${username}@new-email.com`)

    cy.getByDT('saveAccount').click()
    cy.getByDT('profileSaveSuccess').should('contain', 'Profile saved successfully!')

    // Close Modal and verify the new profile names
    cy.get('.c-modal-close').click()

    cy.getByDT('profileDisplayName').should('contain', 'I am a bot')
    cy.getByDT('profileName').should('contain', username)
    cy.giLogOut()
  })

  it('prevent incorrect logins/signup actions', () => {
    cy.log('- Connot login a non existent user')
    cy.getByDT('loginBtn').click()

    cy.getByDT('loginName').clear().type('non existent')
    cy.getByDT('badUsername').should('contain', 'cannot contain spaces')

    cy.getByDT('loginName').clear().type('nonexistent')
    cy.getByDT('password').clear().type('987654321')

    cy.getByDT('loginSubmit').click()
    cy.getByDT('loginError').should('contain', 'Invalid username or password')

    cy.getByDT('closeModal').click()

    cy.log('- Cannot signup existing user twice')
    cy.getByDT('signupBtn').click()

    cy.getByDT('signName').clear().type('new user')
    cy.getByDT('badUsername').should('contain', 'cannot contain spaces')

    cy.getByDT('signName').clear().type(username)
    cy.getByDT('badUsername').should('contain', 'name is unavailable')

    // TODO: When email verification is implemented
    // cy.getByDT('signEmail').clear().type(`${username}@email.com`)
    // cy.getByDT('badUsername').should('contain', 'email is unavailable')

    cy.getByDT('closeModal').click()

    cy.log('- Switch between login to signup modals')
    cy.getByDT('loginBtn').click()

    cy.getByDT('goToSignup').click()
    cy.getByDT('signName').should('exist')

    cy.getByDT('goToLogin').click()
    cy.getByDT('loginName').should('exist')

    cy.getByDT('closeModal').click()
  })
})
