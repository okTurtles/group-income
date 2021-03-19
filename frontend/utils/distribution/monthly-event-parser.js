'use strict'
import { saferFloat } from '~/frontend/views/utils/currencies.js'
import incomeDistribution from '~/frontend/utils/distribution/mincome-proportional.js'

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
function parseMonthlyDistributionFromEvents (distributionEvents: Array<Object>, minCome: number): Array<any | {|from: string, to: string, amount: number|}> {
  let groupMembers = []
  for (const event of distributionEvents) {
    if (event.type === 'incomeDeclaredEvent') {
      const amount = minCome + event.data.income
      groupMembers.push({
        name: event.data.name,
        amount: saferFloat(amount)
      })
    } else if (event.type === 'paymentEvent') {
      const amount = event.data.amount
      const from = event.data.from
      for (const member of groupMembers) {
        if (member.name === from) {
          member.amount -= amount
        }
      }
    } else if (event.type === 'leaveEvent') {
      groupMembers = groupMembers.filter((e) => e.name !== event.name)
      // TODO: discuss the ambiguities of the given pseudocode for this case.
    }
  }
  return incomeDistribution(groupMembers, minCome)
}

export default parseMonthlyDistributionFromEvents
