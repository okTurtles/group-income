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
      { amount: 50, from: 'u1', to: 'u2', total: 50, isLate: false, partial: false, dueOn: '2021-01' },
      { amount: 50, from: 'u1', to: 'u3', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 100, from: 'u5', to: 'u4', total: 100, partial: false, isLate: false, dueOn: '2021-01' }
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
      { amount: 50, from: 'u1', to: 'u3', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 100, from: 'u5', to: 'u4', total: 100, partial: false, isLate: false, dueOn: '2021-01' }
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
      { amount: 75.00000000000001, from: 'u1', to: 'u4', total: 75.00000000000001, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 199.99999999999997, from: 'u1', to: 'u5', total: 199.99999999999997, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 99.99999999999999, from: 'u1', to: 'u6', total: 99.99999999999999, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 299.99999999999994, from: 'u2', to: 'u4', total: 299.99999999999994, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 225, from: 'u3', to: 'u4', total: 225, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 75.00000000000001, from: 'u1', to: 'u4', total: 75.00000000000001, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 199.99999999999997, from: 'u1', to: 'u5', total: 199.99999999999997, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 99.99999999999999, from: 'u1', to: 'u6', total: 99.99999999999999, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 299.99999999999994, from: 'u2', to: 'u4', total: 299.99999999999994, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 225, from: 'u3', to: 'u4', total: 225, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u4', amount: 75.00000000000001, when: dateAtCyclesPassed(0.07) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u1', to: 'u4', amount: 75.00000000000001, total: 75.00000000000001, dueOn: '2021-01', isLate: false, partial: false },
      { amount: 199.99999999999997, from: 'u1', to: 'u5', total: 199.99999999999997, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 99.99999999999999, from: 'u1', to: 'u6', total: 99.99999999999999, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 299.99999999999994, from: 'u2', to: 'u4', total: 299.99999999999994, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 225, from: 'u3', to: 'u4', total: 225, partial: false, isLate: false, dueOn: '2021-01' }

    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 199.99999999999997, from: 'u1', to: 'u5', total: 199.99999999999997, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 99.99999999999999, from: 'u1', to: 'u6', total: 99.99999999999999, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 299.99999999999994, from: 'u2', to: 'u4', total: 299.99999999999994, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 225, from: 'u3', to: 'u4', total: 225, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('Transaction minimization-specific load-test.', function () {
    setup = []
    // Add maxH havers user#1, user#2, ... user#H ... user#maxH to setup. Each haver has a haveNeed of H^2:
    const maxH = 30 // Approximately half of Dunbar's number.
    for (let h = 1; h <= maxH; h++) {
      const name = 'user#' + (h < 10 ? '0' + h : h)
      const haveNeed = Math.pow(h, 2)
      const when = dateAtCyclesPassed(Math.random())
      setup.push({ type: 'haveNeedEvent', data: { name, haveNeed, when } })
    }
    // Add maxN needers user#(maxH+1), user#(maxH+2), ... user#N ... user#(maxH+maxN) to setup. Each needer has a haveNeed of -N*2:
    const maxN = 30 // Approximately half of Dunbar's number.
    for (let n = maxH + 1; n <= maxH + maxN; n++) {
      const name = 'user#' + n
      const haveNeed = -2 * n
      const when = dateAtCyclesPassed(Math.random())
      setup.push({ type: 'haveNeedEvent', data: { name, haveNeed, when } })
    }
    const dist = groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })
    dist.sort((pA, pB) => pA.amount - pB.amount).sort((pA, pB) => pA.from < pB.from ? -1 : 1)

    should(dist).eql([
      { amount: 0.2887361184558435, from: 'user#01', to: 'user#31', total: 0.2887361184558435, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.1549444738233743, from: 'user#02', to: 'user#32', total: 1.1549444738233743, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.5986250661025907, from: 'user#03', to: 'user#33', total: 2.5986250661025907, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.619777895293496, from: 'user#04', to: 'user#34', total: 4.619777895293496, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.2184029613960865, from: 'user#05', to: 'user#31', total: 7.2184029613960865, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.394500264410363, from: 'user#06', to: 'user#35', total: 10.394500264410363, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 14.148069804336327, from: 'user#07', to: 'user#36', total: 14.148069804336327, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 18.479111581173985, from: 'user#08', to: 'user#32', total: 18.479111581173985, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 23.387625594923325, from: 'user#09', to: 'user#37', total: 23.387625594923325, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 28.873611845584342, from: 'user#10', to: 'user#33', total: 28.873611845584342, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 34.93707033315705, from: 'user#11', to: 'user#38', total: 34.93707033315705, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 41.578001057641465, from: 'user#12', to: 'user#34', total: 41.578001057641465, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 48.79640401903755, from: 'user#13', to: 'user#39', total: 48.79640401903755, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 56.59227921734532, from: 'user#14', to: 'user#40', total: 56.59227921734532, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.472765732416713, from: 'user#15', to: 'user#41', total: 10.472765732416713, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 54.492860920148075, from: 'user#15', to: 'user#31', total: 54.492860920148075, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 14.310946589106294, from: 'user#16', to: 'user#42', total: 14.310946589106294, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 59.605499735589625, from: 'user#16', to: 'user#35', total: 59.605499735589625, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 83.44473823373878, from: 'user#17', to: 'user#43', total: 83.44473823373878, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 35.698572184029615, from: 'user#18', to: 'user#44', total: 35.698572184029615, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 57.85193019566368, from: 'user#18', to: 'user#36', total: 57.85193019566368, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 32.706504494976194, from: 'user#19', to: 'user#45', total: 32.706504494976194, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 71.5272342675833, from: 'user#19', to: 'user#41', total: 71.5272342675833, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 45.80539397144368, from: 'user#20', to: 'user#46', total: 45.80539397144368, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 69.68905341089369, from: 'user#20', to: 'user#42', total: 69.68905341089369, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 32.35430988894764, from: 'user#21', to: 'user#47', total: 32.35430988894764, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 44.36594394500264, from: 'user#21', to: 'user#32', total: 44.36594394500264, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50.612374405076686, from: 'user#21', to: 'user#37', total: 50.612374405076686, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 43.74828133262824, from: 'user#22', to: 'user#49', total: 43.74828133262824, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 96, from: 'user#22', to: 'user#48', total: 96, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 52.741406663141206, from: 'user#23', to: 'user#51', total: 52.741406663141206, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 100.00000000000003, from: 'user#23', to: 'user#50', total: 100.00000000000003, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 34.527763088313066, from: 'user#24', to: 'user#33', total: 34.527763088313066, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 38.419883659439435, from: 'user#24', to: 'user#45', total: 38.419883659439435, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 41.06292966684295, from: 'user#24', to: 'user#38', total: 41.06292966684295, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 52.3014278159704, from: 'user#24', to: 'user#44', total: 52.3014278159704, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 54.25171866737175, from: 'user#25', to: 'user#49', total: 54.25171866737175, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 61.64569011105237, from: 'user#25', to: 'user#47', total: 61.64569011105237, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 64.56266525647806, from: 'user#25', to: 'user#52', total: 64.56266525647806, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 21.320359598096378, from: 'user#26', to: 'user#54', total: 21.320359598096378, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 29.20359598096245, from: 'user#26', to: 'user#39', total: 29.20359598096245, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 46.194606028556315, from: 'user#26', to: 'user#46', total: 46.194606028556315, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 98.46705446853505, from: 'user#26', to: 'user#53', total: 98.46705446853505, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 21.802221047065046, from: 'user#27', to: 'user#34', total: 21.802221047065046, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 23.40772078265468, from: 'user#27', to: 'user#40', total: 23.40772078265468, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 29.340454785827756, from: 'user#27', to: 'user#55', total: 29.340454785827756, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 49.258593336858794, from: 'user#27', to: 'user#51', total: 49.258593336858794, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 86.67964040190364, from: 'user#27', to: 'user#54', total: 86.67964040190364, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 33.70957165520905, from: 'user#28', to: 'user#57', total: 33.70957165520905, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 80.65954521417224, from: 'user#28', to: 'user#55', total: 80.65954521417224, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 112, from: 'user#28', to: 'user#56', total: 112, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 12.329772607087676, from: 'user#29', to: 'user#59', total: 12.329772607087676, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 18.873611845584378, from: 'user#29', to: 'user#45', total: 18.873611845584378, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 39.437334743521944, from: 'user#29', to: 'user#52', total: 39.437334743521944, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 80.29042834479094, from: 'user#29', to: 'user#57', total: 80.29042834479094, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 91.8959280803794, from: 'user#29', to: 'user#58', total: 91.8959280803794, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.5552617662612342, from: 'user#30', to: 'user#43', total: 2.5552617662612342, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.532945531464954, from: 'user#30', to: 'user#53', total: 7.532945531464954, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 24.10407191962061, from: 'user#30', to: 'user#58', total: 24.10407191962061, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 105.67022739291231, from: 'user#30', to: 'user#59', total: 105.67022739291231, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 120.00000000000003, from: 'user#30', to: 'user#60', total: 120.00000000000003, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
})
