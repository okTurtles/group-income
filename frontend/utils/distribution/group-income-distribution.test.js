/* eslint-env mocha */

// For rapid development, run these tests with:
// ./node_modules/.bin/mocha -w -R min --require Gruntfile.js frontend/utils/distribution/group-income-distribution.test.js

import should from 'should'
import groupIncomeDistribution from './group-income-distribution.js'

function unfoldParameters (json, monthstamp = '2020-11') {
  const newJSON = {}

  newJSON.monthstamp = monthstamp
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
        incomeAmount: json.mincome - json.profiles[profile].need
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
        const dist = groupIncomeDistribution(unfoldParameters(
          {
            mincome: 12,
            profiles: {
              u1: { have: 10 },
              u2: { need: 2 }
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
        const dist = groupIncomeDistribution(unfoldParameters(
          {
            mincome: 12,
            profiles: {
              u1: { have: 10 },
              u2: { need: 2 }
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
        const dist = groupIncomeDistribution(unfoldParameters(
          {
            adjusted: true,
            mincome: 12,
            profiles: {
              u1: { have: 10 },
              u2: { need: 2 }
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
        const dist = groupIncomeDistribution(unfoldParameters(
          {
            adjusted: true,
            mincome: 1000,
            profiles: {
              u1: { have: 100 },
              u2: { need: 75 },
              u3: { need: 50 }
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
        const dist = groupIncomeDistribution(unfoldParameters(
          {
            adjusted: true,
            mincome: 1000,
            profiles: {
              u1: { have: 100 },
              u2: { need: 100 },
              u3: { need: 50 }
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
        const dist = groupIncomeDistribution(unfoldParameters(
          {
            adjusted: true,
            mincome: 1000,
            profiles: {
              u1: { have: 100 },
              u2: { need: 50 },
              u3: { need: 300 }
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
    it('[SCENARIO 4]:ignores users who updated income after paying and can no longer pay',
      // Create a group with $1000 mincome and 3 members:
      // u1: pledge 100$
      // u2: income 950$ (a.k.a needs $50)
      // u3: income 900$ (a.k.a needs $100)
      // Login u1 and send $50 to u3 (a partial payment). - The payment goes as expected.
      // Change the pledge amount of u1 from $100 to $50.
      // Expected Result: Don't show any payment to u3 because u1 already pledge all their money.
      function () {
        const dist = groupIncomeDistribution(unfoldParameters(
          {
            adjusted: true,
            mincome: 1000,
            profiles: {
              u1: { have: 50 },
              u2: { need: 50 },
              u3: { need: 100 }
            },
            payments: [
              { u1: { u2: 50 } }
            ]
          }))
        should(dist).eql([])
      })
    it('[SCENARIO 4.1 (continuation)]: can distribute money from new members',
      // Invite a new member u4, who can pledge $150.
      // Expected Result #1: u4 should be asked to send $50 to u2 and $50 to u3.
      // Expected Result #2: u3's payments page should say 'Amount received $50 out of $100'.
      // Expected Result #3: u1 should have no 'todo' payments because u1 already pledge all their money.

      function () {
        const dist = groupIncomeDistribution(unfoldParameters(
          {
            adjusted: true,
            mincome: 1000,
            profiles: {
              u1: { have: 50 },
              u2: { need: 50 },
              u3: { need: 100 },
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
      // (Everyone agrees to the mincome change?)
      // Expected Result: I don't know... we never discussed this.
      function () {
        const dist = groupIncomeDistribution(unfoldParameters(
          {
            adjusted: true,
            mincome: 500,
            profiles: {
              u1: { have: 600 },
              u2: { need: 550 }
            }
          }))
        should(dist).eql([
          // TODO: I had to hand modify this scenario so that the mocha tests made since. NOT ORIGINAL JSON FROM TESTS!
          { from: 'u1', to: 'u2', amount: 550 }
        ])
      })
    it('[SCENARIO 2]: Create a group with $500 mincome and 2 members',
      // u1: pledge 100$
      // u2: Income 450$ (a.k.a needs $50)
      // Change the mincome from $500 to $750
      // (Everyone agrees to the mincome change?)
      // Expected Result: Same, no idea.
      function () {
        const dist = groupIncomeDistribution(unfoldParameters(
          {
            adjusted: true,
            mincome: 750,
            profiles: {
              u1: { need: 150 },
              u2: { need: 300 }
            }
          }))
        should(dist).eql([])
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
        const dist = groupIncomeDistribution(unfoldParameters(
          {
            adjusted: true,
            mincome: 1000,
            profiles: {
              u1: { have: 250 },
              u2: { need: 100 },
              u3: { need: 250 },
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
        const dist = groupIncomeDistribution(unfoldParameters(
          {
            adjusted: true,
            mincome: 1000,
            profiles: {
              u1: { have: 250 },
              u2: { need: 100 },
              u3: { need: 250 },
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
        const dist = groupIncomeDistribution(unfoldParameters(
          {
            adjusted: true,
            mincome: 1000,
            profiles: {
              u1: { have: 250 },
              u2: { need: 100 },
              u3: { need: 250 },
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
