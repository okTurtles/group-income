/* eslint-env mocha */

// For rapid development, run these tests with:
// ./node_modules/.bin/mocha -w -R min --require Gruntfile.js frontend/utils/distribution/group-income-distribution.test.js

import should from 'should'
import incomeDistribution from './mincome-default.js'
import { groupIncomeDistributionLogic } from './group-income-distribution.js'

describe('group income distribution logic', function () {
  it('has a basic test', function () {
    should(groupIncomeDistributionLogic({
      monthstamp: "2020-10",
      adjusted: false,
      mincomeAmount: 12,
      groupProfiles: {
        "u1": {
          incomeDetailsType: "pledgeAmount",
          pledgeAmount: 10,
        },
        "u2": {
          incomeDetailsType: "incomeAmount",
          incomeAmount: 10,
        }
      },
      payments: {
        "payment1": {
          amount: 2,
          exchangeRate: 1,
          status: "completed",
          createdDate: "2020-10-16T18:58:58.169Z"
        }
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
    })).eql([
      { amount: 2, from: 'u1', to: 'u2' }
    ])
  })
})
