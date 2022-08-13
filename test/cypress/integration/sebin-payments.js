// similar to time.js but without the import
export function humanDate (datems, opts = { month: 'short', day: 'numeric' }) {
  const locale = navigator.languages ? navigator.languages[0] : navigator.language
  return new Date(datems).toLocaleDateString(locale, opts)
}

const userId = Math.floor(Math.random() * 10000)
const groupName = 'Dreamers'
const mincome = 1000
const timeStart = Date.now()
// const timeOneMonth = 60000 * 60 * 24 * 31
const humanDateToday = humanDate(timeStart)

function setIncomeDetails (doesPledge, incomeAmount) {
  cy.getByDT('contributionsLink').click()
  cy.getByDT('openIncomeDetailsModal').click()
  cy.getByDT(doesPledge ? 'doesntNeedIncomeRadio' : 'needsIncomeRadio').click()
  cy.getByDT('inputIncomeOrPledge').clear().type(incomeAmount)

  if (!doesPledge) {
    cy.randomPaymentMethodInIncomeDetails()
  }

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

    setIncomeDetails(true, 3000)
    cy.giLogout()
  })

  it('multiple users join the group and add their income details', () => {
    const options = {
      groupName,
      bypassUI: true,
      shouldLogoutAfter: false
    }

    const usersData = [
      { num: 2, doesPledge: false, incomeOrPledgeAmount: 900 },
      { num: 3, doesPledge: false, incomeOrPledgeAmount: 750 },
      { num: 4, doesPledge: false, incomeOrPledgeAmount: 800 },
      { num: 5, doesPledge: false, incomeOrPledgeAmount: 600 },
      { num: 6, doesPledge: true, incomeOrPledgeAmount: 60 }
    ]
    const isLastItem = num => usersData[usersData.length - 1].num === num

    for (const { num, doesPledge, incomeOrPledgeAmount } of usersData) {
      cy.giAcceptGroupInvite(invitationLinks.anyone, { username: `user${num}-${userId}`, ...options })
      setIncomeDetails(doesPledge, incomeOrPledgeAmount)

      if (!isLastItem(num)) {
        cy.giLogout()
      }
    }
  })

  it('user1 sends $250 to user3 (total)', () => {
    cy.giSwitchUser(`user1-${userId}`, { bypassUI: true })

    cy.giForceDistributionDateToNow()

    // cy.getByDT('paymentsLink').click()
    // cy.get('[data-test-date]').should('have.attr', 'data-test-date', humanDateToday)

    // assertNavTabs(['Todo1', 'Sent'])
    // assertMonthOverview([
    //   ['Payments sent', '0 out of 1'],
    //   ['Amount sent', '$0 out of $250']
    // ])

    // cy.getByDT('recordPayment').click()
    // cy.getByDT('modal').within(() => {
    //   cy.getByDT('payRecord').find('tbody').children().should('have.length', 1)
    //   cy.getByDT('payRow').eq(0).find('input[data-test="amount"]').should('have.value', '250')
    //   cy.getByDT('payRow').eq(0).find('label[data-test="check"]').click()

    //   cy.get('button[type="submit"]').click()
    //   cy.getByDT('successClose').click()
    //   cy.getByDT('closeModal').should('not.exist')
    // })

    // assertMonthOverview([
    //   ['Payments sent', '1 out of 1'],
    //   ['Amount sent', '$250 out of $250']
    // ])

    // cy.log('assert payments table is correct')
    // assertNavTabs(['Todo', 'Sent'])
    // cy.getByDT('link-PaymentRowSent').click()
    // cy.getByDT('payList').find('tbody').children().should('have.length', 1)
    // cy.getByDT('payList').within(() => {
    //   cy.getByDT('payRow').eq(0).find('td:nth-child(1)').should('contain', `user3-${userId}`)
    //   cy.getByDT('payRow').eq(0).find('td:nth-child(2)').should('contain', '$250')
    //   cy.getByDT('payRow').eq(0).find('td:nth-child(3)').should('contain', humanDateToday)

    //   cy.log('assert payment detail is correct')
    //   cy.getByDT('menuTrigger').click()
    //   cy.getByDT('menuContent').find('ul > li:nth-child(1)').as('btnDetails')
    //   cy.get('@btnDetails').should('contain', 'Payment details')
    //   cy.get('@btnDetails').click()
    // })

    // cy.getByDT('modal').within(() => {
    //   cy.getByDT('amount').should('contain', '$250')
    //   cy.getByDT('subtitle').should('contain', `Sent to user3-${userId}`)
    //   cy.getByDT('details').find('li:nth-child(2)').should('contain', humanDate(timeStart, { month: 'long', year: 'numeric', day: 'numeric' }))
    //   cy.getByDT('details').find('li:nth-child(3)').should('contain', '$1000')
    // })

    // cy.closeModal()

    // cy.log('user3 confirms the received payment')
    // cy.giSwitchUser(`user3-${userId}`, { bypassUI: true })
    // cy.getByDT('paymentsLink').click()

    // cy.getByDT('payList').find('tbody').children().should('have.length', 1)
    // cy.getByDT('payList').within(() => {
    //   cy.getByDT('payRow').eq(0).find('td:nth-child(1)').should('contain', `user1-${userId}`)
    //   cy.getByDT('payRow').eq(0).find('td:nth-child(2)').should('contain', '$250')
    //   cy.getByDT('payRow').eq(0).find('td:nth-child(3)').should('contain', humanDateToday)
    // })

    // assertMonthOverview([
    //   ['Payments received', '1 out of 1'],
    //   ['Amount received', '$250 out of $250']
    // ])
  })

  it.skip('user4 sends $50 to user2 (partial)', () => {
    cy.giSwitchUser(`user4-${userId}`, { bypassUI: true })
    cy.getByDT('paymentsLink').click()
    cy.getByDT('recordPayment').click()
    cy.getByDT('modal').within(() => {
      cy.getByDT('payRecord').find('tbody').children().should('have.length', 1)
      cy.getByDT('payRow').eq(0).find('input[data-test="amount"]').should('have.value', '100')
      cy.getByDT('payRow').eq(0).find('input[data-test="amount"]').clear({ force: true }).type('50')
      cy.getByDT('payRow').eq(0).find('label[data-test="check"] input').should('be.checked')

      cy.get('button[type="submit"]').click()
      cy.getByDT('successClose').click()
      cy.getByDT('closeModal').should('not.exist')
    })

    assertNavTabs(['Todo1', 'Sent'])

    assertMonthOverview([
      ['Payments sent', '1 out of 2'],
      ['Amount sent', '$50 out of $100']
    ])

    cy.getByDT('payList').within(() => {
      cy.getByDT('payRow').eq(0).find('td:nth-child(2)').should('contain', '$50 out of $100')
    })

    cy.getByDT('link-PaymentRowSent').click()
    cy.getByDT('payList').find('tbody').children().should('have.length', 1)
    cy.getByDT('payList').within(() => {
      cy.getByDT('payRow').eq(0).find('td:nth-child(1)').should('contain', `user2-${userId}`)
      cy.getByDT('payRow').eq(0).find('td:nth-child(2)').should('contain', '$50')
      cy.getByDT('payRow').eq(0).find('td:nth-child(3)').should('contain', humanDateToday)
    })
  })

  it.skip('user1 changes their income details to "needing" and sees the correct UI', () => {
    cy.giSwitchUser(`user1-${userId}`, { bypassUI: true })

    setIncomeDetails(false, 950)

    cy.getByDT('paymentsLink').click()

    assertNavTabs(['Received', 'Sent'])
    cy.getByDT('noPayments').should('exist')

    cy.getByDT('link-PaymentRowSent').click()
    cy.getByDT('payList').find('tbody').children().should('have.length', 1)

    assertMonthOverview([
      ['Payments received', '0 out of 0'],
      ['Amount received', '$0 out of $0']
    ])
  })

  it.skip('user1 changes their income details back to "giving" and sees the correct UI', () => {
    setIncomeDetails(true, 250)

    cy.getByDT('paymentsLink').click()
    assertNavTabs(['Todo', 'Sent'])
  })
})
