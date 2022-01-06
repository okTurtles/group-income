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

// This algorithm is responsible for "balancing" payments
// such that the least number of payments are made without
// changing the amount paid to and received by each member.
function minimizeTotalPaymentsCount (distribution: Distribution, groupMembers: Array<Object>): Distribution {
  distribution = cloneDeep(distribution)

  let havers = groupMembers.filter((m) => m.haveNeed > 0).sort((a, b) => a.haveNeed - b.haveNeed)
  let needers = groupMembers.filter((m) => m.haveNeed < 0).sort((a, b) => a.haveNeed - b.haveNeed)

  const tangledHavers = []
  const tangledNeeders = []

  havers.forEach((haver, index) => (index % 2) ? tangledHavers.push(haver) : tangledHavers.unshift(haver))
  needers.forEach((needer, index) => (index % 2) ? tangledNeeders.push(needer) : tangledNeeders.unshift(needer))

  havers = tangledHavers
  needers = tangledNeeders

  // You can think of this algorithm as a method of untangling
  // a closed-loop on string; you don't try to untangle the
  // entire string at once: instead you untangle it in larger
  // and larger sections, and eventually it comes undone.

  // Set the maximum number of knots we will untangle at a time.
  const maxKnot = Math.min(10, Math.min(havers.length, needers.length))

  const subHavers = [] // Stores the havers into group sizes of maxKnot
  const subNeeders = [] // Stores the needers into group sizes of maxKnot

  const maxSubHavers = Math.ceil(havers.length / maxKnot)
  for (let step = 0; step < maxSubHavers; step++) {
    const subArray = havers.slice(step * maxKnot, Math.min((step + 1) * maxKnot, havers.length))
    subHavers.push(subArray)
  }

  const maxSubNeeders = Math.ceil(needers.length / maxKnot)
  for (let step = 0; step < maxSubNeeders; step++) {
    const subArray = needers.slice(step * maxKnot, Math.min((step + 1) * maxKnot, needers.length))
    subNeeders.push(subArray)
  }

  // Divide & conquer the problem:
  for (let haverGroup = 0; haverGroup < maxSubHavers; haverGroup++) {
    for (let neederGroup = 0; neederGroup < maxSubNeeders; neederGroup++) {
      const subHaves = subHavers[haverGroup]
      const subNeeds = subNeeders[neederGroup]

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

  untangleDistribution(distribution, havers, needers) // Conquer
  return distribution
}

export default minimizeTotalPaymentsCount
