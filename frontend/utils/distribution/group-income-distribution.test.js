/* eslint-env mocha */

// For rapid development, run these tests with:
// ./node_modules/.bin/mocha -w -R min --require Gruntfile.js frontend/utils/distribution/group-income-distribution.test.js

import should from 'should'
import { groupIncomeDistributionLogic, groupIncomeDistributionAdjustFirstLogic, groupIncomeDistributionNewLogic, dataToEvents } from './group-income-distribution.js'

function unfoldParameters (json) {
  const newJSON = {}

  newJSON.monthstamp = '2020-11'
  newJSON.adjusted = json.adjusted
  newJSON.mincome = json.mincome

  newJSON.payments = []

  for (const payment in json.payments) {
    for (const from in json.payments[payment]) {
      for (const to in json.payments[payment][from]) {
        newJSON.payments.push({ from: from, to: to, amount: json.payments[payment][from][to] })
      }
    }
  }

  newJSON.profiles = {}

  for (const profile in json.profiles) {
    if (json.profiles[profile].have) {
      newJSON.profiles[profile] = {
        incomeDetailsType: 'pledgeAmount',
        pledgeAmount: json.profiles[profile].have
      }
    } else {
      newJSON.profiles[profile] = {
        incomeDetailsType: 'incomeAmount',
        incomeAmount: json.profiles[profile].need
      }
    }
  }
  json = newJSON

  const allPayments = {}
  const paymentsFrom = {}

  let paymentCount = 0
  for (const p in json.payments) {
    const payment = json.payments[p]
    paymentCount++
    const hash = 'paymentHash' + paymentCount
    allPayments[hash] = {
      'data': {
        amount: payment.amount
      }
    }
    if (!paymentsFrom[payment.from]) paymentsFrom[payment.from] = {}
    if (!paymentsFrom[payment.from][payment.to]) paymentsFrom[payment.from][payment.to] = []
    paymentsFrom[payment.from][payment.to].push(hash)
  }

  const monthlyPayments = {}
  monthlyPayments[json.monthstamp] = {}
  monthlyPayments[json.monthstamp].paymentsFrom = paymentsFrom

  return {
    getters:
    {
      'groupProfiles': json.profiles,
      'currentGroupState': {
        payments: allPayments
      },
      'monthlyPayments': monthlyPayments,
      'groupSettings': {
        'mincomeAmount': json.mincome
      }
    },
    monthstamp: json.monthstamp,
    adjusted: json.adjusted
  }
}

