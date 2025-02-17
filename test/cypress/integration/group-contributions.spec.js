const userId = performance.now().toFixed(20).replace('.', '')
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
  cy.getByDT('inputNonMonetaryContribution').should('have.length', 1)
  cy.getByDT('inputNonMonetaryContribution').type(name)
  cy.getByDT('buttonAddNonMonetaryContribution', 'button').click()
  cy.getByDT('buttonAddNonMonetaryContribution', 'button').should('not.exist')

  // Assert the contribution was added to the list once
  cy.getByDT('givingList').should($list => {
    const contribution = $list.find('li').filter((i, item) => {
      return item.textContent.includes(name) && item.getAttribute('data-test') === 'editable'
    })
    expect(contribution).to.have.length(1)
  })
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
  cy.getByDT(needsIncome ? 'needsIncomeRadio' : 'doesntNeedIncomeRadio').click()
  cy.getByDT('inputIncomeOrPledge').type('{selectall}{del}' + newIncome)

  assertGraphicSummary(graphicLegend)

  if (needsIncome) {
    // entering the payment details is mandatory for 'needsIncome'
    cy.randomPaymentMethodInIncomeDetails()
  }

  cy.getByDT('submitIncome').click()
  cy.getByDT('closeModal').should('not.exist') // make sure the modal closes.

  const elIncomeStatus = needsIncome ? elReceivingFirst : elGivingFirst
  cy.get(elIncomeStatus).should('contain', incomeStatus)
}

