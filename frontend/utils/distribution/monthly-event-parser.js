'use strict'
import incomeDistribution from '~/frontend/utils/distribution/mincome-proportional.js'
import { lastDayOfMonth, dateFromMonthstamp, dateToMonthstamp, addMonthsToDate } from '~/frontend/utils/time.js'
import minimizeTotalPaymentsCount from '~/frontend/utils/distribution/payments-minimizer.js'
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
        payments = payments.filter((payment) => payment !== paymentB)
        j--
      }
    }
  }
  return payments
}

// DRYing function meant for accumulating late payments from a previous cycle
function addDistributions (paymentsA: Distribution, paymentsB: Distribution): Distribution {
  return reduceDistribution([...paymentsA, ...paymentsB])
}

// DRYing function meant for chipping away a cycle's todoPayments distribution using that cycle's payments:
function subtractDistributions (paymentsA: Distribution, paymentsB: Distribution): Distribution {
  // Don't modify any payment list/objects parameters in-place, as this is not intended:
  paymentsB = cloneDeep(paymentsB)

  // Reverse the sign of the second operand's amounts so that the final addition is actually subtraction:
  paymentsB = paymentsB.map((p) => {
    p.amount *= -1
    p.total *= -1
    return p
  })

  return addDistributions(paymentsA, paymentsB)
}

