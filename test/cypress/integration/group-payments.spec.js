const userId = Math.floor(Math.random() * 10000)
const groupName = 'Dreamers'
const usersDisplayName = {
  1: 'Greg',
  2: 'Margarida',
  3: 'Pierre',
  4: 'Sandrina'
}

const elReceivingFirst = '.receiving .c-contribution-item:first-child'
const elGivingFirst = '.giving .c-contribution-item:first-child'

function addNonMonetaryContribution (name) {
  cy.getByDT('addNonMonetaryContribution', 'button').click()
  cy.getByDT('inputNonMonetaryContribution').type(name)
  cy.getByDT('buttonAddNonMonetaryContribution', 'button').click()
}

function assertNonMonetaryEditableValue (name) {
  cy.getByDT('buttonEditNonMonetaryContribution').click()
  cy.getByDT('inputNonMonetaryContribution').should('have.value', name)
  cy.getByDT('buttonSaveNonMonetaryContribution').click()
}

function assertGraphicSummary (legendListItems) {
  cy.getByDT('groupPledgeSummary', 'ul').within(([list]) => {
    legendListItems.forEach((legendText, index) => {
      cy.get(list).children().eq(index)
        .invoke('text')
        .should('contain', legendText)
    })
  })
}

function assertContributionsWidget (assertions) {
  cy.getByDT('dashboard', 'a').click()
  cy.getByDT('contributionsWidget').within(() => {
    Object.keys(assertions).forEach(dataTest => {
      cy.getByDT(dataTest).should('contain', assertions[dataTest])
    })
  })
  cy.getByDT('contributionsLink', 'a').click()
}

function updateIncome (newIncome, needsIncome, graphicLegend, incomeStatus) {
  cy.getByDT('contributionsLink').click()
  cy.getByDT('openIncomeDetailsModal').click()
  cy.getByDT(needsIncome ? 'needsIncomeRadio' : 'dontNeedsIncomeRadio').click()
  cy.getByDT('inputIncomeOrPledge').clear().type(newIncome)

  assertGraphicSummary(graphicLegend)

  cy.getByDT('submitIncome').click()
  cy.getByDT('closeModal').should('not.exist') // make sure the modal closes.

  const elIncomeStatus = needsIncome ? elReceivingFirst : elGivingFirst
  cy.get(elIncomeStatus).should('contain', incomeStatus)
}

