const userId = Math.floor(Math.random() * 10000)
const groupName = 'Dreamers'
const groupMincome = 250
const groupNewMincome = 500

function assertProposalOpenState ({ description }) {
  cy.getByDT('statusDescription')
    .should('contain', description)
  cy.getByDT('voteFor').should('exist')
  cy.getByDT('voteAgainst').should('exist')
}

function assertMincome (mincome) {
  cy.getByDT('groupMincome').within(() => {
    cy.getByDT('minIncome').should('contain', `$${mincome}`)
  })
}

function getProposalBoxes () {
  return cy.getByDT('proposalsWidget', 'ul').children()
}

function tryUnsuccessfullyToProposeNewSimilarMincome () {
  cy.log('try Unsuccessfully To Propose New Similar Mincome')
  // Verify an identical open proposal cannot be created twice.
  cy.getByDT('groupMincome').within(() => {
    cy.get('button').click()
  })

  cy.getByDT('modalProposal').within(() => {
    cy.get('input[type="number"][name="mincomeAmount"]')
      .type(groupNewMincome)
    cy.getByDT('nextBtn', 'button')
      .click()
    cy.getByDT('submitBtn').click()
    cy.getByDT('proposalError').contains('Failed to change mincome. There is an identical open proposal.')
    cy.getByDT('closeModal').click()
    cy.getByDT('closeModal').should('not.exist')
  })
}

describe('Proposals - Add members', () => {
  const invitationLinks = {}

  it('user1 registers, creates a group and share its invitation link', () => {
    cy.visit('/')

    cy.giSignup(`user1-${userId}`, { bypassUI: true })

    cy.giCreateGroup(groupName, { mincome: groupMincome, bypassUI: true })

    cy.giGetInvitationAnyone().then(url => {
      invitationLinks.anyone = url
    })

    cy.giLogout()
  })

  it('not registered user2 and user3 join the group through the invitation link', () => {
    cy.giAcceptGroupInvite(invitationLinks.anyone, { username: `user2-${userId}`, groupName })
    cy.giAcceptGroupInvite(invitationLinks.anyone, { username: `user3-${userId}`, groupName })
  })

  it('user1 proposes to add user4, user5 together to the group', () => {
    cy.giLogin(`user1-${userId}`, { bypassUI: true })

    cy.giInviteMember([`user4-${userId}`, `user5-${userId}`])
  })

  it('user1 proposes to add user6 to the group', () => {
    cy.giInviteMember([`user6-${userId}`])
  })

  it('user2 proposes to add user7 to the group', () => {
    cy.giSwitchUser(`user2-${userId}`)

    cy.giInviteMember([`user7-${userId}`])
  })

  it('user2 proposes to change mincome to $500', () => {
    cy.getByDT('groupMincome').within(() => {
      cy.get('button').click()
    })

    cy.getByDT('modalProposal').within(() => {
      cy.get('input[type="number"][name="mincomeAmount"]')
        .type(groupNewMincome)
      cy.getByDT('nextBtn', 'button')
        .click()
      cy.getByDT('reason', 'textarea').clear().type('House renting is increasing.')
      cy.getByDT('submitBtn').click()
      cy.getByDT('finishBtn').click()
      cy.getByDT('closeModal').should('not.exist')
    })

    tryUnsuccessfullyToProposeNewSimilarMincome()
  })

  it('user3 votes "yes" to all 5 proposals', () => {
    cy.giSwitchUser(`user3-${userId}`)

    getProposalBoxes()
      // assert grouped proposals
      .should('have.length', 4)
      // assert total individual proposals
      .getByDT('proposalItem').should('have.length', 5)

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

      cy.log(`${username} is part of members list as "pending"`)

      cy.getByDT('groupMembers').find(`ul>li:nth-child(${index + 1})`).within(() => {
        cy.getByDT('username').should('contain', `${username}-${userId}`)
        cy.getByDT('pillPending').should('contain', 'pending')
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
        cy.getByDT('sendLink').within(() => {
          cy.getByDT('invitationLink').get('.link').should('contain', 'http://localhost')
          cy.getByDT('invitationLink').get('.c-invisible-input')
            .invoke('prop', 'value')
            .then(inviteLink => {
              invitationLinks[username] = inviteLink
              expect(inviteLink).to.contain('http://localhost')
            })
        })
      })
    }

    assertInvitationLinkFor(0, 'user4')
    assertInvitationLinkFor(1, 'user6')
  })

  it('user1 votes "yes" to the new mincome ($500) and proposal is accepted.', () => {
    assertMincome(groupMincome)

    tryUnsuccessfullyToProposeNewSimilarMincome()

    getProposalBoxes().eq(3).within(() => {
      cy.getByDT('title', 'h4').as('title')
      cy.get('@title').should('contain', `user2-${userId} is proposing:`)
      cy.getByDT('proposalItem').eq(0).within(() => {
        cy.getByDT('typeDescription')
          .should('contain', `Change mincome from $${groupMincome} to $${groupNewMincome}`)
        cy.getByDT('statusDescription')
          .should('contain', '2 out of 3 members voted.')

        cy.getByDT('voteFor').click()
        //  Proposal gets accepted and mincome is updated on the sidebar!
        cy.getByDT('statusDescription')
          .should('contain', 'Proposal accepted!')
        cy.get('@title').should('contain', `user2-${userId} proposed:`)
      })
    })

    assertMincome(groupNewMincome)

    cy.giLogout()
  })

  it('user4 registers and then joins the group through their unique invitation link', () => {
    cy.giSignup(`user4-${userId}`, { bypassUI: true })
    cy.giAcceptGroupInvite(invitationLinks.user4, {
      isLoggedIn: true,
      groupName,
      actionBeforeLogout: () => {
        cy.log('"New" tag does not appear for previous members')
        cy.getByDT('groupMembers').find('ul > li')
          .each(([member], index) => {
            cy.get(member).within(() => {
              cy.getByDT('pillNew').should('not.exist')
            })
          })
      }
    })
  })

  it('user6 registers through a unique invitation link to join a group', () => {
    cy.giAcceptGroupInvite(invitationLinks.user6, {
      groupName,
      username: `user6-${userId}`,
      inviteCreator: `user1-${userId}`
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

  it('user1 logins and sees all 5 proposals correctly and the new member', () => {
    cy.giLogin(`user1-${userId}`, { bypassUI: true })

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

    getProposalBoxes().eq(3).within(() => {
      cy.getByDT('title', 'h4').should('contain', `user2-${userId} proposed:`)

      cy.getByDT('proposalItem').eq(0).within(() => {
        cy.getByDT('statusDescription')
          .should('contain', 'Proposal accepted!')
      })
    })

    cy.getByDT('groupMembers').find('ul')
      .children()
      .should('have.length', 5)
      .each(([member], index) => {
        cy.get(member).within(() => {
          const usersMap = [1, 2, 3, 4, 6]
          cy.getByDT('username').should('contain', `user${usersMap[index]}-${userId}`)
          if (index > 1) {
            cy.getByDT('pillNew').should('contain', 'new')
          }
        })
      })

    assertMincome(groupNewMincome)

    cy.giLogout()
  })
})
