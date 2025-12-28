
// Similar to time.js but without the import.
function addTimeToDate (dateOrIsoString, milliseconds) {
  return new Date(new Date(dateOrIsoString).getTime() + milliseconds).toISOString()
}

function humanDate (datems, opts = { month: 'short', day: 'numeric' }) {
  const locale = navigator.languages ? navigator.languages[0] : navigator.language
  return new Date(datems).toLocaleDateString(locale, opts)
}

const API_URL = Cypress.config('baseUrl')
const userId = performance.now().toFixed(20).replace('.', '')
const groupName = 'Dreamers'
const mincome = 1000
const timeStart = Date.now()
const timeOneMonth = 60000 * 60 * 24 * 31
const humanDateToday = humanDate(timeStart)

function setIncomeDetails (doesPledge, incomeAmount) {
  cy.getByDT('contributionsLink').click()
  cy.getByDT('openIncomeDetailsModal').click()
  cy.getByDT(doesPledge ? 'doesntNeedIncomeRadio' : 'needsIncomeRadio').click()
  cy.getByDT('inputIncomeOrPledge').type('{selectall}{del}' + incomeAmount)

  if (!doesPledge) {
    cy.randomPaymentMethodInIncomeDetails()
    cy.randomNonMonetaryInIncomeDetails()
  }

  cy.getByDT('submitIncome').click()
  cy.getByDT('closeModal').should('not.exist')
  cy.url().should('eq', `${API_URL}/app/contributions`)
}

