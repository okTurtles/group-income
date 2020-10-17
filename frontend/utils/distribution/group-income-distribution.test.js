/* eslint-env mocha */

// For rapid development, run these tests with:
// ./node_modules/.bin/mocha -w -R min --require Gruntfile.js frontend/utils/distribution/group-income-distribution.test.js

import should from 'should'
import { groupIncomeDistributionLogic } from './group-income-distribution.js'

describe('group income distribution logic', function () {
  it('can distribute income evenly with two users', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 12,
      groupProfiles: {
        "u1": { incomeDetailsType: "pledgeAmount", pledgeAmount: 10 },
        "u2": { incomeDetailsType: "incomeAmount", incomeAmount: 10 }
      }
    })
    should(dist).eql([{ amount: 2, from: 'u1', to: 'u2' }])
  })

  it('has no effect for adjustment when there are no payments', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 12,
      groupProfiles: {
        "u1": { incomeDetailsType: "pledgeAmount", pledgeAmount: 10 },
        "u2": { incomeDetailsType: "incomeAmount", incomeAmount: 10 }
      },
      adjustWith: {
        monthstamp: "2020-10",
        payments: {},
        monthlyPayments: {}
      }
    })
    should(dist).eql([{ amount: 2, from: 'u1', to: 'u2' }])
  })

  it('ignores existing payments when not adjusted', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 12,
      groupProfiles: {
        "u1": { incomeDetailsType: "pledgeAmount", pledgeAmount: 10 },
        "u2": { incomeDetailsType: "incomeAmount", incomeAmount: 10 }
      },
    })
    should(dist).eql([{ amount: 2, from: 'u1', to: 'u2' }])
  })

  it('takes into account payments from this month when adjusted', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 12,
      groupProfiles: {
        "u1": { incomeDetailsType: "pledgeAmount", pledgeAmount: 10 },
        "u2": { incomeDetailsType: "incomeAmount", incomeAmount: 10 }
      },
      adjustWith: {
        monthstamp: "2020-10",
        payments: {
          "payment1": { amount: 2, exchangeRate: 1, status: "completed", creationMonthstamp: "2020-10" }
        },
        monthlyPayments: {
          "2020-10": {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              "u1": { "u2": ["payment1"] }
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
        "u1": { incomeDetailsType: "pledgeAmount", pledgeAmount: 100 },
        "u2": { incomeDetailsType: "incomeAmount", incomeAmount: 925 },
        "u3": { incomeDetailsType: "incomeAmount", incomeAmount: 950 }
      },
      adjustWith: {
        monthstamp: "2020-10",
        payments: {
          "payment1": { amount: 75, exchangeRate: 1, status: "completed", creationMonthstamp: "2020-10" }
        },
        monthlyPayments: {
          "2020-10": {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              "u1": { "u2": ["payment1"] }
            }
          }
        }
      }
    })
    should(dist).eql([{ amount: 25, from: 'u1', to: 'u3' }])
  })

  it('[scenario 2]', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        "u1": { incomeDetailsType: "pledgeAmount", pledgeAmount: 100 },
        "u2": { incomeDetailsType: "incomeAmount", incomeAmount: 900 },
        "u3": { incomeDetailsType: "incomeAmount", incomeAmount: 950 }
      },
      adjustWith: {
        monthstamp: "2020-10",
        payments: {
          "payment1": { amount: 100, exchangeRate: 1, status: "completed", creationMonthstamp: "2020-10" }
        },
        monthlyPayments: {
          "2020-10": {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              "u1": { "u2": ["payment1"] }
            }
          }
        }
      }
    })
    should(dist).eql([])
  })

  it('[scenario 3]', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        "u1": { incomeDetailsType: "pledgeAmount", pledgeAmount: 100 },
        "u2": { incomeDetailsType: "incomeAmount", incomeAmount: 950 },
        "u3": { incomeDetailsType: "incomeAmount", incomeAmount: 700 }
      },
      adjustWith: {
        monthstamp: "2020-10",
        payments: {
          "payment1": { amount: 25, exchangeRate: 1, status: "completed", creationMonthstamp: "2020-10" }
        },
        monthlyPayments: {
          "2020-10": {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              "u1": { "u2": ["payment1"] }
            }
          }
        }
      }
    })
    should(dist).eql([
      { amount: 5.769230769230769, from: 'u1', to: 'u2' },
      { amount: 69.23076923076924, from: 'u1', to: 'u3' }
    ])
  })

  it('[scenario 4] ignores users who updated income after paying and can no longer pay', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        "u1": { incomeDetailsType: "pledgeAmount", pledgeAmount: 50 },
        "u2": { incomeDetailsType: "incomeAmount", incomeAmount: 950 },
        "u3": { incomeDetailsType: "incomeAmount", incomeAmount: 900 }
      },
      adjustWith: {
        monthstamp: "2020-10",
        payments: {
          "payment1": { amount: 50, exchangeRate: 1, status: "completed", creationMonthstamp: "2020-10" }
        },
        monthlyPayments: {
          "2020-10": {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              "u1": { "u3": ["payment1"] }
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
        "u1": { incomeDetailsType: "pledgeAmount", pledgeAmount: 50 },
        "u2": { incomeDetailsType: "incomeAmount", incomeAmount: 950 },
        "u3": { incomeDetailsType: "incomeAmount", incomeAmount: 900 },
        "u4": { incomeDetailsType: "pledgeAmount", pledgeAmount: 150 }
      },
      adjustWith: {
        monthstamp: "2020-10",
        payments: {
          "payment1": { amount: 50, exchangeRate: 1, status: "completed", creationMonthstamp: "2020-10" }
        },
        monthlyPayments: {
          "2020-10": {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              "u1": { "u3": ["payment1"] }
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
})
