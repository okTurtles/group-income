/* eslint-env mocha */

import should from 'should'
import groupIncomeDistribution from './group-income-distribution.js'
import { addMonthsToDate, compareCycles, dateToMonthstamp } from '~/frontend/utils/time.js'
const mincomeAmount = 1000
let setup = []

const defaultStartDate = '2021-01'

// Helper function that returns the date string for a specific number of cycles past a specific start date.
function dateAtCyclesPassed(cycles, startDate = defaultStartDate) {
  return addMonthsToDate(startDate, cycles).toISOString()
}

// Helper fuction that inserts the "startCycleEvent" between each month's set of events.
function insertMonthlyCycleEvents(events: Array<Object>): Array<Object> {
  const newEvents = []
  let lastEvent = null
  for (const event of events) {
    if (!lastEvent) lastEvent = event
    if (compareCycles(event.data.when, lastEvent.data.when) > 0) {
      // Add the missing monthly cycle event
      const monthlyCycleEvent = {
        type: 'startCycleEvent',
        data: {
          payments: [], // List to be populated later, by the events-parser
          distribution: [], // List to be populated later, by the events-parser
          when: dateToMonthstamp(addMonthsToDate(dateToMonthstamp(lastEvent.data.when), 1))
        }
      }
      newEvents.push(monthlyCycleEvent)
      lastEvent = monthlyCycleEvent
    }

    newEvents.push(event)
  }

  return newEvents
}

// Helper fuction that inserts the "when" of each event.data.
function groupIncomeDistributionWrapper(events, opts, timeSpanMonths = 1.0, startDate = defaultStartDate) {
  // events = [{ type: 'startCycleEvent', data: { when: dateToMonthstamp(startDate), payments: [], distribution: [] } }].concat(events)
  const eventsWithTimeStamps = insertMonthlyCycleEvents(events.map((v, i) => {
    v.data.when = v.data.when ? v.data.when : dateToMonthstamp(addMonthsToDate(startDate, i * timeSpanMonths / events.length))
    return v
  }))
  // console.table(eventsWithTimeStamps) // TODO: for demonstration of commit; REMOVE!!!
  return groupIncomeDistribution(eventsWithTimeStamps, opts)
}