function assertMonthOverviewTitle (title) {
  cy.getByDT('monthOverviewTitle').should('contain', title)
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

function openNotificationCard ({
  notificationsCount = 0, // 0 means not to check number of notifications
  messageToAssert = '',
  clickItem = true
} = {}) {
  cy.getByDT('notificationBell').click()
  cy.getByDT('notificationCard').should('be.visible')

  if (notificationsCount > 0) {
    cy.getByDT('notificationList').within(() => {
      cy.get('ul.c-list').children().should('have.length', notificationsCount)
    })
  }

  return cy.getByDT('notificationCard').within(() => {
    cy.getByDT('notificationList').find('ul > li').as('items')

    if (messageToAssert) {
      cy.get('@items').should('contain', messageToAssert)

      if (clickItem) {
        cy.get('@items').each(($el) => {
          if ($el.text().includes(messageToAssert)) {
            cy.wrap($el).click()
            return false // if the targeting item is found, prematurely leave the loop.
          }
        })
      }
    }
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

    // TODO: move these assertions to unit tests.
    cy.window().its('sbp').then(sbp => {
      // The getters we're going to test.
      const { periodStampGivenDate, periodAfterPeriod, periodBeforePeriod } = sbp('state/vuex/getters')
      const { distributionDate, distributionPeriodLength } = sbp('state/vuex/getters').groupSettings
      const onePeriodLengthBefore = addTimeToDate(distributionDate, -distributionPeriodLength)
      const onePeriodLengthAhead = addTimeToDate(distributionDate, distributionPeriodLength)
      const twoPeriodLengthsAhead = addTimeToDate(distributionDate, distributionPeriodLength * 2)
      const oneSecondAhead = addTimeToDate(distributionDate, 1000)
      const oneSecondBefore = addTimeToDate(distributionDate, -1000)
      /* eslint-disable no-unused-expressions */
      expect(periodStampGivenDate(new Date()) === onePeriodLengthBefore, 1).to.be.true
      expect(periodStampGivenDate(distributionDate) === distributionDate, 2).to.be.true
      expect(periodStampGivenDate(onePeriodLengthAhead) === onePeriodLengthAhead, 3).to.be.true
      expect(periodStampGivenDate(twoPeriodLengthsAhead) === twoPeriodLengthsAhead, 4).to.be.true
      expect(periodStampGivenDate(onePeriodLengthBefore) === onePeriodLengthBefore, 5).to.be.true
      expect(periodStampGivenDate(oneSecondAhead) === distributionDate, 6).to.be.true
      expect(periodStampGivenDate(oneSecondBefore) === onePeriodLengthBefore, 7).to.be.true

      expect(periodAfterPeriod(distributionDate) === onePeriodLengthAhead, 8).to.be.true
      expect(periodAfterPeriod(onePeriodLengthAhead) === twoPeriodLengthsAhead, 9).to.be.true
      expect(periodAfterPeriod(onePeriodLengthBefore) === distributionDate, 10).to.be.true

      expect(periodBeforePeriod(distributionDate) === onePeriodLengthBefore, 11).to.be.true
      expect(periodBeforePeriod(onePeriodLengthAhead) === distributionDate, 12).to.be.true
      expect(periodBeforePeriod(onePeriodLengthBefore) === undefined, 13).to.be.true
      /* eslint-enable no-unused-expressions */
    })
    cy.giLogout({ bypassUI: true })
  })

  it('Three users join the group and add their income details', () => {
    const usernames = [2, 3, 4].map(i => `user${i}-${userId}`)
    const actionsBeforeLogout = [[false, 900], [false, 750], [true, 100]]
      .map(([doesPledge, incomeAmount]) => () => setIncomeDetails(doesPledge, incomeAmount))
    cy.giAcceptMultipleGroupInvites(invitationLinks.anyone, {
      usernames,
      actionBeforeLogout: actionsBeforeLogout,
      existingMemberUsername: `user1-${userId}`,
      groupName,
      bypassUI: true
    })
  })

  it('user1 sends $250 to user3 (total)', () => {
    cy.giLogin(`user1-${userId}`, {
      bypassUI: true,
      toGroupDashboardUponSuccess: false
    })

    // NOTE: TWO HEISENBUGS ARE IN THIS TEST! PLEASE LEAVE THESE COMMENTS FOR FUTURE
    //       REFERENCE IN CASE WE RUN INTO MORE!
    cy.giForceDistributionDateToNow()

    // Period-related getters should also work in a normal period.
    cy.window().its('sbp').then(sbp => {
      const { periodStampGivenDate, periodAfterPeriod, periodBeforePeriod, groupSortedPeriodKeys } = sbp('state/vuex/getters')
      const { distributionDate, distributionPeriodLength } = sbp('state/vuex/getters').groupSettings
      const onePeriodLengthBefore = addTimeToDate(distributionDate, -distributionPeriodLength)
      const onePeriodLengthAhead = addTimeToDate(distributionDate, distributionPeriodLength)
      const twoPeriodLengthsAhead = addTimeToDate(distributionDate, distributionPeriodLength * 2)
      const oneSecondAhead = addTimeToDate(distributionDate, 1000)
      const oneSecondBefore = addTimeToDate(distributionDate, -1000)
      const waitingPeriod = groupSortedPeriodKeys[0]
      /* eslint-disable no-unused-expressions */
      // The provided integers are there to help identify a failed assertion.
      expect(periodStampGivenDate(new Date()) === distributionDate, 1).to.be.true
      expect(periodStampGivenDate(distributionDate) === distributionDate, 2).to.be.true
      expect(periodStampGivenDate(onePeriodLengthAhead) === onePeriodLengthAhead, 3).to.be.true
      expect(periodStampGivenDate(onePeriodLengthBefore) === undefined, 4).to.be.true
      expect(periodStampGivenDate(oneSecondAhead) === distributionDate, 5).to.be.true
      expect(periodStampGivenDate(oneSecondBefore) === waitingPeriod, 6).to.be.true
      expect(periodStampGivenDate(waitingPeriod) === waitingPeriod, 7).to.be.true

      expect(periodAfterPeriod(distributionDate) === onePeriodLengthAhead, 8).to.be.true
      expect(periodAfterPeriod(onePeriodLengthAhead) === twoPeriodLengthsAhead, 9).to.be.true
      expect(periodAfterPeriod(onePeriodLengthBefore) === undefined, 10).to.be.true
      expect(periodAfterPeriod(oneSecondAhead) === onePeriodLengthAhead, 11).to.be.true
      expect(periodAfterPeriod(oneSecondBefore) === distributionDate, 12).to.be.true
      expect(periodAfterPeriod(waitingPeriod) === distributionDate, 13).to.be.true

      expect(periodBeforePeriod(distributionDate) === waitingPeriod, 14).to.be.true
      expect(periodBeforePeriod(onePeriodLengthAhead) === distributionDate, 15).to.be.true
      expect(periodBeforePeriod(onePeriodLengthBefore) === undefined, 16).to.be.true
      expect(periodBeforePeriod(oneSecondAhead) === waitingPeriod, 17).to.be.true
      expect(periodBeforePeriod(oneSecondBefore) === undefined, 18).to.be.true
      expect(periodBeforePeriod(twoPeriodLengthsAhead) === onePeriodLengthAhead, 19).to.be.true
      expect(periodBeforePeriod(waitingPeriod) === undefined, 20).to.be.true
      /* eslint-enable no-unused-expressions */
    })
    cy.getByDT('paymentsLink').click()
    cy.get('[data-test-date]').should('have.attr', 'data-test-date', humanDateToday)

    assertNavTabs(['Todo1', 'Completed'])
    assertMonthOverview([
      ['Payments sent', '0 out of 1'],
      ['Amount sent', '$0 out of $250']
    ])
    cy.window().its('sbp').then(sbp => {
      const { distributionPeriodLength } = sbp('state/vuex/getters').groupSettings
      // Use 'Date.now()' here rather than 'timeStart' since a few seconds have already elapsed.
      const start = humanDate(Date.now())
      const end = humanDate(Date.now() + distributionPeriodLength)
      assertMonthOverviewTitle(`Period: ${start} - ${end}`)
    })

    cy.getByDT('recordPayment').should('be.disabled')
    // NOTE: keep this comment around just to show the lengths we have to go to
    //       to get Cypress tests working consistently sometimes, before figuring
    //       out a cleaner workaround
    // cy.getByDT('payList').within(() => {
    //   cy.getByDT('todoCheck').find('[type="checkbox"]').check({ force: true })
    // })
    // NOTE: this is what I finally settled on to get around a timeout error
    //       related to a nonsensical "detached element" error in Cypress
    cy.getByDT('todoCheck').click({ force: true })
    cy.getByDT('recordPayment').should('not.be.disabled').click()
    cy.getByDT('modal').within(() => {
      cy.getByDT('payRecord').find('tbody').children().should('have.length', 1)
      cy.getByDT('payRow').eq(0).find('input[data-test="amount"]').should('have.value', '250')
      cy.getByDT('payRow').eq(0).find('label[data-test="check"]').click()

      cy.get('button[type="submit"]').click()
      cy.getByDT('successClose').click()
      cy.getByDT('closeModal').should('not.exist')
    })

    assertMonthOverview([
      ['Payments sent', '1 out of 1'],
      ['Amount sent', '$250 out of $250']
    ])

    cy.log('assert payments table is correct')
    assertNavTabs(['Todo', 'Completed'])
    cy.getByDT('link-PaymentRowSent').click()
    cy.getByDT('payList').find('tbody').children().should('have.length', 1)
    cy.getByDT('payList').within(() => {
      cy.getByDT('payRow').eq(0).find('td:nth-child(1)').should('contain', `user3-${userId}`)
      cy.getByDT('payRow').eq(0).find('td:nth-child(2)').should('contain', '$250')
      cy.getByDT('payRow').eq(0).find('td:nth-child(4)').should('contain', humanDateToday)

      cy.log('assert payment detail is correct')
      cy.getByDT('menuTrigger').click()
      cy.getByDT('menuContent').find('menu > li:nth-child(1)').as('btnDetails')
      cy.get('@btnDetails').should('contain', 'Payment details')
      cy.get('@btnDetails').click()
    })

    cy.getByDT('modal').within(() => {
      cy.getByDT('amount').should('contain', '$250')
      cy.getByDT('subtitle').should('contain', `Sent to user3-${userId}`)

      // cy.getByDT('details').find('li:nth-child(2)').should('contain', humanDate(dateToMonthstamp(new Date(timeStart)), { month: 'long', year: 'numeric' }))
      // BUG/TODO: I had to revert Sebin's change from here:
      // https://github.com/okTurtles/group-income/pull/1018/commits/fbb55a22a6c2bf6238a17b4c121272bf5e13014e#r533006646
      // Because suddenly I started to get failing Cypress tests on December 2, 2020
      // on my machine. The UI would produce "December 2020", and this would
      // produce "November 2020":
      // > humanDate('2020-12', { month: 'long', year: 'numeric' })
      // 'November 2020'
      // If I put a single space after the 12, it produces the right date:
      // > humanDate('2020-12 ', { month: 'long', year: 'numeric' })
      // 'December 2020'
      // Not sure how to make this work in all timezones/systems... adding a space
      // after feels hackish/buggy. If anyone knows the "proper" way to do this
      // please fix!
      cy.getByDT('details').find('li:nth-child(2)').should('contain', humanDate(timeStart, { month: 'long', year: 'numeric', day: 'numeric' }))
      cy.getByDT('details').find('li:nth-child(3)').should('contain', '$1,000')
    })
    cy.closeModal()

    cy.log('user3 confirms the received payment')
    cy.giSwitchUser(`user3-${userId}`)
    cy.getByDT('paymentsLink').click()

    cy.getByDT('payList').find('tbody').children().should('have.length', 1)
    cy.getByDT('payList').within(() => {
      cy.getByDT('payRow').eq(0).find('td:nth-child(1)').should('contain', `user1-${userId}`)
      cy.getByDT('payRow').eq(0).find('td:nth-child(2)').should('contain', '$250')
      cy.getByDT('payRow').eq(0).find('td:nth-child(4)').should('contain', humanDateToday)
    })

    assertMonthOverview([
      ['Payments received', '1 out of 1'],
      ['Amount received', '$250 out of $250']
    ])

    cy.log('user3 receives a notification for the payment and clicking on it opens a "Payment details" modal.')
    openNotificationCard({
      notificationsCount: 3,
      messageToAssert: `user1-${userId} sent you a $250 mincome contribution. Review and send a thank you note.`
    })

    cy.getByDT('modal').within(() => {
      cy.getByDT('modal-header-title').should('contain', 'Payment details')
    })
    cy.closeModal()
  })

  it('user3 sends a thank you note to user1 for their payment', () => {
    const thankYouText = 'Thank you for your contribution! It’s going to be super helpful for my programming lessons.'

    cy.log('user3 opens a "Send Thank you" Modal')
    cy.getByDT('paymentsLink').click()
    cy.getByDT('payList').within(() => {
      cy.getByDT('menuTrigger').click()
      cy.getByDT('menuContent').find('menu > li:nth-child(3)').as('btnThankYou')

      cy.get('@btnThankYou').should('contain', 'Send thank you')
      cy.get('@btnThankYou').click()
    })

    cy.getByDT('modal').within(() => {
      cy.getByDT('submitBtn').should('be.disabled')

      cy.get('textarea').type(thankYouText)
      cy.getByDT('submitBtn').should('not.be.disabled').click()

      cy.getByDT('confirmBtn').click()
      cy.getByDT('closeModal').should('not.exist')
    })

    cy.log('user1 receives a notification for a thank you note')
    cy.giSwitchUser(`user1-${userId}`)
    openNotificationCard({
      // no need to check the exact number of notifications but do check if the notification list contains the item for thank-you message.
      notificationsCount: 0,
      messageToAssert: `user3-${userId} sent you a thank you note for your contribution.`
    })

    cy.getByDT('modal-header-title').should('contain', 'Thank you note!') // Hack for "detached DOM" heisenbug https://on.cypress.io/element-has-detached-from-dom
    cy.getByDT('modal').within(() => {
      cy.getByDT('memoLabel').should('contain', `user3-${userId} Note:`)
      cy.getByDT('memo').should('contain', thankYouText)
    })
    cy.closeModal()
  })

  it('user4 sends $50 to user2 (partial)', () => {
    cy.giSwitchUser(`user4-${userId}`)
    cy.getByDT('paymentsLink').click()

    cy.getByDT('todoCheck').click()
    cy.getByDT('recordPayment').click()
    cy.getByDT('modal').within(() => {
      cy.getByDT('payRecord').find('tbody').children().should('have.length', 1)
      cy.getByDT('payRow').eq(0).find('input[data-test="amount"]').as('firstRowAmountInput')

      cy.get('@firstRowAmountInput').should('have.value', '100')
      cy.get('@firstRowAmountInput').clear({ force: true })
      // NOTE: Since this amount input element has a floating element ('$' sign) above it, cypress thinks the <input /> is not visible, which is not true.
      //       So we need to add { force: true } here.
      cy.get('@firstRowAmountInput').type('50', { force: true })

      cy.getByDT('payRow').eq(0).find('label[data-test="check"] input').should('be.checked')

      cy.get('button[type="submit"]').click()
      cy.getByDT('successClose').click()
      cy.getByDT('closeModal').should('not.exist')
    })

    assertNavTabs(['Todo1', 'Completed'])

    assertMonthOverview([
      ['Payments sent', '1 out of 2'],
      ['Amount sent', '$50 out of $100']
    ])

    cy.getByDT('paymentInfo').should('contain', '$50 in total, to 1 member')
    cy.getByDT('payList').within(() => {
      cy.getByDT('payRow').eq(0).find('td:nth-child(3)').should('contain', '$50 out of $100')
    })

    cy.getByDT('link-PaymentRowSent').click()
    cy.getByDT('payList').find('tbody').children().should('have.length', 1)
    cy.getByDT('payList').within(() => {
      cy.getByDT('payRow').eq(0).find('td:nth-child(1)').should('contain', `user2-${userId}`)
      cy.getByDT('payRow').eq(0).find('td:nth-child(2)').should('contain', '$50')
      cy.getByDT('payRow').eq(0).find('td:nth-child(4)').should('contain', humanDateToday)
    })

    cy.log('user2 confirms the received payment')
    cy.giSwitchUser(`user2-${userId}`)
    cy.getByDT('paymentsLink').click()

    cy.getByDT('payList').find('tbody').children().should('have.length', 1)
    cy.getByDT('payList').within(() => {
      cy.getByDT('payRow').eq(0).find('td:nth-child(1)').should('contain', `user4-${userId}`)
      cy.getByDT('payRow').eq(0).find('td:nth-child(2)').should('contain', '$50')
      cy.getByDT('payRow').eq(0).find('td:nth-child(4)').should('contain', humanDateToday)
    })
  })

  it('user1 sends $250 to user3 (again)', () => {
    cy.giSwitchUser(`user1-${userId}`)

    cy.giForceDistributionDateToNow()

    cy.getByDT('paymentsLink').click()
    cy.get('[data-test-date]').should('have.attr', 'data-test-date', humanDateToday)

    assertNavTabs(['Todo1', 'Completed'])
    assertMonthOverview([
      ['Payments sent', '0 out of 1'],
      ['Amount sent', '$0 out of $250']
    ])
    cy.window().its('sbp').then(sbp => {
      const { distributionPeriodLength } = sbp('state/vuex/getters').groupSettings
      // Use 'Date.now()' here rather than 'timeStart' since a few seconds have already elapsed.
      const start = humanDate(Date.now())
      const end = humanDate(Date.now() + distributionPeriodLength)
      assertMonthOverviewTitle(`Period: ${start} - ${end}`)
    })

    cy.getByDT('recordPayment').should('be.disabled')
    cy.getByDT('todoCheck').click({ force: true })
    cy.getByDT('recordPayment').should('not.be.disabled').click()
    cy.getByDT('modal').within(() => {
      cy.getByDT('payRecord').find('tbody').children().should('have.length', 1)
      cy.getByDT('payRow').eq(0).find('input[data-test="amount"]').should('have.value', '250')
      cy.getByDT('payRow').eq(0).find('label[data-test="check"]').click()

      cy.get('button[type="submit"]').click()
      cy.getByDT('successClose').click()
      cy.getByDT('closeModal').should('not.exist')
    })

    assertMonthOverview([
      ['Payments sent', '1 out of 1'],
      ['Amount sent', '$250 out of $250']
    ])

    cy.log('assert payments table is correct again')
    assertNavTabs(['Todo', 'Completed'])
    cy.getByDT('link-PaymentRowSent').click()
    cy.getByDT('payList').find('tbody').children().should('have.length', 2)
    cy.getByDT('payList').within(() => {
      cy.getByDT('payRow').eq(0).find('td:nth-child(1)').should('contain', `user3-${userId}`)
      cy.getByDT('payRow').eq(0).find('td:nth-child(2)').should('contain', '$250')
      cy.getByDT('payRow').eq(0).find('td:nth-child(4)').should('contain', humanDateToday)

      cy.log('assert payment detail is correct')
      cy.getByDT('menuTrigger').eq(0).click()
      cy.getByDT('menuContent').eq(0).find('menu > li:nth-child(1)').as('btnDetails')
      cy.get('@btnDetails').should('contain', 'Payment details')
      cy.get('@btnDetails').click()
    })

    cy.getByDT('modal').within(() => {
      cy.getByDT('amount').should('contain', '$250')
      cy.getByDT('subtitle').should('contain', `Sent to user3-${userId}`)

      cy.getByDT('details').find('li:nth-child(2)').should('contain', humanDate(timeStart, { month: 'long', year: 'numeric', day: 'numeric' }))
      cy.getByDT('details').find('li:nth-child(3)').should('contain', '$1,000')
    })
    cy.closeModal()

    cy.log('user3 confirms the received payment again')
    cy.giSwitchUser(`user3-${userId}`)
    cy.getByDT('paymentsLink').click()

    cy.getByDT('payList').find('tbody').children().should('have.length', 2)
    cy.getByDT('payList').within(() => {
      cy.getByDT('payRow').eq(0).find('td:nth-child(1)').should('contain', `user1-${userId}`)
      cy.getByDT('payRow').eq(0).find('td:nth-child(2)').should('contain', '$250')
      cy.getByDT('payRow').eq(0).find('td:nth-child(4)').should('contain', humanDateToday)
    })

    assertMonthOverview([
      ['Payments received', '1 out of 1'],
      ['Amount received', '$250 out of $250']
    ])

    cy.log('user3 receives a notification for the payment and clicking on it opens a "Payment details" modal.')
    openNotificationCard({
      notificationsCount: 5,
      messageToAssert: `user1-${userId} sent you a $250 mincome contribution. Review and send a thank you note.`
    })

    cy.getByDT('modal').within(() => {
      cy.getByDT('modal-header-title').should('contain', 'Payment details')
    })
    cy.closeModal()
  })

  it('user1 changes their income details to "needing" and sees the correct UI', () => {
    cy.giSwitchUser(`user1-${userId}`)

    setIncomeDetails(false, 950)

    cy.getByDT('paymentsLink').click()

    assertNavTabs(['Received', 'Completed'])
    cy.getByDT('noPayments').should('exist')

    cy.getByDT('link-PaymentRowSent').click()
    cy.getByDT('payList').find('tbody').children().should('have.length', 2)

    assertMonthOverview([
      ['Payments received', '0 out of 0'],
      ['Amount received', '$0 out of $0']
    ])
  })

  it('user1 changes their income details back to "giving" and sees the correct UI', () => {
    setIncomeDetails(true, 250)

    cy.getByDT('paymentsLink').click()
    assertNavTabs(['Todo', 'Completed'])
  })

  it.skip('one month later, user1 sends to user3 the missing $78.57 (test incomplete)', () => {
    cy.clock(timeStart, ['Date'])
    cy.visit('/')
    cy.tick(timeOneMonth)

    cy.giSwitchUser(`user1-${userId}`)
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

    // BUG - Making a late payment does not work as expected.
    // Expected: Remove user3's late payment of $78.57.
    // Reality: The late payment persists and the current month payment is reduced to partial ($100 out of $178.57)
    // Once that is fixed, uncomment the assertions bellow:

    /*
    assertNavTabs(['Todo2', 'Sent3'])
    */
    cy.getByDT('payList').within(() => {
      cy.getByDT('payRow').eq(0).find('td:nth-child(1)').should('contain', 'user2')
      cy.getByDT('payRow').eq(0).find('td:nth-child(2)').should('contain', '$71.43')

      cy.getByDT('payRow').eq(1).find('td:nth-child(1)').should('contain', 'user3')
      cy.getByDT('payRow').eq(1).find('td:nth-child(2)').should('contain', '$178.57')
    })
  })

  it('log out', () => {
    cy.giLogout({ bypassUI: true })
  })
})
