'use strict'
import mincomeProportional from '~/frontend/utils/distribution/mincome-proportional.js'
import { lastDayOfMonth, dateFromMonthstamp, dateToMonthstamp } from '~/frontend/utils/time.js'
import { cloneDeep } from '~/frontend/utils/giLodash.js'

type Payment = {| amount: number; total: number; partial: boolean; isLate: boolean; from: string; to: string; dueOn: string; |}

type Distribution = Array<Payment>;

// Merges multiple payments between any combinations two of users:
function reduceDistribution (payments: Distribution): Distribution {
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

function addDistributions (paymentsA: Distribution, paymentsB: Distribution): Distribution {
  return reduceDistribution([...paymentsA, ...paymentsB])
}

function subtractDistributions (paymentsA: Distribution, paymentsB: Distribution): Distribution {
  // Don't modify any payment list/objects parameters in-place, as this is not intended:
  paymentsB = cloneDeep(paymentsB)
  // Reverse the sign of the second operand's amounts so that the final addition is actually subtraction:
  for (const p of paymentsB) {
    p.amount *= -1
    p.total *= -1
  }
  return addDistributions(paymentsA, paymentsB)
}

function scaleDistribution (groupMembers, payments, distribution) {
  const havers = groupMembers.filter(m => m.haveNeed > 0)
  for (const haver of havers) {
    const paymentsFrom = payments.filter(p => p.from === haver.name)
    const totalPaidFrom = paymentsFrom.reduce((a, p) => a + p.amount, 0)
    const distributionFrom = distribution.filter(p => p.from === haver.name)
    const totalDistFrom = distributionFrom.reduce((a, p) => a + p.amount, 0)
    const scalar = Math.max((totalDistFrom) / (haver.haveNeed - totalPaidFrom), 1)
    for (const todo of distribution) {
      if (todo.from === haver.name) {
        todo.amount /= scalar
        todo.total /= scalar
      }
    }
  }
  return distribution
}

// This algorithm is responsible for calculating the monthly-rated distribution of
// payments.
function parsedistributionFromEvents (
  distributionEvents: Distribution,
  mincome: number,
  adjusted: boolean,
  latePayments?: Array<Object>
): Distribution {
  distributionEvents = cloneDeep(distributionEvents)

  const groupMembers = []
  const payments = []
  let distribution = []

  // Convenience function for retreiving a user by name:
  const getUser = name => groupMembers.find(member => member.name === name)

  const eventHandlers = {
    haveNeedEvent (event) {
      const oldUser = getUser(event.data.name)
      if (oldUser) {
        oldUser.haveNeed = event.data.haveNeed
      } else {
        groupMembers.push({
          name: event.data.name,
          haveNeed: event.data.haveNeed
        })
      }
    },
    paymentEvent (event) {
      payments.push({
        from: event.data.from,
        to: event.data.to,
        amount: event.data.amount,
        total: 0,
        dueOn: '',
        isLate: false,
        partial: false
      })
    },
    userExitsGroupEvent (event) {
      const idx = groupMembers.findIndex(v => v.name === event.data.name)
      if (idx === -1) throw new Error(`userExitsGroupEvent: no such user: ${event.data.name}`)
      groupMembers.splice(idx, 1)
    }
    // TODO: if we decide to handle latePayments as part of the distribution
    //       events, then add a dummy function here that does nothing for latePaymentEvents
    //       and handle the events separately down below (see other TODO at end of function)
  }

  // handle all events, filling out payments and groupMembers arrays
  for (const event of distributionEvents) {
    eventHandlers[event.type](event)
  }

  distribution = mincomeProportional(
    groupMembers.map(user => ({ name: user.name, amount: mincome + user.haveNeed })),
    mincome
  )

  if (!adjusted) return distribution

  // begin adjusted algorithm
  for (const payment of distribution) {
    payment.total = payment.amount
  }

  distribution = subtractDistributions(distribution, payments).filter(todo => todo.amount > 0)
  // necessary for 'Adjusted 100h2x 100n3x w/payment' test case
  distribution = scaleDistribution(groupMembers, payments, distribution)

  const overDistribution = []
  let overageExists = false

  // loop through all the needers
  const needers = groupMembers.filter(m => m.haveNeed < 0)
  // console.log({ distribution, needers })

  for (const needer of needers) {
    // calculate amount being sent to needer
    const incomingPayments = distribution.filter(p => p.to === needer.name)
    const existingPayments = payments.filter(p => p.to === needer.name)
    const totalToNeeder = incomingPayments.reduce((a, p) => a + p.amount, 0)
    const totalReceived = existingPayments.reduce((a, p) => a + p.amount, 0)
    // find out what current adjusted needer haveNeed is
    const adjustedNeed = Math.abs(needer.haveNeed) - totalReceived
    // if the amount being sent is greater than the adjustedNeed
    // we must redistribute the excess to the other needers who don't
    // have enough
    // console.log({ needer, payments, incomingPayments, adjustedNeed, totalToNeeder, totalReceived })
    if (totalToNeeder > adjustedNeed) {
      // loop through the payments being sent to needer
      // propertionally reduce them so that totalToNeeder = adjustedNeed
      // call the difference "overpayment", and send that to whoever needs it
      // while making sure that no new overpayments are created
      const overpayment = totalToNeeder - adjustedNeed
      overageExists = true
      // console.log({ overpayment, needer })

      for (const todo of distribution) {
        if (todo.to === needer.name) {
          const proportionOver = overpayment * todo.amount / totalToNeeder
          // console.log('subtracting', proportionOver, `from: ($${todo.amount}) ${todo.from} => ${needer.name}`)
          todo.amount -= proportionOver
          todo.total -= proportionOver
          overDistribution.push({
            name: todo.from,
            amount: proportionOver
          })
        }
      }
    } else {
      // in this case we're dealing with a needer who does NOT have an overage
      // so we add them to our overDistribution as a needer
      overDistribution.push({
        name: needer.name,
        amount: -(adjustedNeed - totalToNeeder)
      })
    }
  }

  if (overageExists) {
    const adjustOverpayDistribution = mincomeProportional(overDistribution, 0).map(p => {
      p.total = p.amount
      return p
    })
    // console.log({ distribution, overDistribution, adjustOverpayDistribution })
    distribution = addDistributions(distribution, adjustOverpayDistribution).filter(p => p.amount > 0)
  }

  const dueDate = dateToMonthstamp(lastDayOfMonth(dateFromMonthstamp(dateToMonthstamp(distributionEvents[distributionEvents.length - 1].data.when))))

  distribution = distribution.map((payment) => {
    payment.partial = (payment.total !== payment.amount)
    payment.isLate = false
    payment.dueOn = dueDate
    return payment
  })

  // TODO: add in latePayments to the end of the distribution
  //       consider passing in latePayments through distributionEvents
  //       instead of as a separate option, and simply do the event handler
  //       for it down here instead of up above.

  return distribution
}

export default parsedistributionFromEvents
