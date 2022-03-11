/* eslint-env mocha */

// run with: ./node_modules/.bin/mocha -w --require @babel/register frontend/utils/distribution/group-income-distribution.test.js

import should from 'should'
import groupIncomeDistribution from './group-income-distribution.js'
import { dateFromMonthstamp } from '~/frontend/utils/time.js'
const mincomeAmount = 1000
let setup = []

const defaultStartDate = dateFromMonthstamp('2021-01').toISOString()
const defaultLateDate = dateFromMonthstamp('2020-12').toISOString()

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
  it('Test empty distirbution event list for un-adjusted distribution.', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([])
  })
  it('EVENTS: [u1, u5, u2 and u3] join the group and set haveNeeds of [100, 100, -50, and -50], respectively. Test unadjusted.', function () {
    setup.splice(setup.length, 0,
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u5', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: -50 } },
      { type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -50 } }
    )
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 25, from: 'u1', to: 'u2' },
      { amount: 25, from: 'u1', to: 'u3' },
      { amount: 25, from: 'u5', to: 'u2' },
      { amount: 25, from: 'u5', to: 'u3' }
    ])
  })
  it('Test the adjusted version of the previous event-list. Should be unchanged.', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 25, from: 'u1', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u1', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('EVENT: a payment of $10 is made from u1 to u2. Test unadjusted first (again, unchanged)', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u2', amount: 10 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 25, from: 'u1', to: 'u2' },
      { amount: 25, from: 'u1', to: 'u3' },
      { amount: 25, from: 'u5', to: 'u2' },
      { amount: 25, from: 'u5', to: 'u3' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u5', to: 'u3', amount: 50 },
      { from: 'u1', to: 'u2', amount: 50 }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 40 },
      { from: 'u5', to: 'u3', amount: 50 }
    ])
  })
  it('EVENT: Adjusted of "a payment of $10 is made from u1 to u2."', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 15, from: 'u1', to: 'u2', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u1', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('EVENT: u4 joins and sets a need of 100. Test un-adjsuted first.', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u4', haveNeed: -100 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 25, from: 'u1', to: 'u2' },
      { amount: 25, from: 'u1', to: 'u3' },
      { amount: 50, from: 'u1', to: 'u4' },
      { amount: 25, from: 'u5', to: 'u2' },
      { amount: 25, from: 'u5', to: 'u3' },
      { amount: 50, from: 'u5', to: 'u4' }
    ])
  })
  it('Adjusted of: "u4 joins and sets a need of 100."', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 15, from: 'u1', to: 'u2', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u1', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u1', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 40 },
      { from: 'u1', to: 'u3', amount: 50 },
      { from: 'u5', to: 'u4', amount: 100 }
    ])
  })
  it('EVENT: u3 removes themselves from the group. Test un-adjsuted first.', function () {
    setup.push({ type: 'userExitsGroupEvent', data: { name: 'u3' } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 25, from: 'u1', to: 'u2' },
      { amount: 50, from: 'u1', to: 'u4' },
      { amount: 25, from: 'u5', to: 'u2' },
      { amount: 50, from: 'u5', to: 'u4' }

    ])
  })
  it('Adjusted of: "u3 removes themselves from the group."', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 15, from: 'u1', to: 'u2', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u1', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 40 },
      { from: 'u1', to: 'u4', amount: 25 },
      { from: 'u5', to: 'u4', amount: 75 }
    ])
  })
  it('EVENT: u1 pays $5 to u4. Test un-adjsuted first.', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u4', amount: 5 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 25, from: 'u1', to: 'u2' },
      { amount: 50, from: 'u1', to: 'u4' },
      { amount: 25, from: 'u5', to: 'u2' },
      { amount: 50, from: 'u5', to: 'u4' }
    ])
  })
  it('Adjusted of: "u1 pays $5 to u4."', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 15, from: 'u1', to: 'u2', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 45, from: 'u1', to: 'u4', total: 50, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 40 },
      { from: 'u1', to: 'u4', amount: 20 },
      { from: 'u5', to: 'u4', amount: 75 }
    ])
  })
  it('EVENT: u3 rejoins and sets haveNeed to -100. Test un-adjuusted first.', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -100 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 20, from: 'u1', to: 'u2' },
      { amount: 40, from: 'u1', to: 'u4' },
      { amount: 40, from: 'u1', to: 'u3' },
      { amount: 20, from: 'u5', to: 'u2' },
      { amount: 40, from: 'u5', to: 'u4' },
      { amount: 40, from: 'u5', to: 'u3' }
    ])
  })
  it('Adjusted of: "u3 rejoins and sets haveNeed to -100."', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 10, from: 'u1', to: 'u2', total: 20, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 35, from: 'u1', to: 'u4', total: 40, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u1', to: 'u3', total: 40, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 20, from: 'u5', to: 'u2', total: 20, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u5', to: 'u4', total: 40, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u5', to: 'u3', total: 40, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 30 },
      { from: 'u1', to: 'u4', amount: 55 },
      { from: 'u5', to: 'u4', amount: 20 },
      { from: 'u5', to: 'u3', amount: 80 }
    ])
  })
  it('EVENT: u5 pays $10 to u2. Test un-adjusted first.', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u5', to: 'u2', amount: 10 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 20, from: 'u1', to: 'u2' },
      { amount: 40, from: 'u1', to: 'u4' },
      { amount: 40, from: 'u1', to: 'u3' },
      { amount: 20, from: 'u5', to: 'u2' },
      { amount: 40, from: 'u5', to: 'u4' },
      { amount: 40, from: 'u5', to: 'u3' }
    ])
  })
  it('Adjusted of: "u5 pays $10 to u2."', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 10, from: 'u1', to: 'u2', total: 20, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 35, from: 'u1', to: 'u4', total: 40, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u1', to: 'u3', total: 40, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10, from: 'u5', to: 'u2', total: 20, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u5', to: 'u4', total: 40, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u5', to: 'u3', total: 40, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Adjusted 100h2x 100n3x w/payment', function () {
    setup = [{ type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -100 } },
      { type: 'haveNeedEvent', data: { name: 'u4', haveNeed: -100 } },
      { type: 'paymentEvent', data: { from: 'u1', to: 'u3', amount: 50 } },
      { type: 'haveNeedEvent', data: { name: 'u5', haveNeed: -100 } }
    ]
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 25.000000000000004, from: 'u1', to: 'u4', total: 25.000000000000004, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25.000000000000004, from: 'u1', to: 'u5', total: 25.000000000000004, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 33.33333333333333, from: 'u2', to: 'u3', total: 33.33333333333333, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 33.33333333333333, from: 'u2', to: 'u4', total: 33.33333333333333, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 33.33333333333333, from: 'u2', to: 'u5', total: 33.33333333333333, partial: false, isLate: false, dueOn: '2021-01' }
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
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 6.666666666666666, from: 'u2', to: 'u1' },
      { amount: 13.333333333333332, from: 'u2', to: 'u3' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 9.999999999999998, from: 'u2', to: 'u1', total: 9.999999999999998, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10, from: 'u2', to: 'u3', total: 10, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Adjusted 20h1x 20n2x - u3 adjusts haveNeed', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -2 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 10, from: 'u2', to: 'u1', total: 10, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    setup.push({ type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -12 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
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
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 6.666666666666666, from: 'u1', to: 'u3' },
      { amount: 13.333333333333332, from: 'u2', to: 'u3' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 10, from: 'u2', to: 'u3', total: 10, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('20h2x 20n1x - now u1 leaves (unadjusted)', function () {
    setup.push({ type: 'userExitsGroupEvent', data: { name: 'u1' } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 20, from: 'u2', to: 'u3' }
    ])
  })
  it('20h2x 20n1x - now u1 leaves (adjusted)', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u2', to: 'u3', amount: 10, total: 10, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('20h2x 20n1x - u1 returns (unadjusted)', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 10 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 13.333333333333332, from: 'u2', to: 'u3' },
      { amount: 6.666666666666666, from: 'u1', to: 'u3' }
    ])
  })
  it.skip('Cycle test. Adjusted.', function () {
    setup.push({ type: 'userExitsGroupEvent', data: { name: 'u1' } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 13.333333333333332, from: 'u2', to: 'u3', total: 13.333333333333332, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 20, from: 'u2', to: 'u3', total: 20, partial: false, isLate: false, dueOn: '2021-02' }
    ])
  })
  it.skip('Cycle test. Unadjusted & adjusted.', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 10 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u3', amount: 6.666666666666666 },
      { amount: 13.333333333333332, from: 'u2', to: 'u3' },
      { amount: 6.666666666666666, from: 'u1', to: 'u3' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
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
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 71.42857142857143, from: 'u1', to: 'u2' },
      { amount: 178.57142857142858, from: 'u1', to: 'u3' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 178.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Cypress/group-paying.spec.js unit-test equivalent - user1 sends $71.43 to user2 (total).', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u2', amount: 71.43 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 71.42857142857143, from: 'u1', to: 'u2' },
      { amount: 178.57142857142858, from: 'u1', to: 'u3' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 178.57, from: 'u1', to: 'u3', total: 178.57, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 28.569999999999993, from: 'u4', to: 'u2', total: 28.569999999999993, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 71.42999999999999, from: 'u4', to: 'u3', total: 71.42999999999999, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Cypress/group-paying.spec.js unit-test equivalent - user1 sends $100 to user3 (partial).', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u3', amount: 100 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 71.42857142857143, from: 'u1', to: 'u2' },
      { amount: 178.57142857142858, from: 'u1', to: 'u3' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 78.57, from: 'u1', to: 'u3', total: 178.56818181818178, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 28.569999999999993, from: 'u4', to: 'u2', total: 28.569999999999993, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 71.42999999999999, from: 'u4', to: 'u3', total: 71.42999999999999, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Cypress/group-paying.spec.js unit-test equivalent - user1 changes their income details to "needing.', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u1', haveNeed: -100 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 22.22222222222222, from: 'u4', to: 'u1' },
      { amount: 22.22222222222222, from: 'u4', to: 'u2' },
      { amount: 55.55555555555556, from: 'u4', to: 'u3' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 22.22222222222222, from: 'u4', to: 'u1', total: 22.22222222222222, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 22.22222222222222, from: 'u4', to: 'u2', total: 22.22222222222222, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 55.55555555555556, from: 'u4', to: 'u3', total: 55.55555555555556, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Cypress/group-paying.spec.js unit-test equivalent - user1 changes their income details back to "giving".', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 250 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 71.42857142857143, from: 'u1', to: 'u2' },
      { amount: 178.57142857142858, from: 'u1', to: 'u3' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 78.57, from: 'u1', to: 'u3', total: 178.56818181818178, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 28.569999999999993, from: 'u4', to: 'u2', total: 28.569999999999993, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 71.42999999999999, from: 'u4', to: 'u3', total: 71.42999999999999, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it.skip('Cypress/group-paying.spec.js unit-test equivalent - one month later, user1 sends to user3 the missing $78.57.', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u3', amount: 78.57 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 71.42857142857142 },
      { from: 'u1', to: 'u3', amount: 178.57142857142856 },
      { amount: 28.571428571428562, from: 'u4', to: 'u2' },
      { amount: 71.42857142857142, from: 'u4', to: 'u3' },
      { from: 'u1', to: 'u3', amount: 178.57142857142858 },
      { amount: 71.42857142857143, from: 'u1', to: 'u2' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 78.57142857142857, from: 'u1', to: 'u3', total: 178.57142857142856, isLate: true, partial: true, dueOn: '2021-02' },
      { amount: 28.571428571428562, from: 'u4', to: 'u2', total: 28.571428571428562, isLate: true, partial: false, dueOn: '2021-02' },
      { amount: 71.42857142857142, from: 'u4', to: 'u3', total: 71.42857142857142, isLate: true, partial: false, dueOn: '2021-02' },
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, isLate: false, partial: false, dueOn: '2021-02' },
      { amount: 100.00142857142859, from: 'u1', to: 'u3', total: 178.57142857142858, isLate: false, partial: true, dueOn: '2021-02' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, isLate: false, partial: false, dueOn: '2021-02' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, isLate: false, partial: false, dueOn: '2021-02' }
    ])
  })
  it.skip('Added cypress test - two months later, make sure the first months distributions are gone.', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u3', amount: 178.58 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 71.42857142857142 },
      { from: 'u1', to: 'u3', amount: 178.57142857142856 },
      { amount: 28.571428571428562, from: 'u4', to: 'u2' },
      { amount: 71.42857142857142, from: 'u4', to: 'u3' },
      { from: 'u1', to: 'u3', amount: 2.842170943040401e-14 },
      { amount: 71.42857142857143, from: 'u1', to: 'u2' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3' },
      { from: 'u1', to: 'u3', amount: 178.57142857142856 },
      { amount: 71.42857142857142, from: 'u1', to: 'u2' },
      { amount: 28.571428571428562, from: 'u4', to: 'u2' },
      { amount: 71.42857142857142, from: 'u4', to: 'u3' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 78.57142857142857, from: 'u1', to: 'u3', total: 178.57142857142856, isLate: true, partial: true, dueOn: '2021-02' },
      { amount: 28.571428571428562, from: 'u4', to: 'u2', total: 28.571428571428562, isLate: true, partial: false, dueOn: '2021-02' },
      { amount: 71.42857142857142, from: 'u4', to: 'u3', total: 71.42857142857142, isLate: true, partial: false, dueOn: '2021-02' },
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, isLate: true, partial: false, dueOn: '2021-03' },
      { amount: 2.842170943040401e-14, from: 'u1', to: 'u3', total: 2.842170943040401e-14, isLate: true, partial: false, dueOn: '2021-03' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, isLate: true, partial: false, dueOn: '2021-03' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, isLate: true, partial: false, dueOn: '2021-03' },
      { amount: 71.42857142857142, from: 'u1', to: 'u2', total: 71.42857142857142, isLate: false, partial: false, dueOn: '2021-03' },
      { amount: 28.571428571428562, from: 'u4', to: 'u2', total: 28.571428571428562, isLate: false, partial: false, dueOn: '2021-03' },
      { amount: 71.42857142857142, from: 'u4', to: 'u3', total: 71.42857142857142, isLate: false, partial: false, dueOn: '2021-03' }
    ])
  })
})
