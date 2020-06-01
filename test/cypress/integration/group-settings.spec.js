const userId = Math.floor(Math.random() * 10000)
const groupName = 'Dreamers'
const groupMincome = 750
const groupNewMincome = groupMincome + 100
const sharedValues = ''

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

  it('user1 creates a group with rule "disagreement" and threshold "2"', () => {
    cy.giCreateGroup('groupDis_1', { ruleName: 'disagreement', ruleThreshold: 2 })

    verifyRuleSelected('disagreement', {
      status: '2',
      ruleAdjusted: false
    })
  })

  it('user1 creates a group with rule "disagreement" and threshold "37"', () => {
    cy.giCreateGroup('groupDis_37_adjusted', { bypassUI: true, ruleName: 'disagreement', ruleThreshold: 37 })

    verifyRuleSelected('disagreement', {
      status: '37 (adjusted to 3*)',
      ruleAdjusted: true
    })
  })

  it('user1 creates a group with rule "percentage" and threshold "90"', () => {
    cy.giCreateGroup('groupPerc_75', { ruleName: 'percentage', ruleThreshold: 90 })

    verifyRuleSelected('percentage', {
      status: '90% (3 out of 3 members)',
      ruleAdjusted: false
    })
  })

  it('user1 creates a group with rule "percentage" and threshold "40"', () => {
    cy.giCreateGroup('groupPerc_75', { bypassUI: true, ruleName: 'percentage', ruleThreshold: 40 })

    verifyRuleSelected('percentage', {
      status: '40% (2* out of 3 members)',
      ruleAdjusted: true
    })

    cy.giLogout()
  })
})
