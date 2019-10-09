const userId = 'yey'
const groupName = 'Dreamers'

function assertGroupMembersCount (count) {
  // OPTIMIZE: We could also verify the username of each member...
  cy.getByDT('groupMembers').find('ul')
    .children()
    .should('have.length', count)
}

function assertProposalOpenDescription ({ description }) {
  cy.getByDT('statusDescription')
    .should('contain', description)
  cy.getByDT('voteFor').should('exist')
  cy.getByDT('voteAgainst').should('exist')
}

function getProposalsList () {
  return cy.getByDT('proposalsWidget', 'ul').children()
}

describe('Group proposals - Add members', () => {
  it('successfully loads the homepage', function () {
    cy.visit('/')
  })

  it('register 6 users and logout each one', () => {
    for (var i = 1; i <= 6; i++) {
      cy.giSignUp(`user${i}-${userId}`)
      cy.giLogOut()
    }
  })

  it('user1 logins back and creates new Group', () => {
    cy.giLogin(`user1-${userId}`)

    cy.giCreateGroup(groupName, {
      income: 400
    })
    cy.getByDT('profileName').should('contain', `user1-${userId}`)

    cy.getByDT('welcomeGroup').should('contain', `Welcome ${groupName}!`)
  })

  it('user1 invites user2 and user3 to the group', () => {
    cy.getByDT('inviteButton').click()

    cy.getByDT('searchUser').clear().type(`user2-${userId}`)
    cy.getByDT('addButton').click()

    cy.getByDT('searchUser').clear().type(`user3-${userId}`)
    cy.getByDT('addButton').click()

    cy.getByDT('submit').click()

    cy.getByDT('notifyInvitedSuccess')
      .should('contain', 'Members invited successfully!')

    cy.giLogOut()
  })

  it('user2 and user 3 accepts their invites', () => {
    cy.giLogin(`user2-${userId}`)
    cy.giAcceptGroupInvite(groupName)
    assertGroupMembersCount(2)
    cy.giLogOut()

    cy.giLogin(`user3-${userId}`)
    cy.giAcceptGroupInvite(groupName)
    assertGroupMembersCount(3)
    cy.giLogOut()
  })

  it('user1 proposes to add user4 and user5 together to the group', () => {
    cy.giLogin(`user1-${userId}`)
    cy.getByDT('inviteButton').click()

    cy.getByDT('searchUser').clear().type(`user4-${userId}`)
    cy.getByDT('addButton').click()

    cy.getByDT('searchUser').clear().type(`user5-${userId}`)
    cy.getByDT('addButton').click()

    cy.getByDT('submit').click()

    cy.getByDT('notifyInvitedSuccess')
      .should('contain', 'Members proposed successfully!')

    cy.giLogOut()
  })

  it('user2 proposes to add user6 to the group', () => {
    cy.giLogin(`user2-${userId}`)

    cy.getByDT('inviteButton').click()

    cy.getByDT('searchUser').clear().type(`user6-${userId}`)
    cy.getByDT('addButton').click()

    cy.getByDT('submit').click()

    cy.getByDT('notifyInvitedSuccess')
      .should('contain', 'Members proposed successfully!')

    cy.giLogOut()
  })

  it('user3 logins and votes "yes" to all 3 proposals', () => {
    cy.giLogin(`user3-${userId}`)

    cy.getByDT('proposalsWidget', 'ul')
      .children()
      .should('have.length', 3)

    getProposalsList().each(($el) => {
      const item = $el[0]
      cy.get(item).within(() => {
        // TODO: Assert when proposals are grouped

        assertProposalOpenDescription({
          description: '1 out of 3 members voted.'
        })
        // Vote yes!
        cy.getByDT('voteFor').click()
        cy.getByDT('statusDescription')
          .should('contain', '2 out of 3 members voted.')
        cy.getByDT('voted').should('contain', 'You voted yes.')
      })
    })
  })

  it('user3 changes their 2nd "yes" vote to "no" and proposal gets refused', () => {
    getProposalsList().eq(1).within(() => {
      cy.getByDT('voted').find('a.link')
        .should('contain', 'Change vote.')
        .click()
      cy.getByDT('voteFor').should('exist')
      cy.getByDT('voteAgainst').click()

      // The proposal was refused and that's it.
      cy.getByDT('statusDescription')
        .should('contain', 'Proposal refused.')
    })

    cy.giLogOut()
  })

  it('user2 logins and votes "yes" to add user4. Proposal is accepted and invitation is created.', () => {
    cy.giLogin(`user2-${userId}`)

    getProposalsList().eq(0).within(() => {
      cy.get('h4').should('contain', `user1-${userId} is proposing:`)
      assertProposalOpenDescription({
        description: '2 out of 3 members voted.'
      })

      // Vote yes...
      cy.getByDT('voteFor').click()

      // Proposal gets accepted and invitation is created!
      cy.get('h4').should('contain', `user1-${userId} proposed:`)
      cy.getByDT('statusDescription')
        .should('contain', 'Proposal accepted!')
      cy.getByDT('voted').should('not.exist')
      cy.getByDT('sendLink').should('contain', `Please send the following link to user4-${userId} so they can join the group:`)
      cy.getByDT('sendLink').get('a.link')
        .should('contain', 'http://localhost')
        .invoke('attr', 'href')
        .then(href => {
          expect(href).to.contain('http://localhost')
        })
    })
  })

  it('user2 decides to cancel his proposal of adding user6', () => {
    // Get last proposal
    getProposalsList().eq(2).within(() => {
      cy.get('h4').should('contain', 'You are proposing:')
      cy.getByDT('statusDescription')
        .should('contain', '2 out of 3 members voted.')
      cy.getByDT('cancelProposal').click()
      cy.getByDT('statusDescription')
        .should('contain', 'Proposal cancelled.')
      cy.get('h4').should('contain', 'You proposed:')
    })

    cy.giLogOut()
  })

  it('user1 logins and sees all 3 proposals with the correct states', () => {
    cy.giLogin(`user1-${userId}`)

    // A quick checkup that each proposal state is correct.
    // OPTIMIZE: Maybe we should adopt Visual Testing in these cases
    // https://docs.cypress.io/guides/tooling/visual-testing.html#Functional-vs-visual-testing#article
    getProposalsList().eq(0).within(() => {
      cy.get('h4').should('contain', 'You proposed:')
      cy.getByDT('statusDescription')
        .should('contain', 'Proposal accepted!')
      cy.getByDT('sendLink').should('exist')
    })

    getProposalsList().eq(1).within(() => {
      cy.get('h4').should('contain', 'You proposed:')
      cy.getByDT('statusDescription')
        .should('contain', 'Proposal refused.')
    })

    getProposalsList().eq(2).within(() => {
      cy.get('h4').should('contain', `user2-${userId} proposed:`)
      cy.getByDT('statusDescription')
        .should('contain', 'Proposal cancelled.')
    })
  })
})
