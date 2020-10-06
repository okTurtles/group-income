
// Similar to time.js but without the import.
export function humanDate (datems, opts = { month: 'short', day: 'numeric' }) {
  const locale = navigator.languages ? navigator.languages[0] : navigator.language
  return new Date(datems).toLocaleDateString(locale, opts)
}

const userId = Math.floor(Math.random() * 10000)
const groupName = 'Dreamers'
const mincome = 1000
const timeStart = Date.now()
const timeOneMonth = 60000 * 60 * 24 * 31
const humanDateToday = humanDate(timeStart)

function setIncomeDetails (doesPledge, incomeAmount) {
  cy.getByDT('contributionsLink').click()
  cy.getByDT('openIncomeDetailsModal').click()
  cy.getByDT(doesPledge ? 'doesntNeedIncomeRadio' : 'needsIncomeRadio').click()
  cy.getByDT('inputIncomeOrPledge').clear().type(incomeAmount)
  cy.getByDT('submitIncome').click()
  cy.getByDT('closeModal').should('not.exist')
  cy.url().should('eq', 'http://localhost:8000/app/contributions')
}

function assertNavTabs (tabs) {
  cy.getByDT('payNav').children().should('have.length', tabs.length)
  cy.getByDT('payNav').within(() => {
    for (let i = 0; i < tabs.length; i++) {
      cy.get('button').eq(i).should('contain', tabs[i])
    }
  })
}

function assertMonthOverview (items) {
  cy.log('MonthOverview values are correct')
  cy.getByDT('monthOverview').within(() => {
    items.forEach((texts, i) => {
      cy.get(`ul > li:nth-child(${i + 1})`).should('contain', texts.join(''))
    })
  })
}

