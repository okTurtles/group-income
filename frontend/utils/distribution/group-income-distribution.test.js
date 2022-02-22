/* eslint-env mocha */

import should from 'should'
import groupIncomeDistribution from './group-income-distribution.js'
import { addMonthsToDate, compareCycles, dateToMonthstamp } from '~/frontend/utils/time.js'
const mincomeAmount = 1000
let setup = []

const defaultStartDate = '2021-01'

// Helper function that returns the date string for a specific number of cycles past a specific start date.
function dateAtCyclesPassed (cycles, startDate = defaultStartDate) {
  return addMonthsToDate(startDate, cycles).toISOString()
}

// Helper fuction that inserts the "startCycleEvent" between each month's set of events.
function insertMonthlyCycleEvents (events: Array<Object>): Array<Object> {
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
function groupIncomeDistributionWrapper (events, opts, timeSpanMonths = 1.0, startDate = defaultStartDate) {
  // events = [{ type: 'startCycleEvent', data: { when: dateToMonthstamp(startDate), payments: [], distribution: [] } }].concat(events)
  const eventsWithTimeStamps = insertMonthlyCycleEvents(events.map((v, i) => {
    v.data.when = v.data.when ? v.data.when : dateToMonthstamp(addMonthsToDate(startDate, i * timeSpanMonths / events.length))
    return v
  }))
  // console.table(eventsWithTimeStamps) // TODO: for demonstration of commit; REMOVE!!!
  return groupIncomeDistribution(eventsWithTimeStamps, opts)
}

describe('Test group-income-distribution.js (without minimization)', function () {
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
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 50, from: 'u1', to: 'u2', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u3', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Test the adjusted version of the previous event-list. Should be unchanged.', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 25, from: 'u1', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u1', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 50, from: 'u1', to: 'u2', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u3', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
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
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 50, from: 'u1', to: 'u2', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u3', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Test the adjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 15, from: 'u1', to: 'u2', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u1', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 40, total: 50, partial: true, isLate: false, dueOn: '2021-01' },
      { from: 'u5', to: 'u3', amount: 50, total: 50, isLate: false, partial: false, dueOn: '2021-01' }
    ])
  })
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
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 50, total: 50, dueOn: '2021-01', isLate: false, partial: false },
      { amount: 50, from: 'u1', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u3', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
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
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 40, from: 'u1', to: 'u2', total: 50, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u1', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u3', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }

    ])
  })
  it('EVENT: u3 removes themselves from the group. Test un-adjsuted first.', function () {
    setup.push({ type: 'userExitsGroupEvent', data: { name: 'u3' } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 25, from: 'u1', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u1', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 50, from: 'u1', to: 'u2', total: 50, isLate: false, partial: false, dueOn: '2021-01' },
      { amount: 25, from: 'u1', to: 'u4', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 75, from: 'u5', to: 'u4', total: 75, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Test the adjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 15, from: 'u1', to: 'u2', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u1', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 40, from: 'u1', to: 'u2', total: 50, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u1', to: 'u4', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 75, from: 'u5', to: 'u4', total: 75, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('EVENT: u1 pays $5 to u4. Test un-adjsuted first.', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u4', amount: 5 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 25, from: 'u1', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u1', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 50, from: 'u1', to: 'u2', total: 50, isLate: false, partial: false, dueOn: '2021-01' },
      { amount: 25, from: 'u1', to: 'u4', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 75, from: 'u5', to: 'u4', total: 75, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Test the adjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 15, from: 'u1', to: 'u2', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 45, from: 'u1', to: 'u4', total: 50, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 40, from: 'u1', to: 'u2', total: 50, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 20, from: 'u1', to: 'u4', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 75, from: 'u5', to: 'u4', total: 75, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
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
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 40, total: 40, dueOn: '2021-01', isLate: false, partial: false },
      { amount: 60, from: 'u1', to: 'u3', total: 60, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 80, from: 'u5', to: 'u4', total: 80, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 20, from: 'u5', to: 'u3', total: 20, partial: false, isLate: false, dueOn: '2021-01' }
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
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 30, from: 'u1', to: 'u2', total: 40, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 60, from: 'u1', to: 'u3', total: 60, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 80, from: 'u5', to: 'u4', total: 80, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 20, from: 'u5', to: 'u3', total: 20, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('EVENT: u5 pays $10 to u2. Test un-adjusted first.', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u5', to: 'u2', amount: 10 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 20, from: 'u1', to: 'u2', total: 20, isLate: false, partial: false, dueOn: '2021-01' },
      { amount: 40, from: 'u1', to: 'u4', total: 40, isLate: false, partial: false, dueOn: '2021-01' },
      { amount: 20, from: 'u5', to: 'u2', total: 20, isLate: false, partial: false, dueOn: '2021-01' },
      { amount: 40, from: 'u1', to: 'u3', total: 40, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u5', to: 'u4', total: 40, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u5', to: 'u3', total: 40, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 40, total: 40, dueOn: '2021-01', isLate: false, partial: false },
      { amount: 60, from: 'u1', to: 'u3', total: 60, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 80, from: 'u5', to: 'u4', total: 80, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 20, from: 'u5', to: 'u3', total: 20, partial: false, isLate: false, dueOn: '2021-01' }
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
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 30, from: 'u1', to: 'u2', total: 40, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 60, from: 'u1', to: 'u3', total: 60, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 80, from: 'u5', to: 'u4', total: 80, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 20, from: 'u5', to: 'u3', total: 20, partial: false, isLate: false, dueOn: '2021-01' }
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
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([])
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
      { amount: 6.666666666666666, from: 'u1', to: 'u3', total: 6.666666666666666, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 13.333333333333332, from: 'u2', to: 'u3', total: 13.333333333333332, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 6.666666666666666, from: 'u1', to: 'u3', total: 6.666666666666666, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 13.333333333333332, from: 'u2', to: 'u3', total: 13.333333333333332, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 13.333333333333332, from: 'u2', to: 'u3', total: 13.333333333333332, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 13.333333333333332, from: 'u2', to: 'u3', total: 13.333333333333332, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Test the adjusted version. Should ignore payment events!', function () {
    setup.push({ type: 'userExitsGroupEvent', data: { name: 'u1', when: dateAtCyclesPassed(0.08) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 20, from: 'u2', to: 'u3', total: 20, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 20, from: 'u2', to: 'u3', total: 20, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Test the unadjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 20, from: 'u2', to: 'u3', total: 20, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 20, from: 'u2', to: 'u3', total: 20, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Cycle test. Unadjusted.', function () {
    setup = setup.concat({ type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 10, when: dateAtCyclesPassed(0.09) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 6.666666666666666, from: 'u1', to: 'u3', total: 6.666666666666666, isLate: false, partial: false, dueOn: '2021-01' },
      { amount: 13.333333333333332, from: 'u2', to: 'u3', total: 13.333333333333332, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 6.666666666666666, from: 'u1', to: 'u3', total: 6.666666666666666, isLate: false, partial: false, dueOn: '2021-01' },
      { amount: 13.333333333333332, from: 'u2', to: 'u3', total: 13.333333333333332, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Cycle test. Adjusted.', function () {
    setup.push({ type: 'userExitsGroupEvent', data: { name: 'u1', when: dateAtCyclesPassed(1.01) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 13.333333333333332, from: 'u2', to: 'u3', total: 13.333333333333332, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 20, from: 'u2', to: 'u3', total: 20, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 13.333333333333332, from: 'u2', to: 'u3', total: 13.333333333333332, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 20, from: 'u2', to: 'u3', total: 20, partial: false, isLate: false, dueOn: '2021-02' }
    ])
  })
  it('Cycle test.', function () {
    setup = setup.concat({ type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 10, when: dateAtCyclesPassed(1.02) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 6.666666666666666, from: 'u1', to: 'u3', total: 6.666666666666666, isLate: true, partial: false, dueOn: '2021-02' },
      { amount: 13.333333333333332, from: 'u2', to: 'u3', total: 13.333333333333332, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 6.666666666666666, from: 'u1', to: 'u3', total: 6.666666666666666, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 6.666666666666666, from: 'u1', to: 'u3', total: 6.666666666666666, isLate: true, partial: false, dueOn: '2021-02' },
      { amount: 13.333333333333332, from: 'u2', to: 'u3', total: 13.333333333333332, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 6.666666666666666, from: 'u1', to: 'u3', total: 6.666666666666666, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 13.333333333333332, from: 'u2', to: 'u3', total: 13.333333333333332, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 6.666666666666666, from: 'u1', to: 'u3', total: 6.666666666666666, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
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
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 100, from: 'u1', to: 'u2', total: 100, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 150.00000000000003, from: 'u1', to: 'u3', total: 150.00000000000003, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 178.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 100, from: 'u1', to: 'u2', total: 100, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 150.00000000000003, from: 'u1', to: 'u3', total: 150.00000000000003, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: false, dueOn: '2021-01' }
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
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 100, from: 'u1', to: 'u2', total: 100, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 150.00000000000003, from: 'u1', to: 'u3', total: 150.00000000000003, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 178.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 28.569999999999993, from: 'u1', to: 'u2', total: 100, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 150.00000000000003, from: 'u1', to: 'u3', total: 150.00000000000003, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: false, dueOn: '2021-01' }
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
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 100, from: 'u1', to: 'u2', total: 100, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 150.00000000000003, from: 'u1', to: 'u3', total: 150.00000000000003, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 78.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 28.569999999999993, from: 'u1', to: 'u2', total: 100, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 50.00000000000003, from: 'u1', to: 'u3', total: 150.00000000000003, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Cypress/group-paying.spec.js unit-test equivalent - user1 changes their income details to "needing.', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u1', haveNeed: -100, when: dateAtCyclesPassed(0.07) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 22.22222222222222, from: 'u4', to: 'u1', total: 22.22222222222222, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 22.22222222222222, from: 'u4', to: 'u2', total: 22.22222222222222, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 55.55555555555556, from: 'u4', to: 'u3', total: 55.55555555555556, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 22.22222222222222, from: 'u4', to: 'u1', total: 22.22222222222222, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 22.22222222222222, from: 'u4', to: 'u2', total: 22.22222222222222, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 55.55555555555556, from: 'u4', to: 'u3', total: 55.55555555555556, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 22.22222222222222, from: 'u4', to: 'u1', total: 22.22222222222222, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 22.22222222222222, from: 'u4', to: 'u2', total: 22.22222222222222, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 55.55555555555556, from: 'u4', to: 'u3', total: 55.55555555555556, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
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
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 100, from: 'u1', to: 'u2', total: 100, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 150.00000000000003, from: 'u1', to: 'u3', total: 150.00000000000003, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 78.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 28.569999999999993, from: 'u1', to: 'u2', total: 100, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 50.00000000000003, from: 'u1', to: 'u3', total: 150.00000000000003, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Cypress/group-paying.spec.js unit-test equivalent - one month later, user1 sends to user3 the missing $78.57.', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u3', amount: 78.57, when: dateAtCyclesPassed(1.01) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 178.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 178.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 100, from: 'u1', to: 'u2', total: 100, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 150.00000000000003, from: 'u1', to: 'u3', total: 150.00000000000003, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 150.00000000000003, from: 'u1', to: 'u3', total: 150.00000000000003, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 100, from: 'u1', to: 'u2', total: 100, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: false, dueOn: '2021-02' }
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
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 28.569999999999993, from: 'u1', to: 'u2', total: 100, partial: true, isLate: true, dueOn: '2021-02' },
      { amount: 50.00000000000003, from: 'u1', to: 'u3', total: 150.00000000000003, partial: true, isLate: true, dueOn: '2021-02' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 100, from: 'u1', to: 'u2', total: 100, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 71.43000000000004, from: 'u1', to: 'u3', total: 150.00000000000003, partial: true, isLate: false, dueOn: '2021-02' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: false, dueOn: '2021-02' }
    ])
  })
  it('Added cypress test - two months later, make sure the first months distributions are gone.', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u3', amount: 178.58, when: dateAtCyclesPassed(2.01) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 178.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 178.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: false, isLate: true, dueOn: '2021-03' },
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: true, dueOn: '2021-03' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: true, dueOn: '2021-03' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: true, dueOn: '2021-03' },
      { amount: 178.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: false, isLate: false, dueOn: '2021-03' },
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-03' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: false, dueOn: '2021-03' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-03' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 100, from: 'u1', to: 'u2', total: 100, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 150.00000000000003, from: 'u1', to: 'u3', total: 150.00000000000003, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 150.00000000000003, from: 'u1', to: 'u3', total: 150.00000000000003, partial: false, isLate: true, dueOn: '2021-03' },
      { amount: 100, from: 'u1', to: 'u2', total: 100, partial: false, isLate: true, dueOn: '2021-03' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: true, dueOn: '2021-03' },
      { amount: 150.00000000000003, from: 'u1', to: 'u3', total: 150.00000000000003, partial: false, isLate: false, dueOn: '2021-03' },
      { amount: 100, from: 'u1', to: 'u2', total: 100, partial: false, isLate: false, dueOn: '2021-03' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: false, dueOn: '2021-03' }
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
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 28.569999999999993, from: 'u1', to: 'u2', total: 100, partial: true, isLate: true, dueOn: '2021-02' },
      { amount: 50.00000000000003, from: 'u1', to: 'u3', total: 150.00000000000003, partial: true, isLate: true, dueOn: '2021-02' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 100, from: 'u1', to: 'u2', total: 100, partial: false, isLate: true, dueOn: '2021-03' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: true, dueOn: '2021-03' },
      { amount: 100, from: 'u1', to: 'u2', total: 100, partial: false, isLate: false, dueOn: '2021-03' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: false, dueOn: '2021-03' }
    ])
  })
  it('Minor transaction minimization-specific tests.', function () {
    setup = [
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 1000, when: dateAtCyclesPassed(0.01) } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: 800, when: dateAtCyclesPassed(0.02) } },
      { type: 'haveNeedEvent', data: { name: 'u3', haveNeed: 600, when: dateAtCyclesPassed(0.02) } },
      { type: 'haveNeedEvent', data: { name: 'u4', haveNeed: -600, when: dateAtCyclesPassed(0.04) } },
      { type: 'haveNeedEvent', data: { name: 'u5', haveNeed: -200, when: dateAtCyclesPassed(0.05) } },
      { type: 'haveNeedEvent', data: { name: 'u6', haveNeed: -100, when: dateAtCyclesPassed(0.06) } }
    ]
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 374.99999999999994, from: 'u1', to: 'u4', total: 374.99999999999994, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.4210854715202004e-14, from: 'u2', to: 'u4', total: 1.4210854715202004e-14, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 200, from: 'u2', to: 'u5', total: 200, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 100, from: 'u2', to: 'u6', total: 100, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 225, from: 'u3', to: 'u4', total: 225, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 374.99999999999994, from: 'u1', to: 'u4', total: 374.99999999999994, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.4210854715202004e-14, from: 'u2', to: 'u4', total: 1.4210854715202004e-14, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 200, from: 'u2', to: 'u5', total: 200, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 100, from: 'u2', to: 'u6', total: 100, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 225, from: 'u3', to: 'u4', total: 225, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u4', amount: 75.00000000000001, when: dateAtCyclesPassed(0.07) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([

      { amount: 374.99999999999994, from: 'u1', to: 'u4', total: 374.99999999999994, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.4210854715202004e-14, from: 'u2', to: 'u4', total: 1.4210854715202004e-14, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 200, from: 'u2', to: 'u5', total: 200, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 100, from: 'u2', to: 'u6', total: 100, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 225, from: 'u3', to: 'u4', total: 225, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 299.99999999999994, from: 'u1', to: 'u4', total: 374.99999999999994, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 1.4210854715202004e-14, from: 'u2', to: 'u4', total: 1.4210854715202004e-14, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 200, from: 'u2', to: 'u5', total: 200, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 100, from: 'u2', to: 'u6', total: 100, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 225, from: 'u3', to: 'u4', total: 225, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Transaction minimization-specific load-test.', function () {
    setup = []
    // Add maxH havers user#1, user#2, ... user#H ... user#maxH to setup. Each haver has a haveNeed of H^2:
    const maxH = 25 // Approximately half of Dunbar's number.
    for (let h = 1; h <= maxH; h++) {
      const name = 'user#' + (h < 10 ? '0' + h : h)
      const haveNeed = Math.pow(h, 2)
      const when = dateAtCyclesPassed(Math.random())
      setup.push({ type: 'haveNeedEvent', data: { name, haveNeed, when } })
    }
    // Add maxN needers user#(maxH+1), user#(maxH+2), ... user#N ... user#(maxH+maxN) to setup. Each needer has a haveNeed of -N*2:
    const maxN = 25 // Approximately half of Dunbar's number.
    for (let n = maxH + 1; n <= maxH + maxN; n++) {
      const name = 'user#' + n
      const haveNeed = -2 * n
      const when = dateAtCyclesPassed(Math.random())
      setup.push({ type: 'haveNeedEvent', data: { name, haveNeed, when } })
    }
    setup.sort((eventA, eventB) => eventA.when < eventB.when ? -1 : 1)
    const dist = groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })
    dist.sort((pA, pB) => pA.amount - pB.amount).sort((pA, pB) => pA.from < pB.from ? -1 : 1)

    should(dist).eql([
      { amount: 0.3438914027149321, from: 'user#01', to: 'user#41', total: 0.3438914027149321, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.3755656108597285, from: 'user#02', to: 'user#43', total: 1.3755656108597285, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.8796380090497768, from: 'user#03', to: 'user#39', total: 0.8796380090497768, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.2153846153846124, from: 'user#03', to: 'user#28', total: 2.2153846153846124, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.153846153846154, from: 'user#04', to: 'user#30', total: 2.153846153846154, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.3484162895927603, from: 'user#04', to: 'user#41', total: 3.3484162895927603, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.597285067873303, from: 'user#05', to: 'user#37', total: 8.597285067873303, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5.0678733031674215, from: 'user#06', to: 'user#32', total: 5.0678733031674215, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.312217194570136, from: 'user#06', to: 'user#43', total: 7.312217194570136, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 16.850678733031675, from: 'user#07', to: 'user#50', total: 16.850678733031675, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.4561085972850718, from: 'user#08', to: 'user#28', total: 0.4561085972850718, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.936651583710407, from: 'user#08', to: 'user#45', total: 9.936651583710407, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.616289592760179, from: 'user#08', to: 'user#39', total: 11.616289592760179, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 27.855203619909503, from: 'user#09', to: 'user#48', total: 27.855203619909503, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.8895927601809956, from: 'user#10', to: 'user#35', total: 1.8895927601809956, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.131221719457012, from: 'user#10', to: 'user#41', total: 7.131221719457012, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.540271493212659, from: 'user#10', to: 'user#34', total: 7.540271493212659, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 17.82805429864254, from: 'user#10', to: 'user#47', total: 17.82805429864254, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 41.610859728506796, from: 'user#11', to: 'user#44', total: 41.610859728506796, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.003619909502266, from: 'user#12', to: 'user#36', total: 6.003619909502266, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 20.159276018099558, from: 'user#12', to: 'user#47', total: 20.159276018099558, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 23.3574660633484, from: 'user#12', to: 'user#42', total: 23.3574660633484, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 26.51945701357466, from: 'user#13', to: 'user#35', total: 26.51945701357466, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 31.59819004524887, from: 'user#13', to: 'user#44', total: 31.59819004524887, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.403981900453253, from: 'user#14', to: 'user#42', total: 10.403981900453253, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 12.928506787330317, from: 'user#14', to: 'user#38', total: 12.928506787330317, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 44.070226244343125, from: 'user#14', to: 'user#49', total: 44.070226244343125, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 18.435113122173476, from: 'user#15', to: 'user#35', total: 18.435113122173476, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25.791855203619917, from: 'user#15', to: 'user#40', total: 25.791855203619917, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 33.14859728506634, from: 'user#15', to: 'user#49', total: 33.14859728506634, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 13.234389140271492, from: 'user#16', to: 'user#38', total: 13.234389140271492, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 24.182805429864246, from: 'user#16', to: 'user#37', total: 24.182805429864246, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50.619004524886876, from: 'user#16', to: 'user#39', total: 50.619004524886876, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.493936651585228, from: 'user#17', to: 'user#48', total: 7.493936651585228, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 23.111312217194588, from: 'user#17', to: 'user#33', total: 23.111312217194588, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 23.15583710407087, from: 'user#17', to: 'user#35', total: 23.15583710407087, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 45.6235294117647, from: 'user#17', to: 'user#36', total: 45.6235294117647, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 20.372850678733034, from: 'user#18', to: 'user#36', total: 20.372850678733034, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 35.88597285067873, from: 'user#18', to: 'user#41', total: 35.88597285067873, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 55.16199095022625, from: 'user#18', to: 'user#43', total: 55.16199095022625, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 22.32398190045252, from: 'user#19', to: 'user#46', total: 22.32398190045252, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 42.888687782805405, from: 'user#19', to: 'user#33', total: 42.888687782805405, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 58.93212669683257, from: 'user#19', to: 'user#32', total: 58.93212669683257, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 27.33574660633488, from: 'user#20', to: 'user#45', total: 27.33574660633488, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 54.20814479638009, from: 'user#20', to: 'user#40', total: 54.20814479638009, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 56.01266968325789, from: 'user#20', to: 'user#47', total: 56.01266968325789, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 41.08235294117648, from: 'user#21', to: 'user#31', total: 41.08235294117648, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 52.72760180995473, from: 'user#21', to: 'user#45', total: 52.72760180995473, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 57.846153846153854, from: 'user#21', to: 'user#30', total: 57.846153846153854, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 14.88506787330317, from: 'user#22', to: 'user#39', total: 14.88506787330317, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 18.7134841628967, from: 'user#22', to: 'user#48', total: 18.7134841628967, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 22.150226244343898, from: 'user#22', to: 'user#43', total: 22.150226244343898, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 41.01864253393589, from: 'user#22', to: 'user#42', total: 41.01864253393589, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 69.67601809954749, from: 'user#22', to: 'user#46', total: 69.67601809954749, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 20.91764705882352, from: 'user#23', to: 'user#31', total: 20.91764705882352, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 22.5447963800905, from: 'user#23', to: 'user#29', total: 22.5447963800905, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 35.29049773755655, from: 'user#23', to: 'user#41', total: 35.29049773755655, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 49.837104072398205, from: 'user#23', to: 'user#38', total: 49.837104072398205, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 53.32850678733031, from: 'user#23', to: 'user#28', total: 53.32850678733031, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 14.790950226244341, from: 'user#24', to: 'user#44', total: 14.790950226244341, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 20.781176470590538, from: 'user#24', to: 'user#49', total: 20.781176470590538, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 37.42262443438914, from: 'user#24', to: 'user#34', total: 37.42262443438914, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 41.93737556560856, from: 'user#24', to: 'user#48', total: 41.93737556560856, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 83.14932126696834, from: 'user#24', to: 'user#50', total: 83.14932126696834, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.21990950226244, from: 'user#25', to: 'user#42', total: 9.21990950226244, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 23.03710407239819, from: 'user#25', to: 'user#34', total: 23.03710407239819, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 35.45520361990949, from: 'user#25', to: 'user#29', total: 35.45520361990949, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 41.21990950226245, from: 'user#25', to: 'user#37', total: 41.21990950226245, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 52.00000000000001, from: 'user#25', to: 'user#26', total: 52.00000000000001, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 53.99999999999999, from: 'user#25', to: 'user#27', total: 53.99999999999999, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
})
