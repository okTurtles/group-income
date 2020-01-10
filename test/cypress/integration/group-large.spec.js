const userId = Math.floor(Math.random() * 10000)
const groupName = 'Dreamers'

describe('Large group', () => {
  const invitationLinks = {}

  it('A group with 20 members shows correctly the pledging month overview widget', () => {
    cy.visit('/')

    cy.giSignup(`user1-${userId}`)

    cy.giCreateGroup(groupName)

    cy.giGetInvitationAnyone().then(url => {
      invitationLinks.anyone = url
    })

    cy.giLogout()

    for (let i = 2; i <= 21; i++) {
      cy.giAcceptGroupInvite(invitationLinks.anyone, {
        username: `user${i}-${userId}`,
        groupName,
        actionBeforeLogout: () => {
          if (i > 3) {
            cy.getByDT('contributionsLink').click()
          }
          cy.getByDT('openIncomeDetailModal').click()
          let salary = Math.floor(Math.random() * (600 - 20) + 20)
          let action = 'dontNeedsIncomeRadio'
          if (Math.random() < 0.5) {
            salary = Math.floor(Math.random() * (200 - 20) + 20)
            action = 'needsIncomeRadio'
          }
          cy.getByDT(action).click()
          cy.getByDT('inputIncomeOrPledge').type(salary)
          cy.getByDT('submitIncome').click()
        }
      })
    }

    cy.giLogin(`user1-${userId}`)
    cy.get('.graph-bar')
      .should('have.length', 20)
    cy.giLogout()
  })
})
