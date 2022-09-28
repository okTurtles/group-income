const userId = Math.floor(Math.random() * 10000)
const groupName = 'Dreamers'
const groupNamePerc40 = 'groupPerc_40'
const groupMincome = 750
const groupNewMincome = groupMincome + 100
const sharedValues = ''
let invitationLinkAnyone

function getProposalItems (num) {
  return cy.getByDT('proposalItem', 'li').children()
}

describe('Changing Group Settings', () => {
  it('user1 creates a new group', () => {
    cy.visit('/')
    cy.giSignup(`user1-${userId}`, { bypassUI: true })

    cy.giCreateGroup(groupName, { mincome: groupMincome, sharedValues })
  })

  it('user1 changes the group minimum income (increase it $100)', () => {
    cy.getByDT('groupMincome').within(() => {
      cy.getByDT('minIncome').should('contain', `$${groupMincome}`)
      cy.get('button').click()
    })

    cy.getByDT('modalProposal').within(() => {
      cy.get('input[inputmode="decimal"][name="mincomeAmount"]')
        .type(groupNewMincome)

      cy.getByDT('submitBtn', 'button')
        .click()
    })

    cy.getByDT('groupMincome').within(() => {
      cy.getByDT('minIncome').should('contain', `$${groupNewMincome}`)
    })
  })

  it('user1 changes avatar and profile settings', () => {
    const groupPicture = 'imageTest.png' // at fixtures/imageTest
    const newGroupName = 'Turtles'
    const newSharedValues = 'One step at the time.'

    cy.getByDT('groupSettingsLink').click()

    cy.fixture(groupPicture, 'base64').then(fileContent => {
      cy.get('[data-test="avatar"]').attachFile({ fileContent, fileName: groupPicture, mimeType: 'image/png' }, { subjectType: 'input' })
    })

    cy.getByDT('avatarMsg').should('contain', 'Avatar updated!')

    cy.getByDT('groupName').should('have.value', groupName)
    cy.getByDT('groupName').clear().type(newGroupName)

    cy.getByDT('sharedValues').should('have.value', '')
    cy.getByDT('sharedValues').clear().type(newSharedValues)

    cy.getByDT('saveBtn', 'button').click()
    cy.getByDT('formMsg').should('contain', 'Your changes were saved!')

    // Go to dashboard and verify new values:
    cy.getByDT('dashboard').click()
    cy.getByDT('groupName').should('contain', newGroupName)
    cy.getByDT('sharedValues').should('contain', newSharedValues)
  })
})

