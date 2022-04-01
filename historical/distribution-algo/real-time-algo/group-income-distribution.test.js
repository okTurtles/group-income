/* eslint-env mocha */

// run with: ./node_modules/.bin/mocha -w --require @babel/register frontend/utils/distribution/group-income-distribution.test.js

import should from 'should'
import groupIncomeDistribution from './group-income-distribution.js'
import { dateFromMonthstamp } from '~/frontend/utils/time.js'

const defaultStartDate = dateFromMonthstamp('2021-01').toISOString()
const defaultLateDate = dateFromMonthstamp('2020-12').toISOString()

let setup = []

function groupIncomeDistributionWrapper (events, opts) {
  for (const event of events) {
    if (!event.data.when) {
      event.data.when = defaultStartDate
    }
  }
  for (const event of opts.latePayments || []) {
    event.data.when = defaultLateDate
  }
  return groupIncomeDistribution(events, opts)
}

describe('Test group-income-distribution.js', function () {
  it('Test empty distirbution event list for unadjusted distribution.', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false })).eql([])
  })
  it('EVENTS: [u1, u2, u3 and u4] join the group and set haveNeeds of [100, 100, -50, and -50], respectively. Test unadjusted.', function () {
    setup.splice(setup.length, 0,
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -50 } },
      { type: 'haveNeedEvent', data: { name: 'u4', haveNeed: -50 } }
    )
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false })).eql([
      { amount: 25, from: 'u1', to: 'u3' },
      { amount: 25, from: 'u1', to: 'u4' },
      { amount: 25, from: 'u2', to: 'u3' },
      { amount: 25, from: 'u2', to: 'u4' }
    ])
  })
  it('Test the adjusted version of the previous event-list. Should be unchanged.', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false })).eql([
      { amount: 25, from: 'u1', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u1', to: 'u4', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u2', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u2', to: 'u4', total: 25, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('EVENT: a payment of $10 is made from u1 to u3. Test unadjusted first (again, unchanged)', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u3', amount: 10 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false })).eql([
      { amount: 25, from: 'u1', to: 'u3' },
      { amount: 25, from: 'u1', to: 'u4' },
      { amount: 25, from: 'u2', to: 'u3' },
      { amount: 25, from: 'u2', to: 'u4' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true })).eql([
      { amount: 50, from: 'u2', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u1', to: 'u3', total: 50, partial: true, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('EVENT: Adjusted of "a payment of $10 is made from u1 to u3."', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false })).eql([
      { amount: 15, from: 'u1', to: 'u3', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u1', to: 'u4', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u2', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u2', to: 'u4', total: 25, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true })).eql([
      { amount: 50, from: 'u2', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u1', to: 'u3', total: 50, partial: true, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('EVENT: u5 joins and sets a need of 100. Test unadjusted first.', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u5', haveNeed: -100 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false })).eql([
      { amount: 25, from: 'u1', to: 'u3' },
      { amount: 25, from: 'u1', to: 'u4' },
      { amount: 50, from: 'u1', to: 'u5' },
      { amount: 25, from: 'u2', to: 'u3' },
      { amount: 25, from: 'u2', to: 'u4' },
      { amount: 50, from: 'u2', to: 'u5' }
    ])
  })
  it('Adjusted of: "u5 joins and sets a need of 100."', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false })).eql([
      { amount: 15, from: 'u1', to: 'u3', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u1', to: 'u4', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u1', to: 'u5', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u2', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u2', to: 'u4', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u2', to: 'u5', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true })).eql([
      { amount: 40, from: 'u1', to: 'u3', total: 50, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u1', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 100, from: 'u2', to: 'u5', total: 100, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('EVENT: u4 removes themselves from the group. Test unadjusted first.', function () {
    setup.push({ type: 'userExitsGroupEvent', data: { name: 'u4' } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false })).eql([
      { amount: 25, from: 'u1', to: 'u3' },
      { amount: 50, from: 'u1', to: 'u5' },
      { amount: 25, from: 'u2', to: 'u3' },
      { amount: 50, from: 'u2', to: 'u5' }

    ])
  })
  it('Adjusted of: "u4 removes themselves from the group."', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false })).eql([
      { amount: 15, from: 'u1', to: 'u3', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 53.57142857, from: 'u1', to: 'u5', total: 53.57142857, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u2', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 46.42857143, from: 'u2', to: 'u5', total: 46.42857143, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true })).eql([
      { amount: 40, from: 'u1', to: 'u3', total: 50, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 33.33333333, from: 'u1', to: 'u5', total: 33.33333333, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 66.66666667, from: 'u2', to: 'u5', total: 66.66666667, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('EVENT: u1 pays $5 to u5. Test unadjusted first.', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u5', amount: 5 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false })).eql([
      { amount: 25, from: 'u1', to: 'u3' },
      { amount: 50, from: 'u1', to: 'u5' },
      { amount: 25, from: 'u2', to: 'u3' },
      { amount: 50, from: 'u2', to: 'u5' }
    ])
  })
  it('Adjusted of: "u1 pays $5 to u5."', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false })).eql([
      { amount: 15, from: 'u1', to: 'u3', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 48.57142857, from: 'u1', to: 'u5', total: 53.57142857, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u2', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 46.42857143, from: 'u2', to: 'u5', total: 46.42857143, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true })).eql([
      { amount: 40, from: 'u1', to: 'u3', total: 50, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 28.33333333, from: 'u1', to: 'u5', total: 33.33333333, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 66.66666667, from: 'u2', to: 'u5', total: 66.66666667, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('EVENT: u4 rejoins and sets haveNeed to -100. Test unadjusted first.', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u4', haveNeed: -100 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false })).eql([
      { amount: 20, from: 'u1', to: 'u3' },
      { amount: 40, from: 'u1', to: 'u5' },
      { amount: 40, from: 'u1', to: 'u4' },
      { amount: 20, from: 'u2', to: 'u3' },
      { amount: 40, from: 'u2', to: 'u5' },
      { amount: 40, from: 'u2', to: 'u4' }
    ])
  })
  it('Adjusted of: "u4 rejoins and sets haveNeed to -100."', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false })).eql([
      { amount: 15, from: 'u1', to: 'u3', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 48.57142857, from: 'u1', to: 'u5', total: 53.57142857, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 21.42857143, from: 'u1', to: 'u4', total: 21.42857143, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 16.16161616, from: 'u2', to: 'u3', total: 16.16161616, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 30.01443001, from: 'u2', to: 'u5', total: 30.01443001, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 53.82395382, from: 'u2', to: 'u4', total: 53.82395382, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true })).eql([
      { amount: 40, from: 'u1', to: 'u3', total: 50, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 45, from: 'u1', to: 'u5', total: 33.33333333, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 26.47058824, from: 'u2', to: 'u5', total: 26.47058824, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 73.52941176, from: 'u2', to: 'u4', total: 73.52941176, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('EVENT: u2 pays $10 to u3. Test unadjusted first.', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u2', to: 'u3', amount: 10 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false })).eql([
      { amount: 20, from: 'u1', to: 'u3' },
      { amount: 40, from: 'u1', to: 'u5' },
      { amount: 40, from: 'u1', to: 'u4' },
      { amount: 20, from: 'u2', to: 'u3' },
      { amount: 40, from: 'u2', to: 'u5' },
      { amount: 40, from: 'u2', to: 'u4' }
    ])
  })
  it('Adjusted of: "u2 pays $10 to u3."', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false })).eql([
      { amount: 15, from: 'u1', to: 'u3', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 48.57142857, from: 'u1', to: 'u5', total: 53.57142857, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 21.42857143, from: 'u1', to: 'u4', total: 21.42857143, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.16161616, from: 'u2', to: 'u3', total: 16.16161616, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 30.01443001, from: 'u2', to: 'u5', total: 30.01443001, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 53.82395382, from: 'u2', to: 'u4', total: 53.82395382, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Simple test pattern problem', function () {
    setup = [
      { type: 'haveNeedEvent', data: { name: 'User1', haveNeed: 10 } },
      { type: 'haveNeedEvent', data: { name: 'User2', haveNeed: 10 } },
      { type: 'haveNeedEvent', data: { name: 'User3', haveNeed: -10 } },
      { type: 'paymentEvent', data: { from: 'User2', to: 'User3', amount: 5 } },
      { type: 'haveNeedEvent', data: { name: 'User4', haveNeed: -10 } }
    ]
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false })).eql([
      { amount: 5, from: 'User1', to: 'User3', total: 5, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5, from: 'User1', to: 'User4', total: 5, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5, from: 'User2', to: 'User4', total: 5, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Simple test pattern problem (continued)', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'User5', haveNeed: 10 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false })).eql([
      { amount: 2.5, from: 'User1', to: 'User3', total: 2.5, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.5, from: 'User1', to: 'User4', total: 3.5, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3, from: 'User2', to: 'User4', total: 3, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.5, from: 'User5', to: 'User3', total: 2.5, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.5, from: 'User5', to: 'User4', total: 3.5, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Simple test pattern problem (continued 2x)', function () {
    setup.pop()
    setup.push({ type: 'paymentEvent', data: { amount: 5, from: 'User2', to: 'User4' } })
    setup.push({ type: 'haveNeedEvent', data: { name: 'User5', haveNeed: 10 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false })).eql([
      { amount: 2.5, from: 'User1', to: 'User3', total: 2.5, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.5, from: 'User1', to: 'User4', total: 2.5, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.5, from: 'User5', to: 'User3', total: 2.5, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.5, from: 'User5', to: 'User4', total: 2.5, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Problematic minimization overpayment', function () {
    setup = [
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: -100 } },
      { type: 'haveNeedEvent', data: { name: 'u3', haveNeed: 100 } },
      { type: 'paymentEvent', data: { from: 'u3', to: 'u2', amount: 50 } },
      { type: 'haveNeedEvent', data: { name: 'u4', haveNeed: -100 } },
      { type: 'haveNeedEvent', data: { name: 'u5', haveNeed: 100 } },
      { type: 'paymentEvent', data: { from: 'u1', to: 'u4', amount: 60 } },
      { type: 'paymentEvent', data: { from: 'u5', to: 'u4', amount: 10 } }
    ]
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true })).eql([
      { amount: 30, from: 'u3', to: 'u2', total: 50, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 20, from: 'u5', to: 'u2', total: 20, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 30, from: 'u5', to: 'u4', total: 40, partial: true, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Adjusted 100h2x 100n3x w/payment', function () {
    setup = [
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -100 } },
      { type: 'haveNeedEvent', data: { name: 'u4', haveNeed: -100 } },
      { type: 'paymentEvent', data: { from: 'u1', to: 'u3', amount: 50 } },
      { type: 'haveNeedEvent', data: { name: 'u5', haveNeed: -100 } }
    ]
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false })).eql([
      { amount: 25, from: 'u1', to: 'u4', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u1', to: 'u5', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 22.72727273, from: 'u2', to: 'u3', total: 22.72727273, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 38.63636364, from: 'u2', to: 'u4', total: 38.63636364, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 38.63636364, from: 'u2', to: 'u5', total: 38.63636364, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true })).eql([
      { amount: 50, from: 'u1', to: 'u3', total: 100, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u2', to: 'u5', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u2', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Entire payment paid scenario', function () {
    setup = [
      { type: 'haveNeedEvent', data: { name: 'User1', haveNeed: 10 } },
      { type: 'haveNeedEvent', data: { name: 'User2', haveNeed: 10 } },
      { type: 'haveNeedEvent', data: { name: 'User3', haveNeed: -10 } },
      { type: 'haveNeedEvent', data: { name: 'User4', haveNeed: -10 } },
      { type: 'paymentEvent', data: { from: 'User2', to: 'User4', amount: 10 } }
    ]
    // NOTE: we cannot test the non-minimized version here because
    // there's a payment that would never happen in the non-minimized version
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true })).eql([
      { amount: 10, from: 'User1', to: 'User3', total: 10, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Test minimization issue', function () {
    setup = [
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -100 } },
      { type: 'haveNeedEvent', data: { name: 'u4', haveNeed: -100 } },
      { type: 'paymentEvent', data: { from: 'u2', to: 'u4', amount: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u5', haveNeed: 100 } }
    ]
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true })).eql([
      { amount: 50, from: 'u5', to: 'u3', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u1', to: 'u3', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Weird scenario', function () {
    setup = [
      { type: 'haveNeedEvent', data: { name: 'User1', haveNeed: 10 } },
      { type: 'haveNeedEvent', data: { name: 'User2', haveNeed: 10 } },
      { type: 'haveNeedEvent', data: { name: 'User3', haveNeed: -10 } },
      { type: 'paymentEvent', data: { from: 'User2', to: 'User3', amount: 5 } },
      { type: 'haveNeedEvent', data: { name: 'User4', haveNeed: -10 } },
      { type: 'paymentEvent', data: { from: 'User2', to: 'User4', amount: 5 } },
      { type: 'haveNeedEvent', data: { name: 'User5', haveNeed: 10 } },
      { type: 'paymentEvent', data: { from: 'User5', to: 'User4', amount: 2.5 } }
    ]
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false })).eql([
      { amount: 2.5, dueOn: '2021-01', from: 'User1', isLate: false, partial: false, to: 'User3', total: 2.5 },
      { amount: 2.5, dueOn: '2021-01', from: 'User1', isLate: false, partial: false, to: 'User4', total: 2.5 },
      { amount: 2.5, dueOn: '2021-01', from: 'User5', isLate: false, partial: false, to: 'User3', total: 2.5 }
    ])
  })
  // # EVENT: [u1, u2 and u3] join a group and set haveNeeds of [20, 20, -20], respectively
  // # EVENT: u1 sends 10 to u3
  // # EVENT: u1 adjusts haveNeed -10
  // # EVENT: u2 sends 10 to u1
  // # EVENT: u1 adjusts haveNeed 10
  it('Adjusted 20h2x 20n1x w/payment and side switch', function () {
    setup = [
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 20 } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: 20 } },
      { type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -20 } },
      { type: 'paymentEvent', data: { from: 'u1', to: 'u3', amount: 10 } },
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: -10 } }
    ]
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false })).eql([
      { amount: 6.666666666666666, from: 'u2', to: 'u1' },
      { amount: 13.333333333333332, from: 'u2', to: 'u3' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false })).eql([
      { amount: 10, from: 'u2', to: 'u1', total: 10, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10, from: 'u2', to: 'u3', total: 10, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Adjusted 20h1x 20n2x - u3 adjusts haveNeed', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -2 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false })).eql([
      { amount: 10, from: 'u2', to: 'u1', total: 10, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    setup.push({ type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -12 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false })).eql([
      { amount: 10, from: 'u2', to: 'u1', total: 10, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2, from: 'u2', to: 'u3', total: 2, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Followup payment & switch for 20h2x 20n1x', function () {
    setup.splice(setup.length, 0,
      { type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -20 } },
      { type: 'paymentEvent', data: { from: 'u2', to: 'u1', amount: 10 } },
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 10 } }
    )
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false })).eql([
      { amount: 6.666666666666666, from: 'u1', to: 'u3' },
      { amount: 13.333333333333332, from: 'u2', to: 'u3' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false })).eql([
      { amount: 10, from: 'u2', to: 'u3', total: 10, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('20h2x 20n1x - now u1 leaves (unadjusted)', function () {
    setup.push({ type: 'userExitsGroupEvent', data: { name: 'u1' } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false })).eql([
      { amount: 20, from: 'u2', to: 'u3' }
    ])
  })
  it('20h2x 20n1x - now u1 leaves (adjusted)', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false })).eql([
      { from: 'u2', to: 'u3', amount: 10, total: 10, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('20h2x 20n1x - u1 returns (unadjusted)', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 10 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false })).eql([
      { amount: 13.333333333333332, from: 'u2', to: 'u3' },
      { amount: 6.666666666666666, from: 'u1', to: 'u3' }
    ])
  })
  it.skip('Cycle test. Adjusted.', function () {
    setup.push({ type: 'userExitsGroupEvent', data: { name: 'u1' } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false })).eql([
      { amount: 13.333333333333332, from: 'u2', to: 'u3', total: 13.333333333333332, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 20, from: 'u2', to: 'u3', total: 20, partial: false, isLate: false, dueOn: '2021-02' }
    ])
  })
  it.skip('Cycle test. Unadjusted & adjusted.', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 10 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false })).eql([
      { from: 'u1', to: 'u3', amount: 6.666666666666666 },
      { amount: 13.333333333333332, from: 'u2', to: 'u3' },
      { amount: 6.666666666666666, from: 'u1', to: 'u3' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false })).eql([
      { amount: 13.333333333333332, from: 'u2', to: 'u3', total: 13.333333333333332, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 6.666666666666666, from: 'u1', to: 'u3', total: 6.666666666666666, partial: false, isLate: false, dueOn: '2021-02' }
    ])
  })
  it('Cypress/group-paying.spec.js unit-test equivalent - three users join the group and add their income details.', function () {
    setup = [
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 250 } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: -100 } },
      { type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -250 } },
      { type: 'haveNeedEvent', data: { name: 'u4', haveNeed: 100 } }
    ]
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false })).eql([
      { amount: 71.42857142857143, from: 'u1', to: 'u2' },
      { amount: 178.57142857142858, from: 'u1', to: 'u3' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false })).eql([
      { amount: 71.42857143, from: 'u1', to: 'u2', total: 71.42857143, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 178.57142857, from: 'u1', to: 'u3', total: 178.57142857, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 28.57142857, from: 'u4', to: 'u2', total: 28.57142857, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 71.42857143, from: 'u4', to: 'u3', total: 71.42857143, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Cypress/group-paying.spec.js unit-test equivalent - user1 sends $71.43 to user2 (total).', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u2', amount: 71.43 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false })).eql([
      { amount: 71.42857142857143, from: 'u1', to: 'u2' },
      { amount: 178.57142857142858, from: 'u1', to: 'u3' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false })).eql([
      { amount: 178.57142857, from: 'u1', to: 'u3', total: 178.57142857, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 28.57142857, from: 'u4', to: 'u2', total: 28.57142857, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 71.42857143, from: 'u4', to: 'u3', total: 71.42857143, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Cypress/group-paying.spec.js unit-test equivalent - user1 sends $100 to user3 (partial).', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u3', amount: 100 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false })).eql([
      { amount: 71.42857142857143, from: 'u1', to: 'u2' },
      { amount: 178.57142857142858, from: 'u1', to: 'u3' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false })).eql([
      { amount: 78.57142857, from: 'u1', to: 'u3', total: 178.57142857, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 28.57142857, from: 'u4', to: 'u2', total: 28.57142857, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 71.42857143, from: 'u4', to: 'u3', total: 71.42857143, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Cypress/group-paying.spec.js unit-test equivalent - user1 changes their income details to "needing.', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u1', haveNeed: -100 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false })).eql([
      { amount: 22.22222222222222, from: 'u4', to: 'u1' },
      { amount: 22.22222222222222, from: 'u4', to: 'u2' },
      { amount: 55.55555555555556, from: 'u4', to: 'u3' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false })).eql([
      { amount: 50.00035715, from: 'u4', to: 'u1', total: 50.00035715, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 14.28510204, from: 'u4', to: 'u2', total: 14.28510204, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 35.71454082, from: 'u4', to: 'u3', total: 35.71454082, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Cypress/group-paying.spec.js unit-test equivalent - user1 changes their income details back to "giving".', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 250 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false })).eql([
      { amount: 71.42857142857143, from: 'u1', to: 'u2' },
      { amount: 178.57142857142858, from: 'u1', to: 'u3' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false })).eql([
      { amount: 78.57142857, from: 'u1', to: 'u3', total: 178.57142857, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 28.57, from: 'u4', to: 'u2', total: 28.57, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 71.42857143, from: 'u4', to: 'u3', total: 71.42857143, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
})
describe.skip('Test partial payments with haveNeed changes', function () {
  it('partial payment + needer haveNeed reduced', function () {
    setup = [
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: -100 } },
      { type: 'paymentEvent', data: { from: 'u1', to: 'u2', amount: 50 } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: -60 } }
    ]
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true })).eql([
      { amount: 10, from: 'u1', to: 'u2', total: 60, partial: true, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('partial payment + needer haveNeed reduced past owed', function () {
    setup = [
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: -100 } },
      { type: 'paymentEvent', data: { from: 'u1', to: 'u2', amount: 50 } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: -40 } }
    ]
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true })).eql([])
  })
  it('partial payment + needer haveNeed increased', function () {
    setup = [
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: -100 } },
      { type: 'paymentEvent', data: { from: 'u1', to: 'u2', amount: 50 } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: -110 } }
    ]
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true })).eql([
      { amount: 50, from: 'u1', to: 'u2', total: 100, partial: true, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('partial payment + haver haveNeed reduced', function () {
    setup = [
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: -100 } },
      { type: 'paymentEvent', data: { from: 'u1', to: 'u2', amount: 50 } },
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 50 } }
    ]
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true })).eql([])
    // and then back up
    setup.push({ type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 60 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true })).eql([
      { amount: 10, from: 'u1', to: 'u2', total: 60, partial: true, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('partial payment + haver haveNeed increased', function () {
    setup = [
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: -100 } },
      { type: 'paymentEvent', data: { from: 'u1', to: 'u2', amount: 50 } },
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 110 } }
    ]
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true })).eql([
      { amount: 50, from: 'u1', to: 'u2', total: 100, partial: true, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('partial payment + haver + needer haveNeed increased', function () {
    setup = [
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: -100 } },
      { type: 'paymentEvent', data: { from: 'u1', to: 'u2', amount: 50 } },
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 110 } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: -110 } }
    ]
    // ground must not shift beneath our feat
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true })).eql([
      { amount: 50, from: 'u1', to: 'u2', total: 100, partial: true, isLate: false, dueOn: '2021-01' }
    ])
  })
})
