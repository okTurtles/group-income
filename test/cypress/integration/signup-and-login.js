describe('Signup, Profile and Login', () => {
  // NOTE: Create a uniqueId to avoid duplicated users during crypress tests
  // OPTIMIZE: We need to find a cleaner way to handle multiple
  // users and groups that are created during test...
  const userId = Math.floor(Math.random() * 10000)
  const username = `user1-${userId}`

  it('user1 signups and creates a group', () => {
    cy.visit('/')
    cy.giSignup(username)

    cy.giCreateGroup('Dreamers', { bypassUI: true })
    cy.getByDT('profileName').should('contain', username)
  })

  it('user1 does logout and login again', () => {
    cy.giLogout()
    cy.giLogin(username)
  })

  it('user1 changes avatar and profile settings', () => {
    const profilePicture = 'imageTest.png' // at fixtures/imageTest
    let profilePictureDataURI

    cy.getByDT('settingsBtn').click()

    cy.fixture(profilePicture, 'base64').then(fileContent => {
      profilePictureDataURI = `data:image/jpeg;base64, ${fileContent}`
      cy.getByDT('avatar').attachFile({ fileContent, fileName: profilePicture, mimeType: 'image/png' }, { subjectType: 'input' })
    })

    cy.log('Avatar editor modal shoul pop up. image is saved with no edit.')
    cy.getByDT('AvatarEditorModal').within(() => {
      cy.getByDT('modal-header-title').should('contain', 'Edit avatar')
      cy.getByDT('imageHelperTag').invoke('attr', 'src', profilePictureDataURI)
      cy.getByDT('imageCanvas').should('exist')
      cy.getByDT('saveBtn').click()
    })

    cy.getByDT('avatarMsg').should('contain', 'Avatar updated!')

    cy.getByDT('displayName').clear().type('John Bot')
    cy.getByDT('bio').clear().type('Born in a test case')

    cy.getByDT('profileEmail').should('have.value', `${username}@email.com`)
    cy.getByDT('profileEmail').clear().type(`${username}@new-email.com`)

    cy.getByDT('saveAccount').click()
    cy.getByDT('profileMsg').should('contain', 'Your changes were saved!')

    // Close Modal and verify the new profile names
    cy.get('.c-modal-close').click()

    cy.getByDT('profileDisplayName').should('contain', 'John Bot')
    cy.getByDT('profileName').should('contain', username)
    cy.giLogout()
  })

  it('sign up button remains disabled if passwords are not the same', () => {
    const user2 = `user2-${userId}`
    const password = '123456789'
    const wrongPassword = 'wRoNgPaSsWoRd123'

    cy.getByDT('signupBtn').click()

    cy.getByDT('signName').type(user2)
    cy.getByDT('signEmail').type(`${user2}@email.com`)
    cy.getByDT('password').type(password)
    cy.getByDT('passwordConfirm').type(wrongPassword)
    cy.getByDT('signSubmit').should('be.disabled')

    cy.getByDT('passwordConfirm').clear().type(password)
    cy.getByDT('signSubmit').should('not.be.disabled')

    cy.closeModal()
  })

  it('prevent incorrect logins/signup actions', () => {
    cy.log('- Connot login a non existent user')
    cy.getByDT('loginBtn').click()

    cy.getByDT('loginName').clear().type('non existent')
    cy.getByDT('badUsername').should('contain', 'A username cannot contain whitespace.')

    cy.getByDT('loginName').clear().type('nonexistent')
    cy.getByDT('password').clear().type('987654321')

    cy.getByDT('loginSubmit').click()
    cy.getByDT('loginError').should('contain', 'Incorrect username or password')

    cy.closeModal()

    cy.log('- Cannot signup existing user twice')
    cy.getByDT('signupBtn').click()

    cy.getByDT('signName').clear().type('new user')
    cy.getByDT('badUsername').should('contain', 'A username cannot contain whitespace.')

    cy.getByDT('signName').clear().type(username)
    cy.getByDT('badUsername').should('contain', 'This username is already being used.')

    cy.closeModal()

    cy.log('- Switch between login to signup modals')
    cy.getByDT('loginBtn').click()

    cy.getByDT('goToSignup').click()
    cy.getByDT('signName').should('exist')

    cy.getByDT('goToLogin').click()
    cy.getByDT('loginName').should('exist')

    cy.closeModal()
  })
})
