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

function setDisplayName (name) {
  cy.getByDT('settingsBtn').click()
  cy.getByDT('displayName').clear().type(name)
  cy.getByDT('saveAccount').click()
  cy.getByDT('profileSaveSuccess').should('contain', 'Profile saved successfully!')
  cy.closeModal()
}

function addNonMonetaryContribution (name) {
  cy.getByDT('addNonMonetaryContribution', 'button').click()
  cy.getByDT('inputNonMonetaryContribution').type(name)
  cy.getByDT('buttonAddNonMonetaryContribution', 'button').click()
}

function editNonMonetaryContribution (name, check) {
  cy.getByDT('buttonEditNonMonetaryContribution').click()
  if (check) {
    cy.getByDT('inputNonMonetaryContribution').should('have.value', name)
  } else {
    cy.getByDT('inputNonMonetaryContribution').clear().type(name)
  }
  cy.getByDT('buttonSaveNonMonetaryContribution').click()
}

function updateIncome (newIcome, needIcome) {
  cy.getByDT('contributionsLink').click()
  cy.getByDT('openIncomeDetailModal').click()
  cy.getByDT(needIcome ? 'needsIncomeRadio' : 'dontNeedsIncomeRadio').click()
  cy.getByDT('inputIncomeOrPledge').clear().type(newIcome)
  cy.getByDT('submitIncome').click()
}

