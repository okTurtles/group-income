describe('Signup, Profile and Login', () => {
  // NOTE: Create a uniqueId to avoid duplicated users during crypress tests
  // OPTIMIZE: We need to find a cleaner way to handle multiple
  // users and groups that are created during test...
  const userId = performance.now().toFixed(20).replace('.', '')
  const username = `user1-${userId}`
  const pwStore = {} // { username: password }

  it('user1 signups and creates a group', () => {
    cy.visit('/')
    cy.giSignup(username)
    cy.window().then(win => {
      pwStore[username] = win.sessionStorage.getItem(`cy__pw__${username}`)
    })

    cy.giCreateGroup('Dreamers', { bypassUI: true })
    cy.getByDT('profileName').should('contain', username)
  })

  it('user1 does logout and login again', () => {
    cy.giLogout()
    cy.giLogin(username, { password: pwStore[username] })
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

    cy.getByDT('displayName').type('{selectall}{del}John Bot')
    cy.getByDT('bio').type('{selectall}{del}Born in a test case')

    cy.getByDT('saveAccount').click()
    cy.getByDT('profileMsg').should('contain', 'Your changes were saved!')

    // Close Modal and verify the new profile names
    cy.get('.c-modal-close').click()

    cy.getByDT('profileDisplayName').should('contain', 'John Bot')
    cy.getByDT('profileName').should('contain', username)
    cy.giLogout({ bypassUI: true })
  })

  it('sign up button remains disabled if terms are not agreed or you have not saved the password', () => {
    const user2 = `user2-${userId}`

    cy.getByDT('signupBtn').click()

    cy.getByDT('signName').type(user2)
    // Auto-generated password should be 32 characters long.
    cy.getByDT('password').invoke('val').should('have.length', 32)
    cy.getByDT('signSubmit').should('be.disabled')

    cy.getByDT('savedPassword').check({ force: true }).should('be.checked')
    cy.getByDT('signTerms').check({ force: true }).should('be.checked')
    cy.getByDT('signSubmit').should('be.disabled')

    // 1. Clicking the copy password button is mandatory to enable the sign up button.
    cy.getByDT('copyPassword').click()
    cy.getByDT('signSubmit').should('not.be.disabled')

    // 2. If the terms and conditions checkbox is unchecked, the sign up button gets disabled.
    cy.getByDT('signTerms').uncheck({ force: true }).should('not.be.checked')
    cy.getByDT('signSubmit').should('be.disabled')

    // 3. If the saved password checkbox is unchecked, the sign up button gets disabled.
    cy.getByDT('signTerms').check({ force: true }).should('be.checked')
    cy.getByDT('savedPassword').uncheck({ force: true }).should('not.be.checked')
    cy.getByDT('signSubmit').should('be.disabled')

    // Once all conditions for 1, 2 and 3 above are met, the sign up button becomes enabled.
    cy.getByDT('savedPassword').check({ force: true }).should('be.checked')
    cy.getByDT('signSubmit').should('not.be.disabled')

    cy.closeModal()
  })

  it('prevent incorrect logins/signup actions', () => {
    cy.log('- Connot login a non existent user')
    cy.getByDT('loginBtn').click()

    cy.getByDT('loginName').type('{selectall}{del}non existent')
    cy.getByDT('badUsername').should('contain', 'A username cannot contain whitespace.')

    cy.getByDT('loginName').type('{selectall}{del}nonexistent')
    cy.getByDT('password').type('{selectall}{del}987654321')

    cy.getByDT('loginSubmit').click()
    cy.getByDT('loginError').should('contain', 'Incorrect username or password')

    cy.closeModal()

    cy.log('- Cannot signup existing user twice')
    cy.getByDT('signupBtn').click()

    cy.getByDT('signName').type('{selectall}{del}new user')
    cy.getByDT('badUsername').should('contain', 'A username cannot contain whitespace.')

    cy.getByDT('signName').type('{selectall}{del}' + username)
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

  it('change user password', () => {
    const oldPassword = pwStore[username]
    const newPassword = 'abcdefghi'

    cy.giLogin(username, { password: oldPassword })
    cy.getByDT('settingsBtn').click()
    cy.getByDT('passwordBtn').click()

    cy.getByDT('PasswordModal').within(() => {
      cy.getByDT('current').type('{selectall}{del}' + oldPassword)
      cy.getByDT('newPassword').type('{selectall}{del}' + newPassword)
      cy.getByDT('confirm').type('{selectall}{del}' + newPassword)
      cy.getByDT('submit').click()
    })
    cy.getByDT('PasswordModal').should('not.exist')
    cy.giLogout({ bypassUI: true })

    // Login using old password
    cy.getByDT('loginBtn').click()
    cy.getByDT('loginName').type('{selectall}{del}' + username)
    cy.getByDT('password').type('{selectall}{del}' + oldPassword)

    cy.getByDT('loginSubmit').click()
    cy.getByDT('loginError').should('contain', 'Incorrect username or password')
    cy.closeModal()

    // Now, log in with the correct changed password
    cy.giLogin(username, { password: newPassword })
    cy.giLogout({ bypassUI: true })
  })
})
