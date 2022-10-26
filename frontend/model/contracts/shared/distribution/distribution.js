'use strict'

import mincomeProportional from './mincome-proportional.js'
import minimizeTotalPaymentsCount from './payments-minimizer.js'
import { cloneDeep } from '../giLodash.js'
import { saferFloat, DECIMALS_MAX } from '../currencies.js'

/*::
type Distribution = Array<Object>;
*/

const tinyNum = 1 / Math.pow(10, DECIMALS_MAX)

export function unadjustedDistribution ({ haveNeeds = [], minimize = true } /*: {
  haveNeeds: Array<Object>, minimize?: boolean
} */) /*: Distribution */ {
  const distribution = mincomeProportional(haveNeeds)
  return minimize ? minimizeTotalPaymentsCount(distribution) : distribution
}

export function adjustedDistribution (
  { distribution, payments, dueOn } /*: { distribution: Distribution, payments: Distribution, dueOn: string } */
) /*: Distribution */ {
  distribution = cloneDeep(distribution)
  // ensure the total is set because of how reduceDistribution works
  for (const todo of distribution) {
    todo.total = todo.amount
  }
  distribution = subtractDistributions(distribution, payments)
    // remove any todos for containing miniscule amounts
    // and pledgers who switched sides should have their todos removed
    .filter(todo => todo.amount >= tinyNum)
  for (const todo of distribution) {
    todo.amount = saferFloat(todo.amount)
    todo.total = saferFloat(todo.total)
    todo.partial = todo.total !== todo.amount
    todo.isLate = false
    todo.dueOn = dueOn
  }
  // TODO: add in latePayments to the end of the distribution
  //       consider passing in latePayments
  return distribution
}

// Merges multiple payments between any combinations two of users:
function reduceDistribution (payments /*: Distribution */) /*: Distribution */ {
  // Don't modify the payments list/object parameter in-place, as this is not intended:
  payments = cloneDeep(payments)
  for (let i = 0; i < payments.length; i++) {
    const paymentA = payments[i]
    for (let j = i + 1; j < payments.length; j++) {
      const paymentB = payments[j]

      // Were paymentA and paymentB between the same two users?
      if ((paymentA.from === paymentB.from && paymentA.to === paymentB.to) ||
        (paymentA.to === paymentB.from && paymentA.from === paymentB.to)) {
        // Add or subtract paymentB's amount to paymentA's amount, depending on the relative
        // direction of the two payments:
        paymentA.amount += (paymentA.from === paymentB.from ? 1 : -1) * paymentB.amount
        paymentA.total += (paymentA.from === paymentB.from ? 1 : -1) * paymentB.total
        // Remove paymentB from payments, and decrement the inner sentinal loop variable:
        payments.splice(j, 1)
        j--
      }
    }
  }
  return payments
}

function addDistributions (paymentsA /*: Distribution */, paymentsB /*: Distribution */) /*: Distribution */ {
  return reduceDistribution([...paymentsA, ...paymentsB])
}

function subtractDistributions (paymentsA /*: Distribution */, paymentsB /*: Distribution */) /*: Distribution */ {
  // Don't modify any payment list/objects parameters in-place, as this is not intended:
  paymentsB = cloneDeep(paymentsB)
  // Reverse the sign of the second operand's amounts so that the final addition is actually subtraction:
  for (const p of paymentsB) {
    p.amount *= -1
    p.total *= -1
  }
  return addDistributions(paymentsA, paymentsB)
}
