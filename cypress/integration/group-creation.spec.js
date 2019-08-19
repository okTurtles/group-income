describe('Group Creation and Inviting Members', () => {
  const userId = new Date().getMilliseconds()

  it('successfully loads the homepage', function () {
    cy.visit('/')
  })

  it('register user1 and logout', () => {
    cy.giSignUp(`user1-${userId}`)
    cy.giLogOut()
  })

  it('register user2', () => {
    cy.giSignUp(`user2-${userId}`)
  })

  it('user2 create new Group', () => {
    const testName = 'Test Group'
    const testValues = 'Testing this software'
    const testIncome = 200
    // const testSetting = 80
    const groupImage = 'imageTest.png' // at fixtures/imageTest

    cy.getByDataTest('createGroup').click()
    cy.getByDataTest('groupName').type(testName)

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

    cy.getByDataTest('nextBtn').click()

    cy.get('textarea[name="sharedValues"]').type(testValues)
    cy.getByDataTest('nextBtn').click()

    cy.get('input[name="incomeProvided"]').type(testIncome)

    cy.getByDataTest('nextBtn').click()

    // TODO - It seems we are not testing the Percentages Rules ATM.
    // so, let's just move on...

    cy.getByDataTest('finishBtn').click()

    cy.getByDataTest('welcomeGroup').contains(`Welcome ${testName}!`)

    cy.getByDataTest('toDashboardBtn').click()
  })

  it('user2 starts inviting user1 to the Group', () => {
    cy.getByDataTest('inviteButton').click()

    cy.getByDataTest('searchUser').clear().type(`user1-${userId}`)

    cy.getByDataTest('addButton').click()

    cy.getByDataTest('member').its('length').should('be', 1)
  })

  it('user2 cancels user1 invitation', () => {
    cy.getByDataTest('deleteMember').click()

    cy.getByDataTest('member').should('not.exist')
  })

  it('user2 decides to actually invite user1', () => {
    cy.getByDataTest('searchUser').clear().type(`user1-${userId}`)

    cy.getByDataTest('addButton').click()

    cy.getByDataTest('submit').click()

    cy.getByDataTest('notifyInvitedSuccess')
      .should('contain', 'Members invited successfully!')
  })

  it('user2 logs out', () => {
    cy.giLogOut()
  })
})
