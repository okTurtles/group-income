const userId = Math.floor(Math.random() * 10000)
const groupName = 'Dreamers'
const mincome = 1000
const timeStart = Date.UTC(2020, 1, 10)

function addIncome (doesPledge, incomeAmount) {
  cy.getByDT('contributionsLink').click()
  cy.getByDT('openIncomeDetailsModal').click()
  cy.getByDT(doesPledge ? 'doesntNeedIncomeRadio' : 'needsIncomeRadio').click()
  cy.getByDT('inputIncomeOrPledge').clear().type(incomeAmount)
  cy.getByDT('submitIncome').click()
  cy.getByDT('closeModal').should('not.exist')
}

function assertPaymentsTabs (tabs) {
  cy.getByDT('payNav').children().should('have.length', tabs.length)
  cy.getByDT('payNav').within(() => {
    for (let i = 0; i < tabs.length; i++) {
      cy.get('button').eq(i).should('contain', tabs[i])
    }
  })
}

describe('Group Payments', () => {
  const invitationLinks = {}

  beforeEach(() => {
    cy.clock(timeStart, ['Date'])
  })

  it('user1 creates a group', () => {
    cy.visit('/')

    cy.giSignup(`user1-${userId}`, { bypassUI: true })
    cy.giCreateGroup(groupName, { mincome, bypassUI: true })
    cy.giGetInvitationAnyone().then(url => {
      invitationLinks.anyone = url
    })

    addIncome(true, 250)
    cy.giLogout()
  })

  it('Three users join the group and add their income details', () => {
    cy.giAcceptGroupInvite(invitationLinks.anyone, {
      username: `user2-${userId}`,
      groupName,
      bypassUI: true,
      actionBeforeLogout: () => {
        addIncome(false, 900)
      }
    })

    cy.giAcceptGroupInvite(invitationLinks.anyone, {
      username: `user3-${userId}`,
      groupName,
      bypassUI: true,
      actionBeforeLogout: () => {
        addIncome(false, 750)
      }
    })

    cy.giAcceptGroupInvite(invitationLinks.anyone, {
      username: `user4-${userId}`,
      groupName,
      bypassUI: true,
      shouldLogoutAfter: false,
      actionBeforeLogout: () => {
        addIncome(true, 100)
      }
    })
  })

  it('user1 sends to user2 $71.43 (total)', () => {
    cy.giSwitchUser(`user1-${userId}`, { bypassUI: true })

    cy.getByDT('paymentsLink').click()
    cy.get('[data-test-date]').should('have.attr', 'data-test-date', 'Feb 10')

    assertPaymentsTabs(['Todo2', 'Sent'])

    cy.getByDT('recordPayment').click()
    cy.getByDT('modal').within(() => {
      cy.getByDT('payRecord').find('tbody').children().should('have.length', 2)
      cy.getByDT('payRow').eq(0).find('input[data-test="amount"]').should('have.value', '71.43')
      cy.getByDT('payRow').eq(0).find('label[data-test="check"]').click()

      cy.get('button[type="submit"]').click()
      cy.getByDT('successClose').click()
      cy.getByDT('closeModal').should('not.exist')
    })
    assertPaymentsTabs(['Todo1', 'Sent1'])

    // TODO - assert user2 received the payment.
  })

  it('user1 sends to user3 $100 (partial)', () => {
    cy.getByDT('recordPayment').click()
    cy.getByDT('modal').within(() => {
      cy.getByDT('payRecord').find('tbody').children().should('have.length', 1)
      cy.getByDT('payRow').eq(0).find('input[data-test="amount"]').should('have.value', '178.57')
      cy.getByDT('payRow').eq(0).find('input[data-test="amount"]').clear({ force: true }).type('100')
      cy.getByDT('payRow').eq(0).find('label[data-test="check"] input').should('be.checked')

      cy.get('button[type="submit"]').click()
      cy.getByDT('successClose').click()
      cy.getByDT('closeModal').should('not.exist')
    })

    assertPaymentsTabs(['Todo1', 'Sent2'])

    cy.getByDT('payList').within(() => {
      cy.getByDT('payRow').eq(0).find('td:nth-child(2)').should('contain', '$78.57 out of $178.57')
    })

    // TODO - assert user3 received the payment.
  })

  it('one month later, user1 sends to user3 the missing $78.57 (test incomplete)', () => {
    cy.visit('/')
    cy.tick(60000 * 60 * 24 * 31) // time travel 1 month later
    cy.getByDT('paymentsLink').click()
    cy.get('[data-test-date]').should('have.attr', 'data-test-date', 'Mar 12')

    // BUG - The payments are incorrect. The getter ourPayments.late logic is wrong.
    /*
    assertPaymentsTabs(['Todo3', 'Sent2'])
    */
    // TODO: Assert each payment data. 1 late (Feb 29) and 2 new (Mar 31).
    /*
    cy.getByDT('recordPayment').click()
    cy.getByDT('modal').within(() => {
      cy.getByDT('payRecord').find('tbody').children().should('have.length', 3)
      cy.log('Verify and tick the late payment - user2')
      cy.getByDT('payRow').eq(0).find('input[data-test="amount"]').should('have.value', '78.57')
      // cy.getByDT('payRow').eq(0).find('[data-test="isPartial"]').should('exist') // TODO this
      cy.getByDT('payRow').eq(0).find('[data-test="isLate"]').should('exist')
      cy.getByDT('payRow').eq(0).find('label[data-test="check"]').click()

      cy.log('Record one payment')
      cy.get('button[type="submit"]').click()
      cy.getByDT('successClose').click()
      cy.getByDT('closeModal').should('not.exist')
    })
    */

    // BUG - Making a late payment does not work as expected.
    // Expected: Remove user3's late payment of $78.57.
    // Reality: The late payment persists and the current month payment is reduced to partial ($100 out of $178.57)
    // Once that is fixed, uncomment the assertions bellow:

    /*
    assertPaymentsTabs(['Todo2', 'Sent3'])
    cy.getByDT('payList').within(() => {
      cy.getByDT('payRow').eq(0).find('td:nth-child(1)').should('contain', 'user2')
      cy.getByDT('payRow').eq(0).find('td:nth-child(2)').should('contain', '$71.43')

      cy.getByDT('payRow').eq(1).find('td:nth-child(1)').should('contain', 'user3')
      cy.getByDT('payRow').eq(1).find('td:nth-child(2)').should('contain', '$178.57')
    })
    */

    cy.giLogout()
  })
})