describe('Group Payments', () => {
  const invitationLinks = {}

  it('user1 creates a group', () => {
    cy.visit('/')

    cy.giSignup(`user1-${userId}`, { bypassUI: true })
    cy.giCreateGroup(groupName, { mincome, bypassUI: true })
    cy.giGetInvitationAnyone().then(url => {
      invitationLinks.anyone = url
    })

    setIncomeDetails(true, 250)
    cy.giLogout()
  })

  it('Three users join the group and add their income details', () => {
    const options = { groupName, bypassUI: true, shouldLogoutAfter: false }
    cy.giAcceptGroupInvite(invitationLinks.anyone, { username: `user2-${userId}`, ...options })
    setIncomeDetails(false, 900)
    cy.giLogout()

    cy.giAcceptGroupInvite(invitationLinks.anyone, { username: `user3-${userId}`, ...options })
    setIncomeDetails(false, 750)
    cy.giLogout()

    cy.giAcceptGroupInvite(invitationLinks.anyone, { username: `user4-${userId}`, ...options })
    setIncomeDetails(true, 100)
  })

  it('user1 sends $71.43 to user2 (total)', () => {
    cy.giSwitchUser(`user1-${userId}`, { bypassUI: true })

    cy.getByDT('paymentsLink').click()
    cy.get('[data-test-date]').should('have.attr', 'data-test-date', humanDateToday)

    assertNavTabs(['Todo2', 'Sent'])
    assertMonthOverview([
      ['Payments sent', '0 out of 2'],
      ['Amount sent', '$0 out of $250']
    ])

    cy.getByDT('recordPayment').click()
    cy.getByDT('modal').within(() => {
      cy.getByDT('payRecord').find('tbody').children().should('have.length', 2)
      cy.getByDT('payRow').eq(0).find('input[data-test="amount"]').should('have.value', '71.43')
      cy.getByDT('payRow').eq(0).find('label[data-test="check"]').click()

      cy.get('button[type="submit"]').click()
      cy.getByDT('successClose').click()
      cy.getByDT('closeModal').should('not.exist')
    })

    assertMonthOverview([
      ['Payments sent', '1 out of 2'],
      ['Amount sent', '$71.43 out of $250']
    ])

    cy.log('assert payments table is correct')
    assertNavTabs(['Todo1', 'Sent'])
    cy.getByDT('link-PaymentRowSent').click()
    cy.getByDT('payList').find('tbody').children().should('have.length', 1)
    cy.getByDT('payList').within(() => {
      cy.getByDT('payRow').eq(0).find('td:nth-child(1)').should('contain', `user2-${userId}`)
      cy.getByDT('payRow').eq(0).find('td:nth-child(2)').should('contain', '$71.43')
      cy.getByDT('payRow').eq(0).find('td:nth-child(3)').should('contain', humanDateToday)

      cy.log('assert payment detail is correct')
      cy.getByDT('menuTrigger').click()
      cy.getByDT('menuContent').find('ul > li:nth-child(1)').as('btnDetails')
      cy.get('@btnDetails').should('contain', 'Payment details')
      cy.get('@btnDetails').click()
    })

    cy.getByDT('modal').within(() => {
      cy.getByDT('amount').should('contain', '$71.43')
      cy.getByDT('subtitle').should('contain', `Sent to user2-${userId}`)

      cy.getByDT('details').find('li:nth-child(2)').should('contain', humanDate(timeStart, { month: 'long', year: 'numeric' }))
      cy.getByDT('details').find('li:nth-child(3)').should('contain', '$1000')
    })
    cy.closeModal()

    cy.log('user2 confirms the received payment')
    cy.giSwitchUser(`user2-${userId}`, { bypassUI: true })
    cy.getByDT('paymentsLink').click()

    cy.getByDT('payList').find('tbody').children().should('have.length', 1)
    cy.getByDT('payList').within(() => {
      cy.getByDT('payRow').eq(0).find('td:nth-child(1)').should('contain', `user1-${userId}`)
      cy.getByDT('payRow').eq(0).find('td:nth-child(2)').should('contain', '$71.43')
      cy.getByDT('payRow').eq(0).find('td:nth-child(3)').should('contain', humanDateToday)
    })

    assertMonthOverview([
      ['Payments received', '1 out of 2'],
      ['Amount received', '$71.43 out of $100']
    ])
  })

  it('user1 sends $100 to user3 (partial)', () => {
    cy.giSwitchUser(`user1-${userId}`, { bypassUI: true })
    cy.getByDT('paymentsLink').click()
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

    assertNavTabs(['Todo1', 'Sent'])

    assertMonthOverview([
      ['Payments sent', '1 out of 2'],
      ['Amount sent', '$171.43 out of $250']
    ])

    cy.getByDT('payList').within(() => {
      cy.getByDT('payRow').eq(0).find('td:nth-child(2)').should('contain', '$78.57 out of $178.57')
    })

    cy.getByDT('link-PaymentRowSent').click()
    cy.getByDT('payList').find('tbody').children().should('have.length', 2)
    cy.getByDT('payList').within(() => {
      cy.getByDT('payRow').eq(1).find('td:nth-child(1)').should('contain', `user3-${userId}`)
      cy.getByDT('payRow').eq(1).find('td:nth-child(2)').should('contain', '$100')
      cy.getByDT('payRow').eq(1).find('td:nth-child(3)').should('contain', humanDateToday)
    })

    cy.log('user3 confirms the received payment')
    cy.giSwitchUser(`user3-${userId}`, { bypassUI: true })
    cy.getByDT('paymentsLink').click()

    cy.getByDT('payList').find('tbody').children().should('have.length', 1)
    cy.getByDT('payList').within(() => {
      cy.getByDT('payRow').eq(0).find('td:nth-child(1)').should('contain', `user1-${userId}`)
      cy.getByDT('payRow').eq(0).find('td:nth-child(2)').should('contain', '$100')
      cy.getByDT('payRow').eq(0).find('td:nth-child(3)').should('contain', humanDateToday)
    })
  })

  it('user1 changes their income details to "needing" and sees the correct UI', () => {
    cy.giSwitchUser(`user1-${userId}`, { bypassUI: true })

    setIncomeDetails(false, 950)

    cy.getByDT('paymentsLink').click()

    assertNavTabs(['Received', 'Sent'])
    cy.getByDT('noPayments').should('exist')

    cy.getByDT('link-PaymentRowSent').click()
    cy.getByDT('payList').find('tbody').children().should('have.length', 2)

    assertMonthOverview([
      ['Payments received', '0 out of 1'],
      ['Amount received', '$0 out of $12.50']
    ])
  })

  it('user1 changes their income details back to "giving" and sees the correct UI', () => {
    setIncomeDetails(true, 250)

    cy.getByDT('paymentsLink').click()
    assertNavTabs(['Todo1', 'Sent'])
  })

  it('one month later, user1 sends to user3 the missing $78.57 (test incomplete)', () => {
    cy.clock(timeStart, ['Date'])
    cy.visit('/')
    cy.tick(timeOneMonth)

    cy.giSwitchUser(`user1-${userId}`, { bypassUI: true })
    cy.getByDT('paymentsLink').click()
    cy.get('[data-test-date]').should('have.attr', 'data-test-date', humanDate(timeStart + timeOneMonth))

    assertMonthOverview([
      ['Payments sent', '0 out of 2'],
      ['Amount sent', '$0 out of $250']
    ])

    // BUG - The payments are incorrect. The getter ourPayments.late logic is wrong.
    /*
    assertNavTabs(['Todo3', 'Sent2'])
    */
    // TODO: Assert each payment data. 1 late and 2 new.
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
    assertNavTabs(['Todo2', 'Sent3'])
    cy.getByDT('payList').within(() => {
      cy.getByDT('payRow').eq(0).find('td:nth-child(1)').should('contain', 'user2')
      cy.getByDT('payRow').eq(0).find('td:nth-child(2)').should('contain', '$71.43')

      cy.getByDT('payRow').eq(1).find('td:nth-child(1)').should('contain', 'user3')
      cy.getByDT('payRow').eq(1).find('td:nth-child(2)').should('contain', '$178.57')
    })
    */

    cy.giLogout()
  })

  // https://github.com/okTurtles/group-income-simple/issues/763#issuecomment-656250338
  it('scenario 1', () => {
    cy.visit('/')

    // Create a group with $1000 mincome and 3 members:
    cy.giSignup(`u1-${userId}`, { bypassUI: true })
    cy.giCreateGroup('Scenario-1 Group', { mincome: 1000, bypassUI: true })

    // We can't use async/await here: https://docs.cypress.io/guides/core-concepts/introduction-to-cypress.html#Commands-Are-Asynchronous
    cy.giGetInvitationAnyone().then(invitationLink => {
      // u1: pledge 100$
      setIncomeDetails(true, 100)
      cy.giLogout()

      // u2: Income 925$ (a.k.a needs $75)
      cy.giAcceptGroupInvite(invitationLink, { username: `u2-${userId}`, bypassUI: true, shouldLogoutAfter: false })
      setIncomeDetails(false, 925)
      cy.giLogout()

      // u3: no income details added.
      cy.giAcceptGroupInvite(invitationLink, { username: `u3-${userId}`, bypassUI: true, shouldLogoutAfter: false })

      // Login u1 and send $75 to u2. - The payment goes as expected.
      cy.giSwitchUser(`u1-${userId}`, { bypassUI: true })
      cy.getByDT('paymentsLink').click()
      cy.getByDT('recordPayment').click()
      cy.getByDT('modal').within(() => {
        cy.getByDT('payRow').eq(0).find('label[data-test="check"]').click()

        cy.get('button[type="submit"]').click()
        cy.getByDT('successClose').click()
        cy.getByDT('closeModal').should('not.exist')
      })

      // Switch to u3 and add income details: Income 950$ (a.k.a needs $50)
      cy.giSwitchUser(`u3-${userId}`, { bypassUI: true })
      setIncomeDetails(false, 950)

      // Expected: Should receive only $25 from u1 (100 - 75)
      cy.get('.c-contribution-list').should('contain.text', `$25 from u1-${userId}`)

      // Switch to u1 and go to the payments page.
      cy.giSwitchUser(`u1-${userId}`, { bypassUI: true })
      cy.getByDT('paymentsLink').click()

      // It should show 1 payment to u3 of $25.
      cy.get('.c-partial').should('contain.text', '$25 out of $40')

      // The sidebar should say "Amount sent $75 of $100"
      cy.get('ul > :nth-child(2) > p > .has-text-1').should('contain.text', '$75 out of $100')

      cy.giLogout()
    })
  })
})