describe('Chunk 0: Adjustment Tests',
  function () {
    it('SCENARIO 1: can distribute income evenly with two users',
      // has no effect for adjustment when there are no payments
      // mincome: 12
      // u1: pledge 10$
      // u2: Income 10$ (a.k.a needs $2)
      // Expected: [{ from: 'u1', to: 'u2', amount: 2 }]
      function () {
        const dist = groupIncomeDistributionAdjustFirstLogic(unfoldParameters(
          {
            mincome: 12,
            profiles: {
              u1: { have: 10 },
              u2: { need: 10 }
            }
          }))
        should(dist).eql([
          { from: 'u1', to: 'u2', amount: 2 }
        ])
      })
    it('SCENARIO 2: ignores existing payments when not adjusted',
      // mincome: 12
      // u1: pledge 10$
      // u2: Income 10$ (a.k.a needs $2)
      // u1: sends u2 $2
      // Expected: [{ from: 'u1', to: 'u2', amount: 2 }]
      function () {
        const dist = groupIncomeDistributionAdjustFirstLogic(unfoldParameters(
          {
            mincome: 12,
            profiles: {
              u1: { have: 10 },
              u2: { need: 10 }
            },
            payments: [
              { u1: { u2: 2 } }
            ]
          }))
        should(dist).eql([
          { from: 'u1', to: 'u2', amount: 2 }
        ])
      })
    it('SCENARIO 3: takes into account payments from this month when adjusted',
      // mincome: 12
      // u1: pledge 10$
      // u2: Income 10$ (a.k.a needs $2)
      // u1: sends u2 $2
      // Expected: []
      function () {
        const dist = groupIncomeDistributionAdjustFirstLogic(unfoldParameters(
          {
            adjusted: true,
            mincome: 12,
            profiles: {
              u1: { have: 10 },
              u2: { need: 10 }
            },
            payments: [
              { u1: { u2: 2 } }
            ]
          }))
        should(dist).eql([])
      }
    )
  }
)
describe('Chunk A: When someone updates their income details', // TODO: first!
  function () {
    it('[SCENARIO 1]: after a payment is already made',
      // Create a group with $1000 mincome and 3 members
      // u1: pledge 100$
      // u2: Income 925$ (a.k.a needs $75)
      // u3: no income details added.
      // Login u1 and send $75 to u2. - The payment goes as expected.
      // Switch to u3 and add income details: Income 950$ (a.k.a needs $50)
      // Expected Result: Should receive only $25 from u1 (100 - 75)
      // Switch to u1 and go to the payments page.
      // Expected Result: It should show 1 payment to u3 of $25. The sidebar should say 'Amount sent $75 of $100'
      function () {
        const dist = groupIncomeDistributionAdjustFirstLogic(unfoldParameters(
          {
            adjusted: true,
            mincome: 1000,
            profiles: {
              u1: { have: 100 },
              u2: { need: 925 },
              u3: { need: 950 }
            },
            payments: [
              { u1: { u2: 75 } }
            ]
          }))
        should(dist).eql([
          { from: 'u1', to: 'u3', amount: 25 }
        ])
      })
    it('[SCENARIO 2]: Create a group with $1000 mincome and 3 members',
      // u1: pledge 100$
      // u2: Income 900$ (a.k.a needs $100)
      // u3: no income details added.
      // Login u1 and send $100 to u2. - The payment goes as expected.
      // Switch to u3 and add income details: Income 950$ (a.k.a needs $50)
      // Expected Result: Should not receive anything from u1 because u1 already pledge all their money to u2.
      // Switch to u1 and go to the payments page.
      // Expected Result: Don't show any 'todo' payments. The sidebar should say 'Amount sent $100 of $100'
      function () {
        const dist = groupIncomeDistributionAdjustFirstLogic(unfoldParameters(
          {
            adjusted: true,
            mincome: 1000,
            profiles: {
              u1: { have: 100 },
              u2: { need: 900 },
              u3: { need: 950 }
            },
            payments: [
              { u1: { u2: 100 } }
            ]
          }))
        should(dist).eql([

        ])
      })
    it('[SCENARIO 3]: Create a group with $1000 mincome and 3 members',
      // u1: pledge 100$
      // u2: Income 950$ (a.k.a needs $50)
      // u3: no income details added.
      // Login u1 and send $25 to u2 (a partial payment). - The payment goes as expected.
      // Switch to u3 and add income details: Income 700$ (a.k.a needs $300)
      // Expected Result: It shows 'You'll receive $75' in the graphic summary. Why? It's the result of 85.71 - (25 - 14.29).The u2 now should only receive $14.29 instead of the needed $50.But u1 already sent $25, so the difference should be discounted from $85.71.
      // Switch to u1 and go to the payments page.
      // Expected Result: most of the $75 would go to u3, and some of it would go to u2
      function () {
        const dist = groupIncomeDistributionAdjustFirstLogic(unfoldParameters(
          {
            adjusted: true,
            mincome: 1000,
            profiles: {
              u1: { have: 100 },
              u2: { need: 950 },
              u3: { need: 700 }
            },
            payments: [
              { u1: { u2: 25 } }
            ]
          }))
        should(dist).eql([
          { from: 'u1', to: 'u2', amount: 5.769230769230769 },
          { from: 'u1', to: 'u3', amount: 69.23076923076924 }
        ])
      })
    it.skip('[SCENARIO 4]:ignores users who updated income after paying and can no longer pay',
      // Create a group with $1000 mincome and 3 members:
      // u1: pledge 100$
      // u2: income 950$ (a.k.a needs $50)
      // u3: income 900$ (a.k.a needs $100)
      // Login u1 and send $50 to u3 (a partial payment). - The payment goes as expected.
      // Change the pledge amount of u1 from $100 to $50.
      // Expected Result: Don't show any payment to u3 because u1 already pledge all their money.
      function () {
        const dist = groupIncomeDistributionAdjustFirstLogic(unfoldParameters(
          {
            adjusted: true,
            mincome: 1000,
            profiles: {
              u1: { have: 100 },
              u2: { need: 950 },
              u3: { need: 900 }
            }
          }))
        should(dist).eql([
          // TODO: it appeas as though the system is passing parameters to our function which do not reflect the change in u1's pledge amount.
        ])
      })
    it('[SCENARIO 4.1 (continuation)]:can distribute money from new members',
      // Invite a new member u4, who can pledge $150.
      // Expected Result #1: u4 should be asked to send $50 to u2 and $50 to u3.
      // Expected Result #2: u3's payments page should say 'Amount received $50 out of $100'.
      // Expected Result #3: u1 should have no 'todo' payments because u1 already pledge all their money.

      function () {
        const dist = groupIncomeDistributionAdjustFirstLogic(unfoldParameters(
          {
            adjusted: true,
            mincome: 1000,
            profiles: {
              u1: { have: 50 },
              u2: { need: 950 },
              u3: { need: 900 },
              u4: { have: 150 }
            },
            payments: [
              { u1: { u3: 50 } }
            ]
          }))
        should(dist).eql([
          { from: 'u4', to: 'u2', amount: 50 },
          { from: 'u4', to: 'u3', amount: 50 }
        ])
      }
    )
  }
)
describe('Chunk B: Changing group mincome',
  function () {
    it('[SCENARIO 1]: Create a group with $1000 mincome and 2 members',
      // u1: pledge 100$
      // u2: Income 950$ (a.k.a needs $50)
      // Change the mincome from $1000 to $500
      // Expected Result: I don't know... we never discussed this.
      function () {
        const dist = groupIncomeDistributionAdjustFirstLogic(unfoldParameters(
          {
            adjusted: true,
            mincome: 500,
            profiles: {
              u1: { have: 100 },
              u2: { need: 950 }
            }
          }))
        should(dist).eql([
          { from: 'u1', to: 'u2', amount: 100 }
        ])
      })
    it('[SCENARIO 2]: Create a group with $500 mincome and 2 members',
      // u1: pledge 100$
      // u2: Income 450$ (a.k.a needs $50)
      // Change the mincome from $500 to $750
      // Expected Result: Same, no idea.
      function () {
        const dist = groupIncomeDistributionAdjustFirstLogic(unfoldParameters(
          {
            adjusted: true,
            mincome: 750,
            profiles: {
              u1: { have: 100 },
              u2: { need: 450 }
            }
          }))
        should(dist).eql([
          { from: 'u1', to: 'u2', amount: 100 }
        ])
      }
    )
  }
)
describe('Chunk C: 4-way distribution tests',
  function () {
    it('[SCENARIO 1]: splits money evenly between two pledgers and two needers',
      // u1: pledge 250$
      // u2: Income 900$ (a.k.a needs $100)
      // u3: Income 759$ (a.k.a needs $250)
      // u4: pledge 250$
      // Expected Result: Same, no idea.
      function () {
        const dist = groupIncomeDistributionAdjustFirstLogic(unfoldParameters(
          {
            adjusted: true,
            mincome: 1000,
            profiles: {
              u1: { have: 250 },
              u2: { need: 900 },
              u3: { need: 750 },
              u4: { have: 250 }
            }
          }))
        should(dist).eql([
          { from: 'u1', to: 'u2', amount: 50 },
          { from: 'u4', to: 'u2', amount: 25 },
          { from: 'u1', to: 'u3', amount: 125 },
          { from: 'u4', to: 'u3', amount: 62.5 }
        ])
      })
    it('[SCENARIO 2]: stops asking user to pay someone they fully paid their share to',
      // u1 fully pays their share to u2
      // Expected Result: Same, no idea.
      function () {
        const dist = groupIncomeDistributionAdjustFirstLogic(unfoldParameters(
          {
            adjusted: true,
            mincome: 1000,
            profiles: {
              u1: { have: 250 },
              u2: { need: 900 },
              u3: { need: 750 },
              u4: { have: 250 }
            },
            payments: [
              { u1: { u2: 50 } }
            ]
          }))
        should(dist).eql([
          // TODO: The full payment does not eliminate the amounts owed by u1 to u2
          { from: 'u1', to: 'u2', amount: 22.22222222222222 },
          { from: 'u4', to: 'u2', amount: 15.4320987654321 },
          { from: 'u1', to: 'u3', amount: 111.1111111111111 },
          { from: 'u4', to: 'u3', amount: 77.16049382716051 }
        ])
      })
    it('[SCENARIO 3]: does not ask users who have paid their full share to pay any more',
      // u1 pays their share to u3
      // Expected Result: Same, no idea.
      function () {
        const dist = groupIncomeDistributionAdjustFirstLogic(unfoldParameters(
          {
            adjusted: true,
            mincome: 1000,
            profiles: {
              u1: { have: 250 },
              u2: { need: 900 },
              u3: { need: 750 },
              u4: { have: 250 }
            },
            payments: [
              { u1: { u2: 50 } },
              { u1: { u3: 125 } }
            ]
          }))
        should(dist).eql([
          // TODO: The full payment does not eliminate the amounts owed by u1 to u3
          { from: 'u1', to: 'u2', amount: 11.538461538461538 },
          { from: 'u4', to: 'u2', amount: 29.585798816568047 },
          { from: 'u1', to: 'u3', amount: 28.846153846153847 },
          { from: 'u4', to: 'u3', amount: 73.96449704142013 }

        ])
      }
    )
  }
)
describe('group income distribution logic', function () {
  it('can distribute income evenly with two users', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 12,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' }
      }
    })
    should(dist).eql([
      { amount: 2, from: 'u1', to: 'u2' }
    ])
  })

  it('has no effect for adjustment when there are no payments', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 12,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {},
        monthlyPayments: {}
      }
    })
    should(dist).eql([
      { amount: 2, from: 'u1', to: 'u2' }
    ])
  })

  it('ignores existing payments when not adjusted', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 12,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' }
      }
    })
    should(dist).eql([
      { amount: 2, from: 'u1', to: 'u2' }
    ])
  })

  it('takes into account payments from this month when adjusted', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 12,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 2, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u2': ['payment1'] }
            }
          }
        }
      }
    })
    should(dist).eql([])
  })

  it('[scenario 1]', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 925, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 75, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u2': ['payment1'] }
            }
          }
        }
      }
    })
    should(dist).eql([
      { amount: 25, from: 'u1', to: 'u3' }
    ])
  })

  it('[scenario 2]', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 100, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u2': ['payment1'] }
            }
          }
        }
      }
    })
    should(dist).eql([])
  })

  it('[scenario 3] redistributes excess of todo-payments back into other todo-payments', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 700, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 25, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u2': ['payment1'] }
            }
          }
        }
      }
    })
    should(dist).eql([
      { amount: 75, from: 'u1', to: 'u3' }
    ])
  })

  it('[scenario 4] ignores users who updated income after paying and can no longer pay', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 50, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u3': ['payment1'] }
            }
          }
        }
      }
    })
    should(dist).eql([])
  })

  it('[scenario 4.1] can distribute money from new members', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 150, joinedDate: '2020-10-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 50, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u3': ['payment1'] }
            }
          }
        }
      }
    })
    should(dist).eql([
      { amount: 50, from: 'u4', to: 'u2' },
      { amount: 50, from: 'u4', to: 'u3' }
    ])
  })

  it('splits money evenly between two pledgers and two needers', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 250, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 750, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {},
        monthlyPayments: {}
      }
    })
    should(dist).eql([
      { amount: 71.42857143, from: 'u1', to: 'u2' },
      { amount: 178.57142857, from: 'u1', to: 'u3' },
      { amount: 28.57142857, from: 'u4', to: 'u2' },
      { amount: 71.42857143, from: 'u4', to: 'u3' }
    ])
  })

  it('stops asking user to pay someone they fully paid their share to', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 250, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 750, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 71.43, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u2': ['payment1'] }
            }
          }
        }
      }
    })
    should(dist).eql([
      { amount: 178.57, from: 'u1', to: 'u3' },
      { amount: 28.57142857, from: 'u4', to: 'u2' },
      { amount: 71.42857143, from: 'u4', to: 'u3' }
    ])
  })

  it.skip('does not ask users who have paid their full share to pay any more', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 250, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 750, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 71.43, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' },
          'payment2': { amount: 100, exchangeRate: 1, status: 'completed', createdDate: '2020-10-13T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u2': ['payment1'], 'u3': ['payment2'] }
            }
          }
        }
      }
    })
    should(dist).eql([
      { amount: 28.57142857, from: 'u4', to: 'u2' },
      { amount: 71.42857143, from: 'u4', to: 'u3' }
    ])
  })

  describe('using new data->events helper function', function () {
    it('can distribute income evenly with two users', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 10 }
        ],
        needs: [
          { name: 'u2', need: 2 }
        ],
        events: []
      })).eql([
        { amount: 2, from: 'u1', to: 'u2' }
      ])
    })

    it('can distribute income evenly with three users but still have need', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 9 }
        ],
        needs: [
          { name: 'u2', need: 40 },
          { name: 'u3', need: 80 }
        ],
        events: []
      })).eql([
        { amount: 3, from: 'u1', to: 'u2' },
        { amount: 6, from: 'u1', to: 'u3' }
      ])
    })

    it('can distribute income evenly with three users and excess', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 21 }
        ],
        needs: [
          { name: 'u2', need: 4 },
          { name: 'u3', need: 8 }
        ],
        events: []
      })).eql([
        { amount: 4, from: 'u1', to: 'u2' },
        { amount: 8, from: 'u1', to: 'u3' }
      ])
    })

    it('distribute income above mincome proportionally', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'd', have: 10 },
          { name: 'e', have: 30 },
          { name: 'f', have: 60 }
        ],
        needs: [
          { name: 'a', need: 30 },
          { name: 'b', need: 20 }
        ],
        events: []
      })).eql([
        { amount: 3, from: 'd', to: 'a' },
        { amount: 9, from: 'e', to: 'a' },
        { amount: 18, from: 'f', to: 'a' },
        { amount: 2, from: 'd', to: 'b' },
        { amount: 6, from: 'e', to: 'b' },
        { amount: 12, from: 'f', to: 'b' }
      ])
    })

    it('distribute income above mincome proportionally when extra won\'t cover need', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'd', have: 4 },
          { name: 'e', have: 4 },
          { name: 'f', have: 10 }
        ],
        needs: [
          { name: 'a', need: 30 },
          { name: 'b', need: 20 }
        ],
        events: []
      })).eql([
        { amount: 2.4, from: 'd', to: 'a' },
        { amount: 2.4, from: 'e', to: 'a' },
        { amount: 6, from: 'f', to: 'a' },
        { amount: 1.6, from: 'd', to: 'b' },
        { amount: 1.6, from: 'e', to: 'b' },
        { amount: 3.9999999999999996, from: 'f', to: 'b' }
      ])
    })

    it('don\'t distribute anything if no one is above mincome', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [],
        needs: [
          { name: 'a', need: 30 },
          { name: 'b', need: 20 },
          { name: 'd', need: 5 },
          { name: 'e', need: 20 },
          { name: 'f', need: 30 }
        ],
        events: []
      })).eql([
      ])
    })

    it('don\'t distribute anything if everyone is above mincome', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'b', have: 5 },
          { name: 'd', have: 10 },
          { name: 'e', have: 60 },
          { name: 'f', have: 12 }
        ],
        needs: [],
        events: []
      })).eql([
      ])
    })

    it('works with very imprecise splits', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 75 }
        ],
        needs: [
          { name: 'u2', need: 25 },
          { name: 'u3', need: 300 }
        ],
        events: []
      })).eql([
        { amount: 5.769230769230769, from: 'u1', to: 'u2' },
        { amount: 69.23076923076924, from: 'u1', to: 'u3' }
      ])
    })

    it('splits money evenly', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 9 }
        ],
        needs: [
          { name: 'u2', need: 80 },
          { name: 'u3', need: 40 }
        ],
        events: []
      })).eql([
        { amount: 6, from: 'u1', to: 'u2' },
        { amount: 3, from: 'u1', to: 'u3' }
      ])
    })

    it('has no effect for adjustment when there are no payments', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 10 }
        ],
        needs: [
          { name: 'u2', need: 2 }
        ],
        events: []
      })
      should(dist).eql([
        { amount: 2, from: 'u1', to: 'u2' }
      ])
    })

    it('ignores existing payments when not adjusted', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 10 }
        ],
        needs: [
          { name: 'u2', need: 2 }
        ],
        events: []
      })
      should(dist).eql([
        { amount: 2, from: 'u1', to: 'u2' }
      ])
    })

    it('takes into account payments from this month when adjusted', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 10 }
        ],
        needs: [
          { name: 'u2', need: 2 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 2 }
        ]
      })
      should(dist).eql([])
    })

    it('[scenario 1]', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 75 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 75 },
          { type: 'join', name: 'u3', need: 50 }
        ]
      })).eql([
        { amount: 25, from: 'u1', to: 'u3' }
      ])
    })

    it('[scenario 2]', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 100 },
          { name: 'u3', need: 50 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 100 }
        ]
      })
      should(dist).eql([])
    })

    it('[scenario 3] redistributes excess of todo-payments back into other todo-payments', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 50 },
          { name: 'u3', need: 300 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 25 }
        ]
      })
      should(dist).eql([
        { amount: 75, from: 'u1', to: 'u3' }
      ])
    })

    it('[scenario 4] ignores users who updated income after paying and can no longer pay', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 50 }
        ],
        needs: [
          { name: 'u2', need: 50 },
          { name: 'u3', need: 100 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u3', amount: 50 }
        ]
      })
      should(dist).eql([])
    })

    it('[scenario 4.1] can distribute money from new members', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 50 }
        ],
        needs: [
          { name: 'u2', need: 50 },
          { name: 'u3', need: 100 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u3', amount: 50 },
          { name: 'u4', have: 150, type: 'join' }
        ]
      })
      should(dist).eql([
        { amount: 50, from: 'u4', to: 'u2' },
        { amount: 50, from: 'u4', to: 'u3' }
      ])
    })

    it('splits money evenly between two pledgers and two needers', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 250 },
          { name: 'u4', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 100 },
          { name: 'u3', need: 250 }
        ],
        events: []
      })
      should(dist).eql([
        { amount: 71.42857142857143, from: 'u1', to: 'u2' },
        { amount: 28.57142857142857, from: 'u4', to: 'u2' },
        { amount: 178.57142857142858, from: 'u1', to: 'u3' },
        { amount: 71.42857142857143, from: 'u4', to: 'u3' }
      ])
    })

    it('stops asking user to pay someone they fully paid their share to', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 250 },
          { name: 'u4', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 100 },
          { name: 'u3', need: 250 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 71.43 }
        ]
      })
      should(dist).eql([
        { amount: 28.57142857142857, from: 'u4', to: 'u2' },
        { amount: 178.57, from: 'u1', to: 'u3' },
        { amount: 71.42857142857143, from: 'u4', to: 'u3' }
      ])
    })

    it.skip('does not ask users who have paid their full share to pay any more', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 250 },
          { name: 'u4', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 100 },
          { name: 'u3', need: 250 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 71.43 },
          { type: 'payment', from: 'u1', to: 'u3', amount: 100 }
        ]
      })
      should(dist).eql([
        { amount: 28.57142857, from: 'u4', to: 'u2' },
        { amount: 71.42857143, from: 'u4', to: 'u3' }
      ])
    })
  })
})

