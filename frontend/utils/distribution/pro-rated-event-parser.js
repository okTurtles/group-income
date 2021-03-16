'use strict'
import { saferFloat } from '~/frontend/views/utils/currencies.js'

// This helper function inserts monthly-balance-events into the
// distributionEvents parameter/list, up intil the month specified, so
// that every month can be pro-rated.
// function insertMonthlyBalanceEvents (distributionEvents: Array<Object>, monthstamp: string) {
//   const newEvents = []
//   let lastEvent = null
//   for (const event of distributionEvents) {
//     // TODO: add monthly-balance event to newEvents.
//     // if (lastEvent && Math.floor(lastEvent.data.cycle) > Math.floor(toCycle(monthstamp))) {}
//     newEvents.push(event)
//     lastEvent = event
//   }
//   return newEvents
// }

// TODO: this algorithm will be responsible for calculating the
// pro-rated distribution of payments (with respect to the cycle
// value of each event).
function parseProRatedDistributionFromEvents (distributionEvents: Array<Object>, minCome: number, monthstamp: string): Array<any | {|name: string, amount: number|}> {
  const incomeDistribution = [] // insertMonthlyBalanceEvents(distributionEvents, monthstamp)
  for (const event of distributionEvents) {
    if (event.type === 'incomeDeclaredEvent') {
      const amount = minCome + event.data.income
      incomeDistribution.push({
        name: event.data.name,
        amount: saferFloat(amount)
      })
    }
  }
  return incomeDistribution
}

export default parseProRatedDistributionFromEvents
