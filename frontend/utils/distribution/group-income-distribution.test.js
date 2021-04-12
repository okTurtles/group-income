/* eslint-env mocha */

import should from 'should'
import groupIncomeDistribution from './group-income-distribution.js'

const mincomeAmount = 1000
let setup = [
  { type: 'startCycleEvent', data: { cycle: 0, latePayments: [] } }
]

describe('Test group-income-distribution.js', function () {
  it('Test empty distirbution event list for un-adjusted distribution.', function () {
    should(groupIncomeDistribution(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([])
  })
  it('EVENTS: [u1, u5, u2 and u3] join the group and set haveNeeds of [100, 100, -50, and -50], respectively. Test unadjusted.', function () {
    setup = [setup,
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u5', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: -50 } },
      { type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -50 } }
    ].flat()
    should(groupIncomeDistribution(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 25 },
      { from: 'u1', to: 'u3', amount: 25 },
      { from: 'u5', to: 'u2', amount: 25 },
      { from: 'u5', to: 'u3', amount: 25 }
    ])
  })
  it('Test the adjusted version of the previous event-list. Should be unchanged.', function () {
    should(groupIncomeDistribution(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 25 },
      { from: 'u1', to: 'u3', amount: 25 },
      { from: 'u5', to: 'u2', amount: 25 },
      { from: 'u5', to: 'u3', amount: 25 }
    ])
  })
  it('EVENT: a payment of $10 is made from u1 to u2. Test unadjusted first (again, unchanged)', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u2', amount: 10 } })
    should(groupIncomeDistribution(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 25 },
      { from: 'u1', to: 'u3', amount: 25 },
      { from: 'u5', to: 'u2', amount: 25 },
      { from: 'u5', to: 'u3', amount: 25 }
    ])
  })
  // With transaction minimization enabled it should look like this:
  // expect(groupIncomeDistribution(setup, { adjusted: false, minimizeTxns: true })).eql([
  //   { from: 'u1', to: 'u2', amount: 50 },
  //   { from: 'u5', to: 'u3', amount: 50 }
  // ])
  it('Test the adjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    should(groupIncomeDistribution(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 15 },
      { from: 'u1', to: 'u3', amount: 25 },
      { from: 'u5', to: 'u2', amount: 25 },
      { from: 'u5', to: 'u3', amount: 25 }
    ])
  })
  // With transaction minimization enabled it should look like this:
  // expect(groupIncomeDistribution(setup, { adjusted: true, minimizeTxns: true })).eql([
  //   { from: 'u1', to: 'u2', amount: 40 },
  //   { from: 'u5', to: 'u3', amount: 50 }
  // ])
  it('EVENT: u4 joins and sets a need of 100. Test un-adjsuted first.', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u4', haveNeed: -100 } })
    should(groupIncomeDistribution(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 25 },
      { from: 'u1', to: 'u3', amount: 25 },
      { from: 'u1', to: 'u4', amount: 50 },
      { from: 'u5', to: 'u2', amount: 25 },
      { from: 'u5', to: 'u3', amount: 25 },
      { from: 'u5', to: 'u4', amount: 50 }
    ])
  })
  it('Test the adjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    should(groupIncomeDistribution(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 15 },
      { from: 'u1', to: 'u3', amount: 25 },
      { from: 'u1', to: 'u4', amount: 50 },
      { from: 'u5', to: 'u2', amount: 25 },
      { from: 'u5', to: 'u3', amount: 25 },
      { from: 'u5', to: 'u4', amount: 50 }
    ])
  })
  // With transaction minimization enabled it should look like this:
  // expect(groupIncomeDistribution(setup, { adjusted: true, minimizeTxn\s: true })).eql([
  //   { from: 'u1', to: 'u2', amount: 40 },
  //   { from: 'u1', to: 'u3', amount: 50 },
  //   { from: 'u5', to: 'u4', amount: 100 }
  // ])
  it('EVENT: u3 removes themselves from the group. Test un-adjsuted first.', function () {
    setup.push({ type: 'userExitsGroupEvent', data: { name: 'u3' } })
    should(groupIncomeDistribution(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 25 },
      { from: 'u1', to: 'u4', amount: 50 },
      { from: 'u5', to: 'u2', amount: 25 },
      { from: 'u5', to: 'u4', amount: 50 }
    ])
  })
  it('Test the adjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    should(groupIncomeDistribution(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 15 },
      { from: 'u1', to: 'u4', amount: 50 },
      { from: 'u5', to: 'u2', amount: 25 },
      { from: 'u5', to: 'u4', amount: 50 }
    ])
  })
  // With transaction minimization enabled it should look like this:
  // expect(groupIncomeDistribution(setup, { adjusted: true, minimizeTxns: true })).eql([
  //   { from: 'u1', to: 'u2', amount: 40 },
  //   { from: 'u1', to: 'u4', amount: 25 },
  //   { from: 'u5', to: 'u4', amount: 75 }
  // ])
  it('EVENT: u1 pays $5 to u4. Test un-adjsuted first.', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u4', amount: 5 } })
    should(groupIncomeDistribution(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 25 },
      { from: 'u1', to: 'u4', amount: 50 },
      { from: 'u5', to: 'u2', amount: 25 },
      { from: 'u5', to: 'u4', amount: 50 }
    ])
  })
  it('Test the adjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    should(groupIncomeDistribution(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 15 },
      { from: 'u1', to: 'u4', amount: 45 },
      { from: 'u5', to: 'u2', amount: 25 },
      { from: 'u5', to: 'u4', amount: 50 }
    ])
  })
  // With transaction minimization enabled it should look like this:
  // expect(groupIncomeDistribution(setup, { adjusted: true, minimizeTxns: true })).eql([
  //   { from: 'u1', to: 'u2', amount: 40 },
  //   { from: 'u1', to: 'u4', amount: 20 },
  //   { from: 'u5', to: 'u4', amount: 75 }
  // ])
  it('EVENT: u3 rejoins and sets haveNeed to -100. Test un-adjuusted first.', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -100 } })
    should(groupIncomeDistribution(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 20 },
      { from: 'u1', to: 'u4', amount: 40 },
      { from: 'u1', to: 'u3', amount: 40 },
      { from: 'u5', to: 'u2', amount: 20 },
      { from: 'u5', to: 'u4', amount: 40 },
      { from: 'u5', to: 'u3', amount: 40 }
    ])
  })
  it('Test the adjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    should(groupIncomeDistribution(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 10 },
      { from: 'u1', to: 'u4', amount: 35 },
      { from: 'u1', to: 'u3', amount: 40 },
      { from: 'u5', to: 'u2', amount: 20 },
      { from: 'u5', to: 'u4', amount: 40 },
      { from: 'u5', to: 'u3', amount: 40 }
    ])
  })
  // Something along these lines (could be different! but shouldn't exceed this number of txns!)
  // expect(groupIncomeDistribution(setup, { adjusted: true, minimizeTxns: true })).eql([
  //   { from: 'u1', to: 'u2', amount: 30 },
  //   { from: 'u1', to: 'u4', amount: 55 },
  //   { from: 'u5', to: 'u3', amount: 80 },
  //   { from: 'u5', to: 'u4', amount: 20 }
  // ])
  it('EVENT: u5 pays $10 to u2. Test un-adjusted first.', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u5', to: 'u2', amount: 10 } })
    should(groupIncomeDistribution(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { to: 'u2', from: 'u1', amount: 20 },
      { to: 'u4', from: 'u1', amount: 40 },
      { to: 'u2', from: 'u5', amount: 20 },
      { to: 'u3', from: 'u1', amount: 40 },
      { to: 'u4', from: 'u5', amount: 40 },
      { to: 'u3', from: 'u5', amount: 40 }
    ])
  })
  it('Test the adjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    should(groupIncomeDistribution(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 10 },
      { from: 'u1', to: 'u4', amount: 35 },
      { from: 'u1', to: 'u3', amount: 40 },
      { from: 'u5', to: 'u2', amount: 10 },
      { from: 'u5', to: 'u4', amount: 40 },
      { from: 'u5', to: 'u3', amount: 40 }
    ])
  })
})
