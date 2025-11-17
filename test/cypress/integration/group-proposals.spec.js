import { INVITE_EXPIRES_IN_DAYS } from '../../../frontend/model/contracts/shared/constants.js'

const API_URL = Cypress.config('baseUrl')
const userId = performance.now().toFixed(20).replace('.', '')
const groupName = 'Dreamers'
const anotherGroupName = 'Donuts'
const groupMincome = 250
const groupNewMincome = 500
const groupInviteLinkExpiry = {
  anyone: INVITE_EXPIRES_IN_DAYS.ON_BOARDING,
  proposal: INVITE_EXPIRES_IN_DAYS.PROPOSAL
}

function assertMembersCount (count) {
  cy.getByDT('groupMembers').find('ul>li').should('have.length', count)
}

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

function getProposalItems (num) {
  return cy.getByDT('proposalsWidget').children()
}

function tryUnsuccessfullyToProposeNewSimilarMincome () {
  cy.log('try Unsuccessfully To Propose New Similar Mincome')
  // Verify an identical open proposal cannot be created twice.
  cy.getByDT('groupMincome').within(() => {
    cy.get('button').click()
  })

  cy.getByDT('modalProposal').within(() => {
    cy.get('input[inputmode="decimal"][name="mincomeAmount"]')
      .type(groupNewMincome)
    cy.getByDT('nextBtn', 'button')
      .click()
    cy.getByDT('submitBtn').click()
    cy.getByDT('proposalError').contains('Failed to create proposal. "There is an identical open proposal.". You can report the error.')

    cy.closeModal()
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

    cy.giLogout({ bypassUI: true })
  })

  it(`initial invitation link has ${groupInviteLinkExpiry.anyone} days of expiry`, () => {
    // If the invite link doesn't expire, this test makes little sense
    if (groupInviteLinkExpiry.anyone != null) {
    // Try to join with expired link
      cy.clock(Date.now() + 1000 * 86400 * groupInviteLinkExpiry.anyone)
      cy.visit(invitationLinks.anyone)
      cy.getByDT('pageTitle')
        .invoke('text')
        .should('contain', 'Oh no! This invite is already expired')
      cy.getByDT('helperText').should('contain', 'You should ask for a new one. Sorry about that!')

      cy.clock().then((clock) => {
        clock.restore()
      })
    }

    cy.visit('/')
    cy.url().should('eq', `${API_URL}/app/`)
    cy.getByDT('welcomeHome').should('contain', 'Welcome to Group Income')
  })

  it('not registered user2 and user3 join the group through the invitation link', () => {
    const options = {
      existingMemberUsername: `user1-${userId}`,
      groupName,
      actionBeforeLogout: () => {},
      shouldLogoutAfter: true,
      bypassUI: true
    }
    cy.giAcceptGroupInvite(invitationLinks.anyone, { ...options, username: `user2-${userId}` })
    cy.giAcceptGroupInvite(invitationLinks.anyone, { ...options, username: `user3-${userId}` })
  })

  it('user1 proposes to add user4, user5, user6 together to the group', () => {
    cy.giLogin(`user1-${userId}`, { bypassUI: true })
    assertMembersCount(3)
    cy.giInviteMember([`user4-${userId}`, `user5-${userId}`])
    cy.giInviteMember([`user6-${userId}`])
  })

  it('user2 proposes to add user7 to the group', () => {
    cy.giSwitchUser(`user2-${userId}`)
    assertMembersCount(3)
    cy.giInviteMember([`user7-${userId}`])
  })

  it(`user2 proposes to change mincome to $${groupNewMincome}`, () => {
    cy.getByDT('groupMincome').within(() => {
      cy.get('button').click()
    })

    cy.getByDT('modalProposal').within(() => {
      cy.get('input[inputmode="decimal"][name="mincomeAmount"]')
        .type(groupNewMincome)
      cy.getByDT('nextBtn', 'button')
        .click()
      cy.getByDT('reason', 'textarea').type('{selectall}{del}House renting is increasing.')
      cy.getByDT('submitBtn').click()
      cy.getByDT('finishBtn').click()
      cy.getByDT('closeModal').should('not.exist')
    })

    tryUnsuccessfullyToProposeNewSimilarMincome()
  })

  it('user3 votes "yes" to all 5 proposals', () => {
    cy.giSwitchUser(`user3-${userId}`)

    // assert total individual proposals
    getProposalItems().should('have.length', 5)

    // Go through each individual proposal and vote yes!
    getProposalItems().each(([item]) => {
      cy.get(item).within(() => {
        assertProposalOpenState({
          description: '1 out of 3 members voted'
        })

        cy.getByDT('voteFor').click()
        cy.getByDT('statusDescription')
          .should('contain', '2 out of 3 members voted')
        cy.getByDT('voted').should('contain', 'You voted yes.')
      })
    })
  })

  it('user3 changes their "yes" vote on user5 to "no" and proposal gets refused', () => {
    getProposalItems().eq(4).within(() => {
      cy.getByDT('title', 'p').should('contain', `user1-${userId} is proposing`)
      cy.getByDT('typeDescription')
        .should('contain', `Add user5-${userId} to group.`)
      cy.getByDT('voted').find('button.link')
        .should('contain', 'Change vote.')
        .click()

      cy.getByDT('voteFor').should('exist')
      cy.getByDT('voteAgainst').click()
    })
    // the proposal will get removed from one list, and there
    // will be a slight delay before it gets re-added to the
    // other list, so wait until that happens.
    // This .pipe() function (from 'cypress-pipe' dependency)
    // let's use apply a should() over a jQuery query repeatedly
    // until it's true.
    // The reason we start with 'body' is because in some tests
    // (including in other integration tests), proposalsWidget isn't
    // attached to the DOM because of the v-if (when there are no proposals)
    cy.get('body')
      .pipe($el => $el.find('[data-test="proposalsWidget"]').children().eq(4).find('[data-test="statusDescription"]'))
      .should('contain', 'Proposal rejected')
  })

  it('user2 votes "yes" to add user4 and user6. Proposals are accepted and invitations created.', () => {
    cy.giSwitchUser(`user2-${userId}`)

    function voteForAndIsAccepted (index, username) {
      getProposalItems().eq(index).within(() => {
        cy.getByDT('title', 'p').should('contain', `user1-${userId} is proposing`)
        cy.getByDT('typeDescription')
          .should('contain', `Add ${username}-${userId} to group.`)
        assertProposalOpenState({
          description: '2 out of 3 members voted'
        })
        cy.getByDT('voteFor').click()
      })
      //  Proposal gets accepted and invitation is created!
      cy.get('body')
        .pipe($el => $el.find('[data-test="proposalsWidget"]').children().eq(index).find('[data-test="statusDescription"]'))
        .should('contain', 'Proposal accepted')
      getProposalItems().eq(index).within(() => {
        cy.getByDT('voted').should('not.exist')
        cy.getByDT('title', 'p').should('contain', `user1-${userId} proposed`)
        cy.getByDT('sendLink').should('not.exist') // Only visible to who created the proposal
      })

      cy.log(`${username} is part of members list as "pending"`)

      cy.getByDT('groupMembers').find('ul').within(() => {
        cy.getByDT(`${username}-${userId}`, 'li').within(() => {
          cy.getByDT('username').should('contain', `${username}-${userId}`)
          cy.getByDT('pillPending').should('contain', 'pending')
        })
      })
    }

    voteForAndIsAccepted(3, 'user4')
    voteForAndIsAccepted(2, 'user6')
  })

  it('user2 decides to cancel his proposal of adding user7', () => {
    getProposalItems().eq(1).within(() => {
      cy.getByDT('title', 'p').should('contain', 'You are proposing')
      cy.getByDT('statusDescription')
        .should('contain', '2 out of 3 members voted')

      cy.getByDT('cancelProposal').click()
    })
    cy.get('body')
      .pipe($el => $el.find('[data-test="proposalsWidget"]').children().eq(1).find('[data-test="statusDescription"]'))
      .should('contain', 'Proposal cancelled')
    getProposalItems().eq(1).within(() => {
      cy.getByDT('title', 'p').should('contain', 'You proposed')
    })
  })

  it('user1 see their accepted proposals to invite user4 and user6', () => {
    cy.giSwitchUser(`user1-${userId}`)

    function assertInvitationLinkFor (index, username) {
      getProposalItems().eq(index).within(() => {
        cy.getByDT('title', 'p').should('contain', 'You proposed')
        cy.getByDT('sendLink').should('contain', `Please send the following link to ${username}-${userId} so they can join the group:`)
        cy.getByDT('sendLink').within(() => {
          cy.getByDT('invitationLink').get('.link').should('contain', API_URL)
          cy.getByDT('invitationLink').get('.c-invisible-input')
            .invoke('prop', 'value')
            .then(inviteLink => {
              invitationLinks[username] = inviteLink
              expect(inviteLink).to.contain(API_URL)
            })
        })
      })
    }

    cy.getByDT('openAllProposals').click()
    cy.get('[data-test="modal"] > .c-container .c-title').should('contain', 'Archived proposals')
    cy.getByDT('modal').within(() => {
      // NOTE: this is to wait until all of the 4 proposals are loaded inside the modal
      cy.get('.c-container > .c-header-info .has-text-1').should('contain', '4 proposals')
      assertInvitationLinkFor(2, 'user4')
      assertInvitationLinkFor(1, 'user6')
    })
    cy.closeModal()
  })

  it(`user1 votes "yes" to the new mincome ($${groupMincome}) and proposal is accepted.`, () => {
    assertMincome(groupMincome)

    tryUnsuccessfullyToProposeNewSimilarMincome()

    getProposalItems().eq(0).within(() => {
      cy.getByDT('title', 'p').as('title')
      cy.get('@title').should('contain', `user2-${userId} is proposing`)
    })

    getProposalItems().eq(0).within(() => {
      cy.getByDT('typeDescription')
        .should('contain', `Change mincome from $${groupMincome} to $${groupNewMincome}`)
      cy.getByDT('statusDescription')
        .should('contain', '2 out of 3 members voted')

      cy.getByDT('voteFor').click()
    })
    //  Proposal gets accepted and mincome is updated on the sidebar!
    cy.get('body')
      .pipe($el => $el.find('[data-test="proposalsWidget"]').children().eq(0).find('[data-test="statusDescription"]'))
      .should('contain', 'Proposal accepted')
    getProposalItems().eq(0).within(() => {
      cy.get('@title').should('contain', `user2-${userId} proposed`)
    })

    assertMincome(groupNewMincome)

    cy.giLogout({ bypassUI: true })
  })

  it('user4 registers and then joins the group through their unique invitation link', () => {
    cy.giSignup(`user4-${userId}`, { bypassUI: true })
    cy.window().its('sbp').then(async sbp => {
      // NOTE: need to wait until to save user settings to indexedStorage
      await sbp('state/vuex/save')
    })
    cy.giAcceptGroupInvite(invitationLinks.user4, {
      username: `user4-${userId}`,
      isLoggedIn: true,
      existingMemberUsername: `user1-${userId}`,
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

  it('invitee can not join the group with the expired invitation link', () => {
    // Try to join with expired link
    cy.clock(Date.now() + 1000 * 86400 * groupInviteLinkExpiry.proposal)
    cy.visit(invitationLinks.user6)
    cy.getByDT('pageTitle')
      .invoke('text')
      .should('contain', 'Oh no! This invite is already expired')
    cy.getByDT('helperText').should('contain', 'You should ask for a new one. Sorry about that!')

    cy.clock().then((clock) => {
      clock.restore()
    })

    cy.visit('/')
    cy.url().should('eq', `${API_URL}/app/`)
    cy.getByDT('welcomeHome').should('contain', 'Welcome to Group Income')
  })

  it(`proposal-based invitation link has ${groupInviteLinkExpiry.proposal} days of expiry`, () => {
    // Expiry check in Group Settings page and Dashboard
    cy.giLogin(`user1-${userId}`, { bypassUI: true })

    cy.clock(Date.now() + 1000 * 86400 * groupInviteLinkExpiry.proposal)

    cy.getByDT('groupSettingsLink').click()
    cy.get('td.c-name:contains("user6")').should('not.exist')
    cy.get('.c-title-wrapper select').select('All links')
    cy.get('td.c-name:contains("user6")').siblings('.c-state').get('.c-state-expire').should('contain', 'Expired')

    cy.getByDT('dashboard').click()
    cy.getByDT('proposalsWidget').should('not.exist')
    cy.getByDT('openAllProposals').click()
    cy.get('[data-test="modal"] > .c-container .c-title').should('contain', 'Archived proposals')
    cy.getByDT('modal').within(() => {
      getProposalItems().eq(2).within(() => {
        cy.getByDT('title', 'p').should('contain', 'You proposed')
        cy.getByDT('statusDescription')
          .should('contain', 'Proposal accepted')
        cy.getByDT('sendLink').should('exist')

        cy.getByDT('sendLink').within(() => {
          cy.get('span.has-text-danger').should('contain', 'Expired')
        })
      })
    })
    cy.clock().then((clock) => {
      clock.restore()
    })

    cy.closeModal()
    cy.giLogout({ bypassUI: true })
  })

  it('user6 registers through a unique invitation link to join a group', () => {
    cy.giAcceptGroupInvite(invitationLinks.user6, {
      groupName,
      existingMemberUsername: `user1-${userId}`,
      actionBeforeLogout: () => {},
      username: `user6-${userId}`,
      inviteCreator: `user1-${userId}`,
      shouldLogoutAfter: true
    })
  })

  it('an already used invitation link cannot be used again', () => {
    cy.visit(invitationLinks.user6) // already used on the previous test
    cy.getByDT('pageTitle')
      .invoke('text')
      .should('contain', 'Oh no! This invite is not valid')
    cy.getByDT('helperText').should('contain', 'You should ask for a new one. Sorry about that!')
    cy.get('button').click()
    cy.url().should('eq', `${API_URL}/app/`)
    cy.getByDT('welcomeHome').should('contain', 'Welcome to Group Income')
  })

  it('an invalid invitation link cannot be used', () => {
    cy.visit('/app/join#?groupId=321&secret=123')
    cy.getByDT('pageTitle')
      .invoke('text')
      .should('contain', 'Oh no! This invite is not valid')
    cy.getByDT('helperText').should('contain', 'Something went wrong. Please, try again.')
    cy.get('button').click()
    cy.url().should('eq', `${API_URL}/app/`)
    cy.getByDT('welcomeHome').should('contain', 'Welcome to Group Income')
  })

  it('user1 logins and sees all 5 proposals correctly and the new members', () => {
    cy.giLogin(`user1-${userId}`, { bypassUI: true })

    // A quick checkup that each proposal state is correct.
    // OPTIMIZE: Maybe we should adopt Visual Testing in these cases
    // https://docs.cypress.io/guides/tooling/visual-testing.html#Functional-vs-visual-testing#article
    getProposalItems().should('have.length', 5)
    cy.getByDT('openAllProposals').click()
    cy.get('[data-test="modal"][aria-label="All proposals"] > .c-container .c-title').should('contain', 'Archived proposals')
    cy.get('[data-test="modal"][aria-label="All proposals"]').within(() => {
      // NOTE: this is to wait until all of the 5 proposals are loaded inside the modal
      cy.get('.c-container > .c-header-info .has-text-1').should('contain', '5 proposals')

      getProposalItems().eq(2).within(() => {
        cy.getByDT('title', 'p').should('contain', 'You proposed')
        cy.getByDT('statusDescription')
          .should('contain', 'Proposal accepted')
        cy.getByDT('sendLink').should('not.exist') // Because it was already used
      })

      getProposalItems().eq(4).within(() => {
        cy.getByDT('statusDescription')
          .should('contain', 'Proposal rejected')
      })

      getProposalItems().eq(3).within(() => {
        cy.getByDT('title', 'p').should('contain', 'You proposed')
        cy.getByDT('statusDescription')
          .should('contain', 'Proposal accepted')
        cy.getByDT('sendLink').should('not.exist')
      })

      getProposalItems().eq(1).within(() => {
        cy.getByDT('title', 'p').should('contain', `user2-${userId} proposed`)
        cy.getByDT('statusDescription')
          .should('contain', 'Proposal cancelled.')
      })

      getProposalItems().eq(0).within(() => {
        cy.getByDT('title', 'p').should('contain', `user2-${userId} proposed`)
        cy.getByDT('statusDescription')
          .should('contain', 'Proposal accepted')
      })

      cy.closeModal()
    })

    cy.getByDT('groupMembers').find('ul')
      .children()
      .should('have.length', 5)
      .each(([member], index) => {
        cy.get(member).within(() => {
          const usersMap = [2, 3, 4, 6, 1]

          cy.getByDT('username').should('contain', `user${usersMap[index]}-${userId}`)

          if (index === 4) { // last member
            cy.getByDT('username').should('contain', '(you)')
          } else {
            cy.getByDT('pillNew').should('contain', 'new')
          }
        })
      })

    assertMincome(groupNewMincome)
  })

  it('user1 creates a new group and checks that all the proposals are per group', () => {
    cy.giCreateGroup(anotherGroupName, { mincome: groupMincome, bypassUI: true })

    // getProposalItems().should('have.length', 0)
    cy.getByDT('proposalsSection').within(() => {
      cy.getByDT('proposalsWidget').should('not.exist')
    })

    cy.getByDT('openAllProposals').click()
    cy.get('[data-test="modal"] > .c-container .c-title').should('contain', 'Archived proposals')
    cy.getByDT('modal').within(() => {
      getProposalItems().should('have.length', 0)
      cy.closeModal()
    })
  })

  it('user1, the group creator, doesn\'t need to propose to change distribution date', () => {
    const openChangeDistributionDateModal = () => {
      cy.getByDT('proposalsSection').within(() => {
        cy.getByDT('menuTrigger').click()
        cy.getByDT('menuContent').within(() => {
          cy.get('menu').children().eq(7).within(() => {
            cy.get('button').click()
          })
        })
      })
    }

    openChangeDistributionDateModal()
    cy.getByDT('modalProposal').within(() => {
      cy.getByDT('modal-header-title').should('contain', 'Change distribution date')
      cy.getByDT('submitBtn').should('contain', 'Change').should('be.disabled')
      cy.get('.c-footer')
        .should('contain', 'The first distribution period is not started yet, so this change will be immediate (no voting required).')

      cy.closeModal()
    })

    // let newDistributionDate = new Date(new Date(Date.now() + 15 * DAYS_MILLIS).setUTCHours(0, 0, 0, 0))
    // newDistributionDate = new Date(new Date(
    //   newDistributionDate.getFullYear(),
    //   newDistributionDate.getMonth(),
    //   newDistributionDate.getDate()
    // ).setUTCHours(0, 0, 0, 0))
    // cy.getByDT('modalProposal').within(() => {
    //   cy.getByDT('modal-header-title').should('contain', 'Change distribution date')
    //   cy.getByDT('submitBtn').should('contain', 'Change').should('be.disabled')
    //   cy.get('.c-footer')
    //     .should('contain', 'The first distribution period is not started yet, so this change will be immediate (no voting required).')
    //   cy.get('.inputgroup select').select(newDistributionDate.toISOString())
    //   cy.getByDT('submitBtn').click()
    //   cy.closeModal()
    // })

    // openChangeDistributionDateModal()
    // const humanNewDate = newDistributionDate.toLocaleString(undefined, { month: 'long', day: 'numeric' })
    // cy.getByDT('modalProposal').within(() => {
    //   cy.getByDT('modal-header-title').should('contain', 'Change distribution date')
    //   cy.get('form .helper').should('contain', `Current distribution date is on ${humanNewDate}.`)
    //   cy.closeModal()
    // })

    cy.giLogout({ bypassUI: true })
  })
})