describe('Proposals - Add members', () => {
  const invitationLinks = {}

  it('user1 registers, creates a group and share its invitation link', () => {
    cy.visit('/')

    cy.giSignup(`user1-${userId}`)

    cy.giCreateGroup(groupName)

    setDisplayName('Margarida')

    cy.getByDT('inviteButton').click()
    // OPTIMIZE - Find a better way to share global variables across tests (invitationLink)
    cy.getByDT('invitationLink').invoke('text').then(text => {
      const urlAt = text.indexOf('http://')
      const url = text.substr(urlAt)
      invitationLinks.anyone = url
      assert.isOk(url, 'invitation link is found')
    })

    cy.closeModal()
    cy.giLogout()
  })

  it('not registered user2 and user3 join the group through the invitation link', () => {
    cy.giAcceptGroupInvite(invitationLinks.anyone, { username: `user2-${userId}`, groupName })
    cy.giAcceptGroupInvite(invitationLinks.anyone, { username: `user3-${userId}`, groupName })
  })

  it('user1 proposes to add user4, user5 together to the group', () => {
    cy.giLogin(`user1-${userId}`)

    cy.giInviteMember([`user4-${userId}`, `user5-${userId}`])
  })

  it('user1 proposes to add user6 to the group', () => {
    cy.giInviteMember([`user6-${userId}`])
  })

  it('user2 proposes to add user7 to the group', () => {
    cy.giSwitchUser(`user2-${userId}`)

    cy.giInviteMember([`user6-${userId}`])
  })

  it('user3 votes "yes" to all 4 proposals', () => {
    cy.giSwitchUser(`user3-${userId}`)

    getProposalBoxes()
      // assert grouped proposals
      .should('have.length', 3)
      // assert total individual proposals
      .getByDT('proposalItem').should('have.length', 4)

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
  })

  it('user2 votes "yes" to add user4 and user6. Proposals are accepted and invitations created.', () => {
    cy.giSwitchUser(`user2-${userId}`)

    function voteForAndIsAccepted (index, username) {
      getProposalBoxes().eq(index).within(() => {
        cy.getByDT('title', 'h4').as('title')
        cy.get('@title').should('contain', `user1-${userId} is proposing:`)
        cy.getByDT('proposalItem').eq(0).within(() => {
          cy.getByDT('typeDescription')
            .should('contain', `Add ${username}-${userId} to group.`)
          assertProposalOpenState({
            description: '2 out of 3 members voted.'
          })
          cy.getByDT('voteFor').click()
          //  Proposal gets accepted and invitation is created!
          cy.getByDT('statusDescription')
            .should('contain', 'Proposal accepted!')
          cy.getByDT('voted').should('not.exist')
          cy.get('@title').should('contain', `user1-${userId} proposed:`)
          cy.getByDT('sendLink').should('not.exist') // Only visible to who created the proposal
        })
      })
    }

    voteForAndIsAccepted(0, 'user4')
    voteForAndIsAccepted(1, 'user6')
  })

  it('user2 decides to cancel his proposal of adding user6', () => {
    getProposalBoxes().eq(2).within(() => {
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
  })

  it('user1 see their accepted proposals to invite user4 and user6', () => {
    cy.giSwitchUser(`user1-${userId}`)

    function assertInvitationLinkFor (index, username) {
      getProposalBoxes().eq(index).within(() => {
        cy.getByDT('title', 'h4').should('contain', 'You proposed:')
        cy.getByDT('sendLink').should('contain', `Please send the following link to ${username}-${userId} so they can join the group:`)
        cy.getByDT('sendLink').get('a.link')
          .should('contain', 'http://localhost')
          .invoke('attr', 'href')
          .then(href => {
            invitationLinks[username] = href
            expect(href).to.contain('http://localhost')
          })
      })
    }

    assertInvitationLinkFor(0, 'user4')
    assertInvitationLinkFor(1, 'user6')

    cy.giLogout()
  })

  it('user4 registers and then joins the group through their unique invitation link', () => {
    cy.giSignup(`user4-${userId}`)
    cy.giAcceptGroupInvite(invitationLinks.user4, {
      isLoggedIn: true,
      groupName
    })
  })

  it('user6 registers through a unique invitation link to join a group', () => {
    cy.giAcceptGroupInvite(invitationLinks.user6, {
      groupName,
      username: `user6-${userId}`,
      inviteCreator: 'Margarida'
    })
  })

  it('an expired invitation link cannot used', () => {
    cy.visit(invitationLinks.user6) // already used on the previous test
    cy.getByDT('pageTitle')
      .invoke('text')
      .should('contain', 'Oh no! Your link has expired.')
    cy.getByDT('helperText').should('contain', 'You should ask for a new one. Sorry about that!')
    cy.get('button').click()
    cy.url().should('eq', 'http://localhost:8000/app/')
    cy.getByDT('welcomeHome').should('contain', 'Welcome to GroupIncome')
  })

  it('an invalid invitation link cannot be used', () => {
    cy.visit('http://localhost:8000/app/join?groupId=321&secret=123')
    cy.getByDT('pageTitle')
      .invoke('text')
      .should('contain', 'Oh no! Something went wrong.')
    cy.getByDT('helperText').should('contain', 'Something went wrong. Please, try again. 404: Not Found')
    cy.get('button').click()
    cy.url().should('eq', 'http://localhost:8000/app/')
    cy.getByDT('welcomeHome').should('contain', 'Welcome to GroupIncome')
  })

  it('user1 logins and sees all 4 proposals correctly and the new member', () => {
    cy.giLogin(`user1-${userId}`)

    // A quick checkup that each proposal state is correct.
    // OPTIMIZE: Maybe we should adopt Visual Testing in these cases
    // https://docs.cypress.io/guides/tooling/visual-testing.html#Functional-vs-visual-testing#article
    getProposalBoxes().eq(0).within(() => {
      cy.getByDT('title', 'h4').should('contain', 'You proposed:')

      cy.getByDT('proposalItem').eq(0).within(() => {
        cy.getByDT('statusDescription')
          .should('contain', 'Proposal accepted!')
        cy.getByDT('sendLink').should('not.exist') // Because it was already used
      })

      cy.getByDT('proposalItem').eq(1).within(() => {
        cy.getByDT('statusDescription')
          .should('contain', 'Proposal refused.')
      })
    })

    getProposalBoxes().eq(1).within(() => {
      cy.getByDT('title', 'h4').should('contain', 'You proposed:')

      cy.getByDT('proposalItem').eq(0).within(() => {
        cy.getByDT('statusDescription')
          .should('contain', 'Proposal accepted!')
        cy.getByDT('sendLink').should('not.exist')
      })
    })

    getProposalBoxes().eq(2).within(() => {
      cy.getByDT('title', 'h4').should('contain', `user2-${userId} proposed:`)
      cy.getByDT('proposalItem').eq(0).within(() => {
        cy.getByDT('statusDescription')
          .should('contain', 'Proposal cancelled.')
      })
    })

    cy.getByDT('groupMembers').find('ul')
      .children()
      .should('have.length', 5)
      .each(([member], index) => {
        cy.get(member).within(() => {
          const usersMap = [1, 2, 3, 4, 6]
          cy.getByDT('username').should('contain', `user${usersMap[index]}-${userId}`)
        })
      })
  })

  it('user clicks on contribution link and is asked to add income details', () => {
    cy.getByDT('contributionsLink').click()
    cy.getByDT('addIncomeDetailsFirstCard').should('contain', 'Add your income details')
  })

  it('user1 fills their Income Details saying they are pledging 500$', () => {
    cy.getByDT('openIncomeDetailModal').click()
    cy.getByDT('introIncomeOrPledge').should('not.be.visible') // Make sure only radio box to select the type is visible at the begining

    cy.getByDT('dontNeedsIncomeRadio').click()
    cy.getByDT('introIncomeOrPledge').should('contain', 'How much do you want to pledge?') // Make sure the user is aksed how much he want to pledge

    cy.getByDT('inputIncomeOrPledge').type(500)
    cy.getByDT('submitIncome').click()
    // After selecting the amount and close the modal make sure it show that no one is in need
    cy.getByDT('receivingParagraph').should('contain', 'When other members pledge a monetary or non-monetary contribution, they will appear here.')
    cy.getByDT('givingParagraph').should('contain', 'No one needs monetary contributions at the moment. You can still add non-monetary contributions if you would like.')
  })

  it('user1 decides to switch income details to needing $100', () => {
    cy.getByDT('openIncomeDetailModal').click()
    cy.getByDT('needsIncomeRadio').click()
    // After swithing to need income, it should ask user how much he need
    cy.getByDT('introIncomeOrPledge').should('contain', 'What\'s your monthly income?')
    cy.getByDT('inputIncomeOrPledge').type(500)
    // It should not let user ask for money if he has more than the basic income
    cy.getByDT('badIncome').should('contain', 'It seems your income is not lower than the group\'s mincome.')
    cy.getByDT('inputIncomeOrPledge').clear().type(100)
    // After updating the income under the limit it should hide the error message
    cy.getByDT('badIncome').should('not.be.visible')
    cy.getByDT('submitIncome').click()
    // After closing the modal it should dislay how much user need
    cy.getByDT('headerNeed').should('contain', 'You need $100')
    // The user should be inform that even if he can\'t pledge he can still contribute
    cy.getByDT('givingParagraph').should('contain', 'You can contribute to your group with money or other valuables like teaching skills, sharing your time ot help someone. The sky is the limit!')
  })

  it('user1 adds non monetary contribution', () => {
    addNonMonetaryContribution('Portuguese classes')

    cy.getByDT('givingList', 'ul')
      .get('li.is-editable')
      .should('have.length', 1)
      .should('contain', 'Portuguese classes')
  })

  it('user1 removes non monetary contribution', () => {
    cy.getByDT('buttonEditNonMonetaryContribution').click()
    cy.getByDT('buttonRemoveNonMonetaryContribution').click()
    cy.getByDT('givingList', 'ul')
      .get('li.is-editable')
      .should('have.length', 0)
  })

  it('user1 adds the same non monetary contribution after removing it', () => {
    addNonMonetaryContribution('Portuguese classes')
    cy.getByDT('givingList', 'ul')
      .get('li.is-editable')
      .should('have.length', 1)
      .should('contain', 'Portuguese classes')
  })

  it('user1 edits the non monetary contribution', () => {
    cy.getByDT('buttonEditNonMonetaryContribution').click()
    cy.getByDT('inputNonMonetaryContribution').clear().type('French classes{enter}')
    editNonMonetaryContribution('French classes', true)
    // Double check
    editNonMonetaryContribution('French classes', true)

    cy.getByDT('givingList', 'ul')
      .get('li.is-editable')
      .should('have.length', 1)
      .should('contain', 'French classes')
  })

  it('user1 cancels the edit', () => {
    cy.getByDT('buttonEditNonMonetaryContribution').click()
    cy.getByDT('buttonCancelNonMonetaryContribution').click()
    cy.getByDT('givingList', 'ul')
      .get('li.is-editable')
      .should('have.length', 1)
      .should('contain', 'French classes')
  })

  it('user1 adds many more non monetary contributions', () => {
    addNonMonetaryContribution('German classes')
    addNonMonetaryContribution('Russian classes')
    addNonMonetaryContribution('Korean classes')

    cy.getByDT('givingList', 'ul')
      .get('li.is-editable')
      .should('have.length', 4)
  })

  it('user2 pledges $100 and sees the non-contributions they are receiving.', () => {
    cy.giSwitchUser(`user2-${userId}`)
    updateIncome(100, false)

    cy.get('.receiving .c-contribution-item:first-child')
      .should('contain', 'French classes by Margarida')

    cy.get('.receiving .c-contribution-list')
      .should('have.length', 4)
  })

  it('user2 also gives non monetary contribution', () => {
    addNonMonetaryContribution('Korean classes')
    addNonMonetaryContribution('French classes')

    cy.get('.giving .c-contribution-list')
      .should('have.length', 3)
  })

  it('user3 pledges $100 and sees who they are pledging to - $50 to user1 (Margarida)', () => {
    cy.giSwitchUser(`user3-${userId}`)
    updateIncome(100, false)

    cy.get('.giving .c-contribution-item:first-child')
      .should('contain', '$50 to Margarida')
  })

  it('user4 and user2 change their pledges to $500 each. user1 sees the receiving contributions from 3 members.', () => {
    cy.giSwitchUser(`user4-${userId}`)
    updateIncome(500, false)
    addNonMonetaryContribution('Korean classes')

    cy.giSwitchUser(`user2-${userId}`)
    updateIncome(500, false)

    cy.giSwitchUser(`user1-${userId}`)
    cy.getByDT('contributionsLink').click()
    cy.get('.receiving .c-contribution-item:first-child')
      .should('contain', '$100 from 3 members')
  })

  it('After lower the income of user4 and user2, user3 should give to 3 persons', () => {
    cy.giSwitchUser(`user4-${userId}`)
    updateIncome(10, true)

    cy.giSwitchUser(`user2-${userId}`)
    updateIncome(10, true)

    cy.giSwitchUser(`user3-${userId}`)
    cy.getByDT('contributionsLink').click()
    cy.get('.giving .c-contribution-item:first-child')
      .should('contain', 'A total of $100 to 3 members')
  })

  it('user3 should receives the same non monetary contribution from 3 members', () => {
    cy.get('.giving .c-contribution-item:first-child')
      .should('contain', 'A total of $100 to 3 members')

    cy.giLogout()
  })
})
