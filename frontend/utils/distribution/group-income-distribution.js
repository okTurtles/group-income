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
    const carried = Object.create(null)
    for (const p of dist) {
      const alreadyPaid = getters.paymentTotalFromUserToUser(p.from, p.to, monthstamp)
      const carryAmount = p.amount - alreadyPaid
      // ex: it wants us to pay $2, but we already paid $3, thus: carryAmount = -$1 (all done paying)
      // ex: it wants us to pay $3, but we already paid $2, thus: carryAmount = $1 (remaining to pay)
      // if we "overpaid" because we sent late payments, remove us from consideration
      p.amount = saferFloat(Math.max(0, carryAmount))
      // calculate our carried adjustment (used when distribution changes due to new users)
      if (!carried[p.from]) carried[p.from] = { carry: 0, total: 0 }
      carried[p.from].total += p.amount
      if (carryAmount < 0) carried[p.from].carry += -carryAmount
    }
    // we loop through and proportionally subtract the amount that we've already paid
    dist = dist.filter(p => p.amount > 0)
    for (const p of dist) {
      const c = carried[p.from]
      p.amount = saferFloat(p.amount - (c.carry * p.amount / c.total))
    }
    // console.debug('adjustedDist', adjustedDist, 'carried', carried)
  }
  return dist
}
