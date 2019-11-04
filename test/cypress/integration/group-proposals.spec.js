const userId = 100
// const userId = Math.floor(Math.random() * 10000)
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
  it('register 6 users and logout each one', () => {
    cy.visit('/')
    for (var i = 1; i <= 6; i++) {
      cy.giSignup(`user${i}-${userId}`)
      cy.giLogout({ hasNoGroup: true })
    }
  })

  it('user1 logins back and creates a group', () => {
    cy.giLogin(`user1-${userId}`)

    cy.giCreateGroup(groupName, {
      income: 400
    })
    cy.getByDT('profileName').should('contain', `user1-${userId}`)

    // Update display name
    cy.getByDT('settingsBtn').click()
    cy.getByDT('displayName').clear().type('Margarida')
    cy.getByDT('saveAccount').click()
    cy.getByDT('profileSaveSuccess').should('contain', 'Profile saved successfully!')
    cy.get('.c-modal-close').click()
  })

  it('user1 invites user2 and user3 to the group', () => {
    cy.giInviteMember([`user2-${userId}`, `user3-${userId}`])

    cy.giLogout()
  })

  it('user2 accepts the invite', () => {
    cy.giLogin(`user2-${userId}`)
    cy.giAcceptGroupInvite(groupName)

    // Update display name
    cy.getByDT('settingsBtn').click()
    cy.getByDT('displayName').clear().type('Sandrina')
    cy.getByDT('saveAccount').click()
    cy.getByDT('profileSaveSuccess').should('contain', 'Profile saved successfully!')
    cy.get('.c-modal-close').click()
    cy.giLogout()
  })

  it('user3 accepts the invite', () => {
    cy.giLogin(`user3-${userId}`)
    cy.giAcceptGroupInvite(groupName)

    // Update display name
    cy.getByDT('settingsBtn').click()
    cy.getByDT('displayName').clear().type('Pierre')
    cy.getByDT('saveAccount').click()
    cy.getByDT('profileSaveSuccess').should('contain', 'Profile saved successfully!')
    cy.get('.c-modal-close').click()
    cy.giLogout()
  })

  it('user1 proposes to add user4 and user5 together to the group', () => {
    cy.giLogin(`user1-${userId}`)

    cy.giInviteMember([`user4-${userId}`, `user5-${userId}`], { isProposal: true })

    cy.giLogout()
  })

  it('user2 proposes to add user6 to the group', () => {
    cy.giLogin(`user2-${userId}`)

    cy.giInviteMember([`user6-${userId}`], { isProposal: true })

    cy.giLogout()
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
    getProposalBoxes().eq(0).within(() => {
      cy.getByDT('title', 'h4').should('contain', `user1-${userId} is proposing:`)
      cy.getByDT('proposalItem').eq(1).within(() => {
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

    cy.giLogout()
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

    cy.giLogout()
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
  })

  it('It should display that no one is doing any contribution', () => {
    cy.getByDT('contributionsLink').click()
    cy.getByDT('addIncomeDetailsFirstCard').should('contain', 'Add your income details')
    cy.getByDT('openIncomeDetailModal').click()
    cy.getByDT('introIncomeOrPledge').should('not.be.visible')
    cy.getByDT('needsIncomeRadio').click()
    cy.getByDT('introIncomeOrPledge').should('contain', 'How much do you want to pledge?')
    cy.getByDT('inputIncomeOrPledge').type(500)
    cy.getByDT('submitIncome').click()
    cy.get('.receiving p').should('contain', 'When other members pledge a monetary or non-monetary contribution, they will appear here.')
  })

  it('It should add income detail modal', () => {
    cy.getByDT('openIncomeDetailModal').click()
    cy.getByDT('dontNeedsIncomeRadio').click()
    cy.getByDT('introIncomeOrPledge').should('contain', 'What\'s your monthly income?')
    cy.getByDT('inputIncomeOrPledge').type(500)
    cy.getByDT('badIncome').should('contain', 'It seems your income is not lower than the group\'s mincome.')
    cy.getByDT('inputIncomeOrPledge').clear().type(100)
    cy.getByDT('badIncome').should('not.be.visible')
    cy.getByDT('submitIncome').click()
    cy.getByDT('headerNeed').should('contain', 'You need $300')
  })

  it('It should display that no one is pledging money at the moment.', () => {
    cy.get('.giving p').should('contain', 'No one needs monetary contributions at the moment.')
    cy.get('.receiving p').should('contain', 'No one is pledging money at the moment.')
  })

  it('It should add non monetary contribution', () => {
    cy.getByDT('addNonMonetaryContribution').last().click()
    cy.getByDT('inputNonMonetaryContribution').type('Portuguese classes')

    cy.getByDT('buttonAddNonMonetaryContribution').click()
    cy.getByDT('givingList')
      .get('li.is-editable')
      .should('have.length', 1)
      .should('contain', 'Portuguese classes')
  })

  it('It should remove non monetary contribution', () => {
    cy.getByDT('buttonEditNonMonetaryContribution').click()
    cy.getByDT('buttonRemoveNonMonetaryContribution').click()
    cy.getByDT('givingList')
      .get('li.is-editable')
      .should('have.length', 0)
  })

  it('It should add the same non monetary contribution', () => {
    cy.getByDT('addNonMonetaryContribution').click()
    cy.getByDT('inputNonMonetaryContribution').type('Portuguese classes')

    cy.getByDT('buttonAddNonMonetaryContribution').click()
    cy.getByDT('givingList')
      .get('li.is-editable')
      .should('have.length', 1)
      .should('contain', 'Portuguese classes')
  })

  it('It should edit the non monetary contribution', () => {
    cy.getByDT('buttonEditNonMonetaryContribution').click()
    cy.getByDT('inputNonMonetaryContribution').clear().type('French classes')
    cy.getByDT('buttonSaveNonMonetaryContribution').click()

    cy.getByDT('givingList')
      .get('li.is-editable')
      .should('have.length', 1)
      .should('contain', 'French classes')
  })

  it('It should cancel the edit', () => {
    cy.getByDT('buttonEditNonMonetaryContribution').click()
    cy.getByDT('buttonCancelNonMonetaryContribution').click()
    cy.getByDT('givingList')
      .get('li.is-editable')
      .should('have.length', 1)
      .should('contain', 'French classes')
  })

  it('It should add more non monetary contribution', () => {
    cy.getByDT('addNonMonetaryContribution').last().click()
    cy.getByDT('inputNonMonetaryContribution').type('German classes')
    cy.getByDT('buttonAddNonMonetaryContribution').click()

    cy.getByDT('addNonMonetaryContribution').last().click()
    cy.getByDT('inputNonMonetaryContribution').type('Russian classes')
    cy.getByDT('buttonAddNonMonetaryContribution').click()

    cy.getByDT('addNonMonetaryContribution').last().click()
    cy.getByDT('inputNonMonetaryContribution').type('Korean classes')
    cy.getByDT('buttonAddNonMonetaryContribution').click()

    cy.getByDT('givingList')
      .get('li.is-editable')
      .should('have.length', 4)
    cy.giLogout()
  })

  it('It should receive non monetary contribution', () => {
    cy.giLogin(`user2-${userId}`)
    cy.getByDT('contributionsLink').click()
    cy.getByDT('openIncomeDetailModal').click()
    cy.getByDT('needsIncomeRadio').click()
    cy.getByDT('inputIncomeOrPledge').clear().type(100)
    cy.getByDT('submitIncome').click()
    cy.getByDT('contributionsLink').click()

    cy.get('.receiving .c-contribution-list')
      .should('have.length', 4)

    cy.getByDT('addNonMonetaryContribution').last().click()
    cy.getByDT('inputNonMonetaryContribution').type('Korean classes')
    cy.getByDT('buttonAddNonMonetaryContribution').click()

    cy.getByDT('addNonMonetaryContribution').last().click()
    cy.getByDT('inputNonMonetaryContribution').clear().type('French classes')
    cy.getByDT('buttonAddNonMonetaryContribution').click()

    cy.get('.giving .c-contribution-list')
      .should('have.length', 3)
    cy.giLogout()
  })

  it('It should receive non monetary contribution', () => {
    cy.giLogin(`user3-${userId}`)
    cy.getByDT('contributionsLink').click()
    cy.getByDT('openIncomeDetailModal').click()
    cy.getByDT('needsIncomeRadio').click()
    cy.getByDT('inputIncomeOrPledge').clear().type(100)
    cy.getByDT('submitIncome').click()
  })

  it('It should give monetary contribution', () => {
    cy.get('.giving .c-contribution-item:first-child')
      .should('contain', '$100 to Margarida')
    cy.giLogout()
  })
})
