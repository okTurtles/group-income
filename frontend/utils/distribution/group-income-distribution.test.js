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
    const maxH = 50 // Approximately half of Dunbar's number.
    for (let h = 1; h <= maxH; h++) {
      const name = 'user#' + (h < 10 ? '0' + h : h)
      const haveNeed = Math.pow(h, 2)
      const when = dateAtCyclesPassed(Math.random())
      setup.push({ type: 'haveNeedEvent', data: { name, haveNeed, when } })
    }
    // Add maxN needers user#(maxH+1), user#(maxH+2), ... user#N ... user#(maxH+maxN) to setup. Each needer has a haveNeed of -N*2:
    const maxN = 50 // Approximately half of Dunbar's number.
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
      { amount: 0.17588817705299942, from: 'user#01', to: 'user#97', total: 0.17588817705299942, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.18264414676761792, from: 'user#02', to: 'user#83', total: 0.18264414676761792, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.5209085614443798, from: 'user#02', to: 'user#98', total: 0.5209085614443798, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.5829935934769948, from: 'user#03', to: 'user#96', total: 1.5829935934769948, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.8142108328479907, from: 'user#04', to: 'user#96', total: 2.8142108328479907, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.3972044263249845, from: 'user#05', to: 'user#94', total: 4.3972044263249845, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.5647990681421087, from: 'user#06', to: 'user#89', total: 2.5647990681421087, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.767175305765871, from: 'user#06', to: 'user#97', total: 3.767175305765871, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.6255096097845074, from: 'user#07', to: 'user#92', total: 2.6255096097845074, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5.993011065812464, from: 'user#07', to: 'user#86', total: 5.993011065812464, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.256843331391963, from: 'user#08', to: 'user#85', total: 11.256843331391963, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.3934769947583625, from: 'user#09', to: 'user#93', total: 2.3934769947583625, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.857542224810654, from: 'user#09', to: 'user#80', total: 4.857542224810654, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.995923121723938, from: 'user#09', to: 'user#72', total: 6.995923121723938, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.101013395457723, from: 'user#10', to: 'user#96', total: 4.101013395457723, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5.8394408852644215, from: 'user#10', to: 'user#100', total: 5.8394408852644215, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.648363424577798, from: 'user#10', to: 'user#86', total: 7.648363424577798, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 21.28246942341293, from: 'user#11', to: 'user#90', total: 21.28246942341293, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25.327897495631916, from: 'user#12', to: 'user#72', total: 25.327897495631916, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 29.725101921956906, from: 'user#13', to: 'user#89', total: 29.725101921956906, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 34.47408270238789, from: 'user#14', to: 'user#92', total: 34.47408270238789, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 39.574839836924866, from: 'user#15', to: 'user#88', total: 39.574839836924866, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 45.02737332556785, from: 'user#16', to: 'user#75', total: 45.02737332556785, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 18.478089691321113, from: 'user#17', to: 'user#84', total: 18.478089691321113, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 32.35359347699571, from: 'user#17', to: 'user#98', total: 32.35359347699571, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 56.98776936517182, from: 'user#18', to: 'user#77', total: 56.98776936517182, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.061129877691524, from: 'user#19', to: 'user#82', total: 8.061129877691524, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.538217821788082, from: 'user#19', to: 'user#85', total: 9.538217821788082, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 45.89628421665317, from: 'user#19', to: 'user#84', total: 45.89628421665317, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 70.35527082119977, from: 'user#20', to: 'user#95', total: 70.35527082119977, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.021619103086712, from: 'user#21', to: 'user#83', total: 8.021619103086712, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 23.43608619685513, from: 'user#21', to: 'user#82', total: 23.43608619685513, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 46.1089807804309, from: 'user#21', to: 'user#68', total: 46.1089807804309, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.364589400116483, from: 'user#22', to: 'user#62', total: 6.364589400116483, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 21.28526499708795, from: 'user#22', to: 'user#97', total: 21.28526499708795, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 57.4800232964473, from: 'user#22', to: 'user#72', total: 57.4800232964473, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 22.16144437973209, from: 'user#23', to: 'user#68', total: 22.16144437973209, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 31.21211415259173, from: 'user#23', to: 'user#78', total: 31.21211415259173, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 39.67128712871288, from: 'user#23', to: 'user#96', total: 39.67128712871288, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 14.032847990681422, from: 'user#24', to: 'user#100', total: 14.032847990681422, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 31.312754804892226, from: 'user#24', to: 'user#92', total: 31.312754804892226, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 55.96598718695402, from: 'user#24', to: 'user#84', total: 55.96598718695402, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 13.390099009900988, from: 'user#25', to: 'user#81', total: 13.390099009900988, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 27.3341409435061, from: 'user#25', to: 'user#94', total: 27.3341409435061, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 28.42497379149682, from: 'user#25', to: 'user#79', total: 28.42497379149682, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 40.78089691322072, from: 'user#25', to: 'user#76', total: 40.78089691322072, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 17.110355270818633, from: 'user#26', to: 'user#85', total: 17.110355270818633, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 33.3744903902155, from: 'user#26', to: 'user#76', total: 33.3744903902155, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 68.41556202679348, from: 'user#26', to: 'user#96', total: 68.41556202679348, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 24.653046010483365, from: 'user#27', to: 'user#77', total: 24.653046010483365, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 44.58185206755971, from: 'user#27', to: 'user#86', total: 44.58185206755971, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 58.98758299359348, from: 'user#27', to: 'user#74', total: 58.98758299359348, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.9227489807801987, from: 'user#28', to: 'user#94', total: 1.9227489807801987, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.026651135702188, from: 'user#28', to: 'user#83', total: 8.026651135702188, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 23.62599883517759, from: 'user#28', to: 'user#86', total: 23.62599883517759, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 104.32093185789157, from: 'user#28', to: 'user#99', total: 104.32093185789157, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.925800815375668, from: 'user#29', to: 'user#90', total: 4.925800815375668, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 18.769248689574837, from: 'user#29', to: 'user#73', total: 18.769248689574837, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 20.44799068142101, from: 'user#29', to: 'user#93', total: 20.44799068142101, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25.09749563191619, from: 'user#29', to: 'user#80', total: 25.09749563191619, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 78.6814210832848, from: 'user#29', to: 'user#52', total: 78.6814210832848, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.77255678508925, from: 'user#30', to: 'user#96', total: 2.77255678508925, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 24.341572510192993, from: 'user#30', to: 'user#90', total: 24.341572510192993, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 37.40048922539308, from: 'user#30', to: 'user#88', total: 37.40048922539308, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 93.78474082702415, from: 'user#30', to: 'user#89', total: 93.78474082702415, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 29.028538147932434, from: 'user#31', to: 'user#89', total: 29.028538147932434, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 140, from: 'user#31', to: 'user#70', total: 140, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25.318578916715182, from: 'user#32', to: 'user#52', total: 25.318578916715182, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 154.79091438555622, from: 'user#32', to: 'user#91', total: 154.79091438555622, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.124239953406862, from: 'user#33', to: 'user#89', total: 3.124239953406862, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50.4179848573095, from: 'user#33', to: 'user#87', total: 50.4179848573095, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 137.99999999999997, from: 'user#33', to: 'user#69', total: 137.99999999999997, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.3217239370995877, from: 'user#34', to: 'user#53', total: 2.3217239370995877, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 39.541991846243455, from: 'user#34', to: 'user#73', total: 39.541991846243455, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 72.45059988351774, from: 'user#34', to: 'user#92', total: 72.45059988351774, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 89.01241700640652, from: 'user#34', to: 'user#74', total: 89.01241700640652, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.671310425160179, from: 'user#35', to: 'user#66', total: 4.671310425160179, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 19.77258008153754, from: 'user#35', to: 'user#89', total: 19.77258008153754, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 57.01912638322652, from: 'user#35', to: 'user#85', total: 57.01912638322652, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 134, from: 'user#35', to: 'user#67', total: 134, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.5308794408855, from: 'user#36', to: 'user#75', total: 8.5308794408855, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 77.8446126965638, from: 'user#36', to: 'user#76', total: 77.8446126965638, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 141.57558532323796, from: 'user#36', to: 'user#93', total: 141.57558532323796, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 17.763075131042527, from: 'user#37', to: 'user#80', total: 17.763075131042527, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 26.16284216656972, from: 'user#37', to: 'user#97', total: 26.16284216656972, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 69.5363075131041, from: 'user#37', to: 'user#87', total: 69.5363075131041, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 127.32868957483987, from: 'user#37', to: 'user#66', total: 127.32868957483987, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.5036691904484556, from: 'user#38', to: 'user#58', total: 0.5036691904484556, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 16.0147233546884, from: 'user#38', to: 'user#77', total: 16.0147233546884, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 112.67624927198602, from: 'user#38', to: 'user#94', total: 112.67624927198602, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 124.78788584740829, from: 'user#38', to: 'user#78', total: 124.78788584740829, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 16.000652300524187, from: 'user#39', to: 'user#96', total: 16.000652300524187, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 42.664368083867004, from: 'user#39', to: 'user#83', total: 42.664368083867004, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 91.22548631333741, from: 'user#39', to: 'user#65', total: 91.22548631333741, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 117.63541059988353, from: 'user#39', to: 'user#62', total: 117.63541059988353, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 19.438555620267913, from: 'user#40', to: 'user#60', total: 19.438555620267913, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 58.17584158415838, from: 'user#40', to: 'user#79', total: 58.17584158415838, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 91.52479906814214, from: 'user#40', to: 'user#95', total: 91.52479906814214, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 112.28188701223063, from: 'user#40', to: 'user#80', total: 112.28188701223063, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 72.849900990099, from: 'user#41', to: 'user#81', total: 72.849900990099, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 100.56144437973208, from: 'user#41', to: 'user#60', total: 100.56144437973208, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 122.2566802562609, from: 'user#41', to: 'user#63', total: 122.2566802562609, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.024554455445676, from: 'user#42', to: 'user#97', total: 8.024554455445676, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 37.33768200349449, from: 'user#42', to: 'user#61', total: 37.33768200349449, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 56.64172393709748, from: 'user#42', to: 'user#96', total: 56.64172393709748, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 75.76000000000002, from: 'user#42', to: 'user#81', total: 75.76000000000002, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 132.50278392545337, from: 'user#42', to: 'user#82', total: 132.50278392545337, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 21.90434478741981, from: 'user#43', to: 'user#84', total: 21.90434478741981, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 31.755061153174267, from: 'user#43', to: 'user#59', total: 31.755061153174267, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 71.3991846243448, from: 'user#43', to: 'user#79', total: 71.3991846243448, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 84.66231799650552, from: 'user#43', to: 'user#61', total: 84.66231799650552, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 115.49633080955154, from: 'user#43', to: 'user#58', total: 115.49633080955154, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.7433197437390966, from: 'user#44', to: 'user#63', total: 3.7433197437390966, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 15.231962725679868, from: 'user#44', to: 'user#85', total: 15.231962725679868, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25.7552941176519, from: 'user#44', to: 'user#84', total: 25.7552941176519, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 54.09994175888179, from: 'user#44', to: 'user#64', total: 54.09994175888179, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 107.10471753057647, from: 'user#44', to: 'user#83', total: 107.10471753057647, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 134.58427489807778, from: 'user#44', to: 'user#97', total: 134.58427489807778, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 17.591426907396688, from: 'user#45', to: 'user#68', total: 17.591426907396688, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 56.344461269656406, from: 'user#45', to: 'user#77', total: 56.344461269656406, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 83.99273150844496, from: 'user#45', to: 'user#57', total: 83.99273150844496, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 86.24493884682572, from: 'user#45', to: 'user#59', total: 86.24493884682572, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 112, from: 'user#45', to: 'user#56', total: 112, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 26.441933605125243, from: 'user#46', to: 'user#91', total: 26.441933605125243, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 38.774513686662594, from: 'user#46', to: 'user#65', total: 38.774513686662594, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 54.196156086196844, from: 'user#46', to: 'user#72', total: 54.196156086196844, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 59.843494467094935, from: 'user#46', to: 'user#85', total: 59.843494467094935, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 90.15077460687243, from: 'user#46', to: 'user#86', total: 90.15077460687243, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 102.77251019219473, from: 'user#46', to: 'user#98', total: 102.77251019219473, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.0379732090855871, from: 'user#47', to: 'user#64', total: 0.0379732090855871, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 30.007268491555042, from: 'user#47', to: 'user#57', total: 30.007268491555042, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 52.80298194525339, from: 'user#47', to: 'user#75', total: 52.80298194525339, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 87.68875946418169, from: 'user#47', to: 'user#73', total: 87.68875946418169, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 108.00000000000001, from: 'user#47', to: 'user#54', total: 108.00000000000001, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 110, from: 'user#47', to: 'user#55', total: 110, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 21.582947000582642, from: 'user#48', to: 'user#93', total: 21.582947000582642, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 43.13705299941764, from: 'user#48', to: 'user#92', total: 43.13705299941764, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 43.638765288293264, from: 'user#48', to: 'user#75', total: 43.638765288293264, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50.138147932440305, from: 'user#48', to: 'user#68', total: 50.138147932440305, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 54.0457076295864, from: 'user#48', to: 'user#87', total: 54.0457076295864, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 93.6790681421084, from: 'user#48', to: 'user#99', total: 93.6790681421084, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 99.02467093768202, from: 'user#48', to: 'user#88', total: 99.02467093768202, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.76715200931854, from: 'user#49', to: 'user#91', total: 0.76715200931854, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 73.86208503203262, from: 'user#49', to: 'user#64', total: 73.86208503203262, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 102, from: 'user#49', to: 'user#51', total: 102, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 103.67827606290042, from: 'user#49', to: 'user#53', total: 103.67827606290042, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 142, from: 'user#49', to: 'user#71', total: 142, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 28.119930110658096, from: 'user#50', to: 'user#95', total: 28.119930110658096, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 41.6696563774027, from: 'user#50', to: 'user#94', total: 41.6696563774027, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 60.352987769365185, from: 'user#50', to: 'user#98', total: 60.352987769365185, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 129.4501572510184, from: 'user#50', to: 'user#90', total: 129.4501572510184, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 180.12771112405414, from: 'user#50', to: 'user#100', total: 180.12771112405414, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
})