describe('Group Voting Rules', () => {
  function updateRuleSettings (ruleName, threshold, opts = {}) {
    cy.log(`Update group Voting Rule: ${ruleName}, ${threshold}`)

    cy.getByDT('groupSettingsLink').click()
    cy.getByDT('votingRules', 'ul').find(`li[data-test='${ruleName}']`).within(() => {
      cy.getByDT('changeRule', 'button').click()
    })

    if (opts.changeSystem) {
      cy.getByDT('changeSystem').should('exist')
    }

    const ruleThreshold = ruleName === 'percentage' ? threshold * 100 : threshold
    cy.getByDT('modalProposal').within(() => {
      cy.get(`input[type='range']#range${ruleName}`)
        .invoke('val', ruleThreshold)
        .trigger('input')
      // Verify the input value has really changed
      cy.get(`input[type='range']#range${ruleName}`).should('have.value', ruleThreshold.toString())

      if (opts.isProposal) {
        cy.getByDT('nextBtn').click()
        cy.getByDT('submitBtn').click()
        cy.getByDT('finishBtn').click()
      } else {
        cy.getByDT('submitBtn').click()
      }
      cy.getByDT('closeModal').should('not.exist')
    })
  }

  function verifyRuleSelected (ruleName, { status, ruleAdjusted }) {
    cy.log(`Verify selected group Voting Rule: ${ruleName}`)

    cy.getByDT('groupSettingsLink').click()
    cy.get('ul[data-test="votingRules"] > li')
      .should('have.length', 1)
      .first()
      .should('have.attr', 'data-test', ruleName)
      .should('have.attr', 'aria-current', 'true')

    cy.get('ul[data-test="votingRules"] > li:first').within(() => {
      cy.getByDT('ruleStatus').should('contain', status)

      if (ruleAdjusted) {
        cy.getByDT('ruleAdjusted').should('contain', '*This value was autom') // asserting beginning of sentence is enough
      } else {
        cy.getByDT('ruleAdjusted').should('not.exist')
      }
    })
  }

  it.skip('user1 creates a group with rule "disagreement" of "2"', () => {
    cy.giCreateGroup('groupDis_2', { ruleName: 'disagreement', ruleThreshold: 2 })

    verifyRuleSelected('disagreement', {
      status: '2',
      ruleAdjusted: false
    })
  })

  it('user1 creates a group with rule "percentage" of 40%', () => {
    cy.giCreateGroup(groupNamePerc40, { bypassUI: true, ruleName: 'percentage', ruleThreshold: 0.4 })

    verifyRuleSelected('percentage', {
      status: '40%',
      ruleAdjusted: false
    })
  })

  it.skip('user1 changes the group rule to "disagrement" of "4"', () => {
    updateRuleSettings('disagreement', 4, { changeSystem: true })
    verifyRuleSelected('disagreement', {
      status: '4',
      ruleAdjusted: false
    })
  })

  it('user1 shares the invitation link for others to join the group', () => {
    cy.getByDT('dashboard').click()
    cy.giGetInvitationAnyone().then(url => {
      invitationLinkAnyone = url
    })
    cy.giLogout()
  })

  it('4 new memebers joins the group via shared invitation link', () => {
    // temp test block while 'disagreement rule' is disabled
    for (let i = 2; i <= 5; i++) {
      cy.giAcceptGroupInvite(invitationLinkAnyone, {
        username: `user${i}-${userId}`,
        groupName: groupNamePerc40,
        bypassUI: true
      })
    }

    cy.giLogin(`user1-${userId}`, { bypassUI: true })
  })

  it.skip('in a group with 4 members, the "disagrement" rule is adjusted from 4 to 3', () => {
    for (let i = 2; i <= 4; i++) {
      cy.giAcceptGroupInvite(invitationLinkAnyone, {
        username: `user${i}-${userId}`,
        groupName: groupNamePerc40,
        bypassUI: true
      })
    }

    cy.giLogin(`user1-${userId}`, { bypassUI: true })

    verifyRuleSelected('disagreement', {
      status: '4 (adjusted to 3*)',
      ruleAdjusted: true
    })
    cy.giLogout()
  })

  it.skip('in a group with 5 members, the "disagrement" rule of 4 is not adjusted.', () => {
    cy.giAcceptGroupInvite(invitationLinkAnyone, {
      username: `user5-${userId}`,
      groupName: groupNamePerc40,
      bypassUI: true
    })

    cy.giLogin(`user1-${userId}`, { bypassUI: true })

    verifyRuleSelected('disagreement', {
      status: '4',
      ruleAdjusted: false
    })
  })

  function voteInProposal (username, proposalNth, votesSoFar, voteType, opts = {}) {
    cy.log(`${username} votes "${voteType}"`)
    cy.giSwitchUser(`${username}-${userId}`)
    getProposalItems().eq(proposalNth).within(() => {
      cy.getByDT('statusDescription').should('contain', `${votesSoFar} out of 5 members voted`)
      cy.getByDT(voteType).click()
    })
    // see explanatory comment in group-proposals.spec.js for this .pipe() thing
    let statusDescription = `${votesSoFar + 1} out of 5 members voted`
    if (opts.decisive === 'rejected') {
      statusDescription = 'Proposal rejected'
    } else if (opts.decisive === 'approved') {
      statusDescription = 'Proposal accepted'
    }
    cy.get('body')
      .pipe($el => $el.find('[data-test="proposalsWidget"]').children().eq(proposalNth).find('[data-test="statusDescription"]'))
      .should('contain', statusDescription)

    getProposalItems().eq(proposalNth).within(() => {
      if (opts.decisive) {
        cy.getByDT('voted').should('not.exist')
      } else if (voteType === 'voteFor') {
        cy.getByDT('voted').should('contain', 'You voted yes.')
      } else {
        cy.getByDT('voted').should('contain', 'You voted no.')
      }
    })
  }

  it.skip('user1 proposes to change rule to percentage 15%). It is rejected once everyone else disagrees.', () => {
    updateRuleSettings('percentage', 0.15, { isProposal: true })

    cy.getByDT('dashboard').click()

    cy.log('Proposal is in the dashboard')
    getProposalItems().should('have.length', 1)

    getProposalItems().eq(0).within(() => {
      cy.get('i.icon-round').should('have.class', 'icon-vote-yea')
      cy.getByDT('typeDescription').should('contain', 'Change from a disagreement based voting system to a percentage based one, with minimum agreement of 15%.')
    })

    voteInProposal('user2', 0, 1, 'voteAgainst')
    voteInProposal('user3', 0, 2, 'voteAgainst')
    voteInProposal('user4', 0, 3, 'voteAgainst')
    voteInProposal('user5', 0, 4, 'voteAgainst', { decisive: 'rejected' })
  })

  it.skip('user5 re-creates the same proposal. It is accepted once someone agrees.', () => {
    updateRuleSettings('percentage', 0.15, { isProposal: true })

    cy.getByDT('dashboard').click()

    cy.log('Proposal is in the dashboard')
    getProposalItems().should('have.length', 1) // since other was archived

    getProposalItems().eq(0).within(() => {
      cy.get('i.icon-round').should('have.class', 'icon-vote-yea')
      cy.getByDT('typeDescription').should('contain', 'Change from a disagreement based voting system to a percentage based one, with minimum agreement of 15%.')
    })

    voteInProposal('user1', 0, 1, 'voteFor', { decisive: 'approved' })

    cy.log('Verify new Voting System: percentage of 15% (adjusted)')
    verifyRuleSelected('percentage', { status: '15% (2* out of 5 members)', ruleAdjusted: true })
  })

  it('user1 proposes to update "percentage" to 80%. It is accepted once someone agrees.', () => {
    updateRuleSettings('percentage', 0.80, { isProposal: true })

    cy.getByDT('dashboard').click()

    cy.log('Proposal is in the dashboard')
    getProposalItems().should('have.length', 1) // since others were archived

    getProposalItems().eq(0).within(() => {
      cy.get('i.icon-round').should('have.class', 'icon-vote-yea')
      cy.getByDT('typeDescription').should('contain', 'Change percentage based from 40% to 80%.')
    })

    voteInProposal('user2', 0, 1, 'voteFor', { decisive: 'approved' })

    cy.log('Verify new Voting System: percentage of 80%.')
    verifyRuleSelected('percentage', { status: '80% (4 out of 5 members)', ruleAdjusted: false })

    cy.giLogout()
  })
})
