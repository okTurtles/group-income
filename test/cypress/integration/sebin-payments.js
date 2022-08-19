/* eslint-disable */

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
      { num: 3, doesPledge: true, incomeOrPledgeAmount: 300 },
      { num: 4, doesPledge: true, incomeOrPledgeAmount: 200 },
      { num: 5, doesPledge: false, incomeOrPledgeAmount: 750 },
      { num: 6, doesPledge: false, incomeOrPledgeAmount: 800 },
      { num: 7, doesPledge: false, incomeOrPledgeAmount: 600 },
      { num: 8, doesPledge: false, incomeOrPledgeAmount: 540 }
    ]
    const isLastItem = num => usersData[usersData.length - 1].num === num

    for (const { num, doesPledge, incomeOrPledgeAmount } of usersData) {
      cy.giAcceptGroupInvite(invitationLinks.anyone, { username: `user${num}-${userId}`, ...options })
      setIncomeDetails(doesPledge, incomeOrPledgeAmount)

      if (!isLastItem(num)) {
        cy.giLogout()
      }
    }

    cy.giSwitchUser(`user1-${userId}`, { bypassUI: true })
    cy.giForceDistributionDateToNow()
  })
})
