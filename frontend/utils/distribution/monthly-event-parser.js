'use strict'
import { saferFloat } from '~/frontend/views/utils/currencies.js'

// TODO: this algorithm will be responsible for calculating the
// okTurtles R&D team's assume-friendly-relationships distribution of payments. The pseudocode of the
// requested algorithm is as follows:
/*
loop (event in events) {
   ({
      payment ({ data }) {
       // psudocode
       subtract data.amount from distributionTODO where user = data.from
     },
      leaveGroup ({ data }) {
        // psuedocode
        remove data (the user who left) from either the haves or the needs
        next adjust the haves (or the needs) to reflect our adjusted distributionTODO
        distributionTODO = mincomeProprotionalAlgo(adjustedDistribution(haves, needs, distributionTODO))
      },
      // likely similar/identical function for joinGroup event
   })[event.type](event)
}
return distributionTODO
*/
function parseMonthlyDistributionFromEvents (distributionEvents: Array<Object>, minCome: number): Array<any | {|name: string, amount: number|}> {
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

export default parseMonthlyDistributionFromEvents
