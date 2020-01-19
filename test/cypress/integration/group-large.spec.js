const userId = Math.floor(Math.random() * 10000)
const groupName = 'Dreamers'
const groupLength = 4

describe('Large group', () => {
  const invitationLinks = {}

  it('user1 creates a group', () => {
    cy.visit('/')

    cy.giSignup(`user1-${userId}`)

    cy.giCreateGroup(groupName)

    cy.giGetInvitationAnyone().then(url => {
      invitationLinks.anyone = url
    })

    cy.giLogout()
  })

  it(`A group with ${groupLength} members shows correctly the pledging month overview widget`, () => {
    for (let i = 2; i <= groupLength + 1; i++) {
      cy.giAcceptGroupInvite(invitationLinks.anyone, {
        username: `user${i}-${userId}`,
        groupName,
        actionBeforeLogout: () => {
          if (i > 3) {
            cy.getByDT('contributionsLink').click()
          }
          cy.giAddRandomIncome()
        }
      })
    }

    cy.giLogin(`user1-${userId}`)
    cy.giAddRandomIncome()
    cy.get('.graph-bar')
      .should('have.length', groupLength + 1)
    cy.giLogout()
  })
})
