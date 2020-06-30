import { saferFloat } from '~/frontend/views/utils/currencies.js'
import incomeDistribution from '~/frontend/utils/distribution/mincome-proportional.js'

export default function groupIncomeDistribution ({ state, getters, monthstamp, adjusted }) {
  // the monthstamp will always be for the current month. the alternative
  // is to allow the re-generation of the distribution for previous months,
  // but that approach requires also storing the historical mincomeAmount
  // and historical groupProfiles. Since together these change across multiple
  // locations in the code, it involves less 'code smell' to do it this way.
  // see historical/group.js for the ugly way of doing it.
  const mincomeAmount = getters.groupMincomeAmount
  const groupProfiles = getters.groupProfiles
  const currentIncomeDistribution = []
  for (const username in groupProfiles) {
    const profile = groupProfiles[username]
    const incomeDetailsType = profile && profile.incomeDetailsType
    if (incomeDetailsType) {
      const adjustment = incomeDetailsType === 'incomeAmount' ? 0 : mincomeAmount
      const amount = adjustment + profile[incomeDetailsType]
      currentIncomeDistribution.push({
        name: username,
        amount: saferFloat(amount)
      })
    }
  }
  var dist = incomeDistribution(currentIncomeDistribution, mincomeAmount)
  if (adjusted) {
    // if this user has already made some payments to other users this
    // month, we need to take that into account and adjust the distribution.
    // this will be used by the Payments page to tell how much still
    // needs to be paid (if it was a partial payment).
    for (const p of dist) {
      const alreadyPaid = getters.paymentTotalFromUserToUser(p.from, p.to, monthstamp)
      // if we "overpaid" because we sent late payments, remove us from consideration
      p.amount = saferFloat(Math.max(0, p.amount - alreadyPaid))
    }
    dist = dist.filter(p => p.amount > 0)
  }
  return dist
}
