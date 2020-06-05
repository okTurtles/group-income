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

      cy.getByDT('submitBtn').click()
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
      status: '40% (2* out of 3 members)',
      ruleAdjusted: true
    })
  })

  it('user1 updates the group rule "percentage" to 90%', () => {
    updateRuleSettings('percentage', 0.9)
    verifyRuleSelected('percentage', {
      status: '90% (3 out of 3 members)',
      ruleAdjusted: false
    })
  })

  it('user1 changes the group rule to "disagrement" of "4"', () => {
    updateRuleSettings('disagreement', 4, { changeSystem: true })
    verifyRuleSelected('disagreement', {
      status: '4 (adjusted to 2*)',
      ruleAdjusted: true
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

    cy.giLogout()
  })

  /* For another PR:

  it('user1 proposes to update voting rule to 1. Everyone disagrees and it gets rejected.', () => {
  })

  it('user1 proposes to update voting rule to 1. It gets accepted with 3 against vs 2 in favor', () => {
  })

  it('user1 proposes to change system to "percentage" 50%". It gets rejected when anyone disagrees.', () => {
  })

  it('user1 proposes to change system to "percentage" 50%". It gets accepted when everyone agrees.', () => {
  })
  */
})
