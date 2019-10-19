describe('Changing Group Settings', () => {
  const userId = Math.floor(Math.random() * 10000)
  const groupMincome = 750
  const groupNewIncome = groupMincome + 100

  it('successfully loads the homepage', function () {
    cy.visit('/')
  })

  it('user1 registers and creates a new group', () => {
    cy.giSignUp(`user1-${userId}`)

    cy.giCreateGroup('Dreamers', {
      income: groupMincome
    })
  })

  it('user1 changes the group minimum income (increase it $100)', () => {
    cy.getByDT('groupMincome').within(() => {
      cy.getByDT('minIncome').should('contain', `$${groupMincome}`)
      cy.get('button').click()
    })

    cy.getByDT('modalProposal').within(() => {
      cy.get('input[type="number"][name="mincomeAmount"]')
        .type(groupNewIncome)

      cy.getByDT('submitBtn', 'button')
        .click()
    })

    cy.getByDT('groupMincome').within(() => {
      cy.getByDT('minIncome').should('contain', `$${groupNewIncome}`)
    })

    cy.giLogOut()
  })
})
