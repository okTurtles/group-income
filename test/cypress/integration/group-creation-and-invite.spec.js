describe('Group Creation and Inviting Members', () => {
  const userId = new Date().getMilliseconds()
  const groupName = 'Dreamers'

  it('successfully loads the homepage', function () {
    cy.visit('/')
  })

  it('register user1 and logout', () => {
    cy.giSignUp(`user1-${userId}`)
    cy.giLogOut()
  })

  it('register user2 and logout', () => {
    cy.giSignUp(`user2-${userId}`)
    cy.giLogOut()
  })

  it('register user3 and logout', () => {
    cy.giSignUp(`user3-${userId}`)
    cy.giLogOut()
  })

  it('user1 logins back and creates new Group', () => {
    const testValues = 'Testing this software'
    const testIncome = 200
    // const testSetting = 80
    const groupImage = 'imageTest.png' // at fixtures/imageTest

    cy.giLogin(`user1-${userId}`)

    cy.getByDT('createGroup').click()
    cy.getByDT('groupName').type(groupName)

    // TODO make a custom command for this
    cy.fixture(groupImage).then((picture) =>
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

    cy.get('textarea[name="sharedValues"]').type(testValues)
    cy.getByDT('nextBtn').click()

    cy.get('input[name="incomeProvided"]').type(testIncome)

    cy.getByDT('nextBtn').click()

    // TODO - It seems we are not testing the Percentages Rules ATM.
    // so, let's just move on...

    cy.getByDT('finishBtn').click()

    cy.getByDT('welcomeGroup').should('contain', `Welcome ${groupName}!`)
  })

  it('user1 starts inviting user2 to the Group', () => {
    cy.getByDT('toDashboardBtn').click()

    cy.getByDT('inviteButton').click()

    cy.getByDT('searchUser').clear().type(`user2-${userId}`)

    cy.getByDT('addButton').click()

    cy.getByDT('member').should('lengthOf', 1)
  })

  it('user1 cancels user2 invitation', () => {
    cy.getByDT('deleteMember').click()

    cy.getByDT('member').should('not.exist')
  })

  it('user1 decides to actually invite user2 and user3 to the group', () => {
    cy.getByDT('searchUser').clear().type(`user2-${userId}`)
    cy.getByDT('addButton').click()

    cy.getByDT('searchUser').clear().type(`user3-${userId}`)
    cy.getByDT('addButton').click()

    cy.getByDT('submit').click()

    cy.getByDT('notifyInvitedSuccess')
      .should('contain', 'Members invited successfully!')

    cy.giLogOut()
  })

  it('user2 accepts the invite', () => {
    cy.giLogin(`user2-${userId}`)
    cy.giAcceptGroupInvite(groupName)
    cy.giLogOut()
  })

  it('user3 accepts the invite', () => {
    cy.giLogin(`user3-${userId}`)
    cy.giAcceptGroupInvite(groupName)
    cy.giLogOut()
  })
})
