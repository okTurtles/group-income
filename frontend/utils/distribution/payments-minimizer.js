'use strict'
import { cloneDeep } from '~/frontend/utils/giLodash.js'

type Payment = {| amount: number; total: number; partial: boolean; isLate: boolean; from: string; to: string; dueOn: string; |}

type Distribution = Array<Payment>

function untangleDistribution (distribution, havers, needers) {
  const paymentsByFrom = distribution.reduce((acc, p) => {
    acc[p.from] ? acc[p.from].push(p) : acc[p.from] = [p]
    return acc
  }, {})
  const paymentsByTo = distribution.reduce((acc, p) => {
    acc[p.to] ? acc[p.to].push(p) : acc[p.to] = [p]
    return acc
  }, {})
  for (const haver of havers) {
    const outgoing = paymentsByFrom[haver.name]
    if (outgoing) {
      for (const paymentfrom of outgoing) {
        const needer = paymentfrom.to
        for (const otherNeeder of needers) {
          if (needer !== otherNeeder.name) {
            const incoming = paymentsByTo[otherNeeder.name]
            if (incoming) {
              const filteredByFrom = incoming.filter((p) => p.dueOn === paymentfrom.dueOn)
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
  }
}

// This algorithm is responsible for "balancing" payments
// such that the least number of payments are made without
// changing the amount paid to and received by each member.
function minimizeTotalPaymentsCount (distribution: Distribution, groupMembers: Array<Object>): Distribution {
  distribution = cloneDeep(distribution)

  const havers = groupMembers.filter((m) => m.haveNeed > 0).sort((a, b) => a.haveNeed - b.haveNeed)
  const needers = groupMembers.filter((m) => m.haveNeed < 0).sort((a, b) => a.haveNeed - b.haveNeed)

  const maxGroupSize = Math.max(havers.length, needers.length)

  // You can think of this algorithm as a method of untangling
  // a closed-loop of string; you don't try to untangle the
  // entire string at once: instead you untangle it in larger
  // and larger sections, and eventually it comes undone.
  for (let subdivisions = 2; subdivisions <= maxGroupSize; subdivisions++) {
    const subHavers = [] // Stores the havers into group sizes of subdivisions
    const subNeeders = [] // Stores the needers into group sizes of subdivisions

    const maxSubHavers = Math.ceil(havers.length / subdivisions)
    for (let step = 0; step < maxSubHavers; step++) {
      const subArray = havers.slice(step * subdivisions, Math.min((step + 1) * subdivisions, havers.length))
      subHavers.push(subArray)
    }

    const maxSubNeeders = Math.ceil(needers.length / subdivisions)
    for (let step = 0; step < maxSubNeeders; step++) {
      const subArray = needers.slice(step * subdivisions, Math.min((step + 1) * subdivisions, needers.length))
      subNeeders.push(subArray)
    }
    const maxGroupCount = Math.max(subHavers.length, subNeeders.length)
    // Divide & conquer the problem:
    for (let group = 0; group < maxGroupCount; group++) {
      const subHaves = subHavers[group % subHavers.length]
      const subNeeds = subNeeders[group % subNeeders.length]

      function filterIrrelivant (payment) {
        return subHaves.find((haver) => haver.name === payment.from) &&
          subNeeds.find((needer) => needer.name === payment.to)
      }

      const minimizable = distribution.filter((payment) => filterIrrelivant(payment))
      untangleDistribution(minimizable, subHaves, subNeeds)

      // WITHOUT this line: we get no boosts in computational efficiency
      // in the final conquering call of untangleDistribution.
      distribution = distribution.filter((payment) => payment.amount > 0)
    }
  }
  untangleDistribution(distribution, havers, needers)
  distribution = distribution.filter((payment) => payment.amount > 0)
  return distribution
}

export default minimizeTotalPaymentsCount
