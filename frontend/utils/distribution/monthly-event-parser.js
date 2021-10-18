'use strict'
import incomeDistribution from '~/frontend/utils/distribution/mincome-proportional.js'
import { lastDayOfMonth, dateFromMonthstamp, dateToMonthstamp, prevMonthstamp } from '~/frontend/utils/time.js'

function simpleCopy (variable) {
  return JSON.parse(JSON.stringify(variable))
}

// Merges multiple payments between any combinations two of users:
function reduceDistribution (payments: Array<Object>): Array<Object> {
  // Don't modify the payments list/object parameter in-place, as this is not intended:
  payments = simpleCopy(payments)
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
function addDistributions (paymentsA: Array<Object>, paymentsB: Array<Object>): Array<Object> {
  return reduceDistribution([paymentsA, paymentsB].flat())
}

// DRYing function meant for chipping away a cycle's todoPayments distribution using that cycle's completedMonthlyPayments:
function subtractDistributions (paymentsA: Array<Object>, paymentsB: Array<Object>): Array<Object> {
  // Don't modify any payment list/objects parameters in-place, as this is not intended:
  paymentsB = simpleCopy(paymentsB)

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
function parseMonthlyDistributionFromEvents (distributionEvents: Array<Object>, minCome: number, adjusted: Boolean): Array<Object> {
  distributionEvents = simpleCopy(distributionEvents)

  // The following list variable is for DRYing out our calculations of the each cycle's final
  // income distributions.
  let groupMembers = []

  // Convenience function for retreiving a user by name:
  const getUser = name => groupMembers.find(member => member.name === name)

  // Make a place to store this and the previous cycle's startCycleEvent (where over/under-payments are stored)
  // so that they can be included in the next cycle's payment distribution calculations:
  let startCycleEvent = { data: { monthlyDistribution: [], completedPayments: [] } }
  let lastStartCycleEvent = simpleCopy(startCycleEvent)
  let monthlyDistribution = [] // For each cycle's monthly distribution calculation
  let completedMonthlyPayments = [] // For accumulating the payment events of each month's cycle.

  const redistributeOverPayments = function (overPayments) {
    const adjustingPayments = []
    const needers = groupMembers.filter((m) => m.haveNeed < 0)
    const havers = groupMembers.filter((m) => m.haveNeed > 0)
    for (const overPayment of overPayments) {
      const totalNeedByOthers = needers.reduce((acc, m) => m.name !== overPayment.to ? acc - m.haveNeed : 0, 0)
      for (const needer of needers) {
        const adjustment = JSON.parse(JSON.stringify(overPayment))
        adjustment.from = overPayment.from
        adjustment.to = needer.name
        if (needer.name !== overPayment.to) {
          adjustment.amount = -overPayment.amount * needer.haveNeed / totalNeedByOthers
          adjustment.total = -overPayment.total * needer.haveNeed / totalNeedByOthers
        } else {
          adjustment.amount = -overPayment.amount
          adjustment.total = -overPayment.total
        }
        adjustingPayments.push(adjustment)
      }
      const totalPledgedByOthers = havers.reduce((acc, m) => m.name !== overPayment.from ? acc + m.haveNeed : 0, 0)
      for (const haver of havers) {
        const adjustment = JSON.parse(JSON.stringify(overPayment))
        adjustment.from = overPayment.to
        adjustment.to = haver.name
        if (haver.name !== overPayment.from) {
          adjustment.amount = overPayment.amount * haver.haveNeed / totalPledgedByOthers
          adjustment.total = overPayment.total * haver.haveNeed / totalPledgedByOthers
        } else {
          adjustment.amount = overPayment.amount
          adjustment.total = overPayment.total
        }
        adjustingPayments.push(adjustment)
      }
    }
    return adjustingPayments
  }

  // Create a helper function for calculating each cycle's payment distribution:
  const paymentsDistribution = function (groupMembers, minCome) {
    const groupIncomes = groupMembers.map((user) => {
      return {
        name: user.name,
        amount: minCome + user.haveNeed
      }
    })
    return incomeDistribution(groupIncomes, minCome)
  }

  const forgivemory = {
    monthlyDistribution: [],
    lastMonthlyDistribution: [],
    monthlyPayments: [],
    lastMonthlyPayments: []
  }

  const handleCycleEvent = (event) => {
    lastStartCycleEvent = simpleCopy(startCycleEvent)
    monthlyDistribution = paymentsDistribution(groupMembers, minCome).map((payment) => {
      payment.total = payment.amount
      return payment
    })

    if (adjusted) {
      monthlyDistribution = subtractDistributions(monthlyDistribution, completedMonthlyPayments)
    }

    monthlyDistribution.forEach((v) => {
      v.partial = (v.total !== v.amount)
    })

    forgivemory.lastMonthlyDistribution = simpleCopy(forgivemory.monthlyDistribution)
    forgivemory.lastMonthlyPayments = simpleCopy(forgivemory.monthlyPayments)
    forgivemory.monthlyPayments = completedMonthlyPayments
    forgivemory.monthlyDistribution = monthlyDistribution

    startCycleEvent = event
    startCycleEvent.data.monthlyDistribution = monthlyDistribution
    startCycleEvent.data.completedPayments = completedMonthlyPayments

    completedMonthlyPayments = []
  }

  const forgiveWithoutForget = (member, fromSwitching, restoreAlso) => {
    const toFilter = (payment) => payment.to !== member.name
    const fromFilter = (payment) => payment.from !== member.name

    const notToFilter = (payment) => !toFilter(payment)
    const notFromFilter = (payment) => !fromFilter(payment)

    if ((member.haveNeed < 0 && fromSwitching) || (member.haveNeed > 0 && !fromSwitching)) {
      // Move payments FROM to memory:
      forgivemory.lastMonthlyPayments = simpleCopy([forgivemory.lastMonthlyPayments,
        lastStartCycleEvent.data.completedPayments.filter(fromFilter)].flat())
      forgivemory.monthlyPayments = simpleCopy([forgivemory.monthlyPayments,
        startCycleEvent.data.completedPayments.filter(fromFilter)].flat())
      forgivemory.lastMonthlyDistribution = simpleCopy([forgivemory.lastMonthlyDistribution,
        lastStartCycleEvent.data.monthlyDistribution.filter(fromFilter)].flat())
      forgivemory.monthlyDistribution = simpleCopy([forgivemory.monthlyDistribution,
        startCycleEvent.data.monthlyDistribution.filter(fromFilter)].flat())

      lastStartCycleEvent.data.completedPayments = lastStartCycleEvent.data.completedPayments.filter(notFromFilter)
      startCycleEvent.data.completedPayments = startCycleEvent.data.completedPayments.filter(notFromFilter)
      lastStartCycleEvent.data.monthlyDistribution = lastStartCycleEvent.data.monthlyDistribution.filter(notFromFilter)
      startCycleEvent.data.monthlyDistribution = startCycleEvent.data.monthlyDistribution.filter(notFromFilter)

      if (restoreAlso) {
        // Restore payments TO:
        lastStartCycleEvent.data.completedPayments = simpleCopy([lastStartCycleEvent.data.completedPayments,
          forgivemory.lastMonthlyPayments.filter(toFilter)].flat())
        startCycleEvent.data.completedPayments = simpleCopy([startCycleEvent.data.completedPayments,
          forgivemory.monthlyPayments.filter(toFilter)].flat())
        lastStartCycleEvent.data.monthlyDistribution = simpleCopy([lastStartCycleEvent.data.monthlyDistribution,
          forgivemory.lastMonthlyDistribution.filter(toFilter)].flat())
        startCycleEvent.data.monthlyDistribution = simpleCopy([startCycleEvent.data.monthlyDistribution,
          forgivemory.monthlyDistribution.filter(toFilter)].flat())

        forgivemory.lastMonthlyPayments = forgivemory.lastMonthlyPayments.filter(notToFilter)
        forgivemory.monthlyPayments = forgivemory.monthlyPayments.filter(notToFilter)
        forgivemory.lastMonthlyDistribution = forgivemory.lastMonthlyDistribution.filter(notToFilter)
        forgivemory.monthlyDistribution = forgivemory.monthlyDistribution.filter(notToFilter)
      }
      // Move payments TO to memory:
    } else if ((member.haveNeed > 0 && fromSwitching) || (member.haveNeed < 0 && !fromSwitching)) {
      forgivemory.lastMonthlyPayments = simpleCopy([forgivemory.lastMonthlyPayments,
        lastStartCycleEvent.data.completedPayments.filter(toFilter)].flat())
      forgivemory.monthlyPayments = simpleCopy([forgivemory.monthlyPayments,
        startCycleEvent.data.completedPayments.filter(toFilter)].flat())
      forgivemory.lastMonthlyDistribution = simpleCopy([forgivemory.lastMonthlyDistribution,
        lastStartCycleEvent.data.monthlyDistribution.filter(toFilter)].flat())
      forgivemory.monthlyDistribution = simpleCopy([forgivemory.monthlyDistribution,
        startCycleEvent.data.monthlyDistribution.filter(toFilter)].flat())

      lastStartCycleEvent.data.completedPayments = lastStartCycleEvent.data.completedPayments.filter(notToFilter)
      startCycleEvent.data.completedPayments = startCycleEvent.data.completedPayments.filter(notToFilter)
      lastStartCycleEvent.data.monthlyDistribution = lastStartCycleEvent.data.monthlyDistribution.filter(notToFilter)
      startCycleEvent.data.monthlyDistribution = startCycleEvent.data.monthlyDistribution.filter(notToFilter)

      if (restoreAlso) {
        // Restore payments FROM:
        lastStartCycleEvent.data.completedPayments = simpleCopy([lastStartCycleEvent.data.completedPayments,
          forgivemory.lastMonthlyPayments.filter(toFilter)].flat())
        startCycleEvent.data.completedPayments = simpleCopy([startCycleEvent.data.completedPayments,
          forgivemory.monthlyPayments.filter(toFilter)].flat())
        lastStartCycleEvent.data.monthlyDistribution = simpleCopy([lastStartCycleEvent.data.monthlyDistribution,
          forgivemory.lastMonthlyDistribution.filter(toFilter)].flat())
        startCycleEvent.data.monthlyDistribution = simpleCopy([startCycleEvent.data.monthlyDistribution,
          forgivemory.monthlyDistribution.filter(toFilter)].flat())

        forgivemory.lastMonthlyPayments = forgivemory.lastMonthlyPayments.filter(notToFilter)
        forgivemory.monthlyPayments = forgivemory.monthlyPayments.filter(notToFilter)
        forgivemory.lastMonthlyDistribution = forgivemory.lastMonthlyDistribution.filter(notToFilter)
        forgivemory.monthlyDistribution = forgivemory.monthlyDistribution.filter(notToFilter)
      }
    }
  }

  const handleIncomeEvent = (event) => {
    const oldUser = getUser(event.data.name)
    if (oldUser) {
      const fromSwitching = Math.sign(oldUser.haveNeed) !== Math.sign(event.data.haveNeed)
      oldUser.haveNeed = event.data.haveNeed
      if (fromSwitching) forgiveWithoutForget(oldUser, fromSwitching, true)
    } else {
      // Add the user who declared their income to our groupMembers list variable
      groupMembers.push({
        name: event.data.name,
        haveNeed: event.data.haveNeed
      })
      forgiveWithoutForget(event.data, false, true)
    }
  }

  const handlePaymentEvent = (event) => {
    completedMonthlyPayments.push({
      from: event.data.from,
      to: event.data.to,
      amount: event.data.amount,
      total: 0
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

  const lastWhen = distributionEvents[distributionEvents.length - 1].data.when

  const artificialEnd = {
    type: 'startCycleEvent',
    data: {
      when: lastWhen,
      monthlyDistribution: [], // List to be populated later, by the events-parser
      completedPayments: []
    }
  }
  handleCycleEvent(artificialEnd)
  // "Overpayments sometimes occur *internally* as a result of people leaving, joining, and (re-)setting income.
  // Our task is to redistribute the overpayments back into the current late payments so nobody in need is asked to pay.
  const overPayments = JSON.parse(JSON.stringify(startCycleEvent.data.monthlyDistribution)).filter((p) => {
    return p.amount < 0
  }).map((p) => {
    p.amount = Math.abs(p.amount)
    p.total = Math.abs(p.total)
    return p
  })

  const adjustingPayments = redistributeOverPayments(overPayments)

  startCycleEvent.data.monthlyDistribution = addDistributions(adjustingPayments, startCycleEvent.data.monthlyDistribution)

  if (!adjusted) {
    startCycleEvent.data.monthlyDistribution = reduceDistribution(addDistributions(startCycleEvent.data.completedPayments, startCycleEvent.data.monthlyDistribution))
  }

  // overPayments = JSON.parse(JSON.stringify(lastStartCycleEvent.data.monthlyDistribution)).filter((p) => {
  //   return p.amount < 0
  // }).map((p) => {
  //   p.amount = Math.abs(p.amount)
  //   p.total = Math.abs(p.total)
  //   return p
  // })

  lastStartCycleEvent.data.monthlyDistribution = addDistributions(adjustingPayments, lastStartCycleEvent.data.monthlyDistribution)

  // Unadjust last
  if (!adjusted) {
    lastStartCycleEvent.data.monthlyDistribution = reduceDistribution(addDistributions(lastStartCycleEvent.data.completedPayments, lastStartCycleEvent.data.monthlyDistribution))
  }

  lastStartCycleEvent.data.monthlyDistribution.forEach((payment) => {
    payment.amount = Math.min(payment.amount, payment.total)
    payment.isLate = true
    payment.partial = payment.partial ? payment.partial : false
    payment.dueOn = dateToMonthstamp(lastDayOfMonth(dateFromMonthstamp(prevMonthstamp(dateToMonthstamp(new Date(lastWhen))))))
  })
  startCycleEvent.data.monthlyDistribution.forEach((payment) => {
    payment.amount = Math.min(payment.amount, payment.total)
    payment.isLate = false
    payment.partial = payment.partial ? payment.partial : false
    payment.dueOn = dateToMonthstamp(lastDayOfMonth(dateFromMonthstamp(dateToMonthstamp(new Date(lastWhen)))))
  })

  const previousTwoCycles = [
    lastStartCycleEvent.data.monthlyDistribution,
    startCycleEvent.data.monthlyDistribution
  ].flat()

  return previousTwoCycles.filter((payment) => {
    return payment.from !== payment.to // This happens when a haver switches to being a needer; remove neutral distribution payments.
  }) // TODO: return late-payments as well.
}

export default parseMonthlyDistributionFromEvents
