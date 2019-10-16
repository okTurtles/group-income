const userId = Math.floor(Math.random() * 10000)
const groupName = 'Dreamers'

function assertProposalOpenState ({ description }) {
  cy.getByDT('statusDescription')
    .should('contain', description)
  cy.getByDT('voteFor').should('exist')
  cy.getByDT('voteAgainst').should('exist')
}

function getProposalBoxes () {
  return cy.getByDT('proposalsWidget', 'ul').children()
}

describe('Proposals - Add members', () => {
  it('successfully loads the homepage', function () {
    cy.visit('/')
  })

  it('register 6 users and logout each one', () => {
    for (var i = 1; i <= 6; i++) {
      cy.giSignUp(`user${i}-${userId}`)
      cy.giLogOut()
    }
  })

  it('user1 logins back and creates a group', () => {
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

  it('user2 and user3 accept their invites', () => {
    cy.giLogin(`user2-${userId}`)
    cy.giAcceptGroupInvite(groupName)
    cy.giLogOut()

    cy.giLogin(`user3-${userId}`)
    cy.giAcceptGroupInvite(groupName)
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

    getProposalBoxes()
      // there are 2 grouped proposals
      .should('have.length', 2)
      // with a total of 3 individual proposals
      .getByDT('proposalItem').should('have.length', 3)

    // Go through each individual proposal and vote yes!
    getProposalBoxes().each(([group]) => {
      cy.get(group).find('ul > li').each(([item]) => {
        cy.get(item).within(() => {
          assertProposalOpenState({
            description: '1 out of 3 members voted.'
          })

          cy.getByDT('voteFor').click()
          cy.getByDT('statusDescription')
            .should('contain', '2 out of 3 members voted.')
          cy.getByDT('voted').should('contain', 'You voted yes.')
        })
      })
    })
  })

  it('user3 changes their "yes" vote on user5 to "no" and proposal gets refused', () => {
    getProposalBoxes().eq(1).within(() => {
      cy.getByDT('title', 'h4').should('contain', `user1-${userId} is proposing:`)
      cy.getByDT('proposalItem').eq(0).within(() => {
        cy.getByDT('typeDescription')
          .should('contain', `Add user5-${userId} to group.`)
        cy.getByDT('voted').find('button.link')
          .should('contain', 'Change vote.')
          .click()

        cy.getByDT('voteFor').should('exist')
        cy.getByDT('voteAgainst').click()

        cy.getByDT('statusDescription')
          .should('contain', 'Proposal refused.')
      })
    })

    cy.giLogOut()
  })

  it('user2 logins and votes "yes" to add user4. Proposal is accepted and invitation is created.', () => {
    cy.giLogin(`user2-${userId}`)

    getProposalBoxes().eq(0).within(() => {
      cy.getByDT('title', 'h4').as('title')
      cy.get('@title').should('contain', `user1-${userId} is proposing:`)
      cy.getByDT('proposalItem').eq(0).within(() => {
        assertProposalOpenState({
          description: '2 out of 3 members voted.'
        })

        cy.getByDT('voteFor').click()
        //  Proposal gets accepted and invitation is created!
        cy.getByDT('statusDescription')
          .should('contain', 'Proposal accepted!')
        cy.getByDT('voted').should('not.exist')
        cy.get('@title').should('contain', `user1-${userId} proposed:`)
        cy.getByDT('sendLink').should('contain', `Please send the following link to user4-${userId} so they can join the group:`)
        cy.getByDT('sendLink').get('a.link')
          .should('contain', 'http://localhost')
          .invoke('attr', 'href')
          .then(href => {
            expect(href).to.contain('http://localhost')
          })
      })
    })
  })

  it('user2 decides to cancel his proposal of adding user6', () => {
    getProposalBoxes().eq(1).within(() => {
      cy.getByDT('title', 'h4').as('title')
      cy.get('@title').should('contain', 'You are proposing:')
      cy.getByDT('proposalItem').eq(0).within(() => {
        cy.getByDT('statusDescription')
          .should('contain', '2 out of 3 members voted.')

        cy.getByDT('cancelProposal').click()
        cy.getByDT('statusDescription')
          .should('contain', 'Proposal cancelled.')
        cy.get('@title').should('contain', 'You proposed:')
      })
    })

    cy.giLogOut()
  })

  it('user1 logins and sees all 3 proposals with the correct states', () => {
    cy.giLogin(`user1-${userId}`)

    // A quick checkup that each proposal state is correct.
    // OPTIMIZE: Maybe we should adopt Visual Testing in these cases
    // https://docs.cypress.io/guides/tooling/visual-testing.html#Functional-vs-visual-testing#article
    getProposalBoxes().eq(0).within(() => {
      cy.getByDT('title', 'h4').should('contain', 'You proposed:')

      cy.getByDT('proposalItem').eq(0).within(() => {
        cy.getByDT('statusDescription')
          .should('contain', 'Proposal accepted!')
        cy.getByDT('sendLink').should('exist')
      })

      cy.getByDT('proposalItem').eq(1).within(() => {
        cy.getByDT('statusDescription')
          .should('contain', 'Proposal refused.')
      })
    })

    getProposalBoxes().eq(1).within(() => {
      cy.getByDT('title', 'h4').should('contain', `user2-${userId} proposed:`)
      cy.getByDT('proposalItem').eq(0).within(() => {
        cy.getByDT('statusDescription')
          .should('contain', 'Proposal cancelled.')
      })
    })

    cy.giLogOut()
  })
})
