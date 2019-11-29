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

function updateIncome (newIncome, needsIncome, incomeStatus) {
  cy.getByDT('contributionsLink').click()
  cy.getByDT('openIncomeDetailModal').click()
  cy.getByDT(needsIncome ? 'needsIncomeRadio' : 'dontNeedsIncomeRadio').click()
  cy.getByDT('inputIncomeOrPledge').clear().type(newIncome)
  cy.getByDT('submitIncome').click()
  cy.getByDT('closeModal').should('not.exist') // make sure the modal closes.

  if (needsIncome) {
    cy.get(elReceivingFirst).should('contain', incomeStatus)
  } else {
    cy.get(elGivingFirst).should('contain', incomeStatus)
  }
}

describe('Payments', () => {
  const invitationLinks = {}

  it('user1 creates a group', () => {
    cy.visit('/')

    cy.giSignup(`user1-${userId}`)

    cy.giCreateGroup(groupName)

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
      })
    }

    cy.giLogin(`user1-${userId}`)
  })

  it('user1 fills their Income Details - pledges $500', () => {
    cy.getByDT('contributionsLink').click()
    cy.getByDT('addIncomeDetailsFirstCard').should('contain', 'Add your income details')

    cy.getByDT('openIncomeDetailModal').click()
    // Make sure only radio box to select the type is visible at the begining
    cy.getByDT('introIncomeOrPledge').should('not.be.visible')

    cy.getByDT('dontNeedsIncomeRadio').click()
    // Make sure the user is aksed how much he want to pledge
    cy.getByDT('introIncomeOrPledge').should('contain', 'How much do you want to pledge?')
    cy.getByDT('inputIncomeOrPledge').type(500)
    cy.getByDT('submitIncome').click()
    // After selecting the amount and close the modal make sure it show that no one is in need
    cy.getByDT('receivingParagraph').should('contain', 'When other members pledge a monetary or non-monetary contribution, they will appear here.')
    cy.getByDT('givingParagraph').should('contain', 'No one needs monetary contributions at the moment. You can still add non-monetary contributions if you would like.')
  })

  it('user1 decides to switch income details to needing $100', () => {
    cy.visit('/app/contributions')

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
  })

  it('user2 pledges $100 and sees their contributions.', () => {
    cy.giSwitchUser(`user2-${userId}`)
    updateIncome(100, false, '$100 to Greg')

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
  })

  it('user3 pledges $100 and sees who they are pledging to - $50 to user1 (Greg)', () => {
    cy.giSwitchUser(`user3-${userId}`)
    updateIncome(100, false, '$50 to Greg')
  })

  it('user4 and user2 change their pledges to $500 each. user1 sees the receiving contributions from 3 members.', () => {
    cy.giSwitchUser(`user4-${userId}`)
    updateIncome(500, false, '$71 to Greg')
    addNonMonetaryContribution('Korean classes')

    cy.giSwitchUser(`user2-${userId}`)
    updateIncome(500, false, '$45 to Greg')

    cy.giSwitchUser(`user1-${userId}`)

    cy.getByDT('contributionsLink').click()
    cy.get(elReceivingFirst).should('contain', '$100 from 3 members')
  })

  it('user4 and user2 reduced income to $10 and now receive money.', () => {
    cy.giSwitchUser(`user4-${userId}`)
    updateIncome(10, true, '$190 by Margarida and Pierre')

    cy.giSwitchUser(`user2-${userId}`)
    // NOTE: They both have the same income of $10, why user2 receives less?
    updateIncome(10, true, '$40 by Pierre')
  })

  it('user3 receives monetary contribution from 3 members', () => {
    cy.giSwitchUser(`user3-${userId}`)
    cy.getByDT('contributionsLink').click()

    cy.get(elGivingFirst)
      .should('contain', 'A total of $100 to 3 members')
  })

  it('user4 sees the pledging graphic with the correct data', () => {
    cy.giSwitchUser(`user4-${userId}`)

    // TODO - basic tests to cover graphic features.

    cy.giLogout()
  })
})

/*
user1
  - needs $100
  - $21 by pierre
user2
  - needs $190
  - $40 by pierre
user3
  - pledges $100
  - to user1, user2 and user4
user4
  - needs $190
  - $40 by pierre

Graphic for user4:

goal: 100 + 190 + userincomeneeded
totalPledge: grouppledge + userpledge
needed: total - goal
surplus: goal - totalPledge
*/
