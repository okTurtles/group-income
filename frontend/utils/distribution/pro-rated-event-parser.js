'use strict'
import { saferFloat } from '~/frontend/views/utils/currencies.js'

// TODO: this algorithm will be responsible for calculating the
// pro-rated distribution of payments (with respect to the cycle
// value of each event).
function parseProRatedDistributionFromEvents (distributionEvents: Array<Object>, minCome: number): Array<any | {|name: string, amount: number|}> {
  const incomeDistribution = []
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