describe('helper function', function () {
  it('can transform payment/join data into events', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 150, joinedDate: '2020-10-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 50, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u3': ['payment1'] }
            }
          }
        }
      }
    })
    should(events).eql({
      haves: [
        { name: 'u1', have: 50 }
      ],
      needs: [
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 }
      ],
      events: [
        { type: 'payment', from: 'u1', to: 'u3', amount: 50 },
        { type: 'join', name: 'u4', have: 150 }
      ]
    })
  })

  it('sorts payments and joins by date', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 150, joinedDate: '2020-10-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 50, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' },
          'payment2': { amount: 20, exchangeRate: 1, status: 'completed', createdDate: '2020-10-22T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u3': ['payment1', 'payment2'] }
            }
          }
        }
      }
    })
    should(events).eql({
      haves: [
        { name: 'u1', have: 50 }
      ],
      needs: [
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 }
      ],
      events: [
        { type: 'payment', from: 'u1', to: 'u3', amount: 50 },
        { type: 'join', name: 'u4', have: 150 },
        { type: 'payment', from: 'u1', to: 'u3', amount: 20 }
      ]
    })
  })

  it('works with no events', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {},
        monthlyPayments: {}
      }
    })
    should(events).eql({
      haves: [
        { name: 'u1', have: 50 }
      ],
      needs: [
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 }
      ],
      events: []
    })
  })

  it('works with only payment events', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 50, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u3': ['payment1'] }
            }
          }
        }
      }
    })
    should(events).eql({
      haves: [
        { name: 'u1', have: 50 }
      ],
      needs: [
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 }
      ],
      events: [
        { type: 'payment', from: 'u1', to: 'u3', amount: 50 }
      ]
    })
  })

  it('works with only join events', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 150, joinedDate: '2020-10-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {},
        monthlyPayments: {}
      }
    })
    should(events).eql({
      haves: [
        { name: 'u1', have: 50 }
      ],
      needs: [
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 }
      ],
      events: [
        { type: 'join', name: 'u4', have: 150 }
      ]
    })
  })

  it('works with no members', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {},
      adjustWith: {
        monthstamp: '2020-10',
        payments: {},
        monthlyPayments: {}
      }
    })
    should(events).eql({
      haves: [],
      needs: [],
      events: []
    })
  })

  it('works with no adjustWith arguments', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {}
    })
    should(events).eql({
      haves: [],
      needs: [],
      events: []
    })
  })

  it('works when members have paid and left', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 150, joinedDate: '2020-10-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 50, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u3': ['payment1'] }
            }
          }
        }
      }
    })
    should(events).eql({
      needs: [
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 }
      ],
      haves: [],
      events: [
        { type: 'payment', from: 'u1', to: 'u3', amount: 50 },
        { type: 'join', name: 'u4', have: 150 }
      ]
    })
  })

  it('ignores users who have no need or excess', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 0, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' }
      }
    })
    should(events).eql({
      haves: [],
      needs: [
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 }
      ],
      events: []
    })
  })

  it('can handle a mix of havers/needers in any order', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 150, joinedDate: '2020-10-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 50, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u3': ['payment1'] }
            }
          }
        }
      }
    })
    should(events).eql({
      haves: [
        { name: 'u1', have: 50 }
      ],
      needs: [
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 }
      ],
      events: [
        { type: 'payment', from: 'u1', to: 'u3', amount: 50 },
        { type: 'join', name: 'u4', have: 150 }
      ]
    })
  })

  describe('transforming the above examples', function () {
    it('can distribute income evenly with two users', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 12,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' }
        }
      })).eql({
        haves: [
          { name: 'u1', have: 10 }
        ],
        needs: [
          { name: 'u2', need: 2 }
        ],
        events: []
      })
    })

    it('has no effect for adjustment when there are no payments', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 12,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' }
        },
        adjustWith: {
          monthstamp: '2020-10',
          payments: {},
          monthlyPayments: {}
        }
      })).eql({
        haves: [
          { name: 'u1', have: 10 }
        ],
        needs: [
          { name: 'u2', need: 2 }
        ],
        events: []
      })
    })

    it('ignores existing payments when not adjusted', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 12,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' }
        }
      })).eql({
        haves: [
          { name: 'u1', have: 10 }
        ],
        needs: [
          { name: 'u2', need: 2 }
        ],
        events: []
      })
    })

    it('takes into account payments from this month when adjusted', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 12,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' }
        },
        adjustWith: {
          monthstamp: '2020-10',
          payments: {
            'payment1': { amount: 2, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
          },
          monthlyPayments: {
            '2020-10': {
              mincomeExchangeRate: 1,
              paymentsFrom: {
                'u1': { 'u2': ['payment1'] }
              }
            }
          }
        }
      })).eql({
        haves: [
          { name: 'u1', have: 10 }
        ],
        needs: [
          { name: 'u2', need: 2 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 2 }
        ]
      })
    })

    it('[scenario 1]', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 1000,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 925, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' }
        },
        adjustWith: {
          monthstamp: '2020-10',
          payments: {
            'payment1': { amount: 75, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
          },
          monthlyPayments: {
            '2020-10': {
              mincomeExchangeRate: 1,
              paymentsFrom: {
                'u1': { 'u2': ['payment1'] }
              }
            }
          }
        }
      })).eql({
        haves: [
          { name: 'u1', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 75 },
          { name: 'u3', need: 50 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 75 }
        ]
      })
    })

    it('[scenario 2]', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 1000,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' }
        },
        adjustWith: {
          monthstamp: '2020-10',
          payments: {
            'payment1': { amount: 100, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
          },
          monthlyPayments: {
            '2020-10': {
              mincomeExchangeRate: 1,
              paymentsFrom: {
                'u1': { 'u2': ['payment1'] }
              }
            }
          }
        }
      })).eql({
        haves: [
          { name: 'u1', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 100 },
          { name: 'u3', need: 50 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 100 }
        ]
      })
    })

    it('[scenario 3] redistributes excess of todo-payments back into other todo-payments', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 1000,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 700, joinedDate: '2020-09-15T00:00:00.000Z' }
        },
        adjustWith: {
          monthstamp: '2020-10',
          payments: {
            'payment1': { amount: 25, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
          },
          monthlyPayments: {
            '2020-10': {
              mincomeExchangeRate: 1,
              paymentsFrom: {
                'u1': { 'u2': ['payment1'] }
              }
            }
          }
        }
      })).eql({
        haves: [
          { name: 'u1', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 50 },
          { name: 'u3', need: 300 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 25 }
        ]
      })
    })

    it('[scenario 4] ignores users who updated income after paying and can no longer pay', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 1000,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' }
        },
        adjustWith: {
          monthstamp: '2020-10',
          payments: {
            'payment1': { amount: 50, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
          },
          monthlyPayments: {
            '2020-10': {
              mincomeExchangeRate: 1,
              paymentsFrom: {
                'u1': { 'u3': ['payment1'] }
              }
            }
          }
        }
      })).eql({
        haves: [
          { name: 'u1', have: 50 }
        ],
        needs: [
          { name: 'u2', need: 50 },
          { name: 'u3', need: 100 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u3', amount: 50 }
        ]
      })
    })

    it('[scenario 4.1] can distribute money from new members', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 1000,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 150, joinedDate: '2020-10-15T00:00:00.000Z' }
        },
        adjustWith: {
          monthstamp: '2020-10',
          payments: {
            'payment1': { amount: 50, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
          },
          monthlyPayments: {
            '2020-10': {
              mincomeExchangeRate: 1,
              paymentsFrom: {
                'u1': { 'u3': ['payment1'] }
              }
            }
          }
        }
      })).eql({
        haves: [
          { name: 'u1', have: 50 }
        ],
        needs: [
          { name: 'u2', need: 50 },
          { name: 'u3', need: 100 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u3', amount: 50 },
          { name: 'u4', have: 150, type: 'join' }
        ]
      })
    })

    it('splits money evenly between two pledgers and two needers', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 1000,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 250, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 750, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' }
        },
        adjustWith: {
          monthstamp: '2020-10',
          payments: {},
          monthlyPayments: {}
        }
      })).eql({
        haves: [
          { name: 'u1', have: 250 },
          { name: 'u4', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 100 },
          { name: 'u3', need: 250 }
        ],
        events: []
      })
    })

    it('stops asking user to pay someone they fully paid their share to', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 1000,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 250, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 750, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' }
        },
        adjustWith: {
          monthstamp: '2020-10',
          payments: {
            'payment1': { amount: 71.43, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
          },
          monthlyPayments: {
            '2020-10': {
              mincomeExchangeRate: 1,
              paymentsFrom: {
                'u1': { 'u2': ['payment1'] }
              }
            }
          }
        }
      })).eql({
        haves: [
          { name: 'u1', have: 250 },
          { name: 'u4', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 100 },
          { name: 'u3', need: 250 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 71.43 }
        ]
      })
    })

    it('does not ask users who have paid their full share to pay any more', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 1000,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 250, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 750, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' }
        },
        adjustWith: {
          monthstamp: '2020-10',
          payments: {
            'payment1': { amount: 71.43, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' },
            'payment2': { amount: 100, exchangeRate: 1, status: 'completed', createdDate: '2020-10-13T00:00:00.000Z' }
          },
          monthlyPayments: {
            '2020-10': {
              mincomeExchangeRate: 1,
              paymentsFrom: {
                'u1': { 'u2': ['payment1'], 'u3': ['payment2'] }
              }
            }
          }
        }
      })).eql({
        haves: [
          { name: 'u1', have: 250 },
          { name: 'u4', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 100 },
          { name: 'u3', need: 250 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 71.43 },
          { type: 'payment', from: 'u1', to: 'u3', amount: 100 }
        ]
      })
    })
  })
})
