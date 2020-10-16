/* eslint-env mocha */

// For rapid development, run these tests with:
// ./node_modules/.bin/mocha -w -R min --require Gruntfile.js frontend/utils/distribution/group-income-distribution.test.js

import should from 'should'
import incomeDistribution from './mincome-default.js'
import { groupIncomeDistributionBaseLogic, groupIncomeDistributionAdjustmentLogic } from './group-income-distribution.js'

describe('group income distribution logic', function () {
  it('can distribute income evenly with two users', function () {
    const dist = groupIncomeDistributionBaseLogic({
      mincomeAmount: 12,
      groupProfiles: {
        "u1": { incomeDetailsType: "pledgeAmount", pledgeAmount: 10 },
        "u2": { incomeDetailsType: "incomeAmount", incomeAmount: 10 }
      }
    })
    should(dist).eql([{ amount: 2, from: 'u1', to: 'u2' }])

    const adjustedDist = groupIncomeDistributionAdjustmentLogic(dist, {
      monthstamp: "2020-10",
      payments: {},
      monthlyPayments: {}
    })
    should(adjustedDist).eql([{ amount: 2, from: 'u1', to: 'u2' }])
  })

  it('ignores existing payments when not adjusted', function () {
    const dist = groupIncomeDistributionBaseLogic({
      mincomeAmount: 12,
      groupProfiles: {
        "u1": { incomeDetailsType: "pledgeAmount", pledgeAmount: 10 },
        "u2": { incomeDetailsType: "incomeAmount", incomeAmount: 10 }
      },
    })
    should(dist).eql([{ amount: 2, from: 'u1', to: 'u2' }])
  })

  it('takes into account payments from this month when adjusted', function () {
    const dist = groupIncomeDistributionBaseLogic({
      mincomeAmount: 12,
      groupProfiles: {
        "u1": { incomeDetailsType: "pledgeAmount", pledgeAmount: 10 },
        "u2": { incomeDetailsType: "incomeAmount", incomeAmount: 10 }
      },
    })
    should(dist).eql([{ amount: 2, from: 'u1', to: 'u2' }])

    const adjustedDist = groupIncomeDistributionAdjustmentLogic(dist, {
      monthstamp: "2020-10",
      payments: {
        "payment1": { amount: 2, exchangeRate: 1, status: "completed", creationMonthstamp: "2020-10" }
      },
      monthlyPayments: {
        "2020-10": {
          mincomeExchangeRate: 1,
          paymentsFrom: {
            "u1": {
              "u2": ["payment1"]
            }
          }
        }
      }
    })
    should(adjustedDist).eql([])
  })
})