// This algorithm is responsible for calculating the monthly-rated distribution of
// payments.
function parsedistributionFromEvents (distributionEvents: Distribution, minCome: number, adjusted: Boolean, minimizeTxns: Boolean): Distribution {
  distributionEvents = cloneDeep(distributionEvents)

  // The following list variable is for DRYing out our calculations of the each cycle's final
  // income distributions.
  let groupMembers = []

  // Convenience function for retreiving a user by name:
  const getUser = name => groupMembers.find(member => member.name === name)

  const forgivemory = [] // Forgiven late payments, and forgotten over payments
  const attentionSpan = 2 // Number of cycles (or months) of 'forgivemory'

  // Make a place to store this and preceding cycles' startCycleEvent (where over/under-payments are stored)
  // so that they can be included in the next cycle's payment distribution calculations:
  let cycleEvents = []
  let distribution = [] // For each cycle's monthly distribution calculation
  let payments = [] // For accumulating the payment events of each month's cycle.

  // Temporarily forgets what a specific user inteded to pledge when their income details change to needing.
  const forgiveWithFilter = (filter) => {
    forgivemory.forEach((memory, index) => {
      memory.payments = memory.payments.concat(cycleEvents[index].data.payments.filter(filter))
      memory.distribution = memory.distribution.concat(cycleEvents[index].data.distribution.filter(filter))
    })
    cycleEvents = cycleEvents.map((cycleEvent) => ({
      data: {
        when: cycleEvent.data.when,
        payments: cycleEvent.data.payments.filter((o) => !filter(o)),
        distribution: cycleEvent.data.distribution.filter((o) => !filter(o))
      }
    })
    )
  }

  // Remember what a specific user was supposed to pay when their income details change to having.
  const rememberWithFilter = (filter) => {
    cycleEvents = cycleEvents.map((cycleEvent, index) => ({
      data: {
        when: cycleEvent.data.when,
        payments: cycleEvent.data.payments.concat(forgivemory[index].payments.filter((o) => filter(o))),
        distribution: cycleEvent.data.distribution.concat(forgivemory[index].distribution.filter((o) => filter(o)))
      }
    }))
    forgivemory.forEach((memory, index) => {
      memory.payments = memory.payments.filter((o) => !filter(o))
      memory.distribution = memory.distribution.filter((o) => !filter(o))
    })
  }

  // Create a helper function that forgives income/leave/join events, without forgetting them
  // (for up to attentionSpan number of cycles):
  const forgiveWithoutForget = (member, fromSwitching, restoreAlso) => {
    const fromFilter = (payment) => payment.from !== member.name
    const toFilter = (payment) => payment.to !== member.name
    if ((member.haveNeed < 0 && fromSwitching) || (member.haveNeed > 0 && !fromSwitching)) {
      forgiveWithFilter(fromFilter) // Move payments FROM USER to forgivemory
      if (restoreAlso) {
        rememberWithFilter(toFilter) // Restore payments TO USER from forgivemory:
      }
    } else if ((member.haveNeed > 0 && fromSwitching) || (member.haveNeed < 0 && !fromSwitching)) {
      forgiveWithFilter(toFilter) // Move payments TO USER to forgivemory:
      if (restoreAlso) {
        rememberWithFilter(fromFilter) // Restore payments FROM USER from forgivemory:
      }
    }
  }

  // Create a helper function for calculating each cycle's payment distribution:
  const paymentsDistribution = function (groupMembers, minCome): Distribution {
    const groupIncomes = groupMembers.map((user) => {
      return {
        name: user.name,
        amount: minCome + user.haveNeed
      }
    })
    const preMinimized = incomeDistribution(groupIncomes, minCome)
    return minimizeTxns ? minimizeTotalPaymentsCount(preMinimized, groupMembers) : preMinimized
  }

  // Create a helper function for handling each startCycleEvent:
  const handleCycleEvent = (event) => {
    distribution = paymentsDistribution(groupMembers, minCome).map((payment) => {
      payment.total = payment.amount
      return payment
    })

    if (adjusted) {
      distribution = subtractDistributions(distribution, payments)
    }

    distribution.forEach((v) => {
      v.partial = (v.total !== v.amount)
    })
    const eventCopy = cloneDeep(event)
    eventCopy.data.payments = cloneDeep(payments)
    eventCopy.data.distribution = cloneDeep(distribution)
    cycleEvents.push(eventCopy)

    forgivemory.unshift({
      payments,
      distribution
    })

    payments = []
    distribution = []
  }

  const handleIncomeEvent = (event) => {
    const oldUser = getUser(event.data.name)
    if (oldUser) {
      const switched = Math.sign(oldUser.haveNeed) !== Math.sign(event.data.haveNeed)
      oldUser.haveNeed = event.data.haveNeed
      if (switched) forgiveWithoutForget(oldUser, true, true)
    } else {
      // Add the user who declared their income to our groupMembers list variable
      groupMembers.push({
        name: event.data.name,
        haveNeed: event.data.haveNeed
      })
      forgiveWithoutForget(event.data, false, false)
    }
  }

  const handlePaymentEvent = (event) => {
    payments.push({
      from: event.data.from,
      to: event.data.to,
      amount: event.data.amount,
      total: 0,
      dueOn: '',
      isLate: false,
      partial: false
    })
  }

  const handleExitEvent = (event) => {
    forgiveWithoutForget(event.data, false, false)
    groupMembers = groupMembers.filter((v) => { return v.name !== event.data.name })
  }
  // Loop through the events, pro-rating each user's monthly pledges/needs:
  distributionEvents.forEach((event) => {
    if (event.type === 'startCycleEvent') {
      handleCycleEvent(event)
    } else if (event.type === 'haveNeedEvent') {
      handleIncomeEvent(event)
    } else if (event.type === 'paymentEvent') {
      handlePaymentEvent(event)
    } else if (event.type === 'userExitsGroupEvent') {
      handleExitEvent(event)
    }
  })

  while (forgivemory.length > attentionSpan) forgivemory.pop()
  while (cycleEvents.length > attentionSpan) cycleEvents.shift()

  distribution = paymentsDistribution(groupMembers, minCome).map((payment) => {
    payment.total = payment.amount
    return payment
  })

  if (adjusted) {
    distribution = subtractDistributions(distribution, payments)
  }

  distribution.forEach((v) => {
    v.partial = (v.total !== v.amount)
  })

  if (distributionEvents.length > 0) {
    const lastEvent = distributionEvents[distributionEvents.length - 1]
    const cycle = {
      data: {
        when: lastEvent.type === 'startCycleEvent' ? dateToMonthstamp(addMonthsToDate(lastEvent.data.when, 1)) : lastEvent.data.when,
        payments,
        distribution
      }
    }
    cycleEvents.push(cycle)

    forgivemory.unshift({
      payments,
      distribution
    })
  }

  const finalOverPayments = []
  let overPayments = []
  cycleEvents.forEach((startCycleEvent, cycleIndex) => {
    // "Overpayments sometimes occur *internally* as a result of people leaving, joining, and (re-)setting income.
    // This routine is to redistribute the overpayments back into the current late payments so nobody in need is asked to pay.
    const over = cloneDeep(startCycleEvent.data.distribution).filter((p) => {
      return p.amount < 0
    }).map((p) => {
      p.amount = Math.abs(p.amount)
      p.total = Math.abs(p.total)

      return p
    })
    overPayments = cloneDeep(over)
    finalOverPayments.push(overPayments)
  })

  distribution = cycleEvents.reverse().map((startCycleEvent, cycleIndex) => {
    const previousDistribution = cycleIndex + 1 < cycleEvents.length ? finalOverPayments[cycleIndex + 1] : []

    startCycleEvent.data.distribution = subtractDistributions(startCycleEvent.data.distribution, previousDistribution)

    if (!adjusted) {
      startCycleEvent.data.distribution = addDistributions(startCycleEvent.data.payments, startCycleEvent.data.distribution)
    }
    return startCycleEvent.data.distribution.map((payment) => {
      payment.amount = Math.min(payment.amount, payment.total)
      payment.isLate = cycleIndex > 0
      payment.partial = payment.partial ? payment.partial : false
      payment.dueOn = dateToMonthstamp(lastDayOfMonth(dateFromMonthstamp(dateToMonthstamp(new Date(startCycleEvent.data.when)))))
      return payment
    })
  }).reverse().flat()

  return distribution.filter((payment) => {
    return payment.from !== payment.to // This happens when a haver switches to being a needer; remove neutral distribution payments.
  })
}

export default parsedistributionFromEvents
