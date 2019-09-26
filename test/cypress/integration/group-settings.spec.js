describe('Changing Group Settings', () => {
  const userId = new Date().getMilliseconds()
  const groupName = 'Dreamers'
  const groupMincome = 750
  const groupNewIncome = groupMincome + 100

  it('successfully loads the homepage', function () {
    cy.visit('/')
  })

  it('user1 registers user1 and creates new group', () => {
    const testValues = 'Testing this software'
    const groupImage = 'imageTest.png' // at fixtures/imageTest

    // NOTE: DELETE this after merging with Pieer PR,
    // it improves the group creation.
    cy.giSignUp(`user1-${userId}`)

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

    cy.get('input[name="incomeProvided"]').type(groupMincome)

    cy.getByDT('nextBtn').click()

    // TODO - It seems we are not testing the Percentages Rules ATM.
    // so, let's just move on...

    cy.getByDT('finishBtn').click()

    cy.getByDT('welcomeGroup').should('contain', `Welcome ${groupName}!`)
  })

  it('user1 changes the group minimum income (increase it $100)', () => {
    cy.getByDT('toDashboardBtn').click()

    cy.getByDT('groupMincome').within(() => {
      cy.getByDT('minIncome').should('contain', `$${groupMincome}`)
      cy.get('button').click()
    })

    cy.getByDT('modalProposal').within(() => {
      cy.get('input[type="number"][name="incomeProvided"]')
        .type(groupNewIncome)

      cy.getByDT('finishBtn', 'button')
        .click()
    })

    cy.getByDT('groupMincome').within(() => {
      cy.getByDT('minIncome').should('contain', `$${groupNewIncome}`)
    })

    cy.giLogOut()
  })
})
