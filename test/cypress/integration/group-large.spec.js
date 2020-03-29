const userId = Math.floor(Math.random() * 10000)
const groupName = 'Dreamers'
const groupLength = 12

describe('Large group', () => {
  const invitationLinks = {}

  it('user1 creates a group', () => {
    cy.visit('/')

    cy.giSignup(`user1-${userId}`, { bypassUI: true })

    cy.giCreateGroup(groupName, { bypassUI: true })

    cy.giGetInvitationAnyone().then(url => {
      invitationLinks.anyone = url
    })

    cy.giLogout()
  })

  it(`A group with ${groupLength} members shows correctly the pledging month overview widget`, () => {
    for (let i = 2; i <= groupLength; i++) {
      cy.giAcceptGroupInvite(invitationLinks.anyone, {
        username: `user${i}-${userId}`,
        groupName,
        bypassUI: true,
        actionBeforeLogout: () => {
          if (i > 3) {
            cy.getByDT('contributionsLink').click()
          }
          cy.giAddRandomIncome()
        }
      })
    }

    cy.giLogin(`user1-${userId}`, { bypassUI: true })
    cy.giAddRandomIncome()
    cy.get('.graph-bar')
      .should('have.length', groupLength)
  })

  it('A search for "user1" should display 4 members', () => {
    cy.getByDT('seeAllMembers').click()
    cy.getByDT('memberCount')
      .should('contain', '12 members')
    cy.getByDT('search').type('user1')
    cy.getByDT('memberSearchCount')
      .should('contain', 'Showing 4 results for "user1"')
    cy.get('.c-search-member')
      .should('have.length', 4)
    cy.closeModal()
    cy.giLogout()
  })
})
