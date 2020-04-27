describe('Changing Group Settings', () => {
  const userId = Math.floor(Math.random() * 10000)
  const groupName = 'Dreamers'
  const groupMincome = 750
  const groupNewMincome = groupMincome + 100
  const sharedValues = ''

  it('user1 creates a new group', () => {
    cy.visit('/')
    cy.giSignup(`user1-${userId}`, { bypassUI: true })

    cy.giCreateGroup(groupName, { mincome: groupMincome, sharedValues })
  })

  it('user1 changes the group minimum income (increase it $100)', () => {
    cy.getByDT('groupMincome').within(() => {
      cy.getByDT('minIncome').should('contain', `$${groupMincome}`)
      cy.get('button').click()
    })

    cy.getByDT('modalProposal').within(() => {
      cy.get('input[inputmode="decimal"][name="mincomeAmount"]')
        .type(groupNewMincome)

      cy.getByDT('submitBtn', 'button')
        .click()
    })

    cy.getByDT('groupMincome').within(() => {
      cy.getByDT('minIncome').should('contain', `$${groupNewMincome}`)
    })
  })

  it('user1 changes avatar and profile settings', () => {
    const groupPicture = 'imageTest.png' // at fixtures/imageTest
    const newGroupName = 'Turtles'
    const newSharedValues = 'One step at the time.'

    cy.getByDT('groupSettingsLink').click()

    cy.fixture(groupPicture, 'base64').then(fileContent => {
      cy.get('[data-test="avatar"]').upload({ fileContent, fileName: groupPicture, mimeType: 'image/png' }, { subjectType: 'input' })
    })

    cy.getByDT('avatarMsg').should('contain', 'Avatar updated!')

    cy.getByDT('groupName').should('have.value', groupName)
    cy.getByDT('groupName').clear().type(newGroupName)

    cy.getByDT('sharedValues').should('have.value', sharedValues)
    cy.getByDT('sharedValues').clear().type(newSharedValues)

    cy.getByDT('saveBtn', 'button').click()
    cy.getByDT('formMsg').should('contain', 'Your changes were saved!')

    // Go to dashboard and verify new values:
    cy.getByDT('dashboard').click()
    cy.getByDT('groupName').should('contain', newGroupName)
    cy.getByDT('sharedValues').should('contain', newSharedValues)

    cy.giLogout()
  })
})
