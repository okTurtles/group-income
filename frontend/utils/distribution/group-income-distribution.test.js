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
  console.time('groupIncomeDistribution')
  // console.table(eventsWithTimeStamps) // TODO: for demonstration of commit; REMOVE!!!
  const dist = groupIncomeDistribution(eventsWithTimeStamps, opts).sort((pA, pB) => pA.amount - pB.amount).sort((pA, pB) => pA.from < pB.from ? -1 : 1)
  console.timeEnd('groupIncomeDistribution')
  return dist
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
      { amount: 25, from: 'u1', to: 'u4', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { from: 'u1', to: 'u2', amount: 50, total: 50, dueOn: '2021-01', isLate: false, partial: false },
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
      { amount: 25, from: 'u1', to: 'u4', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u1', to: 'u2', total: 50, partial: true, isLate: false, dueOn: '2021-01' },
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
      { amount: 25, from: 'u1', to: 'u4', total: 25, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u1', to: 'u2', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
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
      { amount: 20, from: 'u1', to: 'u4', total: 25, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u1', to: 'u2', total: 50, partial: true, isLate: false, dueOn: '2021-01' },
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
      { from: 'u1', to: 'u2', amount: 20, total: 20, dueOn: '2021-01', isLate: false, partial: false },
      { from: 'u1', to: 'u4', amount: 80, total: 80, dueOn: '2021-01', isLate: false, partial: false },
      { amount: 20, from: 'u5', to: 'u2', total: 20, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 80, from: 'u5', to: 'u3', total: 80, partial: false, isLate: false, dueOn: '2021-01' }
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
      { from: 'u1', to: 'u2', amount: 10, total: 20, dueOn: '2021-01', isLate: false, partial: true },
      { from: 'u1', to: 'u4', amount: 75, total: 80, dueOn: '2021-01', isLate: false, partial: true },
      { amount: 20, from: 'u5', to: 'u2', total: 20, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 80, from: 'u5', to: 'u3', total: 80, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('EVENT: u5 pays $10 to u2. Test un-adjusted first.', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u5', to: 'u2', amount: 10 } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 20, total: 20, dueOn: '2021-01', isLate: false, partial: false },
      { from: 'u1', to: 'u4', amount: 40, total: 40, dueOn: '2021-01', isLate: false, partial: false },
      { amount: 40, from: 'u1', to: 'u3', total: 40, partial: false, isLate: false, dueOn: '2021-01' },
      { from: 'u5', to: 'u2', amount: 20, total: 20, dueOn: '2021-01', isLate: false, partial: false },
      { amount: 40, from: 'u5', to: 'u4', total: 40, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u5', to: 'u3', total: 40, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([

      { from: 'u1', to: 'u2', amount: 20, total: 20, dueOn: '2021-01', isLate: false, partial: false },
      { from: 'u1', to: 'u4', amount: 80, total: 80, dueOn: '2021-01', isLate: false, partial: false },
      { amount: 20, from: 'u5', to: 'u2', total: 20, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 80, from: 'u5', to: 'u3', total: 80, partial: false, isLate: false, dueOn: '2021-01' }
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

      { from: 'u1', to: 'u2', amount: 10, total: 20, dueOn: '2021-01', isLate: false, partial: true },
      { from: 'u1', to: 'u4', amount: 75, total: 80, dueOn: '2021-01', isLate: false, partial: true },
      { amount: 10, from: 'u5', to: 'u2', total: 20, partial: true, isLate: false, dueOn: '2021-01' },
      { amount: 80, from: 'u5', to: 'u3', total: 80, partial: false, isLate: false, dueOn: '2021-01' }
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
      { from: 'u1', to: 'u3', amount: 6.666666666666666, total: 6.666666666666666, dueOn: '2021-02', isLate: true, partial: false },
      { amount: 6.666666666666666, from: 'u1', to: 'u3', total: 6.666666666666666, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 13.333333333333332, from: 'u2', to: 'u3', total: 13.333333333333332, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u1', to: 'u3', amount: 6.666666666666666, total: 6.666666666666666, dueOn: '2021-02', isLate: true, partial: false },
      { amount: 6.666666666666666, from: 'u1', to: 'u3', total: 6.666666666666666, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 13.333333333333332, from: 'u2', to: 'u3', total: 13.333333333333332, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 6.666666666666666, from: 'u1', to: 'u3', total: 6.666666666666666, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 13.333333333333332, from: 'u2', to: 'u3', total: 13.333333333333332, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 6.666666666666666, from: 'u1', to: 'u3', total: 6.666666666666666, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 13.333333333333332, from: 'u2', to: 'u3', total: 13.333333333333332, partial: false, isLate: false, dueOn: '2021-02' }
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
      { from: 'u1', to: 'u2', amount: 71.42857142857143, total: 71.42857142857143, dueOn: '2021-02', isLate: true, partial: false },
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-02' },
      { from: 'u1', to: 'u3', amount: 178.57142857142858, total: 178.57142857142858, dueOn: '2021-02', isLate: true, partial: false },
      { from: 'u1', to: 'u3', amount: 178.57142857142858, total: 178.57142857142858, dueOn: '2021-02', isLate: false, partial: false },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 100, total: 100, dueOn: '2021-02', isLate: true, partial: false },
      { amount: 100, from: 'u1', to: 'u2', total: 100, partial: false, isLate: false, dueOn: '2021-02' },
      { from: 'u1', to: 'u3', amount: 150.00000000000003, total: 150.00000000000003, dueOn: '2021-02', isLate: true, partial: false },
      { from: 'u1', to: 'u3', amount: 150.00000000000003, total: 150.00000000000003, dueOn: '2021-02', isLate: false, partial: false },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 78.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: true, isLate: true, dueOn: '2021-02' },
      { amount: 100.00142857142859, from: 'u1', to: 'u3', total: 178.57142857142858, partial: true, isLate: false, dueOn: '2021-02' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-02' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 28.569999999999993, from: 'u1', to: 'u2', total: 100, partial: true, isLate: true, dueOn: '2021-02' },
      { amount: 50.00000000000003, from: 'u1', to: 'u3', total: 150.00000000000003, partial: true, isLate: true, dueOn: '2021-02' },
      { amount: 71.43000000000004, from: 'u1', to: 'u3', total: 150.00000000000003, partial: true, isLate: false, dueOn: '2021-02' },
      { amount: 100, from: 'u1', to: 'u2', total: 100, partial: false, isLate: false, dueOn: '2021-02' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: false, dueOn: '2021-02' }
    ])
  })
  it('Added cypress test - two months later, make sure the first months distributions are gone.', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u3', amount: 100.00142857142859, when: dateAtCyclesPassed(2.01) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: false, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 71.42857142857143, total: 71.42857142857143, dueOn: '2021-02', isLate: true, partial: false },
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: true, dueOn: '2021-03' },
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-03' },
      { from: 'u1', to: 'u3', amount: 178.57142857142858, total: 178.57142857142858, dueOn: '2021-02', isLate: true, partial: false },
      { from: 'u1', to: 'u3', amount: 178.57142857142858, total: 178.57142857142858, dueOn: '2021-03', isLate: true, partial: false },
      { from: 'u1', to: 'u3', amount: 178.57142857142858, total: 178.57142857142858, dueOn: '2021-03', isLate: false, partial: false },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: true, dueOn: '2021-03' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: false, dueOn: '2021-03' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: true, dueOn: '2021-03' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-03' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { from: 'u1', to: 'u2', amount: 100, total: 100, dueOn: '2021-02', isLate: true, partial: false },
      { amount: 100, from: 'u1', to: 'u2', total: 100, partial: false, isLate: true, dueOn: '2021-03' },
      { amount: 100, from: 'u1', to: 'u2', total: 100, partial: false, isLate: false, dueOn: '2021-03' },
      { from: 'u1', to: 'u3', amount: 150.00000000000003, total: 150.00000000000003, dueOn: '2021-02', isLate: true, partial: false },
      { from: 'u1', to: 'u3', amount: 150.00000000000003, total: 150.00000000000003, dueOn: '2021-03', isLate: true, partial: false },
      { from: 'u1', to: 'u3', amount: 150.00000000000003, total: 150.00000000000003, dueOn: '2021-03', isLate: false, partial: false },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: true, dueOn: '2021-03' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: false, dueOn: '2021-03' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: false, mincomeAmount })).eql([
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: true, dueOn: '2021-03' },
      { amount: 71.42857142857143, from: 'u1', to: 'u2', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-03' },
      { amount: 78.57, from: 'u1', to: 'u3', total: 178.57142857142858, partial: true, isLate: false, dueOn: '2021-03' },
      { amount: 78.57142857142858, from: 'u1', to: 'u3', total: 178.57142857142858, partial: true, isLate: true, dueOn: '2021-02' },
      { amount: 100.00142857142859, from: 'u1', to: 'u3', total: 178.57142857142858, partial: true, isLate: true, dueOn: '2021-03' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: true, dueOn: '2021-03' },
      { amount: 28.57142857142857, from: 'u4', to: 'u2', total: 28.57142857142857, partial: false, isLate: false, dueOn: '2021-03' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: true, dueOn: '2021-03' },
      { amount: 71.42857142857143, from: 'u4', to: 'u3', total: 71.42857142857143, partial: false, isLate: false, dueOn: '2021-03' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 28.569999999999993, from: 'u1', to: 'u2', total: 100, partial: true, isLate: true, dueOn: '2021-02' },
      { amount: 49.99857142857144, from: 'u1', to: 'u3', total: 150.00000000000003, partial: true, isLate: false, dueOn: '2021-03' },
      { amount: 50.00000000000003, from: 'u1', to: 'u3', total: 150.00000000000003, partial: true, isLate: true, dueOn: '2021-02' },
      { amount: 71.43000000000004, from: 'u1', to: 'u3', total: 150.00000000000003, partial: true, isLate: true, dueOn: '2021-03' },
      { amount: 100, from: 'u1', to: 'u2', total: 100, partial: false, isLate: true, dueOn: '2021-03' },
      { amount: 100, from: 'u1', to: 'u2', total: 100, partial: false, isLate: false, dueOn: '2021-03' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: true, dueOn: '2021-02' },
      { amount: 100, from: 'u4', to: 'u3', total: 100, partial: false, isLate: true, dueOn: '2021-03' },
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
      { amount: 75.00000000000003, from: 'u1', to: 'u4', total: 75.00000000000003, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 99.99999999999999, from: 'u1', to: 'u6', total: 99.99999999999999, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 199.99999999999997, from: 'u1', to: 'u5', total: 199.99999999999997, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 300, from: 'u2', to: 'u4', total: 300, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 225, from: 'u3', to: 'u4', total: 225, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 75.00000000000003, from: 'u1', to: 'u4', total: 75.00000000000003, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 99.99999999999999, from: 'u1', to: 'u6', total: 99.99999999999999, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 199.99999999999997, from: 'u1', to: 'u5', total: 199.99999999999997, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 300, from: 'u2', to: 'u4', total: 300, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 225, from: 'u3', to: 'u4', total: 225, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u4', amount: 75.00000000000003, when: dateAtCyclesPassed(0.07) } })
    should(groupIncomeDistributionWrapper(setup, { adjusted: false, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 75.00000000000003, from: 'u1', to: 'u4', total: 75.00000000000003, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 99.99999999999999, from: 'u1', to: 'u6', total: 99.99999999999999, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 199.99999999999997, from: 'u1', to: 'u5', total: 199.99999999999997, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 300, from: 'u2', to: 'u4', total: 300, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 225, from: 'u3', to: 'u4', total: 225, partial: false, isLate: false, dueOn: '2021-01' }
    ])
    should(groupIncomeDistributionWrapper(setup, { adjusted: true, minimizeTxns: true, mincomeAmount })).eql([
      { amount: 99.99999999999999, from: 'u1', to: 'u6', total: 99.99999999999999, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 199.99999999999997, from: 'u1', to: 'u5', total: 199.99999999999997, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 300, from: 'u2', to: 'u4', total: 300, partial: false, isLate: false, dueOn: '2021-01' },
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
      { amount: 0.17588817705299944, from: 'user#01', to: 'user#99', total: 0.17588817705299944, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.009504950495049505, from: 'user#02', to: 'user#51', total: 0.009504950495049505, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.6940477577169479, from: 'user#02', to: 'user#96', total: 0.6940477577169479, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.5829935934769945, from: 'user#03', to: 'user#97', total: 1.5829935934769945, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.8142108328479907, from: 'user#04', to: 'user#95', total: 2.8142108328479907, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.06178217821782178, from: 'user#05', to: 'user#51', total: 0.06178217821782178, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.335422248107164, from: 'user#05', to: 'user#99', total: 4.335422248107164, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.33197437390798, from: 'user#06', to: 'user#94', total: 6.33197437390798, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.618520675596978, from: 'user#07', to: 'user#89', total: 8.618520675596978, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.30714036109493303, from: 'user#08', to: 'user#51', total: 0.30714036109493303, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.949702970297032, from: 'user#08', to: 'user#92', total: 10.949702970297032, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.5887478159580664, from: 'user#09', to: 'user#51', total: 0.5887478159580664, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 13.658194525334888, from: 'user#09', to: 'user#91', total: 13.658194525334888, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.23762376237623764, from: 'user#10', to: 'user#51', total: 0.23762376237623764, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 17.351193942923707, from: 'user#10', to: 'user#90', total: 17.351193942923707, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 21.282469423412937, from: 'user#11', to: 'user#80', total: 21.282469423412937, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.0466627839254512, from: 'user#12', to: 'user#52', total: 1.0466627839254512, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.7993011065800624, from: 'user#12', to: 'user#63', total: 2.7993011065800624, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 21.4819336051264, from: 'user#12', to: 'user#88', total: 21.4819336051264, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.766243447874232, from: 'user#13', to: 'user#52', total: 3.766243447874232, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 25.958858474082675, from: 'user#13', to: 'user#87', total: 25.958858474082675, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.5394059405940597, from: 'user#14', to: 'user#51', total: 0.5394059405940597, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 7.488689621800311, from: 'user#14', to: 'user#69', total: 7.488689621800311, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 26.445987139993516, from: 'user#14', to: 'user#84', total: 26.445987139993516, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 39.57483983692485, from: 'user#15', to: 'user#85', total: 39.57483983692485, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.6083168316831683, from: 'user#16', to: 'user#51', total: 0.6083168316831683, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 44.419056493884696, from: 'user#16', to: 'user#81', total: 44.419056493884696, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.7617067092900616, from: 'user#17', to: 'user#67', total: 0.7617067092900616, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.3869306930693068, from: 'user#17', to: 'user#51', total: 1.3869306930693068, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 48.68304576595744, from: 'user#17', to: 'user#83', total: 48.68304576595744, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 56.9877693651718, from: 'user#18', to: 'user#79', total: 56.9877693651718, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 4.786767617938198, from: 'user#19', to: 'user#53', total: 4.786767617938198, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 58.708864298194584, from: 'user#19', to: 'user#84', total: 58.708864298194584, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.169435061154537, from: 'user#20', to: 'user#55', total: 11.169435061154537, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 59.18583576004523, from: 'user#20', to: 'user#94', total: 59.18583576004523, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.474082702387886, from: 'user#21', to: 'user#53', total: 2.474082702387886, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.913383809060681, from: 'user#21', to: 'user#86', total: 11.913383809060681, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 63.179219568924175, from: 'user#21', to: 'user#79', total: 63.179219568924175, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.6663948747816615, from: 'user#22', to: 'user#53', total: 1.6663948747816615, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.8517647058822995, from: 'user#22', to: 'user#57', total: 6.8517647058822995, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 35.51021549222916, from: 'user#22', to: 'user#64', total: 35.51021549222916, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 41.10150262075862, from: 'user#22', to: 'user#89', total: 41.10150262075862, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5.042376228058643, from: 'user#23', to: 'user#98', total: 5.042376228058643, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 88.00246943297803, from: 'user#23', to: 'user#77', total: 88.00246943297803, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.7642632498543973, from: 'user#24', to: 'user#52', total: 2.7642632498543973, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 42.20785081522881, from: 'user#24', to: 'user#72', total: 42.20785081522881, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 56.339475917444474, from: 'user#24', to: 'user#82', total: 56.339475917444474, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.3131741409435065, from: 'user#25', to: 'user#51', total: 1.3131741409435065, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.0558182877116558, from: 'user#25', to: 'user#52', total: 2.0558182877116558, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 34.175513993783134, from: 'user#25', to: 'user#75', total: 34.175513993783134, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 72.38560423568634, from: 'user#25', to: 'user#80', total: 72.38560423568634, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 22.251089108906807, from: 'user#26', to: 'user#62', total: 22.251089108906807, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 47.8210828635302, from: 'user#26', to: 'user#87', total: 47.8210828635302, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 48.82823571539059, from: 'user#26', to: 'user#76', total: 48.82823571539059, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 5.882772277227874, from: 'user#27', to: 'user#62', total: 5.882772277227874, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 29.606256222891876, from: 'user#27', to: 'user#96', total: 29.606256222891876, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 92.73345257151684, from: 'user#27', to: 'user#78', total: 92.73345257151684, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 8.3900757134537, from: 'user#28', to: 'user#51', total: 8.3900757134537, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 37.30548631324629, from: 'user#28', to: 'user#63', total: 37.30548631324629, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 37.833011065904, from: 'user#28', to: 'user#79', total: 37.833011065904, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 54.36775771694755, from: 'user#28', to: 'user#85', total: 54.36775771694755, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 11.196132786879321, from: 'user#29', to: 'user#54', total: 11.196132786879321, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 67.46702388165929, from: 'user#29', to: 'user#88', total: 67.46702388165929, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 69.25880023303387, from: 'user#29', to: 'user#66', total: 69.25880023303387, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 77.20414685852528, from: 'user#30', to: 'user#83', total: 77.20414685852528, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 81.09521248917417, from: 'user#30', to: 'user#72', total: 81.09521248917417, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 9.010786255096257, from: 'user#31', to: 'user#52', total: 9.010786255096257, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 13.628747815958036, from: 'user#31', to: 'user#56', total: 13.628747815958036, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 45.40095364128631, from: 'user#31', to: 'user#81', total: 45.40095364128631, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 100.98805043559183, from: 'user#31', to: 'user#69', total: 100.98805043559183, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.0192726992976695, from: 'user#32', to: 'user#58', total: 1.0192726992976695, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 72.06488723978335, from: 'user#32', to: 'user#82', total: 72.06488723978335, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 107.02533336319041, from: 'user#32', to: 'user#68', total: 107.02533336319041, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 40.30526324752888, from: 'user#33', to: 'user#90', total: 40.30526324752888, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 72.179989864829, from: 'user#33', to: 'user#81', total: 72.179989864829, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 79.05697169835854, from: 'user#33', to: 'user#67', total: 79.05697169835854, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 15.935170349532555, from: 'user#34', to: 'user#62', total: 15.935170349532555, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 29.523259942607844, from: 'user#34', to: 'user#69', total: 29.523259942607844, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 40.112807375517264, from: 'user#34', to: 'user#83', total: 40.112807375517264, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 44.49082752154439, from: 'user#34', to: 'user#71', total: 44.49082752154439, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 73.26466748406526, from: 'user#34', to: 'user#91', total: 73.26466748406526, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 6.980500865812935, from: 'user#35', to: 'user#94', total: 6.980500865812935, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 35.707443214916566, from: 'user#35', to: 'user#70', total: 35.707443214916566, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 42.54359930110755, from: 'user#35', to: 'user#51', total: 42.54359930110755, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 43.18043099487292, from: 'user#35', to: 'user#64', total: 43.18043099487292, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 87.0510425132143, from: 'user#35', to: 'user#88', total: 87.0510425132143, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 46.484963535507994, from: 'user#36', to: 'user#73', total: 46.484963535507994, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 57.64125616901693, from: 'user#36', to: 'user#59', total: 57.64125616901693, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 123.82485775616234, from: 'user#36', to: 'user#100', total: 123.82485775616234, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 20.936843378793952, from: 'user#37', to: 'user#63', total: 20.936843378793952, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 93.94222476332384, from: 'user#37', to: 'user#89', total: 93.94222476332384, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 125.91184624343839, from: 'user#37', to: 'user#74', total: 125.91184624343839, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 49.3093535128979, from: 'user#38', to: 'user#64', total: 49.3093535128979, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 54.18132159235142, from: 'user#38', to: 'user#67', total: 54.18132159235142, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 72.3304595008345, from: 'user#38', to: 'user#84', total: 72.3304595008345, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 78.16139305844737, from: 'user#38', to: 'user#73', total: 78.16139305844737, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.5760457260786573, from: 'user#39', to: 'user#78', total: 0.5760457260786573, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 28.974666636809587, from: 'user#39', to: 'user#68', total: 28.974666636809587, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 52.83443103417383, from: 'user#39', to: 'user#91', total: 52.83443103417383, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 66.33192634090071, from: 'user#39', to: 'user#80', total: 66.33192634090071, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 118.80884755964932, from: 'user#39', to: 'user#92', total: 118.80884755964932, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 15.521125571674368, from: 'user#40', to: 'user#65', total: 15.521125571674368, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 22.227559697145118, from: 'user#40', to: 'user#51', total: 22.227559697145118, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 65.99753056702193, from: 'user#40', to: 'user#77', total: 65.99753056702193, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 79.93096826433276, from: 'user#40', to: 'user#62', total: 79.93096826433276, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 97.74389918462492, from: 'user#40', to: 'user#97', total: 97.74389918462492, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 3.9061739466137873, from: 'user#41', to: 'user#53', total: 3.9061739466137873, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 33.03096575166359, from: 'user#41', to: 'user#82', total: 33.03096575166359, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 51.73335165049441, from: 'user#41', to: 'user#92', total: 51.73335165049441, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 102.70497749223685, from: 'user#41', to: 'user#61', total: 102.70497749223685, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 104.2925567850834, from: 'user#41', to: 'user#70', total: 104.2925567850834, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 54.27902407485131, from: 'user#42', to: 'user#60', total: 54.27902407485131, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 63.128973248042655, from: 'user#42', to: 'user#90', total: 63.128973248042655, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 94.48749481455506, from: 'user#42', to: 'user#65', total: 94.48749481455506, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 98.37125218404198, from: 'user#42', to: 'user#56', total: 98.37125218404198, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 56.801770530001335, from: 'user#43', to: 'user#52', total: 56.801770530001335, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 107.14823529411767, from: 'user#43', to: 'user#57', total: 107.14823529411767, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 161.26723354687687, from: 'user#43', to: 'user#93', total: 161.26723354687687, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 1.2140914333374404, from: 'user#44', to: 'user#76', total: 1.2140914333374404, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 23.78613861386149, from: 'user#44', to: 'user#51', total: 23.78613861386149, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 60.63042569352657, from: 'user#44', to: 'user#100', total: 60.63042569352657, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 62.69050170240454, from: 'user#44', to: 'user#78', total: 62.69050170240454, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 77.21762603077451, from: 'user#44', to: 'user#95', total: 77.21762603077451, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 114.98072730070228, from: 'user#44', to: 'user#58', total: 114.98072730070228, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 36.50473956191313, from: 'user#45', to: 'user#87', total: 36.50473956191313, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 60.35874383098308, from: 'user#45', to: 'user#59', total: 60.35874383098308, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 64.95836920137968, from: 'user#45', to: 'user#63', total: 64.95836920137968, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 95.52114099920246, from: 'user#45', to: 'user#99', total: 95.52114099920246, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 98.83056493884541, from: 'user#45', to: 'user#55', total: 98.83056493884541, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 97.50917247845561, from: 'user#46', to: 'user#71', total: 97.50917247845561, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 115.5016890002339, from: 'user#46', to: 'user#94', total: 115.5016890002339, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 159.16852116545726, from: 'user#46', to: 'user#86', total: 159.16852116545726, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 22.088153756561635, from: 'user#47', to: 'user#74', total: 22.088153756561635, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 28.554455445536647, from: 'user#47', to: 'user#52', total: 28.554455445536647, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50.31219901756304, from: 'user#47', to: 'user#97', total: 50.31219901756304, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 59.2145695615048, from: 'user#47', to: 'user#90', total: 59.2145695615048, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 93.16658085827845, from: 'user#47', to: 'user#53', total: 93.16658085827845, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 135.2010244706311, from: 'user#47', to: 'user#96', total: 135.2010244706311, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.564671091108627, from: 'user#48', to: 'user#82', total: 2.564671091108627, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 10.514689060977393, from: 'user#48', to: 'user#84', total: 10.514689060977393, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 18.510455313971427, from: 'user#48', to: 'user#98', total: 18.510455313971427, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 24.73276645312314, from: 'user#48', to: 'user#93', total: 24.73276645312314, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 34.33775194032056, from: 'user#48', to: 'user#89', total: 34.33775194032056, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 96.80386721312064, from: 'user#48', to: 'user#54', total: 96.80386721312064, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 101.957672851272, from: 'user#48', to: 'user#76', total: 101.957672851272, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 115.82448600621686, from: 'user#48', to: 'user#75', total: 115.82448600621686, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 19.295022507763164, from: 'user#49', to: 'user#61', total: 19.295022507763164, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 19.991379613770537, from: 'user#49', to: 'user#65', total: 19.991379613770537, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 21.35364340604464, from: 'user#49', to: 'user#73', total: 21.35364340604464, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 26.498671548760033, from: 'user#49', to: 'user#96', total: 26.498671548760033, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 42.24270695642602, from: 'user#49', to: 'user#91', total: 42.24270695642602, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 43.18520438850814, from: 'user#49', to: 'user#98', total: 43.18520438850814, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 63.71531910047398, from: 'user#49', to: 'user#87', total: 63.71531910047398, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 76.05740244612758, from: 'user#49', to: 'user#85', total: 76.05740244612758, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 109.96816313637748, from: 'user#49', to: 'user#95', total: 109.96816313637748, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 0.9180950254820672, from: 'user#50', to: 'user#86', total: 0.9180950254820672, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 2.5080978195592216, from: 'user#50', to: 'user#92', total: 2.5080978195592216, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 15.544716550311113, from: 'user#50', to: 'user#100', total: 15.544716550311113, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 20.69693669559701, from: 'user#50', to: 'user#72', total: 20.69693669559701, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 44.36090820433506, from: 'user#50', to: 'user#97', total: 44.36090820433506, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 62.74119976696614, from: 'user#50', to: 'user#66', total: 62.74119976696614, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 65.72097592514868, from: 'user#50', to: 'user#60', total: 65.72097592514868, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 97.96754857563741, from: 'user#50', to: 'user#99', total: 97.96754857563741, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 129.26196406946184, from: 'user#50', to: 'user#98', total: 129.26196406946184, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
})