describe('Payments', () => {
  const invitationLinks = {}

  it('user1 creates a group', () => {
    cy.visit('/')
    cy.giSignup(`user1-${userId}`, { bypassUI: false })

    // TODO/NOTE: When bypassUI, something related to identity.attributes
    // doesnt fully sync...
    cy.giCreateGroup(groupName, { bypassUI: false })
    // ... causing this step to fail, because attributes is empty.
    cy.giSetDisplayName(usersDisplayName[1])

    cy.giGetInvitationAnyone().then(url => {
      invitationLinks.anyone = url
    })

    cy.giLogout()
  })

  it('user2, user3 and user4 join the group', () => {
    for (let i = 2; i <= 4; i++) {
      cy.giAcceptGroupInvite(invitationLinks.anyone, {
        username: `user${i}-${userId}`,
        groupName,
        displayName: usersDisplayName[i]
        // bypassUI: false
      })
    }

    cy.giLogin(`user1-${userId}`, { bypassUI: false })
  })

  it('user1 fills their Income Details - pledges $500', () => {
    cy.getByDT('contributionsLink').click()
    cy.getByDT('addIncomeDetailsFirstCard').should('contain', 'Add your income details')

    cy.getByDT('openIncomeDetailsModal').click()
    // Make sure only radio box to select the type is visible at the begining
    cy.getByDT('introIncomeOrPledge').should('not.be.visible')

    cy.getByDT('dontNeedsIncomeRadio').click()
    // Make sure the user is aksed how much he want to pledge
    cy.getByDT('introIncomeOrPledge').should('contain', 'How much do you want to pledge?')

    assertGraphicSummary([
      'Total Pledged$0',
      'Needed Pledges$0'
    ])

    cy.getByDT('inputIncomeOrPledge').type(500)

    assertGraphicSummary([
      'Total Pledged$500',
      'Needed Pledges$0'
    ])

    cy.getByDT('submitIncome').click()
    // After selecting the amount and close the modal make sure it show that no one is in need
    cy.getByDT('receivingParagraph').should('contain', 'When other members pledge a monetary or non-monetary contribution, they will appear here.')
    cy.getByDT('givingParagraph').should('contain', 'No one needs monetary contributions at the moment. You can still add non-monetary contributions if you would like.')

    assertContributionsWidget({
      paymentsTitle: 'Payments sent',
      paymentsStatus: 'At the moment, no one is in need of contributions.',
      monetaryTitle: 'You are pledging $500',
      monetaryStatus: '$0 will be used.',
      nonMonetaryStatus: 'There are no non-monetary contributions.'
    })
  })

  it('user1 decides to switch income details to needing $100', () => {
    cy.getByDT('openIncomeDetailsModal').click()
    cy.getByDT('needsIncomeRadio').click()
    // After swithing to need income, it should ask user how much he need
    cy.getByDT('introIncomeOrPledge').should('contain', 'What\'s your monthly income?')
    cy.getByDT('inputIncomeOrPledge').type(500)
    // It should not let user ask for money if he has more than the basic income
    cy.getByDT('badIncome').should('contain', 'Your income must be lower than the group mincome')
    cy.getByDT('inputIncomeOrPledge').clear().type(100)
    // After updating the income under the limit it should hide the error message
    cy.getByDT('badIncome').should('not.be.visible')

    assertGraphicSummary([
      'Total Pledged$0',
      'Needed Pledges$100'
    ])

    cy.getByDT('submitIncome').click()
    // After closing the modal it should dislay how much user need
    cy.getByDT('headerNeed').should('contain', 'You need $100')
    // The user should be inform that even if he can't pledge he can still contribute
    cy.getByDT('givingParagraph').should('contain', 'You can contribute to your group with money or other valuables like teaching skills, sharing your time to help someone. The sky is the limit!')

    assertContributionsWidget({
      paymentsTitle: 'Payments received',
      paymentsStatus: 'No members in the group are pledging yet! 😔',
      monetaryTitle: 'You need $100',
      monetaryStatus: 'You will receive $0.',
      nonMonetaryStatus: 'There are no non-monetary contributions.'
    })
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

  it('user1 re-adds the same non monetary contribution', () => {
    addNonMonetaryContribution('Portuguese classes')
    cy.getByDT('givingList', 'ul')
      .get('li.is-editable')
      .should('have.length', 1)
      .should('contain', 'Portuguese classes')
  })

  it('user1 edits the non monetary contribution', () => {
    cy.getByDT('buttonEditNonMonetaryContribution').click()
    cy.getByDT('inputNonMonetaryContribution').clear().type('French classes{enter}')
    assertNonMonetaryEditableValue('French classes')
    // Double check
    assertNonMonetaryEditableValue('French classes')

    cy.getByDT('givingList', 'ul')
      .get('li.is-editable')
      .should('have.length', 1)
      .should('contain', 'French classes')
  })

  it('user1 edits it again but cancel it', () => {
    cy.getByDT('buttonEditNonMonetaryContribution').click()
    cy.getByDT('buttonCancelNonMonetaryContribution').click()
    cy.getByDT('givingList', 'ul')
      .get('li.is-editable')
      .should('have.length', 1)
      .should('contain', 'French classes')
  })

  it('user1 adds 3 more non monetary contributions', () => {
    addNonMonetaryContribution('German classes')
    addNonMonetaryContribution('Russian classes')
    addNonMonetaryContribution('Korean classes')

    cy.getByDT('givingList', 'ul')
      .get('li.is-editable')
      .should('have.length', 4)

    assertContributionsWidget({
      nonMonetaryStatus: 'You are contributing.'
    })
  })

  it('user2 pledges $100 and sees their contributions.', () => {
    cy.giSwitchUser(`user2-${userId}`, { bypassUI: false })

    const graphicLegend = [
      'Total Pledged$100',
      'Needed Pledges$0'
    ]
    updateIncome(100, false, graphicLegend, '$100 to Greg')

    cy.get(elReceivingFirst)
      .should('contain', 'French classes by Greg')

    cy.get('.receiving .c-contribution-list')
      .should('have.length', 4)
  })

  it('user2 adds 2 non monetary contribution', () => {
    addNonMonetaryContribution('Korean classes')
    addNonMonetaryContribution('French classes')

    cy.get('.giving .c-contribution-list')
      .should('have.length', 3)

    assertContributionsWidget({
      paymentsSummary: ' ', // TODO - just confirm it exists for now.
      monetaryTitle: 'You are pledging $100',
      monetaryStatus: '$100 will be used.',
      nonMonetaryStatus: 'You and 1 other members are contributing.'
    })
  })

  it('user3 pledges $100 and sees who they are pledging to - $50 to user1 (Greg)', () => {
    cy.giSwitchUser(`user3-${userId}`, { bypassUI: false })
    const graphicLegend = [
      'Total Pledged$200',
      'Needed Pledges$0'
    ]
    updateIncome(100, false, graphicLegend, '$50 to Greg')
  })

  it('user4 and user2 increase their pledges to $500 each. user1 sees the receiving contributions from 3 members.', () => {
    cy.giSwitchUser(`user4-${userId}`, { bypassUI: false })
    const graphicLegend4 = [
      'Total Pledged$700',
      'Needed Pledges$0',
      'Surplus$600'
    ]
    updateIncome(500, false, graphicLegend4, '$71.43 to Greg')
    addNonMonetaryContribution('Korean classes')

    cy.giSwitchUser(`user2-${userId}`)
    const graphicLegend2 = [
      'Total Pledged$1100',
      'Needed Pledges$0',
      'Surplus$1000'
    ]
    updateIncome(500, false, graphicLegend2, '$45.45 to Greg')

    cy.giSwitchUser(`user1-${userId}`)

    cy.getByDT('contributionsLink').click()
    cy.get(elReceivingFirst).should('contain', '$100 from 3 members')

    assertContributionsWidget({
      paymentsSummary: ' ', // TODO - just confirm it exists for now.
      monetaryTitle: 'You need $100',
      monetaryStatus: 'You will receive $100.',
      nonMonetaryStatus: 'You and 2 other members are contributing.'
    })
  })

  it('user4 and user2 reduced income to $10 and now receive money.', () => {
    cy.giSwitchUser(`user4-${userId}`, { bypassUI: false })
    const graphicLegend4 = [
      'Total Pledged$600',
      'Needed Pledges$0',
      'Surplus$310',
      "You'll receive$190"
    ]
    updateIncome(10, true, graphicLegend4, '$190 by Margarida and Pierre')

    cy.giSwitchUser(`user2-${userId}`, { bypassUI: false })
    const graphicLegend2 = [
      'Total Pledged$100',
      'Needed Pledges$380',
      "You'll receive$39.58"
    ]
    updateIncome(10, true, graphicLegend2, '$39.58 by Pierre')

    assertContributionsWidget({
      paymentsSummary: ' ', // TODO - just confirm it exists for now.
      monetaryTitle: 'You need $190',
      monetaryStatus: 'You will receive $39.58.',
      nonMonetaryStatus: 'You and 2 other members are contributing.'
    })
  })

  it('user3 pledges to all 3 members', () => {
    cy.giSwitchUser(`user3-${userId}`, { bypassUI: false })
    cy.getByDT('contributionsLink').click()

    cy.get(elGivingFirst)
      .should('contain', 'A total of $100 to 3 members')
  })

  it('user1 receives part of what they need', () => {
    cy.giSwitchUser(`user1-${userId}`, { bypassUI: false })
    cy.getByDT('contributionsLink').click()

    cy.get(elReceivingFirst)
      .should('contain', '$20.83 by Pierre')

    assertContributionsWidget({
      paymentsSummary: ' ', // TODO - just confirm it exists for now.
      monetaryTitle: 'You need $100',
      monetaryStatus: 'You will receive $20.83.',
      nonMonetaryStatus: 'You and 2 other members are contributing.'
    })
    cy.giLogout()
  })
})

/*
Summary of the group status so far:
user1
  - needs $100
  - $20.83 by pierre
user2
  - needs $190
  - $39.58 by pierre
user3
  - pledges $100 to user1, user2 and user4
user4
  - needs $190
  - $39.58 by pierre
*/