describe('Test group-income-distribution.js', function () {
  it('Test empty distirbution event list for un-adjusted distribution.', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([])
  })
  it('EVENTS: [u1, u5, u2 and u3] join the group and set haveNeeds of [100, 100, -50, and -50], respectively. Test unadjusted.', function () {
    setup = setup.concat([{ type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 100 } },
    { type: 'haveNeedEvent', data: { name: 'u5', haveNeed: 100 } },
    { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: -50 } },
    { type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -50 } }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 25, from: 'u1', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u1', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' }
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
      { amount: 25, from: 'u1', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u1', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  // With transaction minimization enabled it should look like this:
  // expect(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true })).eql([
  //   { from: 'u1', to: 'u2', amount: 50 },
  //   { from: 'u5', to: 'u3', amount: 50 }
  // ])
  it('Test the adjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 15, from: 'u1', to: 'u2', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u1', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  // With transaction minimization enabled it should look like this:
  // expect(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true })).eql([
  //   { from: 'u1', to: 'u2', amount: 40 },
  //   { from: 'u5', to: 'u3', amount: 50 }
  // ])
  it('EVENT: u4 joins and sets a need of 100. Test un-adjsuted first.', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u4', haveNeed: -100 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 25, from: 'u1', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u1', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u1', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Test the adjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 15, from: 'u1', to: 'u2', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u1', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u1', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  // With transaction minimization enabled it should look like this:
  // expect(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxn\s: true })).eql([
  //   { from: 'u1', to: 'u2', amount: 40 },
  //   { from: 'u1', to: 'u3', amount: 50 },
  //   { from: 'u5', to: 'u4', amount: 100 }
  // ])
  it('EVENT: u3 removes themselves from the group. Test un-adjsuted first.', function () {
    setup.push({ type: 'userExitsGroupEvent', data: { name: 'u3' } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 25, from: 'u1', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u1', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }

    ])
  })
  it('Test the adjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 15, from: 'u1', to: 'u2', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u1', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  // With transaction minimization enabled it should look like this:
  // expect(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true })).eql([
  //   { from: 'u1', to: 'u2', amount: 40 },
  //   { from: 'u1', to: 'u4', amount: 25 },
  //   { from: 'u5', to: 'u4', amount: 75 }
  // ])
  it('EVENT: u1 pays $5 to u4. Test un-adjsuted first.', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u4', amount: 5 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 25, from: 'u1', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u1', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Test the adjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 15, from: 'u1', to: 'u2', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 45, from: 'u1', to: 'u4', total: 50, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  // With transaction minimization enabled it should look like this:
  // expect(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true })).eql([
  //   { from: 'u1', to: 'u2', amount: 40 },
  //   { from: 'u1', to: 'u4', amount: 20 },
  //   { from: 'u5', to: 'u4', amount: 75 }
  // ])
  it('EVENT: u3 rejoins and sets haveNeed to -100. Test un-adjuusted first.', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -100 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 20, from: 'u1', to: 'u2', total: 20, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u1', to: 'u4', total: 40, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u1', to: 'u3', total: 40, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 20, from: 'u5', to: 'u2', total: 20, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u5', to: 'u4', total: 40, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u5', to: 'u3', total: 40, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Test the adjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 10, from: 'u1', to: 'u2', total: 20, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 35, from: 'u1', to: 'u4', total: 40, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u1', to: 'u3', total: 40, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 20, from: 'u5', to: 'u2', total: 20, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u5', to: 'u4', total: 40, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u5', to: 'u3', total: 40, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  // Something along these lines (could be different! but shouldn't exceed this number of txns!)
  // expect(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true })).eql([
  //   { from: 'u1', to: 'u2', amount: 30 },
  //   { from: 'u1', to: 'u4', amount: 55 },
  //   { from: 'u5', to: 'u3', amount: 80 },
  //   { from: 'u5', to: 'u4', amount: 20 }
  // ])
  it('EVENT: u5 pays $10 to u2. Test un-adjusted first.', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u5', to: 'u2', amount: 10 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 20, total: 20, isLate: false, partial: false, dueOn: '2021-01' },
      { from: 'u1', to: 'u4', amount: 40, total: 40, isLate: false, partial: false, dueOn: '2021-01' },
      { from: 'u5', to: 'u2', amount: 20, total: 20, isLate: false, partial: false, dueOn: '2021-01' },
      { amount: 40, from: 'u1', to: 'u3', total: 40, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u5', to: 'u4', total: 40, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u5', to: 'u3', total: 40, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Test the adjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 10, from: 'u1', to: 'u2', total: 20, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 35, from: 'u1', to: 'u4', total: 40, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u1', to: 'u3', total: 40, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10, from: 'u5', to: 'u2', total: 20, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u5', to: 'u4', total: 40, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u5', to: 'u3', total: 40, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  // Setup:
  // Every month u1 sends u2 $20
  // Last month u1 only sent u2 $10
  // So this month u1 has to send u2 $10 (Late Payment) + $20 for this month
  // So, u1 sends u2 $20
  // BUT, then u2 adjusts their income details (or maybe someone else does), and u1's TODO list for u2 has now changed from $20 / month, to $10 / month
  // So, since u1 sent u2 $20 this month, then the late payment of $10 has already been knocked out, plus u1 has paid for this month too
  it('Test the adjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    setup = [
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 20, when: dateAtCyclesPassed(0.2) } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: -20, when: dateAtCyclesPassed(0.3) } },
      { type: 'paymentEvent', data: { from: 'u1', to: 'u2', amount: 20, when: dateAtCyclesPassed(0.4) } },
      { type: 'paymentEvent', data: { from: 'u1', to: 'u2', amount: 10, when: dateAtCyclesPassed(1.1) } },
      { type: 'paymentEvent', data: { from: 'u1', to: 'u2', amount: 20, when: dateAtCyclesPassed(2.1) } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: -10, when: dateAtCyclesPassed(2.2) } }
    ]
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([])
  })

  // # EVENT: [u1, u2 and u3] join a group and set haveNeeds of [20, 20, -20], respectively
  // # EVENT: u1 sends 10 to u3
  // # EVENT: u1 adjusts haveNeed -10
  // # EVENT: u2 sends 10 to u1
  // # EVENT: u1 adjusts haveNeed 10
  it('Test the unadjusted version of the previous event-list. Should ignore payment events!', function () {
    setup = [
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 20, when: dateAtCyclesPassed(0.01) } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: 20, when: dateAtCyclesPassed(0.02) } },
      { type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -20, when: dateAtCyclesPassed(0.03) } },
      { type: 'paymentEvent', data: { from: 'u1', to: 'u3', amount: 10, when: dateAtCyclesPassed(0.04) } },
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: -10, when: dateAtCyclesPassed(0.05) } },
      { type: 'paymentEvent', data: { from: 'u2', to: 'u1', amount: 10, when: dateAtCyclesPassed(0.06) } },
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 10, when: dateAtCyclesPassed(0.07) } }
    ]
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u3', amount: 6.666666666666666, total: 6.666666666666666, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 13.333333333333332, from: 'u2', to: 'u3', total: 13.333333333333332, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 13.333333333333332, from: 'u2', to: 'u3', total: 13.333333333333332, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Test the adjusted version. Should ignore payment events!', function () {
    setup.push({ type: 'userExitsGroupEvent', data: { name: 'u1', when: dateAtCyclesPassed(0.08) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 20, from: 'u2', to: 'u3', total: 20, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Test the unadjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u2', to: 'u3', amount: 20, total: 20, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Cycle test. Unadjusted.', function () {
    setup = setup.concat({ type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 10, when: dateAtCyclesPassed(0.09) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u3', amount: 6.666666666666666, total: 6.666666666666666, isLate: false, partial: false, dueOn: '2021-01' },
      { amount: 13.333333333333332, from: 'u2', to: 'u3', total: 13.333333333333332, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Cycle test. Adjusted.', function () {
    setup.push({ type: 'userExitsGroupEvent', data: { name: 'u1', when: dateAtCyclesPassed(0.1) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u2', to: 'u3', amount: 20, total: 20, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Cycl test. Unadjusted & adjusted.', function () {
    setup = setup.concat({ type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 10, when: dateAtCyclesPassed(1.01) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 13.333333333333332, from: 'u2', to: 'u3', total: 13.333333333333332, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 6.666666666666666, from: 'u1', to: 'u3', total: 6.666666666666666, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 13.333333333333332, from: 'u2', to: 'u3', total: 13.333333333333332, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 6.666666666666666, from: 'u1', to: 'u3', total: 6.666666666666666, partial: false, isLate: false, dueOn: '2021-02' }
    ])
  })
  it('Cypress/group-paying.spec.js unit-test equivalent - three users join the group and add their income details.', function () {
    setup = [
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 250, when: dateAtCyclesPassed(0.01) } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: -100, when: dateAtCyclesPassed(0.02) } },
      { type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -250, when: dateAtCyclesPassed(0.03) } },
      { type: 'haveNeedEvent', data: { name: 'u4', haveNeed: 100, when: dateAtCyclesPassed(0.04) } }
    ]
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 178.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 178.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Cypress/group-paying.spec.js unit-test equivalent - user1 sends $71.43 to user2 (total).', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u2', amount: 71.43, when: dateAtCyclesPassed(0.05) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 178.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 178.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Cypress/group-paying.spec.js unit-test equivalent - user1 sends $100 to user3 (partial).', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u3', amount: 100, when: dateAtCyclesPassed(0.06) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 178.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 78.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Cypress/group-paying.spec.js unit-test equivalent - user1 changes their income details to "needing.', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u1', haveNeed: -100, when: dateAtCyclesPassed(0.07) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 22.22222222222222, from: 'u4', to: 'u1', total: 22.22222222222222, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 22.22222222222222, from: 'u4', to: 'u2', total: 22.22222222222222, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 55.55555555555556, from: 'u4', to: 'u3', total: 55.55555555555556, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 22.22222222222222, from: 'u4', to: 'u1', total: 22.22222222222222, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 22.22222222222222, from: 'u4', to: 'u2', total: 22.22222222222222, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 55.55555555555556, from: 'u4', to: 'u3', total: 55.55555555555556, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Cypress/group-paying.spec.js unit-test equivalent - user1 changes their income details back to "giving".', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 250, when: dateAtCyclesPassed(0.08) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 178.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 78.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Cypress/group-paying.spec.js unit-test equivalent - one month later, user1 sends to user3 the missing $78.57.', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u3', amount: 78.57, when: dateAtCyclesPassed(1.01) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 71.42857142857143, total: 71.42857142857143, dueOn: '2021-02', isLate: true, partial: false },
      { from: 'u1', to: 'u3', amount: 178.57142857142858, total: 178.57142857142858, dueOn: '2021-02', isLate: true, partial: false },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: true, dueOn: '2021-02' },
      { from: 'u1', to: 'u3', amount: 178.57142857142858, total: 178.57142857142858, dueOn: '2021-02', isLate: false, partial: false },
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 78.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: true, isLate: true, dueOn: '2021-02' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 100.00142857142859, from: 'u1', to: 'u3', total: 178.57142857142858, partial: true, isLate: false, dueOn: '2021-02' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-02' }
    ])
  })
  it('Added cypress test - two months later, make sure the first months distributions are gone.', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u3', amount: 178.58, when: dateAtCyclesPassed(2.01) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 71.42857142857143, total: 71.42857142857143, dueOn: '2021-02', isLate: true, partial: false },
      { from: 'u1', to: 'u3', amount: 178.57142857142858, total: 178.57142857142858, dueOn: '2021-02', isLate: true, partial: false },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: true, dueOn: '2021-02' },
      { from: 'u1', to: 'u3', amount: 178.57142857142858, total: 178.57142857142858, dueOn: '2021-03', isLate: true, partial: false },
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: true, dueOn: '2021-03' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: true, dueOn: '2021-03' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: true, dueOn: '2021-03' },
      { from: 'u1', to: 'u3', amount: 178.57142857142858, total: 178.57142857142858, dueOn: '2021-03', isLate: false, partial: false },
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-03' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: false, dueOn: '2021-03' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-03' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 78.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: true, isLate: true, dueOn: '2021-02' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: true, dueOn: '2021-03' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: true, dueOn: '2021-03' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: true, dueOn: '2021-03' },
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-03' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: false, dueOn: '2021-03' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-03' }
    ])
  })
})