describe('Contributions', () => {
  const invitationLinks = {}

  it('user1 creates a group', () => {
    cy.visit('/')
    cy.giSignup(`user1-${userId}`, { bypassUI: true })

    cy.giCreateGroup(groupName, { bypassUI: true })

    cy.giSetDisplayName(usersDisplayName[1])

    cy.giGetInvitationAnyone().then(url => {
      invitationLinks.anyone = url
    })

    cy.giLogout({ bypassUI: true })
  })

  it('user2, user3 and user4 join the group', () => {
    const usernames = [2, 3, 4].map(i => `user${i}-${userId}`)
    const displayNames = [2, 3, 4].map(i => usersDisplayName[i])
    cy.giAcceptMultipleGroupInvites(invitationLinks.anyone, {
      usernames,
      displayNames,
      existingMemberUsername: `user1-${userId}`,
      groupName,
      bypassUI: true
    })

    cy.giLogin(`user1-${userId}`, { bypassUI: true })
  })

  it('user1 fills their Income Details - pledges $500', () => {
    cy.getByDT('contributionsLink').click()
    cy.getByDT('addIncomeDetailsCard').should('contain', 'Add your income details')

    cy.getByDT('openIncomeDetailsModal').click()
    // Make sure only radio box to select the type is visible at the begining
    cy.getByDT('introIncomeOrPledge').should('not.exist')

    cy.getByDT('doesntNeedIncomeRadio').click()
    // Make sure the user is aksed how much he want to pledge
    cy.getByDT('introIncomeOrPledge').should('contain', 'How much do you want to pledge?')

    assertGraphicSummary([
      'Total Pledged$0',
      'Needed Pledges$0'
    ])

    // Users should be allowed to pledge 0 (see #1027).
    cy.getByDT('inputIncomeOrPledge').type('0')
    cy.getByDT('badIncome').should('not.be.visible')

    // Users should not be allowed to pledge a negative amount.
    cy.getByDT('inputIncomeOrPledge').type('{selectall}{del}-50')
    cy.getByDT('badIncome').should('be.visible')
      .and('contain', 'Oops, you entered a negative number')

    assertGraphicSummary([
      'Total Pledged$0',
      'Needed Pledges$0'
    ])

    cy.getByDT('inputIncomeOrPledge').type('{selectall}{del}' + 500)

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
      paymentsStatus: 'The distribution period begins on:', // distribution period hasn't started at this point
      monetaryTitle: 'You are pledging $500',
      monetaryStatus: '$0 will be used.',
      nonMonetaryStatus: 'There are no non-monetary contributions.'
    })
  })

  it('user1 decides to switch income details to needing $100 and add a payment info', () => {
    cy.getByDT('openIncomeDetailsModal').click()
    cy.getByDT('needsIncomeRadio').click()
    // After swithing to need income, it should ask user how much he need
    cy.getByDT('introIncomeOrPledge').should('contain', 'What\'s your monthly income?')
    cy.getByDT('inputIncomeOrPledge').type(500)
    // It should not let user ask for money if he has more than the basic income
    cy.getByDT('badIncome').should('contain', 'Your income must be lower than the group mincome')
    cy.getByDT('inputIncomeOrPledge').type('{selectall}{del}' + 100)
    // After updating the income under the limit it should hide the error message
    cy.getByDT('badIncome').should('not.be.visible')

    assertGraphicSummary([
      'Total Pledged$0',
      'Needed Pledges$100'
    ])

    cy.getByDT('submitIncome').click()
    // When 'need income' is selected, payment details is requried.
    cy.getByDT('feedbackMsg').should('contain', 'Payment details required. Please let people know how they can pay you.')

    // Fill out the payment details (bitcoin)
    cy.getByDT('paymentMethods').within(() => {
      cy.getByDT('fields', 'ul').children().should('have.length', 1)

      cy.log('Fill the 1º payment method (bitcoin)')
      cy.getByDT('method').within(() => {
        cy.getByDT('remove', 'button').should('not.be.visible')
        cy.get('select')
          .should('have.value', null)
          .select('bitcoin')
        cy.get('input').type('h4sh-t0-b3-s4ved')
        cy.getByDT('remove', 'button').should('be.visible')
      })
    })

    cy.getByDT('submitIncome').click()

    // When 'need income' is selected, at least 1 non-monetary contribution is mandatory
    cy.getByDT('badPledges').should('contain', 'At least one non-monetary pledge is required')
    cy.randomNonMonetaryInIncomeDetails()
    // Adding a non-monetary pledge will clear the error message
    cy.getByDT('badPledges').should('not.be.visible')

    cy.getByDT('submitIncome').click()
    cy.getByDT('closeModal').should('not.exist')

    // After closing the modal it should dislay how much user need
    cy.getByDT('headerNeed').should('contain', 'You need $100')

    // The user should be inform that even if he can't pledge he can still contribute
    cy.getByDT('givingParagraph').should('contain', 'No one needs monetary contributions at the moment. You can still add non-monetary contributions if you would like.')

    assertContributionsWidget({
      paymentsTitle: 'Payments received',
      paymentsStatus: 'The distribution period begins on:', // The distribution period hasn't started yet.
      monetaryTitle: 'You need $100',
      monetaryStatus: 'You will receive $0.',
      nonMonetaryStatus: 'You are contributing.'
    })
  })

  it('user1 adds additional payment info', () => {
    cy.getByDT('openIncomeDetailsModal').click()

    cy.getByDT('paymentMethods').within(() => {
      cy.log('Add a 2º payment method (paypal)')
      cy.getByDT('addMethod', 'button').click()
      cy.getByDT('fields', 'ul').children().should('have.length', 2)

      cy.getByDT('method').eq(1).within(() => {
        cy.getByDT('remove', 'button').should('be.visible')
        cy.get('select').should('have.value', null)
        cy.get('input').should('have.value', '')
        cy.get('select').select('paypal')
        cy.get('input').type('user1-paypal@email.com')
      })

      cy.log('Add a 3º payment method (other)')
      cy.getByDT('addMethod', 'button').click()
      cy.getByDT('fields', 'ul').children().should('have.length', 3)

      cy.getByDT('method').eq(2).within(() => {
        cy.get('select').should('have.value', null)
        cy.get('input').should('have.value', '')
        cy.get('select').select('other')
        cy.get('input').type('IBAN: 12345')
        cy.getByDT('remove', 'button').should('be.visible')
      })

      cy.log('Remove the 2º payment method (paypal)')
      cy.getByDT('method').eq(1).within(() => {
        cy.getByDT('remove', 'button').click()
      })

      cy.getByDT('fields', 'ul').children().should('have.length', 2)

      cy.log('Add a 3º same payment method (other)')
      cy.getByDT('addMethod', 'button').click()
      cy.getByDT('method').eq(2).within(() => {
        cy.get('select').should('have.value', null)
        cy.get('input').should('have.value', '')
        cy.get('select').select('other')
        cy.get('input').type('MBWAY: 91 2345678')
        cy.getByDT('remove', 'button').should('be.visible')
      })
    })

    cy.getByDT('submitIncome').click()
    cy.getByDT('closeModal').should('not.exist')

    cy.log('Verify saved payment info (bitcoin and 2 other)')
    cy.getByDT('openIncomeDetailsModal').click()
    // <BEGIN> HACK FOR A BIZARRE HEISENBUGG!!! </BEGIN>
    // Description: without this, sometimes the payment methods do not appear
    // in the list for some reason, but they re-appear if we close and open the modal
    cy.closeModal()
    cy.getByDT('openIncomeDetailsModal').click()
    // <END> HACK FOR A BIZARRE HEISENBUGG!!! </END>
    cy.getByDT('paymentMethods').within(() => {
      cy.getByDT('fields', 'ul').children().should('have.length', 3)
      cy.getByDT('method').eq(0).within(() => {
        cy.get('select').should('have.value', 'bitcoin')
        cy.get('input').should('have.value', 'h4sh-t0-b3-s4ved')
        cy.getByDT('remove', 'button').should('be.visible')
      })
      cy.getByDT('method').eq(1).within(() => {
        cy.get('select').should('have.value', 'other')
        cy.get('input').should('have.value', 'IBAN: 12345')
        cy.getByDT('remove', 'button').should('be.visible')
      })
      cy.getByDT('method').eq(2).within(() => {
        cy.get('select').should('have.value', 'other')
        cy.get('input').should('have.value', 'MBWAY: 91 2345678')
        cy.getByDT('remove', 'button').should('be.visible')
      })

      cy.log('Try to add a 4º payment method - incompleted !name')
      cy.getByDT('addMethod', 'button').click()
      cy.getByDT('method').eq(3).within(() => {
        cy.get('input').type('mylink.com')
      })
    })

    cy.getByDT('submitIncome').click()
    cy.getByDT('feedbackMsg').should('contain', 'The method name for "mylink.com" is missing.')

    cy.getByDT('paymentMethods').within(() => {
      // Remove the previous incomplete method
      cy.getByDT('method').eq(3).within(() => {
        cy.getByDT('remove', 'button').click()
      })

      cy.log('Try to add a 4º payment method - incompleted !value')
      // Add a new method... incompleted (no value)
      cy.getByDT('addMethod', 'button').click()
      cy.getByDT('method').eq(3).within(() => {
        cy.get('select').select('paypal')
      })
    })

    cy.getByDT('submitIncome').click()
    cy.getByDT('feedbackMsg').should('contain', 'The method "paypal" is incomplete.')

    cy.closeModal()
  })

  it('user1 have their payment info on the profile card', () => {
    cy.getByDT('openProfileCard').click()

    cy.getByDT('profilePaymentMethods').within(() => {
      cy.get('ul').children().should('have.length', 3)
      cy.getByDT('profilePaymentMethod').eq(0).within(() => {
        cy.get('span').eq(0).should('contain', 'bitcoin')
        cy.get('span').eq(1).should('contain', 'h4sh-t0-b3-s4ved')
      })
      cy.getByDT('profilePaymentMethod').eq(1).within(() => {
        cy.get('span').eq(0).should('contain', 'other')
        cy.get('span').eq(1).should('contain', 'IBAN: 12345')
      })
      cy.getByDT('profilePaymentMethod').eq(2).within(() => {
        cy.get('span').eq(0).should('contain', 'other')
        cy.get('span').eq(1).should('contain', 'MBWAY: 91 2345678')
      })
    })
    cy.getByDT('closeProfileCard').click()
  })

  const anotherContribution = 'Portuguese classes'

  it('user1 adds another non-monetary contribution', () => {
    addNonMonetaryContribution(anotherContribution)

    cy.getByDT('givingList', 'ul')
      .get('li.is-editable')
      .should('have.length', 2)
      .should('contain', anotherContribution)
  })

  it('user1 removes a non-monetary contribution', () => {
    cy.getByDT('givingList').find('li').should('have.length', 3) // contributions + cta to add
      .eq(1).within(() => {
        cy.getByDT('buttonEditNonMonetaryContribution').click()
      })

    cy.getByDT('buttonRemoveNonMonetaryContribution').click()
    cy.getByDT('givingList').find('li').should('have.length', 2) // 1 contributon + cta to add
    cy.getByDT('givingParagraph').should('exist')
  })

  it('user1 edits the non monetary contribution', () => {
    cy.getByDT('buttonEditNonMonetaryContribution').click()
    cy.getByDT('inputNonMonetaryContribution').clear()
    cy.getByDT('inputNonMonetaryContribution').type('French classes{enter}')
    cy.giEmptyInvocationQueue() // wait for edits to go through
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

  it('user1 have their payment info on the member list profile card', () => {
    cy.getByDT('dashboard', 'a').click()

    // NOTE: wait until 4 profile cards are fully loaded
    cy.getByDT('openMemberProfileCard', 'img').should('have.length', 4)

    cy.log('The first member card should not contain payment info')
    cy.getByDT('openMemberProfileCard').eq(0).click()
    cy.getByDT('profilePaymentMethods').should('not.exist')
    cy.getByDT('closeProfileCard').click()

    cy.log('The last member card should contain payments info')
    cy.getByDT('openMemberProfileCard').eq(3).click()
    cy.getByDT('profilePaymentMethods').within(() => {
      cy.get('ul').children().should('have.length', 3)
      cy.getByDT('profilePaymentMethod').eq(0).within(() => {
        cy.get('span').eq(0).should('contain', 'bitcoin')
        cy.get('span').eq(1).should('contain', 'h4sh-t0-b3-s4ved')
      })
      cy.getByDT('profilePaymentMethod').eq(1).within(() => {
        cy.get('span').eq(0).should('contain', 'other')
        cy.get('span').eq(1).should('contain', 'IBAN: 12345')
      })
      cy.getByDT('profilePaymentMethod').eq(2).within(() => {
        cy.get('span').eq(0).should('contain', 'other')
        cy.get('span').eq(1).should('contain', 'MBWAY: 91 2345678')
      })
    })

    cy.getByDT('closeProfileCard').click(('topLeft'))
  })

  it('user2 pledges $100 and sees their contributions.', () => {
    cy.giSwitchUser(`user2-${userId}`)

    const graphicLegend = [
      'Total Pledged$100',
      'Needed Pledges$0'
    ]
    updateIncome(100, false, graphicLegend, '$100 to Greg')

    cy.get(elReceivingFirst)
      .should('contain', 'French classes from Greg')

    cy.get('.receiving .c-contribution-list')
      .should('have.length', 4)
  })

  it('user2 adds 2 non monetary contribution', () => {
    addNonMonetaryContribution('Korean classes')
    addNonMonetaryContribution('French classes')

    cy.get('.giving .c-contribution-list')
      .should('have.length', 3)

    assertContributionsWidget({
      paymentsTitle: ' ', // TODO - just confirm it exists for now.
      monetaryTitle: 'You are pledging $100',
      monetaryStatus: '$100 will be used.',
      nonMonetaryStatus: 'You and 1 other member are contributing.'
    })
  })

  it('user3 pledges $100 and sees who they are pledging to - $50 to user1 (Greg)', () => {
    cy.giSwitchUser(`user3-${userId}`)
    const graphicLegend = [
      'Total Pledged$200',
      'Needed Pledges$0'
    ]
    updateIncome(100, false, graphicLegend, '$50 to Greg')
  })

  it('user4 and user2 increase their pledges to $500 each. user1 sees the receiving contributions from 3 members.', () => {
    cy.giSwitchUser(`user4-${userId}`)
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
      paymentsTitle: ' ', // TODO - just confirm it exists for now.
      monetaryTitle: 'You need $100',
      monetaryStatus: 'You will receive $100.',
      nonMonetaryStatus: 'You and 2 other members are contributing.'
    })
  })

  it('user4 and user2 reduced income to $10 and now receive money.', () => {
    cy.giSwitchUser(`user4-${userId}`)
    const graphicLegend4 = [
      'Total Pledged$600',
      'Needed Pledges$0',
      'Surplus$310',
      "You'll receive$190"
    ]
    updateIncome(10, true, graphicLegend4, '$190 from Margarida and Pierre')

    cy.giSwitchUser(`user2-${userId}`)
    const graphicLegend2 = [
      'Total Pledged$100',
      'Needed Pledges$380',
      "You'll receive$39.58"
    ]
    updateIncome(10, true, graphicLegend2, '$39.58 from Pierre')

    assertContributionsWidget({
      paymentsTitle: ' ', // TODO - just confirm it exists for now.
      monetaryTitle: 'You need $190',
      monetaryStatus: 'You will receive $39.58.',
      nonMonetaryStatus: 'You and 2 other members are contributing.'
    })
  })

  it('user3 pledges to all 3 members', () => {
    cy.giSwitchUser(`user3-${userId}`)
    cy.getByDT('contributionsLink').click()

    cy.get(elGivingFirst)
      .should('contain', 'A total of $100 to 3 members')
  })

  it('user1 receives part of what they need', () => {
    cy.giSwitchUser(`user1-${userId}`)
    cy.getByDT('contributionsLink').click()

    cy.get(elReceivingFirst)
      .should('contain', '$20.83 from Pierre')

    assertContributionsWidget({
      paymentsTitle: ' ', // TODO - just confirm it exists for now.
      monetaryTitle: 'You need $100',
      monetaryStatus: 'You will receive $20.83.',
      nonMonetaryStatus: 'You and 2 other members are contributing.'
    })
    cy.giLogout({ bypassUI: true })
  })
})

/*
Summary of the group status so far:
user1
  - needs $100
  - $20.83 from pierre
user2
  - needs $190
  - $39.58 from pierre
user3
  - pledges $100 to user1, user2 and user4
user4
  - needs $190
  - $39.58 from pierre
*/
