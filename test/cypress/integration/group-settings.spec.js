describe('Changing Group Settings', () => {
  const userId = Math.floor(Math.random() * 10000)
  const groupMincome = 750
  const groupNewMincome = groupMincome + 100

  it('user1 registers and creates a new group', () => {
    cy.visit('/')
    cy.giSignup(`user1-${userId}`)

    cy.giCreateGroup('Dreamers', {
      mincome: groupMincome
    })
  })

  it('user1 changes the group minimum income (increase it $100)', () => {
    cy.getByDT('groupMincome').within(() => {
      cy.getByDT('minIncome').should('contain', `$${groupMincome}`)
      cy.get('button').click()
    })

    cy.getByDT('modalProposal').within(() => {
      cy.get('input[type="number"][name="mincomeAmount"]')
        .type(groupNewMincome)

      cy.getByDT('submitBtn', 'button')
        .click()
    })

    cy.getByDT('groupMincome').within(() => {
      cy.getByDT('minIncome').should('contain', `$${groupNewMincome}`)
    })

    cy.giLogout()
  })
})
