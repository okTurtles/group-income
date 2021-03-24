/* eslint-env mocha */

import should from 'should'
import groupIncomeDistribution from './group-income-distribution.js'

function unfoldParameters (json, monthstamp = '2020-11') {
  const newJSON = {}

  newJSON.monthstamp = monthstamp
  newJSON.adjusted = !!json.adjustWith
  newJSON.groupMincomeAmount = json.mincome

  newJSON.payments = []

  const payments = json.adjustWith ? json.adjustWith : []

  for (const payment in payments) {
    for (const from in payments[payment]) {
      for (const to in payments[payment][from]) {
        newJSON.payments.push({ from: from, to: to, amount: payments[payment][from][to] })
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
      'currentGroupState': {
        payments: allPayments
      },
      'groupMonthlyPayments': monthlyPayments,
      'groupMincomeAmount': json.groupMincomeAmount,
      'paymentTotalFromUserToUser': function (from, to, monthstamp) {
        let totalFromTo = 0
        if (paymentsFrom) {
          for (const fromUser in paymentsFrom) {
            if (fromUser === from) {
              for (const toUser in paymentsFrom[fromUser]) {
                if (to === toUser) {
                  for (const paymentHash of paymentsFrom[fromUser][toUser]) {
                    totalFromTo += allPayments[paymentHash].data.amount
                  }
                }
              }
            }
          }
        }
        return totalFromTo
      }
    },
    monthstamp: json.monthstamp,
    adjusted: json.adjusted
  }
}

// TODO: finish writing 'unfold' function for event-based distribution mocha tests.
describe('TODO: make a LONG description for every set of tests', function () {
  const distributionEvents = []

  it('TODO: write description', function () {
    distributionEvents.push({
      type: 'startCycleEvent',
      data: {
        cycle: 0,
        overPayments: []
      }
    })
    should(groupIncomeDistribution(unfoldParameters({
      distributionEvents,
      mincome: 12
    }))).eql([
    ])
  })

  it('TODO: write description', function () {
    distributionEvents.push({
      type: 'haveNeedEvent',
      data: {
        name: 'u1',
        income: 100,
        cycle: 0.1
      }
    })
    should(groupIncomeDistribution(unfoldParameters({
      distributionEvents,
      mincome: 12
    }))).eql([
    ])
  })

  it('TODO: write description', function () {
    distributionEvents.push({
      type: 'haveNeedEvent',
      data: {
        name: 'u2',
        income: -50,
        cycle: 0.2
      }
    })
    should(groupIncomeDistribution(unfoldParameters({
      distributionEvents,
      mincome: 12
    }))).eql([
    ])
  })

  it('TODO: write description', function () {
    distributionEvents.push({
      type: 'haveNeedEvent',
      data: {
        name: 'u3',
        income: -50,
        cycle: 0.3
      }
    })
    should(groupIncomeDistribution(unfoldParameters({
      distributionEvents,
      mincome: 12
    }))).eql([
    ])
  })

  it('TODO: write description', function () {
    distributionEvents.push({
      type: 'paymentEvent',
      data: {
        from: 'u1',
        to: 'u2',
        amount: 10,
        cycle: 0.4
      }
    })
    should(groupIncomeDistribution(unfoldParameters({
      distributionEvents,
      mincome: 12
    }))).eql([
    ])
  })

  it('TODO: write description', function () {
    distributionEvents.push({
      type: 'haveNeedEvent',
      data: {
        name: 'u4',
        income: -100,
        cycle: 0.5
      }
    })
    should(groupIncomeDistribution(unfoldParameters({
      distributionEvents,
      mincome: 12
    }))).eql([
    ])
  })

  it('TODO: write description', function () {
    distributionEvents.push({
      type: 'userExitsGroupEvent',
      data: {
        name: 'u3',
        cycle: 0.6
      }
    })
    should(groupIncomeDistribution(unfoldParameters({
      distributionEvents,
      mincome: 12
    }))).eql([
    ])
  })

  it('TODO: write description', function () {
    distributionEvents.push({
      type: 'paymentEvent',
      data: {
        from: 'u1',
        to: 'u4',
        amount: 5,
        cycle: 0.7
      }
    })
    should(groupIncomeDistribution(unfoldParameters({
      distributionEvents,
      mincome: 12
    }))).eql([
    ])
  })
})
