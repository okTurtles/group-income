describe('SignUp, Profile and Login', () => {
  // A new user to avoid duplicated users on DB during crypress run (in dev mode)
  const userId = new Date().getMilliseconds()
  const userName = `user1-${userId}`

  it('successfully loads homepage', () => {
    cy.visit('/')
  })

  // NOTE: What's the purpose of this test?
  // it.skip('Should start the backend server if necessary', function () {
  //   return require('../backend/index.js')
  // })~

  it('sign up new user1', () => {
    cy.giSignUp(userName)
  })

  it('user1 changes profile settings', () => {
    cy.getByDataTest('settingsBtn').click()
    cy.getByDataTest('bio').clear().type('Born in a test case')
    cy.getByDataTest('displayName').clear().type('I am a bot')

    // NOTE: This needs to work prolery first...
    // cy.getByDataTest('profilePicture').type('http://testing.rocks')

    cy.getByDataTest('profileEmail').clear().type(`${userName}@new-email.com`)

    cy.getByDataTest('saveAccount').click()
    cy.getByDataTest('profileSaveSuccess').contains('Profile saved successfully!')

    // Close Modal and verify the new displayName
    cy.get('.c-modal-close').click()
    // TODO: We should fix this, there's a miss using between displayName and profileName
    cy.getByDataTest('profileName').contains('I am a bot')
  })

  it('user1 logout and login again', () => {
    cy.giLogOut()

    cy.giLogin(userName)
  })

  it('user1 should logout one last time', () => {
    // NOTE: Logout a last time so when tests restart they start
    // from starting point. TODO - find a better way to do this
    /// https://stackoverflow.com/questions/50711829/cypress-browser-state-maintains-log-in-how-do-i-stop-this-from-occurring
    cy.giLogOut()
  })
})
