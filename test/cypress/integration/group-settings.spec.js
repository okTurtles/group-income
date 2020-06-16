const userId = Math.floor(Math.random() * 10000)
const groupName = 'Dreamers'
const groupMincome = 750
const groupNewMincome = groupMincome + 100
const sharedValues = ''
let invitationLinkAnyone

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
      cy.get('[data-test="avatar"]').upload({ fileContent, fileName: groupPicture, mimeType: 'image/png' }, { subjectType: 'input' })
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
    })
  }

  function verifyRuleSelected (ruleName, { status, ruleAdjusted }) {
    cy.log(`Verify selected group Voting Rule: ${ruleName}`)

    cy.getByDT('groupSettingsLink').click()
    cy.get('ul[data-test="votingRules"] > li')
      .should('have.length', 2)
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

  it('user1 creates a group with rule "disagreement" of "2"', () => {
    cy.giCreateGroup('groupDis_2', { ruleName: 'disagreement', ruleThreshold: 2 })

    verifyRuleSelected('disagreement', {
      status: '2',
      ruleAdjusted: false
    })
  })

  it('user1 creates a group with rule "percentage" of 40%', () => {
    cy.giCreateGroup('groupPerc_40', { bypassUI: true, ruleName: 'percentage', ruleThreshold: 0.4 })

    verifyRuleSelected('percentage', {
      status: '40%',
      ruleAdjusted: false
    })
  })

  it('user1 changes the group rule to "disagrement" of "4"', () => {
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

  it('in a group with 4 members, the "disagrement" rule is adjusted from 4 to 3', () => {
    for (let i = 2; i <= 4; i++) {
      cy.giAcceptGroupInvite(invitationLinkAnyone, {
        username: `user${i}-${userId}`, groupName, bypassUI: true
      })
    }

    cy.giLogin(`user1-${userId}`, { bypassUI: true })

    verifyRuleSelected('disagreement', {
      status: '4 (adjusted to 3*)',
      ruleAdjusted: true
    })
    cy.giLogout()
  })

  it('in a group with 5 members, the "disagrement" rule of 4 is not adjusted.', () => {
    cy.giAcceptGroupInvite(invitationLinkAnyone, {
      username: `user5-${userId}`, groupName, bypassUI: true
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
    cy.getByDT('proposalsWidget', 'ul').children().eq(proposalNth).within(() => {
      cy.getByDT('statusDescription').should('contain', `${votesSoFar} out of 5 members voted.`)
      cy.getByDT(voteType).click()

      if (opts.decisive) {
        if (opts.decisive === 'rejected') {
          cy.getByDT('statusDescription').should('contain', 'Proposal refused.')
        } else if (opts.decisive === 'approved') {
          cy.getByDT('statusDescription').should('contain', 'Proposal accepted!')
        }
        cy.getByDT('voted').should('not.exist')
      } else {
        cy.getByDT('statusDescription').should('contain', `${votesSoFar + 1} out of 5 members voted.`)
        if (voteType === 'voteFor') {
          cy.getByDT('voted').should('contain', 'You voted yes.')
        } else {
          cy.getByDT('voted').should('contain', 'You voted no.')
        }
      }
    })
  }

  it('user1 proposes to change rule to percentage 15%). It is rejected once everyone else disagrees.', () => {
    updateRuleSettings('percentage', 0.15, { isProposal: true })

    cy.getByDT('dashboard').click()

    cy.log('Proposal is in the dashboard')
    cy.getByDT('proposalsWidget', 'ul').children().should('have.length', 1)

    cy.getByDT('proposalsWidget', 'ul').children().eq(0).within(() => {
      cy.get('i.icon-round').should('have.class', 'icon-vote-yea')
      cy.getByDT('typeDescription').should('contain', 'Change from a disagreement based voting system to a percentage based one, with minimum agreement of 15%.')
    })

    voteInProposal('user2', 0, 1, 'voteAgainst')
    voteInProposal('user3', 0, 2, 'voteAgainst')
    voteInProposal('user4', 0, 3, 'voteAgainst')
    voteInProposal('user5', 0, 4, 'voteAgainst', { decisive: 'rejected' })
  })

  it('user5 re-creates the same proposal. It is accepted once someone agrees.', () => {
    updateRuleSettings('percentage', 0.15, { isProposal: true })

    cy.getByDT('dashboard').click()

    cy.log('Proposal is in the dashboard')
    cy.getByDT('proposalsWidget', 'ul').children().should('have.length', 2)

    cy.getByDT('proposalsWidget', 'ul').children().eq(1).within(() => {
      cy.get('i.icon-round').should('have.class', 'icon-vote-yea')
      cy.getByDT('typeDescription').should('contain', 'Change from a disagreement based voting system to a percentage based one, with minimum agreement of 15%.')
    })

    voteInProposal('user1', 1, 1, 'voteFor', { decisive: 'approved' })

    cy.log('Verify new Voting System: percentage of 15% (adjusted)')
    verifyRuleSelected('percentage', { status: '15% (2* out of 5 members)', ruleAdjusted: true })
  })

  it('user1 proposes to update "percentage" to 80%. It is accepted once someone agrees.', () => {
    updateRuleSettings('percentage', 0.80, { isProposal: true })

    cy.getByDT('dashboard').click()

    cy.log('Proposal is in the dashboard')
    cy.getByDT('proposalsWidget', 'ul').children().should('have.length', 3)

    cy.getByDT('proposalsWidget', 'ul').children().eq(2).within(() => {
      cy.get('i.icon-round').should('have.class', 'icon-vote-yea')
      cy.getByDT('typeDescription').should('contain', 'Change percentage based from 15% to 80%.')
    })

    voteInProposal('user2', 2, 1, 'voteFor', { decisive: 'approved' })

    cy.log('Verify new Voting System: percentage of 80%.')
    verifyRuleSelected('percentage', { status: '80% (4 out of 5 members)', ruleAdjusted: false })

    cy.giLogout()
  })
})
