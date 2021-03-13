'use strict'
import { saferFloat } from '~/frontend/views/utils/currencies.js'

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
