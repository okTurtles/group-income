'use strict'
import { cloneDeep } from '~/frontend/utils/giLodash.js'

type Payment = {| amount: number; total: number; partial: boolean; isLate: boolean; from: string; to: string; dueOn: string; |}

type Distribution = Array<Payment>;

function untangleDistribution (distribution, havers, needers) {
  for (const haver of havers) {
    const outgoing = distribution.filter((p) => p.from === haver.name)
    for (const paymentfrom of outgoing) {
      const needer = paymentfrom.to
      for (const otherNeeder of needers) {
        if (needer !== otherNeeder.name) {
          const incoming = distribution.filter((p) => p.to === otherNeeder.name)
          const filteredByFrom = incoming.filter((p) => p.from === haver.name && p.dueOn === paymentfrom.dueOn)
          if (filteredByFrom.length === 1) {
            const crossOver = filteredByFrom[0]
            for (const paymentTo of incoming) {
              const otherHaver = paymentTo.from
              if (haver.name !== otherHaver && paymentfrom.dueOn === paymentTo.dueOn) {
                const otherHaverPayments = distribution.filter((p) => otherHaver === p.from)
                for (const otherFrom of otherHaverPayments) {
                  if (needer === otherFrom.to && paymentTo.dueOn === otherFrom.dueOn) {
                    const maxCriss = Math.min(paymentfrom.amount, paymentTo.amount)
                    const maxCross = Math.min(otherFrom.amount, crossOver.amount)
                    const maxAmount = Math.min(maxCriss, maxCross)

                    paymentfrom.amount += maxAmount
                    paymentfrom.total += maxAmount
                    paymentTo.amount += maxAmount
                    paymentTo.total += maxAmount

                    otherFrom.amount -= maxAmount
                    otherFrom.total -= maxAmount
                    crossOver.amount -= maxAmount
                    crossOver.total -= maxAmount
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

// TODO: this algorithm will be responsible for "balancing" payments
// such that the least number of payments are made.
function minimizeTotalPaymentsCount (distribution: Distribution, groupMembers: Array<Object>): Distribution {
  distribution = cloneDeep(distribution)
  const havers = groupMembers.filter((m) => m.haveNeed > 0).sort((a, b) => a.haveNeed - b.haveNeed)
  const needers = groupMembers.filter((m) => m.haveNeed < 0).sort((a, b) => a.haveNeed - b.haveNeed)
  untangleDistribution(distribution, havers, needers)
  return distribution
}

export default minimizeTotalPaymentsCount
