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

// Helper fuction that inserts the 'startCycleEvent' between each month's set of events.
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

// Helper fuction that inserts the 'when' of each event.data.
function groupIncomeDistributionWrapper (events, opts, timeSpanMonths = 1.0, startDate = defaultStartDate) {
  const debug = false
  if (debug) {
    console.table(setup.reduce((a, e) => {
      a.push([e.type, JSON.stringify(e.data)])
      return a
    }, []))
  }
  // events = [{ type: 'startCycleEvent', data: { when: dateToMonthstamp(startDate), payments: [], distribution: [] } }].concat(events)
  const eventsWithTimeStamps = insertMonthlyCycleEvents(events.map((v, i) => {
    v.data.when = v.data.when ? v.data.when : dateToMonthstamp(addMonthsToDate(startDate, i * timeSpanMonths / events.length))
    return v
  }))
  // console.table(eventsWithTimeStamps) // TODO: for demonstration of commit; REMOVE!!!
  console.time('groupIncomeDistribution')
  const distribution = groupIncomeDistribution(eventsWithTimeStamps, opts)
  console.timeEnd('groupIncomeDistribution')
  return distribution
}

describe('Test group-income-distribution.js (without minimization)', function () {
  it('Test empty distirbution event list for un-adjusted distribution.', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([])
  })
  it('EVENTS: [u1, u5, u2 and u3] join the group and set haveNeeds of [100, 100, -50, and -50], respectively. Test unadjusted.', function () {
    setup = [{ type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u5', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: -50 } },
      { type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -50 } }
    ]
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 25, from: 'u1', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u1', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 50, from: 'u1', to: 'u3', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u2', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
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
      { amount: 50, from: 'u1', to: 'u3', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u2', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('EVENT: a payment of $10 is made from u1 to u3 Test unadjusted first (again, unchanged)', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u3', amount: 10 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 25, from: 'u1', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u1', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 50, from: 'u1', to: 'u3', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u2', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Test the adjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 25, from: 'u1', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 15, from: 'u1', to: 'u3', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u1', to: 'u3', amount: 40, total: 50, partial: true, isLate: false, dueOn: '2021-01' },
      { from: 'u5', to: 'u2', amount: 50, total: 50, isLate: false, partial: false, dueOn: '2021-01' }
    ])
  })
  it('EVENT: u4 joins and sets a need of 100. Test un-adjsuted first.', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u4', haveNeed: -100 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 25, from: 'u1', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u1', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u1', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u1', to: 'u3', amount: 50, total: 50, dueOn: '2021-01', isLate: false, partial: false },
      { amount: 50, from: 'u1', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u2', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Test the adjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 25, from: 'u1', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 15, from: 'u1', to: 'u3', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u1', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u1', to: 'u3', amount: 40, total: 50, dueOn: '2021-01', isLate: false, partial: true },
      { amount: 50, from: 'u1', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u2', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('EVENT: u4 removes themselves from the group. Test un-adjsuted first.', function () {
    setup.push({ type: 'userExitsGroupEvent', data: { name: 'u4' } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u3', amount: 25, total: 25, dueOn: '2021-01', isLate: false, partial: false },
      { amount: 25, from: 'u1', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u1', to: 'u3', amount: 50, total: 50, dueOn: '2021-01', isLate: false, partial: false },
      { amount: 50, from: 'u5', to: 'u2', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Test the adjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 25, total: 25, dueOn: '2021-01', isLate: false, partial: false },
      { amount: 15, from: 'u1', to: 'u3', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u1', to: 'u3', amount: 40, total: 50, dueOn: '2021-01', isLate: false, partial: true },
      { amount: 50, from: 'u5', to: 'u2', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('EVENT: u5 pays $5 to u2. Test un-adjsuted first.', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u5', to: 'u2', amount: 5 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u3', amount: 25, total: 25, dueOn: '2021-01', isLate: false, partial: false },
      { from: 'u5', to: 'u2', amount: 25, total: 25, dueOn: '2021-01', isLate: false, partial: false },
      { amount: 25, from: 'u1', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u1', to: 'u3', amount: 50, total: 50, dueOn: '2021-01', isLate: false, partial: false },
      { amount: 50, from: 'u5', to: 'u2', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Test the adjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 25, from: 'u1', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 15, from: 'u1', to: 'u3', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 20, from: 'u5', to: 'u2', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u1', to: 'u3', amount: 40, total: 50, dueOn: '2021-01', isLate: false, partial: true },
      { amount: 45, from: 'u5', to: 'u2', total: 50, partial: true, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('EVENT: u4 rejoins and sets haveNeed to -100. Test un-adjuusted first.', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u4', haveNeed: -100 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u3', amount: 25, total: 25, dueOn: '2021-01', isLate: false, partial: false },
      { from: 'u5', to: 'u2', amount: 25, total: 25, dueOn: '2021-01', isLate: false, partial: false },
      { amount: 25, from: 'u1', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u1', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u1', to: 'u3', amount: 50, total: 50, dueOn: '2021-01', isLate: false, partial: false },
      { from: 'u5', to: 'u2', amount: 50, total: 50, dueOn: '2021-01', isLate: false, partial: false },
      { amount: 50, from: 'u1', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Test the adjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 25, from: 'u1', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 15, from: 'u1', to: 'u3', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u1', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 20, from: 'u5', to: 'u2', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u1', to: 'u3', amount: 40, total: 50, dueOn: '2021-01', isLate: false, partial: true },
      { from: 'u1', to: 'u4', amount: 50, total: 50, dueOn: '2021-01', isLate: false, partial: false },
      { amount: 45, from: 'u5', to: 'u2', total: 50, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('EVENT: u5 pays $10 to u2. Test un-adjusted first.', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u5', to: 'u2', amount: 10 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u3', amount: 25, total: 25, dueOn: '2021-01', isLate: false, partial: false },
      { from: 'u5', to: 'u2', amount: 25, total: 25, dueOn: '2021-01', isLate: false, partial: false },
      { amount: 25, from: 'u1', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u1', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u1', to: 'u3', amount: 50, total: 50, dueOn: '2021-01', isLate: false, partial: false },
      { from: 'u5', to: 'u2', amount: 50, total: 50, dueOn: '2021-01', isLate: false, partial: false },
      { amount: 50, from: 'u1', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Test the adjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 25, from: 'u1', to: 'u2', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 15, from: 'u1', to: 'u3', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u1', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10, from: 'u5', to: 'u2', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u5', to: 'u3', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u1', to: 'u3', amount: 40, total: 50, dueOn: '2021-01', isLate: false, partial: true },
      { from: 'u1', to: 'u4', amount: 50, total: 50, dueOn: '2021-01', isLate: false, partial: false },
      { amount: 35, from: 'u5', to: 'u2', total: 50, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u5', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
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
    setup.push({ type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 5, when: dateAtCyclesPassed(0.09) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 4, from: 'u1', to: 'u3', total: 4, isLate: false, partial: false, dueOn: '2021-01' },
      { amount: 16, from: 'u2', to: 'u3', total: 16, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 4, from: 'u1', to: 'u3', total: 4, isLate: false, partial: false, dueOn: '2021-01' },
      { amount: 16, from: 'u2', to: 'u3', total: 16, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Cycle test. Adjusted.', function () {
    setup.push({ type: 'userExitsGroupEvent', data: { name: 'u1', when: dateAtCyclesPassed(1.01) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 16, from: 'u2', to: 'u3', total: 16, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 20, from: 'u2', to: 'u3', total: 20, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 16, from: 'u2', to: 'u3', total: 16, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 20, from: 'u2', to: 'u3', total: 20, partial: false, isLate: false, dueOn: '2021-02' }
    ])
  })
  it('Cycle test.', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 30, when: dateAtCyclesPassed(1.02) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 4, from: 'u1', to: 'u3', total: 4, isLate: true, partial: false, dueOn: '2021-02' },
      { amount: 8, from: 'u2', to: 'u3', total: 8, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 12, from: 'u1', to: 'u3', total: 12, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 4, from: 'u1', to: 'u3', total: 4, isLate: true, partial: false, dueOn: '2021-02' },
      { amount: 8, from: 'u2', to: 'u3', total: 8, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 12, from: 'u1', to: 'u3', total: 12, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 8, from: 'u2', to: 'u3', total: 8, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 12, from: 'u1', to: 'u3', total: 12, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 8, from: 'u2', to: 'u3', total: 8, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 12, from: 'u1', to: 'u3', total: 12, partial: false, isLate: false, dueOn: '2021-02' }
    ])
  })
  // # EVENT: [u1, u2 and u3] join a group and set haveNeeds of [20, 20, -20], respectively
  // # EVENT: u1 sends 10 to u3
  // # EVENT: u1 adjusts haveNeed -10
  // # EVENT: u2 sends 10 to u1
  // # EVENT: u1 adjusts haveNeed 10
  // # EVENT: u1 exits
  // # EVENT: u1 joins and sets haveNeed to 5
  // # EVENT: a cycle passes over
  // # EVENT: u1 exits
  // # EVENT: u1 sets haveNeed to 30
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
    setup.push({ type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 5, when: dateAtCyclesPassed(0.09) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 4, from: 'u1', to: 'u3', total: 4, isLate: false, partial: false, dueOn: '2021-01' },
      { amount: 16, from: 'u2', to: 'u3', total: 16, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 4, from: 'u1', to: 'u3', total: 4, isLate: false, partial: false, dueOn: '2021-01' },
      { amount: 16, from: 'u2', to: 'u3', total: 16, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Cycle test. Adjusted.', function () {
    setup.push({ type: 'userExitsGroupEvent', data: { name: 'u1', when: dateAtCyclesPassed(1.01) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 16, from: 'u2', to: 'u3', total: 16, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 20, from: 'u2', to: 'u3', total: 20, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 16, from: 'u2', to: 'u3', total: 16, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 20, from: 'u2', to: 'u3', total: 20, partial: false, isLate: false, dueOn: '2021-02' }
    ])
  })
  it('Cycle test.', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 30, when: dateAtCyclesPassed(1.02) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 4, from: 'u1', to: 'u3', total: 4, isLate: true, partial: false, dueOn: '2021-02' },
      { amount: 8, from: 'u2', to: 'u3', total: 8, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 12, from: 'u1', to: 'u3', total: 12, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 4, from: 'u1', to: 'u3', total: 4, isLate: true, partial: false, dueOn: '2021-02' },
      { amount: 8, from: 'u2', to: 'u3', total: 8, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 12, from: 'u1', to: 'u3', total: 12, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 8, from: 'u2', to: 'u3', total: 8, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 12, from: 'u1', to: 'u3', total: 12, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 8, from: 'u2', to: 'u3', total: 8, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 12, from: 'u1', to: 'u3', total: 12, partial: false, isLate: false, dueOn: '2021-02' }
    ])
  })
  // # EVENT: [u1, u2 and u3] join a group and set haveNeeds of [20, 20, -20], respectively
  // # EVENT: u1 sends 10 to u3
  // # EVENT: u3 adjusts haveNeed -15
  // # EVENT: u3 adjusts haveNeed -25
  // # EVENT: u3 adjusts haveNeed -5
  // # EVENT: the payment cycle passes
  // # EVENT: u1 exits the group
  // # EVENT: u1 rejoins and sets haveNeed to 30
  it('Test the unadjusted version of the previous event-list. Should ignore payment events!', function () {
    setup = [
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 20, when: dateAtCyclesPassed(0.01) } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: 20, when: dateAtCyclesPassed(0.02) } },
      { type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -20, when: dateAtCyclesPassed(0.03) } },
      { type: 'paymentEvent', data: { from: 'u1', to: 'u3', amount: 10, when: dateAtCyclesPassed(0.04) } },
      { type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -15, when: dateAtCyclesPassed(0.05) } }
    ]
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 7.5, from: 'u1', to: 'u3', total: 7.5, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.5, from: 'u2', to: 'u3', total: 7.5, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 7.5, from: 'u1', to: 'u3', total: 7.5, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.5, from: 'u2', to: 'u3', total: 7.5, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 7.5, from: 'u2', to: 'u3', total: 7.5, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 7.5, from: 'u2', to: 'u3', total: 7.5, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Test the adjusted version. Should ignore payment events!', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -25, when: dateAtCyclesPassed(0.08) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 12.5, from: 'u1', to: 'u3', total: 12.5, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 12.5, from: 'u2', to: 'u3', total: 12.5, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 12.5, from: 'u1', to: 'u3', total: 12.5, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 12.5, from: 'u2', to: 'u3', total: 12.5, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Test the unadjusted version of the previous event-list. Should *not* ignore payment events!', function () {
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 2.5, from: 'u1', to: 'u3', total: 12.5, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 12.5, from: 'u2', to: 'u3', total: 12.5, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 2.5, from: 'u1', to: 'u3', total: 12.5, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 12.5, from: 'u2', to: 'u3', total: 12.5, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Cycle test. Unadjusted.', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -5, when: dateAtCyclesPassed(0.09) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 2.5, from: 'u1', to: 'u3', total: 2.5, isLate: false, partial: false, dueOn: '2021-01' },
      { amount: 2.5, from: 'u2', to: 'u3', total: 2.5, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 2.5, from: 'u1', to: 'u3', total: 2.5, isLate: false, partial: false, dueOn: '2021-01' },
      { amount: 2.5, from: 'u2', to: 'u3', total: 2.5, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Cycle test. Adjusted.', function () {
    setup.push({ type: 'userExitsGroupEvent', data: { name: 'u1', when: dateAtCyclesPassed(1.01) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 2.5, from: 'u2', to: 'u3', total: 2.5, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 5, from: 'u2', to: 'u3', total: 5, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 2.5, from: 'u2', to: 'u3', total: 2.5, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 5, from: 'u2', to: 'u3', total: 5, partial: false, isLate: false, dueOn: '2021-02' }
    ])
  })
  it('Cycle test.', function () {
    setup.push({ type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 30, when: dateAtCyclesPassed(1.02) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 2.5, from: 'u1', to: 'u3', total: 2.5, isLate: true, partial: false, dueOn: '2021-02' },
      { amount: 2, from: 'u2', to: 'u3', total: 2, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 3, from: 'u1', to: 'u3', total: 3, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 2.5, from: 'u1', to: 'u3', total: 2.5, isLate: true, partial: false, dueOn: '2021-02' },
      { amount: 2, from: 'u2', to: 'u3', total: 2, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 3, from: 'u1', to: 'u3', total: 3, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 2, from: 'u2', to: 'u3', total: 2, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 3, from: 'u1', to: 'u3', total: 3, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 2, from: 'u2', to: 'u3', total: 2, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 3, from: 'u1', to: 'u3', total: 3, partial: false, isLate: false, dueOn: '2021-02' }
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
      { amount: 178.5714285714286, from: 'u1', to: 'u3', total: 178.5714285714286, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 100, from: 'u4', to: 'u2', total: 100, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 178.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 178.5714285714286, from: 'u1', to: 'u3', total: 178.5714285714286, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 100, from: 'u4', to: 'u2', total: 100, partial: false, isLate: false, dueOn: '2021-01' },
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
  it('Cypress/group-paying.spec.js unit-test equivalent - user1 changes their income details to needing.', function () {
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
  it('Cypress/group-paying.spec.js unit-test equivalent - user1 changes their income details back to giving.', function () {
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
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 178.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 178.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: false, isLate: false, dueOn: '2021-02' },
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
      { amount: 83.33333333333334, from: 'u1', to: 'u5', total: 83.33333333333334, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 41.666666666666664, from: 'u1', to: 'u6', total: 41.666666666666664, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 258.33333333333337, from: 'u2', to: 'u4', total: 258.33333333333337, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 66.66666666666666, from: 'u2', to: 'u5', total: 66.66666666666666, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 33.33333333333333, from: 'u2', to: 'u6', total: 33.33333333333333, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 341.66666666666674, from: 'u3', to: 'u4', total: 341.66666666666674, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u3', to: 'u5', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u3', to: 'u6', total: 25, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 83.33333333333334, from: 'u1', to: 'u5', total: 83.33333333333334, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 41.666666666666664, from: 'u1', to: 'u6', total: 41.666666666666664, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 258.33333333333337, from: 'u2', to: 'u4', total: 258.33333333333337, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 66.66666666666666, from: 'u2', to: 'u5', total: 66.66666666666666, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 33.33333333333333, from: 'u2', to: 'u6', total: 33.33333333333333, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 341.66666666666674, from: 'u3', to: 'u4', total: 341.66666666666674, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u3', to: 'u5', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u3', to: 'u6', total: 25, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u5', amount: 83.33333333333334, when: dateAtCyclesPassed(0.07) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 83.33333333333334, from: 'u1', to: 'u5', total: 83.33333333333334, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 41.666666666666664, from: 'u1', to: 'u6', total: 41.666666666666664, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 258.33333333333337, from: 'u2', to: 'u4', total: 258.33333333333337, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 66.66666666666666, from: 'u2', to: 'u5', total: 66.66666666666666, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 33.33333333333333, from: 'u2', to: 'u6', total: 33.33333333333333, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 341.66666666666674, from: 'u3', to: 'u4', total: 341.66666666666674, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u3', to: 'u5', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u3', to: 'u6', total: 25, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 41.666666666666664, from: 'u1', to: 'u6', total: 41.666666666666664, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 258.33333333333337, from: 'u2', to: 'u4', total: 258.33333333333337, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 66.66666666666666, from: 'u2', to: 'u5', total: 66.66666666666666, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 33.33333333333333, from: 'u2', to: 'u6', total: 33.33333333333333, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 341.66666666666674, from: 'u3', to: 'u4', total: 341.66666666666674, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u3', to: 'u5', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25, from: 'u3', to: 'u6', total: 25, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Transaction minimization-specific load-test.', function () {
    setup = []
    // Add maxH havers user#1, user#2, ... user#H ... user#maxH to setup. Each haver has a haveNeed of H^2:
    const maxH = 100 // Approximately half of Dunbar's number.
    for (let h = 1; h <= maxH; h++) {
      const name = 'user#' + (h < 10 ? '0' + h : h)
      const haveNeed = Math.pow(h, 2)
      const when = dateAtCyclesPassed(Math.random())
      setup.push({ type: 'haveNeedEvent', data: { name, haveNeed, when } })
    }
    // Add maxN needers user#(maxH+1), user#(maxH+2), ... user#N ... user#(maxH+maxN) to setup. Each needer has a haveNeed of -N*2:
    const maxN = 100 // Approximately half of Dunbar's number.
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
      { amount: 0.0011822077730161075, from: 'user#01', to: 'user#200', total: 0.0011822077730161075, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25.394875129303973, from: 'user#01', to: 'user#101', total: 25.394875129303973, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.004728831092064431, from: 'user#02', to: 'user#200', total: 0.004728831092064431, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.005881483670755137, from: 'user#02', to: 'user#199', total: 0.005881483670755137, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.037032658489729545, from: 'user#02', to: 'user#116', total: 0.037032658489729545, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.010586670607359244, from: 'user#03', to: 'user#199', total: 0.010586670607359244, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.010639869957144969, from: 'user#03', to: 'user#200', total: 0.010639869957144969, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.016385399734003256, from: 'user#03', to: 'user#198', total: 0.016385399734003256, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.09166839071966898, from: 'user#03', to: 'user#104', total: 0.09166839071966898, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.018726171124575145, from: 'user#04', to: 'user#198', total: 0.018726171124575145, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.018820747746416434, from: 'user#04', to: 'user#199', total: 0.018820747746416434, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.018915324368257724, from: 'user#04', to: 'user#200', total: 0.018915324368257724, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 351.5723658933058, from: 'user#04', to: 'user#197', total: 351.5723658933058, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.029259642382148666, from: 'user#05', to: 'user#198', total: 0.029259642382148666, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.029407418353775677, from: 'user#05', to: 'user#199', total: 0.029407418353775677, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.02955519432540269, from: 'user#05', to: 'user#200', total: 0.02955519432540269, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 349.7877345943549, from: 'user#05', to: 'user#196', total: 349.7877345943549, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.042133885030294076, from: 'user#06', to: 'user#198', total: 0.042133885030294076, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.042346682429436976, from: 'user#06', to: 'user#199', total: 0.042346682429436976, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.042559479828579876, from: 'user#06', to: 'user#200', total: 0.042559479828579876, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 348.0031032954043, from: 'user#06', to: 'user#195', total: 348.0031032954043, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.05734889906901139, from: 'user#07', to: 'user#198', total: 0.05734889906901139, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.057638539973400335, from: 'user#07', to: 'user#199', total: 0.057638539973400335, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.05792818087778928, from: 'user#07', to: 'user#200', total: 0.05792818087778928, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 346.21847199645345, from: 'user#07', to: 'user#194', total: 346.21847199645345, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.07490468449830058, from: 'user#08', to: 'user#198', total: 0.07490468449830058, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.07528299098566574, from: 'user#08', to: 'user#199', total: 0.07528299098566574, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.0756612974730309, from: 'user#08', to: 'user#200', total: 0.0756612974730309, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 344.43384069750255, from: 'user#08', to: 'user#193', total: 344.43384069750255, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.09480124131816167, from: 'user#09', to: 'user#198', total: 0.09480124131816167, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.09528003546623319, from: 'user#09', to: 'user#199', total: 0.09528003546623319, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.09575882961430472, from: 'user#09', to: 'user#200', total: 0.09575882961430472, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 342.6492093985518, from: 'user#09', to: 'user#192', total: 342.6492093985518, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.11703856952859466, from: 'user#10', to: 'user#198', total: 0.11703856952859466, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.1176296734151027, from: 'user#10', to: 'user#199', total: 0.1176296734151027, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.11822077730161076, from: 'user#10', to: 'user#200', total: 0.11822077730161076, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 340.864578099601, from: 'user#10', to: 'user#191', total: 340.864578099601, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.866558297620806, from: 'user#100', to: 'user#150', total: 8.866558297620806, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.925668686271612, from: 'user#100', to: 'user#151', total: 8.925668686271612, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.984779074922416, from: 'user#100', to: 'user#152', total: 8.984779074922416, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.043889463573223, from: 'user#100', to: 'user#153', total: 9.043889463573223, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.102999852224027, from: 'user#100', to: 'user#154', total: 9.102999852224027, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.162110240874835, from: 'user#100', to: 'user#155', total: 9.162110240874835, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.22122062952564, from: 'user#100', to: 'user#156', total: 9.22122062952564, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.280331018176446, from: 'user#100', to: 'user#157', total: 9.280331018176446, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.33944140682725, from: 'user#100', to: 'user#158', total: 9.33944140682725, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.398551795478056, from: 'user#100', to: 'user#159', total: 9.398551795478056, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.45766218412886, from: 'user#100', to: 'user#160', total: 9.45766218412886, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.516772572779667, from: 'user#100', to: 'user#161', total: 9.516772572779667, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.575882961430471, from: 'user#100', to: 'user#162', total: 9.575882961430471, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.634993350081277, from: 'user#100', to: 'user#163', total: 9.634993350081277, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.694103738732082, from: 'user#100', to: 'user#164', total: 9.694103738732082, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.753214127382888, from: 'user#100', to: 'user#165', total: 9.753214127382888, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.812324516033692, from: 'user#100', to: 'user#166', total: 9.812324516033692, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.871434904684499, from: 'user#100', to: 'user#167', total: 9.871434904684499, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.930545293335305, from: 'user#100', to: 'user#168', total: 9.930545293335305, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.98965568198611, from: 'user#100', to: 'user#169', total: 9.98965568198611, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.048766070636916, from: 'user#100', to: 'user#170', total: 10.048766070636916, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.10787645928772, from: 'user#100', to: 'user#171', total: 10.10787645928772, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.166986847938526, from: 'user#100', to: 'user#172', total: 10.166986847938526, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.22609723658933, from: 'user#100', to: 'user#173', total: 10.22609723658933, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.285207625240137, from: 'user#100', to: 'user#174', total: 10.285207625240137, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.344318013890941, from: 'user#100', to: 'user#175', total: 10.344318013890941, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.403428402541747, from: 'user#100', to: 'user#176', total: 10.403428402541747, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.462538791192552, from: 'user#100', to: 'user#177', total: 10.462538791192552, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.521649179843358, from: 'user#100', to: 'user#178', total: 10.521649179843358, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.580759568494162, from: 'user#100', to: 'user#179', total: 10.580759568494162, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.639869957144969, from: 'user#100', to: 'user#180', total: 10.639869957144969, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.698980345795773, from: 'user#100', to: 'user#181', total: 10.698980345795773, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.75809073444658, from: 'user#100', to: 'user#182', total: 10.75809073444658, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.817201123097384, from: 'user#100', to: 'user#183', total: 10.817201123097384, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.87631151174819, from: 'user#100', to: 'user#184', total: 10.87631151174819, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.935421900398994, from: 'user#100', to: 'user#185', total: 10.935421900398994, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.9945322890498, from: 'user#100', to: 'user#186', total: 10.9945322890498, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.053642677700605, from: 'user#100', to: 'user#187', total: 11.053642677700605, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.112753066351411, from: 'user#100', to: 'user#188', total: 11.112753066351411, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.171863455002217, from: 'user#100', to: 'user#189', total: 11.171863455002217, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.230973843653024, from: 'user#100', to: 'user#190', total: 11.230973843653024, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.290084232303828, from: 'user#100', to: 'user#191', total: 11.290084232303828, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.349194620954634, from: 'user#100', to: 'user#192', total: 11.349194620954634, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.408305009605439, from: 'user#100', to: 'user#193', total: 11.408305009605439, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.467415398256245, from: 'user#100', to: 'user#194', total: 11.467415398256245, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.52652578690705, from: 'user#100', to: 'user#195', total: 11.52652578690705, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.585636175557855, from: 'user#100', to: 'user#196', total: 11.585636175557855, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.64474656420866, from: 'user#100', to: 'user#197', total: 11.64474656420866, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.703856952859466, from: 'user#100', to: 'user#198', total: 11.703856952859466, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.76296734151027, from: 'user#100', to: 'user#199', total: 11.76296734151027, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.822077730161077, from: 'user#100', to: 'user#200', total: 11.822077730161077, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 176.605124870696, from: 'user#100', to: 'user#101', total: 176.605124870696, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.14161666912959953, from: 'user#11', to: 'user#198', total: 0.14161666912959953, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.1423319048322743, from: 'user#11', to: 'user#199', total: 0.1423319048322743, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.14304714053494902, from: 'user#11', to: 'user#200', total: 0.14304714053494902, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 339.07994680065025, from: 'user#11', to: 'user#190', total: 339.07994680065025, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.1685355401211763, from: 'user#12', to: 'user#198', total: 0.1685355401211763, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.1693867297177479, from: 'user#12', to: 'user#199', total: 0.1693867297177479, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.1702379193143195, from: 'user#12', to: 'user#200', total: 0.1702379193143195, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 337.29531550169935, from: 'user#12', to: 'user#189', total: 337.29531550169935, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.19779518250332498, from: 'user#13', to: 'user#198', total: 0.19779518250332498, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.1987941480715236, from: 'user#13', to: 'user#199', total: 0.1987941480715236, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.1997931136397222, from: 'user#13', to: 'user#200', total: 0.1997931136397222, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 335.5106842027487, from: 'user#13', to: 'user#188', total: 335.5106842027487, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.22939559627604555, from: 'user#14', to: 'user#198', total: 0.22939559627604555, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.23055415989360134, from: 'user#14', to: 'user#199', total: 0.23055415989360134, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.23171272351115713, from: 'user#14', to: 'user#200', total: 0.23171272351115713, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 333.7260529037979, from: 'user#14', to: 'user#187', total: 333.7260529037979, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.263336781439338, from: 'user#15', to: 'user#198', total: 0.263336781439338, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.2646667651839811, from: 'user#15', to: 'user#199', total: 0.2646667651839811, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.26599674892862424, from: 'user#15', to: 'user#200', total: 0.26599674892862424, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 331.941421604847, from: 'user#15', to: 'user#186', total: 331.941421604847, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.2996187379932023, from: 'user#16', to: 'user#198', total: 0.2996187379932023, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.30113196394266295, from: 'user#16', to: 'user#199', total: 0.30113196394266295, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.3026451898921236, from: 'user#16', to: 'user#200', total: 0.3026451898921236, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 330.1567903058963, from: 'user#16', to: 'user#185', total: 330.1567903058963, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.3382414659376386, from: 'user#17', to: 'user#198', total: 0.3382414659376386, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.33994975616964684, from: 'user#17', to: 'user#199', total: 0.33994975616964684, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.34165804640165515, from: 'user#17', to: 'user#200', total: 0.34165804640165515, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 328.3721590069455, from: 'user#17', to: 'user#184', total: 328.3721590069455, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.3792049652726467, from: 'user#18', to: 'user#198', total: 0.3792049652726467, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.38112014186493276, from: 'user#18', to: 'user#199', total: 0.38112014186493276, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.3830353184572189, from: 'user#18', to: 'user#200', total: 0.3830353184572189, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 326.58752770799475, from: 'user#18', to: 'user#183', total: 326.58752770799475, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.4225092359982267, from: 'user#19', to: 'user#198', total: 0.4225092359982267, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.42464312102852075, from: 'user#19', to: 'user#199', total: 0.42464312102852075, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.42677700605881486, from: 'user#19', to: 'user#200', total: 0.42677700605881486, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 324.80289640904397, from: 'user#19', to: 'user#182', total: 324.80289640904397, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.46815427811437865, from: 'user#20', to: 'user#198', total: 0.46815427811437865, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.4705186936604108, from: 'user#20', to: 'user#199', total: 0.4705186936604108, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.47288310920644305, from: 'user#20', to: 'user#200', total: 0.47288310920644305, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 323.01826511009307, from: 'user#20', to: 'user#181', total: 323.01826511009307, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.5161400916211024, from: 'user#21', to: 'user#198', total: 0.5161400916211024, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.518746859760603, from: 'user#21', to: 'user#199', total: 0.518746859760603, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.5213536279001034, from: 'user#21', to: 'user#200', total: 0.5213536279001034, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 321.2336338111424, from: 'user#21', to: 'user#180', total: 321.2336338111424, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.5664666765183981, from: 'user#22', to: 'user#198', total: 0.5664666765183981, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.5693276193290971, from: 'user#22', to: 'user#199', total: 0.5693276193290971, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.5721885621397961, from: 'user#22', to: 'user#200', total: 0.5721885621397961, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 319.44900251219167, from: 'user#22', to: 'user#179', total: 319.44900251219167, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.6191340328062658, from: 'user#23', to: 'user#198', total: 0.6191340328062658, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.6222609723658934, from: 'user#23', to: 'user#199', total: 0.6222609723658934, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.625387911925521, from: 'user#23', to: 'user#200', total: 0.625387911925521, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 317.6643712132407, from: 'user#23', to: 'user#178', total: 317.6643712132407, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.6741421604847052, from: 'user#24', to: 'user#198', total: 0.6741421604847052, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.6775469188709916, from: 'user#24', to: 'user#199', total: 0.6775469188709916, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.680951677257278, from: 'user#24', to: 'user#200', total: 0.680951677257278, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 315.8797399142899, from: 'user#24', to: 'user#177', total: 315.8797399142899, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.7314910595537166, from: 'user#25', to: 'user#198', total: 0.7314910595537166, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.7351854588443919, from: 'user#25', to: 'user#199', total: 0.7351854588443919, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.7388798581350673, from: 'user#25', to: 'user#200', total: 0.7388798581350673, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 314.09510861533926, from: 'user#25', to: 'user#176', total: 314.09510861533926, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.7911807300132999, from: 'user#26', to: 'user#198', total: 0.7911807300132999, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.7951765922860944, from: 'user#26', to: 'user#199', total: 0.7951765922860944, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.7991724545588887, from: 'user#26', to: 'user#200', total: 0.7991724545588887, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 312.3104773163884, from: 'user#26', to: 'user#175', total: 312.3104773163884, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.8532111718634551, from: 'user#27', to: 'user#198', total: 0.8532111718634551, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.8575203191960987, from: 'user#27', to: 'user#199', total: 0.8575203191960987, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.8618294665287425, from: 'user#27', to: 'user#200', total: 0.8618294665287425, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 310.5258460174375, from: 'user#27', to: 'user#174', total: 310.5258460174375, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.9175823851041822, from: 'user#28', to: 'user#198', total: 0.9175823851041822, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.9222166395744054, from: 'user#28', to: 'user#199', total: 0.9222166395744054, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.9268508940446285, from: 'user#28', to: 'user#200', total: 0.9268508940446285, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 308.7412147184868, from: 'user#28', to: 'user#173', total: 308.7412147184868, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.9842943697354811, from: 'user#29', to: 'user#198', total: 0.9842943697354811, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.9892655534210139, from: 'user#29', to: 'user#199', total: 0.9892655534210139, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.9942367371065466, from: 'user#29', to: 'user#200', total: 0.9942367371065466, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 306.95658341953606, from: 'user#29', to: 'user#172', total: 306.95658341953606, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.053347125757352, from: 'user#30', to: 'user#198', total: 1.053347125757352, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.0586670607359243, from: 'user#30', to: 'user#199', total: 1.0586670607359243, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.063986995714497, from: 'user#30', to: 'user#200', total: 1.063986995714497, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 305.1719521205852, from: 'user#30', to: 'user#171', total: 305.1719521205852, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.1247406531697945, from: 'user#31', to: 'user#198', total: 1.1247406531697945, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.130421161519137, from: 'user#31', to: 'user#199', total: 1.130421161519137, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.1361016698684794, from: 'user#31', to: 'user#200', total: 1.1361016698684794, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 303.3873208216344, from: 'user#31', to: 'user#170', total: 303.3873208216344, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.1984749519728093, from: 'user#32', to: 'user#198', total: 1.1984749519728093, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.2045278557706518, from: 'user#32', to: 'user#199', total: 1.2045278557706518, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.2105807595684943, from: 'user#32', to: 'user#200', total: 1.2105807595684943, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 301.60268952268365, from: 'user#32', to: 'user#169', total: 301.60268952268365, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.274550022166396, from: 'user#33', to: 'user#198', total: 1.274550022166396, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.2809871434904685, from: 'user#33', to: 'user#199', total: 1.2809871434904685, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.2874242648145413, from: 'user#33', to: 'user#200', total: 1.2874242648145413, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 299.81805822373286, from: 'user#33', to: 'user#168', total: 299.81805822373286, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.3529658637505544, from: 'user#34', to: 'user#198', total: 1.3529658637505544, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.3597990246785874, from: 'user#34', to: 'user#199', total: 1.3597990246785874, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.3666321856066206, from: 'user#34', to: 'user#200', total: 1.3666321856066206, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 298.033426924782, from: 'user#34', to: 'user#167', total: 298.033426924782, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.4337224767252845, from: 'user#35', to: 'user#198', total: 1.4337224767252845, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.4409634993350082, from: 'user#35', to: 'user#199', total: 1.4409634993350082, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.448204521944732, from: 'user#35', to: 'user#200', total: 1.448204521944732, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 296.24879562583124, from: 'user#35', to: 'user#166', total: 296.24879562583124, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.5168198610905868, from: 'user#36', to: 'user#198', total: 1.5168198610905868, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.524480567459731, from: 'user#36', to: 'user#199', total: 1.524480567459731, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.5321412738288755, from: 'user#36', to: 'user#200', total: 1.5321412738288755, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 294.4641643268804, from: 'user#36', to: 'user#165', total: 294.4641643268804, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.602258016846461, from: 'user#37', to: 'user#198', total: 1.602258016846461, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.6103502290527563, from: 'user#37', to: 'user#199', total: 1.6103502290527563, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.6184424412590515, from: 'user#37', to: 'user#200', total: 1.6184424412590515, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 292.6795330279296, from: 'user#37', to: 'user#164', total: 292.6795330279296, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.6900369439929068, from: 'user#38', to: 'user#198', total: 1.6900369439929068, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.698572484114083, from: 'user#38', to: 'user#199', total: 1.698572484114083, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.7071080242352594, from: 'user#38', to: 'user#200', total: 1.7071080242352594, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 290.8949017289789, from: 'user#38', to: 'user#163', total: 290.8949017289789, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.7801566425299247, from: 'user#39', to: 'user#198', total: 1.7801566425299247, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.7891473326437122, from: 'user#39', to: 'user#199', total: 1.7891473326437122, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.7981380227574997, from: 'user#39', to: 'user#200', total: 1.7981380227574997, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 289.1102704300281, from: 'user#39', to: 'user#162', total: 289.1102704300281, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.8726171124575146, from: 'user#40', to: 'user#198', total: 1.8726171124575146, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.8820747746416433, from: 'user#40', to: 'user#199', total: 1.8820747746416433, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.8915324368257722, from: 'user#40', to: 'user#200', total: 1.8915324368257722, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 287.32563913107725, from: 'user#40', to: 'user#161', total: 287.32563913107725, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.9674183537756764, from: 'user#41', to: 'user#198', total: 1.9674183537756764, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.9773548101078768, from: 'user#41', to: 'user#199', total: 1.9773548101078768, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.9872912664400773, from: 'user#41', to: 'user#200', total: 1.9872912664400773, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 285.5410078321266, from: 'user#41', to: 'user#160', total: 285.5410078321266, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.0645603664844097, from: 'user#42', to: 'user#198', total: 2.0645603664844097, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.074987439042412, from: 'user#42', to: 'user#199', total: 2.074987439042412, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.0854145116004137, from: 'user#42', to: 'user#200', total: 2.0854145116004137, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 283.7563765331756, from: 'user#42', to: 'user#159', total: 283.7563765331756, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.164043150583715, from: 'user#43', to: 'user#198', total: 2.164043150583715, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.174972661445249, from: 'user#43', to: 'user#199', total: 2.174972661445249, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.185902172306783, from: 'user#43', to: 'user#200', total: 2.185902172306783, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 281.97174523422495, from: 'user#43', to: 'user#158', total: 281.97174523422495, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.2658667060735924, from: 'user#44', to: 'user#198', total: 2.2658667060735924, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.2773104773163886, from: 'user#44', to: 'user#199', total: 2.2773104773163886, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.2887542485591843, from: 'user#44', to: 'user#200', total: 2.2887542485591843, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 280.1871139352741, from: 'user#44', to: 'user#157', total: 280.1871139352741, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.370031032954042, from: 'user#45', to: 'user#198', total: 2.370031032954042, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.38200088665583, from: 'user#45', to: 'user#199', total: 2.38200088665583, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.3939707403576183, from: 'user#45', to: 'user#200', total: 2.3939707403576183, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 278.4024826363234, from: 'user#45', to: 'user#156', total: 278.4024826363234, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.476536131225063, from: 'user#46', to: 'user#198', total: 2.476536131225063, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.4890438894635736, from: 'user#46', to: 'user#199', total: 2.4890438894635736, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.501551647702084, from: 'user#46', to: 'user#200', total: 2.501551647702084, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 276.6178513373726, from: 'user#46', to: 'user#155', total: 276.6178513373726, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.585382000886656, from: 'user#47', to: 'user#198', total: 2.585382000886656, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.598439485739619, from: 'user#47', to: 'user#199', total: 2.598439485739619, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.611496970592582, from: 'user#47', to: 'user#200', total: 2.611496970592582, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 274.83322003842176, from: 'user#47', to: 'user#154', total: 274.83322003842176, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.696568641938821, from: 'user#48', to: 'user#198', total: 2.696568641938821, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.7101876754839664, from: 'user#48', to: 'user#199', total: 2.7101876754839664, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.723806709029112, from: 'user#48', to: 'user#200', total: 2.723806709029112, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 273.048588739471, from: 'user#48', to: 'user#153', total: 273.048588739471, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.8100960543815576, from: 'user#49', to: 'user#198', total: 2.8100960543815576, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.824288458696616, from: 'user#49', to: 'user#199', total: 2.824288458696616, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.8384808630116742, from: 'user#49', to: 'user#200', total: 2.8384808630116742, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 271.26395744052013, from: 'user#49', to: 'user#152', total: 271.26395744052013, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.9259642382148665, from: 'user#50', to: 'user#198', total: 2.9259642382148665, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.9407418353775676, from: 'user#50', to: 'user#199', total: 2.9407418353775676, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.955519432540269, from: 'user#50', to: 'user#200', total: 2.955519432540269, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 269.4793261415694, from: 'user#50', to: 'user#151', total: 269.4793261415694, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.044173193438747, from: 'user#51', to: 'user#198', total: 3.044173193438747, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.0595478055268215, from: 'user#51', to: 'user#199', total: 3.0595478055268215, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.074922417614896, from: 'user#51', to: 'user#200', total: 3.074922417614896, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 267.6946948426186, from: 'user#51', to: 'user#150', total: 267.6946948426186, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.1647229200531997, from: 'user#52', to: 'user#198', total: 3.1647229200531997, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.1807063691443775, from: 'user#52', to: 'user#199', total: 3.1807063691443775, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.196689818235555, from: 'user#52', to: 'user#200', total: 3.196689818235555, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 298.00000000000006, from: 'user#52', to: 'user#149', total: 298.00000000000006, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.2876134180582244, from: 'user#53', to: 'user#198', total: 3.2876134180582244, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.3042175262302353, from: 'user#53', to: 'user#199', total: 3.3042175262302353, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.3208216344022468, from: 'user#53', to: 'user#200', total: 3.3208216344022468, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 295.99999999999994, from: 'user#53', to: 'user#148', total: 295.99999999999994, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.4128446874538203, from: 'user#54', to: 'user#198', total: 3.4128446874538203, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.430081276784395, from: 'user#54', to: 'user#199', total: 3.430081276784395, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.44731786611497, from: 'user#54', to: 'user#200', total: 3.44731786611497, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 294.00000000000006, from: 'user#54', to: 'user#147', total: 294.00000000000006, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.5404167282399883, from: 'user#55', to: 'user#198', total: 3.5404167282399883, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.5582976208068566, from: 'user#55', to: 'user#199', total: 3.5582976208068566, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.5761785133737254, from: 'user#55', to: 'user#200', total: 3.5761785133737254, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 292, from: 'user#55', to: 'user#146', total: 292, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.670329540416729, from: 'user#56', to: 'user#198', total: 3.670329540416729, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.6888665582976214, from: 'user#56', to: 'user#199', total: 3.6888665582976214, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.707403576178514, from: 'user#56', to: 'user#200', total: 3.707403576178514, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 290, from: 'user#56', to: 'user#145', total: 290, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.8025831239840406, from: 'user#57', to: 'user#198', total: 3.8025831239840406, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.821788089256687, from: 'user#57', to: 'user#199', total: 3.821788089256687, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.8409930545293336, from: 'user#57', to: 'user#200', total: 3.8409930545293336, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 288, from: 'user#57', to: 'user#144', total: 288, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.9371774789419245, from: 'user#58', to: 'user#198', total: 3.9371774789419245, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.9570622136840554, from: 'user#58', to: 'user#199', total: 3.9570622136840554, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.9769469484261863, from: 'user#58', to: 'user#200', total: 3.9769469484261863, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 286.0000000000001, from: 'user#58', to: 'user#143', total: 286.0000000000001, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.07411260529038, from: 'user#59', to: 'user#198', total: 4.07411260529038, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.094688931579725, from: 'user#59', to: 'user#199', total: 4.094688931579725, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.115265257869071, from: 'user#59', to: 'user#200', total: 4.115265257869071, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 283.99999999999994, from: 'user#59', to: 'user#142', total: 283.99999999999994, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.213388503029408, from: 'user#60', to: 'user#198', total: 4.213388503029408, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.234668242943697, from: 'user#60', to: 'user#199', total: 4.234668242943697, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.255947982857988, from: 'user#60', to: 'user#200', total: 4.255947982857988, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 281.99999999999994, from: 'user#60', to: 'user#141', total: 281.99999999999994, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.355005172159007, from: 'user#61', to: 'user#198', total: 4.355005172159007, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.377000147775972, from: 'user#61', to: 'user#199', total: 4.377000147775972, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.398995123392936, from: 'user#61', to: 'user#200', total: 4.398995123392936, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 280.00000000000006, from: 'user#61', to: 'user#140', total: 280.00000000000006, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.498962612679178, from: 'user#62', to: 'user#198', total: 4.498962612679178, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.521684646076548, from: 'user#62', to: 'user#199', total: 4.521684646076548, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.5444066794739175, from: 'user#62', to: 'user#200', total: 4.5444066794739175, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 278.00000000000017, from: 'user#62', to: 'user#139', total: 278.00000000000017, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.645260824589922, from: 'user#63', to: 'user#198', total: 4.645260824589922, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.668721737845427, from: 'user#63', to: 'user#199', total: 4.668721737845427, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.692182651100931, from: 'user#63', to: 'user#200', total: 4.692182651100931, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 276.0000000000001, from: 'user#63', to: 'user#138', total: 276.0000000000001, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.793899807891237, from: 'user#64', to: 'user#198', total: 4.793899807891237, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.818111423082607, from: 'user#64', to: 'user#199', total: 4.818111423082607, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.842323038273977, from: 'user#64', to: 'user#200', total: 4.842323038273977, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 274, from: 'user#64', to: 'user#137', total: 274, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.944879562583125, from: 'user#65', to: 'user#198', total: 4.944879562583125, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.96985370178809, from: 'user#65', to: 'user#199', total: 4.96985370178809, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.9948278409930555, from: 'user#65', to: 'user#200', total: 4.9948278409930555, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 272, from: 'user#65', to: 'user#136', total: 272, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5.098200088665584, from: 'user#66', to: 'user#198', total: 5.098200088665584, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5.123948573961874, from: 'user#66', to: 'user#199', total: 5.123948573961874, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5.149697059258165, from: 'user#66', to: 'user#200', total: 5.149697059258165, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 270.0000000000001, from: 'user#66', to: 'user#135', total: 270.0000000000001, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5.253861386138614, from: 'user#67', to: 'user#198', total: 5.253861386138614, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5.280396039603961, from: 'user#67', to: 'user#199', total: 5.280396039603961, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5.306930693069307, from: 'user#67', to: 'user#200', total: 5.306930693069307, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 268, from: 'user#67', to: 'user#134', total: 268, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5.4118634550022175, from: 'user#68', to: 'user#198', total: 5.4118634550022175, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5.4391960987143495, from: 'user#68', to: 'user#199', total: 5.4391960987143495, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5.466528742426482, from: 'user#68', to: 'user#200', total: 5.466528742426482, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 266, from: 'user#68', to: 'user#133', total: 266, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5.572206295256391, from: 'user#69', to: 'user#198', total: 5.572206295256391, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5.6003487512930406, from: 'user#69', to: 'user#199', total: 5.6003487512930406, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5.628491207329689, from: 'user#69', to: 'user#200', total: 5.628491207329689, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 263.9999999999999, from: 'user#69', to: 'user#132', total: 263.9999999999999, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5.734889906901138, from: 'user#70', to: 'user#198', total: 5.734889906901138, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5.763853997340033, from: 'user#70', to: 'user#199', total: 5.763853997340033, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5.792818087778928, from: 'user#70', to: 'user#200', total: 5.792818087778928, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 262, from: 'user#70', to: 'user#131', total: 262, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5.899914289936457, from: 'user#71', to: 'user#198', total: 5.899914289936457, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5.929711836855328, from: 'user#71', to: 'user#199', total: 5.929711836855328, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5.959509383774199, from: 'user#71', to: 'user#200', total: 5.959509383774199, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 260, from: 'user#71', to: 'user#130', total: 260, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.067279444362347, from: 'user#72', to: 'user#198', total: 6.067279444362347, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.097922269838924, from: 'user#72', to: 'user#199', total: 6.097922269838924, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.128565095315502, from: 'user#72', to: 'user#200', total: 6.128565095315502, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 258, from: 'user#72', to: 'user#129', total: 258, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.236985370178809, from: 'user#73', to: 'user#198', total: 6.236985370178809, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.268485296290824, from: 'user#73', to: 'user#199', total: 6.268485296290824, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.299985222402838, from: 'user#73', to: 'user#200', total: 6.299985222402838, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 255.99999999999977, from: 'user#73', to: 'user#128', total: 255.99999999999977, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.409032067385844, from: 'user#74', to: 'user#198', total: 6.409032067385844, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.441400916211025, from: 'user#74', to: 'user#199', total: 6.441400916211025, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.473769765036206, from: 'user#74', to: 'user#200', total: 6.473769765036206, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 254.00000000000045, from: 'user#74', to: 'user#127', total: 254.00000000000045, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.58341953598345, from: 'user#75', to: 'user#198', total: 6.58341953598345, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.616669129599528, from: 'user#75', to: 'user#199', total: 6.616669129599528, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.649918723215606, from: 'user#75', to: 'user#200', total: 6.649918723215606, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 252.0000000000005, from: 'user#75', to: 'user#126', total: 252.0000000000005, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.760147775971627, from: 'user#76', to: 'user#198', total: 6.760147775971627, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.794289936456332, from: 'user#76', to: 'user#199', total: 6.794289936456332, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.828432096941038, from: 'user#76', to: 'user#200', total: 6.828432096941038, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 250.00000000000026, from: 'user#76', to: 'user#125', total: 250.00000000000026, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.939216787350377, from: 'user#77', to: 'user#198', total: 6.939216787350377, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.974263336781439, from: 'user#77', to: 'user#199', total: 6.974263336781439, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.009309886212502, from: 'user#77', to: 'user#200', total: 7.009309886212502, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 248.00000000000006, from: 'user#77', to: 'user#124', total: 248.00000000000006, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.120626570119699, from: 'user#78', to: 'user#198', total: 7.120626570119699, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.156589330574849, from: 'user#78', to: 'user#199', total: 7.156589330574849, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.192552091029999, from: 'user#78', to: 'user#200', total: 7.192552091029999, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 246, from: 'user#78', to: 'user#123', total: 246, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.3043771242795925, from: 'user#79', to: 'user#198', total: 7.3043771242795925, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.34126791783656, from: 'user#79', to: 'user#199', total: 7.34126791783656, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.378158711393527, from: 'user#79', to: 'user#200', total: 7.378158711393527, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 244, from: 'user#79', to: 'user#122', total: 244, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.490468449830058, from: 'user#80', to: 'user#198', total: 7.490468449830058, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.528299098566573, from: 'user#80', to: 'user#199', total: 7.528299098566573, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.566129747303089, from: 'user#80', to: 'user#200', total: 7.566129747303089, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 242.00000000000003, from: 'user#80', to: 'user#121', total: 242.00000000000003, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.6789005467710965, from: 'user#81', to: 'user#198', total: 7.6789005467710965, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.71768287276489, from: 'user#81', to: 'user#199', total: 7.71768287276489, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.756465198758683, from: 'user#81', to: 'user#200', total: 7.756465198758683, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 239.99999999999994, from: 'user#81', to: 'user#120', total: 239.99999999999994, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.869673415102706, from: 'user#82', to: 'user#198', total: 7.869673415102706, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.909419240431507, from: 'user#82', to: 'user#199', total: 7.909419240431507, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.949165065760309, from: 'user#82', to: 'user#200', total: 7.949165065760309, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 238.00000000000006, from: 'user#82', to: 'user#119', total: 238.00000000000006, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.062787054824886, from: 'user#83', to: 'user#198', total: 8.062787054824886, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.103508201566425, from: 'user#83', to: 'user#199', total: 8.103508201566425, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.144229348307965, from: 'user#83', to: 'user#200', total: 8.144229348307965, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 235.9999999999999, from: 'user#83', to: 'user#118', total: 235.9999999999999, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.258241465937639, from: 'user#84', to: 'user#198', total: 8.258241465937639, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.299949756169648, from: 'user#84', to: 'user#199', total: 8.299949756169648, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.341658046401655, from: 'user#84', to: 'user#200', total: 8.341658046401655, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 234.00000000000006, from: 'user#84', to: 'user#117', total: 234.00000000000006, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.406088370031033, from: 'user#85', to: 'user#150', total: 6.406088370031033, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.44879562583124, from: 'user#85', to: 'user#151', total: 6.44879562583124, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.491502881631447, from: 'user#85', to: 'user#152', total: 6.491502881631447, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.5342101374316535, from: 'user#85', to: 'user#153', total: 6.5342101374316535, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.57691739323186, from: 'user#85', to: 'user#154', total: 6.57691739323186, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.619624649032069, from: 'user#85', to: 'user#155', total: 6.619624649032069, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.662331904832276, from: 'user#85', to: 'user#156', total: 6.662331904832276, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.705039160632483, from: 'user#85', to: 'user#157', total: 6.705039160632483, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.7477464164326895, from: 'user#85', to: 'user#158', total: 6.7477464164326895, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.790453672232896, from: 'user#85', to: 'user#159', total: 6.790453672232896, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.833160928033103, from: 'user#85', to: 'user#160', total: 6.833160928033103, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.87586818383331, from: 'user#85', to: 'user#161', total: 6.87586818383331, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.918575439633517, from: 'user#85', to: 'user#162', total: 6.918575439633517, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.961282695433724, from: 'user#85', to: 'user#163', total: 6.961282695433724, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.0039899512339305, from: 'user#85', to: 'user#164', total: 7.0039899512339305, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.046697207034137, from: 'user#85', to: 'user#165', total: 7.046697207034137, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.089404462834344, from: 'user#85', to: 'user#166', total: 7.089404462834344, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.132111718634551, from: 'user#85', to: 'user#167', total: 7.132111718634551, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.174818974434758, from: 'user#85', to: 'user#168', total: 7.174818974434758, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.217526230234965, from: 'user#85', to: 'user#169', total: 7.217526230234965, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.260233486035172, from: 'user#85', to: 'user#170', total: 7.260233486035172, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.3029407418353784, from: 'user#85', to: 'user#171', total: 7.3029407418353784, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.345647997635585, from: 'user#85', to: 'user#172', total: 7.345647997635585, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.388355253435792, from: 'user#85', to: 'user#173', total: 7.388355253435792, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.431062509235999, from: 'user#85', to: 'user#174', total: 7.431062509235999, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.473769765036206, from: 'user#85', to: 'user#175', total: 7.473769765036206, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.516477020836413, from: 'user#85', to: 'user#176', total: 7.516477020836413, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.5591842766366195, from: 'user#85', to: 'user#177', total: 7.5591842766366195, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.601891532436826, from: 'user#85', to: 'user#178', total: 7.601891532436826, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.644598788237033, from: 'user#85', to: 'user#179', total: 7.644598788237033, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.68730604403724, from: 'user#85', to: 'user#180', total: 7.68730604403724, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.730013299837447, from: 'user#85', to: 'user#181', total: 7.730013299837447, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.772720555637654, from: 'user#85', to: 'user#182', total: 7.772720555637654, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.815427811437861, from: 'user#85', to: 'user#183', total: 7.815427811437861, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.858135067238067, from: 'user#85', to: 'user#184', total: 7.858135067238067, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.900842323038274, from: 'user#85', to: 'user#185', total: 7.900842323038274, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.943549578838481, from: 'user#85', to: 'user#186', total: 7.943549578838481, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.986256834638688, from: 'user#85', to: 'user#187', total: 7.986256834638688, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.028964090438894, from: 'user#85', to: 'user#188', total: 8.028964090438894, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.071671346239103, from: 'user#85', to: 'user#189', total: 8.071671346239103, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.11437860203931, from: 'user#85', to: 'user#190', total: 8.11437860203931, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.157085857839517, from: 'user#85', to: 'user#191', total: 8.157085857839517, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.199793113639723, from: 'user#85', to: 'user#192', total: 8.199793113639723, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.24250036943993, from: 'user#85', to: 'user#193', total: 8.24250036943993, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.285207625240137, from: 'user#85', to: 'user#194', total: 8.285207625240137, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.327914881040344, from: 'user#85', to: 'user#195', total: 8.327914881040344, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.37062213684055, from: 'user#85', to: 'user#196', total: 8.37062213684055, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.413329392640758, from: 'user#85', to: 'user#197', total: 8.413329392640758, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.456036648440964, from: 'user#85', to: 'user#198', total: 8.456036648440964, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.498743904241172, from: 'user#85', to: 'user#199', total: 8.498743904241172, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.541451160041378, from: 'user#85', to: 'user#200', total: 8.541451160041378, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 231.96296734151008, from: 'user#85', to: 'user#116', total: 231.96296734151008, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.65617260233486, from: 'user#86', to: 'user#198', total: 8.65617260233486, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.699890645780997, from: 'user#86', to: 'user#199', total: 8.699890645780997, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.743608689227132, from: 'user#86', to: 'user#200', total: 8.743608689227132, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 229.99999999999994, from: 'user#86', to: 'user#115', total: 229.99999999999994, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.85864932761933, from: 'user#87', to: 'user#198', total: 8.85864932761933, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.903389980789125, from: 'user#87', to: 'user#199', total: 8.903389980789125, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.94813063395892, from: 'user#87', to: 'user#200', total: 8.94813063395892, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 228, from: 'user#87', to: 'user#114', total: 228, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.06346682429437, from: 'user#88', to: 'user#198', total: 9.06346682429437, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.109241909265554, from: 'user#88', to: 'user#199', total: 9.109241909265554, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.155016994236737, from: 'user#88', to: 'user#200', total: 9.155016994236737, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 226, from: 'user#88', to: 'user#113', total: 226, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.270625092359984, from: 'user#89', to: 'user#198', total: 9.270625092359984, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.317446431210286, from: 'user#89', to: 'user#199', total: 9.317446431210286, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.36426777006059, from: 'user#89', to: 'user#200', total: 9.36426777006059, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 223.9999999999999, from: 'user#89', to: 'user#112', total: 223.9999999999999, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.480124131816169, from: 'user#90', to: 'user#198', total: 9.480124131816169, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.52800354662332, from: 'user#90', to: 'user#199', total: 9.52800354662332, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.575882961430473, from: 'user#90', to: 'user#200', total: 9.575882961430473, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 222.00000000000006, from: 'user#90', to: 'user#111', total: 222.00000000000006, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.691963942662925, from: 'user#91', to: 'user#198', total: 9.691963942662925, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.740913255504656, from: 'user#91', to: 'user#199', total: 9.740913255504656, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.789862568346388, from: 'user#91', to: 'user#200', total: 9.789862568346388, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 219.99999999999994, from: 'user#91', to: 'user#110', total: 219.99999999999994, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.906144524900252, from: 'user#92', to: 'user#198', total: 9.906144524900252, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.956175557854294, from: 'user#92', to: 'user#199', total: 9.956175557854294, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.006206590808336, from: 'user#92', to: 'user#200', total: 10.006206590808336, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 218, from: 'user#92', to: 'user#109', total: 218, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.122665878528153, from: 'user#93', to: 'user#198', total: 10.122665878528153, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.173790453672234, from: 'user#93', to: 'user#199', total: 10.173790453672234, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.224915028816316, from: 'user#93', to: 'user#200', total: 10.224915028816316, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 216, from: 'user#93', to: 'user#108', total: 216, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.341528003546625, from: 'user#94', to: 'user#198', total: 10.341528003546625, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.393757942958477, from: 'user#94', to: 'user#199', total: 10.393757942958477, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.445987882370328, from: 'user#94', to: 'user#200', total: 10.445987882370328, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 214, from: 'user#94', to: 'user#107', total: 214, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.562730899955667, from: 'user#95', to: 'user#198', total: 10.562730899955667, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.616078025713021, from: 'user#95', to: 'user#199', total: 10.616078025713021, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.669425151470373, from: 'user#95', to: 'user#200', total: 10.669425151470373, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 212.0000000000001, from: 'user#95', to: 'user#106', total: 212.0000000000001, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.786274567755283, from: 'user#96', to: 'user#198', total: 10.786274567755283, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.840750701935866, from: 'user#96', to: 'user#199', total: 10.840750701935866, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.895226836116448, from: 'user#96', to: 'user#200', total: 10.895226836116448, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 210, from: 'user#96', to: 'user#105', total: 210, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.342544702231416, from: 'user#97', to: 'user#150', total: 8.342544702231416, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.398161666912959, from: 'user#97', to: 'user#151', total: 8.398161666912959, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.453778631594503, from: 'user#97', to: 'user#152', total: 8.453778631594503, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.509395596276045, from: 'user#97', to: 'user#153', total: 8.509395596276045, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.565012560957587, from: 'user#97', to: 'user#154', total: 8.565012560957587, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.620629525639131, from: 'user#97', to: 'user#155', total: 8.620629525639131, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.676246490320674, from: 'user#97', to: 'user#156', total: 8.676246490320674, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.731863455002218, from: 'user#97', to: 'user#157', total: 8.731863455002218, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.78748041968376, from: 'user#97', to: 'user#158', total: 8.78748041968376, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.843097384365302, from: 'user#97', to: 'user#159', total: 8.843097384365302, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.898714349046845, from: 'user#97', to: 'user#160', total: 8.898714349046845, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.954331313728389, from: 'user#97', to: 'user#161', total: 8.954331313728389, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.009948278409931, from: 'user#97', to: 'user#162', total: 9.009948278409931, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.065565243091473, from: 'user#97', to: 'user#163', total: 9.065565243091473, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.121182207773016, from: 'user#97', to: 'user#164', total: 9.121182207773016, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.17679917245456, from: 'user#97', to: 'user#165', total: 9.17679917245456, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.232416137136102, from: 'user#97', to: 'user#166', total: 9.232416137136102, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.288033101817645, from: 'user#97', to: 'user#167', total: 9.288033101817645, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.343650066499187, from: 'user#97', to: 'user#168', total: 9.343650066499187, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.399267031180731, from: 'user#97', to: 'user#169', total: 9.399267031180731, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.454883995862273, from: 'user#97', to: 'user#170', total: 9.454883995862273, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.510500960543816, from: 'user#97', to: 'user#171', total: 9.510500960543816, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.566117925225358, from: 'user#97', to: 'user#172', total: 9.566117925225358, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.621734889906902, from: 'user#97', to: 'user#173', total: 9.621734889906902, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.677351854588444, from: 'user#97', to: 'user#174', total: 9.677351854588444, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.732968819269987, from: 'user#97', to: 'user#175', total: 9.732968819269987, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.788585783951529, from: 'user#97', to: 'user#176', total: 9.788585783951529, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.844202748633073, from: 'user#97', to: 'user#177', total: 9.844202748633073, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.899819713314615, from: 'user#97', to: 'user#178', total: 9.899819713314615, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.955436677996158, from: 'user#97', to: 'user#179', total: 9.955436677996158, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.0110536426777, from: 'user#97', to: 'user#180', total: 10.0110536426777, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.066670607359242, from: 'user#97', to: 'user#181', total: 10.066670607359242, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.122287572040786, from: 'user#97', to: 'user#182', total: 10.122287572040786, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.177904536722329, from: 'user#97', to: 'user#183', total: 10.177904536722329, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.233521501403871, from: 'user#97', to: 'user#184', total: 10.233521501403871, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.289138466085413, from: 'user#97', to: 'user#185', total: 10.289138466085413, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.344755430766957, from: 'user#97', to: 'user#186', total: 10.344755430766957, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.4003723954485, from: 'user#97', to: 'user#187', total: 10.4003723954485, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.455989360130042, from: 'user#97', to: 'user#188', total: 10.455989360130042, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.511606324811586, from: 'user#97', to: 'user#189', total: 10.511606324811586, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.567223289493128, from: 'user#97', to: 'user#190', total: 10.567223289493128, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.622840254174672, from: 'user#97', to: 'user#191', total: 10.622840254174672, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.678457218856215, from: 'user#97', to: 'user#192', total: 10.678457218856215, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.734074183537757, from: 'user#97', to: 'user#193', total: 10.734074183537757, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.7896911482193, from: 'user#97', to: 'user#194', total: 10.7896911482193, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.845308112900844, from: 'user#97', to: 'user#195', total: 10.845308112900844, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.900925077582386, from: 'user#97', to: 'user#196', total: 10.900925077582386, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.956542042263928, from: 'user#97', to: 'user#197', total: 10.956542042263928, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.01215900694547, from: 'user#97', to: 'user#198', total: 11.01215900694547, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.067775971627015, from: 'user#97', to: 'user#199', total: 11.067775971627015, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.123392936308557, from: 'user#97', to: 'user#200', total: 11.123392936308557, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 207.90833160928037, from: 'user#97', to: 'user#104', total: 207.90833160928037, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.24038421752623, from: 'user#98', to: 'user#198', total: 11.24038421752623, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.297153834786464, from: 'user#98', to: 'user#199', total: 11.297153834786464, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.353923452046697, from: 'user#98', to: 'user#200', total: 11.353923452046697, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 206.00000000000017, from: 'user#98', to: 'user#103', total: 206.00000000000017, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.690113787498152, from: 'user#99', to: 'user#150', total: 8.690113787498152, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.748047879414807, from: 'user#99', to: 'user#151', total: 8.748047879414807, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.80598197133146, from: 'user#99', to: 'user#152', total: 8.80598197133146, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.863916063248116, from: 'user#99', to: 'user#153', total: 8.863916063248116, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.921850155164769, from: 'user#99', to: 'user#154', total: 8.921850155164769, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.979784247081426, from: 'user#99', to: 'user#155', total: 8.979784247081426, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.03771833899808, from: 'user#99', to: 'user#156', total: 9.03771833899808, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.095652430914734, from: 'user#99', to: 'user#157', total: 9.095652430914734, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.15358652283139, from: 'user#99', to: 'user#158', total: 9.15358652283139, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.211520614748043, from: 'user#99', to: 'user#159', total: 9.211520614748043, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.269454706664698, from: 'user#99', to: 'user#160', total: 9.269454706664698, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.327388798581351, from: 'user#99', to: 'user#161', total: 9.327388798581351, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.385322890498006, from: 'user#99', to: 'user#162', total: 9.385322890498006, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.44325698241466, from: 'user#99', to: 'user#163', total: 9.44325698241466, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.501191074331315, from: 'user#99', to: 'user#164', total: 9.501191074331315, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.559125166247968, from: 'user#99', to: 'user#165', total: 9.559125166247968, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.617059258164623, from: 'user#99', to: 'user#166', total: 9.617059258164623, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.674993350081277, from: 'user#99', to: 'user#167', total: 9.674993350081277, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.732927441997932, from: 'user#99', to: 'user#168', total: 9.732927441997932, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.790861533914587, from: 'user#99', to: 'user#169', total: 9.790861533914587, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.84879562583124, from: 'user#99', to: 'user#170', total: 9.84879562583124, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.906729717747895, from: 'user#99', to: 'user#171', total: 9.906729717747895, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.964663809664549, from: 'user#99', to: 'user#172', total: 9.964663809664549, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.022597901581204, from: 'user#99', to: 'user#173', total: 10.022597901581204, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.080531993497857, from: 'user#99', to: 'user#174', total: 10.080531993497857, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.138466085414512, from: 'user#99', to: 'user#175', total: 10.138466085414512, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.196400177331165, from: 'user#99', to: 'user#176', total: 10.196400177331165, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.25433426924782, from: 'user#99', to: 'user#177', total: 10.25433426924782, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.312268361164476, from: 'user#99', to: 'user#178', total: 10.312268361164476, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.370202453081129, from: 'user#99', to: 'user#179', total: 10.370202453081129, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.428136544997784, from: 'user#99', to: 'user#180', total: 10.428136544997784, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.486070636914437, from: 'user#99', to: 'user#181', total: 10.486070636914437, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.544004728831093, from: 'user#99', to: 'user#182', total: 10.544004728831093, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.601938820747746, from: 'user#99', to: 'user#183', total: 10.601938820747746, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.659872912664401, from: 'user#99', to: 'user#184', total: 10.659872912664401, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.717807004581054, from: 'user#99', to: 'user#185', total: 10.717807004581054, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.77574109649771, from: 'user#99', to: 'user#186', total: 10.77574109649771, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.833675188414364, from: 'user#99', to: 'user#187', total: 10.833675188414364, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.891609280331018, from: 'user#99', to: 'user#188', total: 10.891609280331018, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.949543372247673, from: 'user#99', to: 'user#189', total: 10.949543372247673, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.007477464164328, from: 'user#99', to: 'user#190', total: 11.007477464164328, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.065411556080983, from: 'user#99', to: 'user#191', total: 11.065411556080983, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.123345647997636, from: 'user#99', to: 'user#192', total: 11.123345647997636, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.181279739914292, from: 'user#99', to: 'user#193', total: 11.181279739914292, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.239213831830945, from: 'user#99', to: 'user#194', total: 11.239213831830945, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.2971479237476, from: 'user#99', to: 'user#195', total: 11.2971479237476, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.355082015664253, from: 'user#99', to: 'user#196', total: 11.355082015664253, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.413016107580908, from: 'user#99', to: 'user#197', total: 11.413016107580908, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.470950199497562, from: 'user#99', to: 'user#198', total: 11.470950199497562, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.528884291414217, from: 'user#99', to: 'user#199', total: 11.528884291414217, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.586818383330872, from: 'user#99', to: 'user#200', total: 11.586818383330872, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 203.99999999999991, from: 'user#99', to: 'user#102', total: 203.99999999999991, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
})
