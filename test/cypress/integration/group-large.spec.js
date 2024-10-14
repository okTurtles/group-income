const userId = performance.now().toFixed(20).replace('.', '')
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

    cy.giLogout({ bypassUI: true })
  })

  it(`A group with ${groupLength} members shows correctly the pledging month overview widget`, () => {
    const indexes = Array.from({ length: groupLength - 1 }, (_, i) => i + 2)
    const usernames = indexes.map(i => `user${i}-${userId}`)
    const actionsBeforeLogout = indexes.map(i => {
      return () => {
        cy.giAddRandomIncome({ bypassUI: true })
      }
    })

    cy.giAcceptMultipleGroupInvites(invitationLinks.anyone, {
      usernames,
      actionBeforeLogout: actionsBeforeLogout,
      existingMemberUsername: `user1-${userId}`,
      groupName,
      bypassUI: true
    })

    cy.giLogin(`user1-${userId}`, { bypassUI: true })
    cy.giAddRandomIncome({ bypassUI: true })
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
    cy.giLogout({ bypassUI: true })
  })
})
