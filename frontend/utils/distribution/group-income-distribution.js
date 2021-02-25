import { saferFloat } from '~/frontend/views/utils/currencies.js'
import incomeDistribution from '~/frontend/utils/distribution/mincome-proportional.js'

function totalPaymentsToOrFrom (paymentsFrom, allPayments, toOrFrom) {
  let totalToOrFrom = 0
  if (paymentsFrom) {
    for (const fromUser in paymentsFrom) {
      for (const toUser in paymentsFrom[fromUser]) {
        for (const paymentHash of paymentsFrom[fromUser][toUser]) {
          if (fromUser === toOrFrom) {
            totalToOrFrom += allPayments[paymentHash].data.amount
          } else if (toUser === toOrFrom) {
            totalToOrFrom -= allPayments[paymentHash].data.amount
          }
        }
      }
    }
  }
  return totalToOrFrom
}

export default function groupIncomeDistribution ({ state, getters, monthstamp, adjusted }: Object): any {
  // the monthstamp will always be for the current month. the alternative
  // is to allow the re-generation of the distribution for previous months,
  // but that approach requires also storing the historical mincomeAmount
  // and historical groupProfiles. Since together these change across multiple
  // locations in the code, it involves less 'code smell' to do it this way.
  // see historical/group.js for the ugly way of doing it.
  const mincomeAmount = getters.groupMincomeAmount
  const groupProfiles = getters.groupProfiles
  const currentIncomeDistribution = []
  const allPayments = getters.currentGroupState.payments
  const thisMonthPayments = getters.monthlyPayments ? getters.monthlyPayments[monthstamp] : null
  const paymentsFrom = thisMonthPayments && thisMonthPayments.paymentsFrom
  for (const username in groupProfiles) {
    const profile = groupProfiles[username]
    const incomeDetailsType = profile && profile.incomeDetailsType
    if (incomeDetailsType) {
      const adjustment = incomeDetailsType === 'incomeAmount' ? 0 : mincomeAmount
      const amount = adjustment + profile[incomeDetailsType]
      currentIncomeDistribution.push({
        name: username,
        amount: saferFloat(amount - (adjusted ? totalPaymentsToOrFrom(paymentsFrom, allPayments, username) : 0))
      })
    }
  }
  return incomeDistribution(currentIncomeDistribution, mincomeAmount).filter(p => p.amount > 0)
}
