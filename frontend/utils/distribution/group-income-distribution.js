
import { saferFloat } from '~/frontend/views/utils/currencies.js'

function distibuteFromHavesToNeeds ({ haves, needs }) {
  const totalHave = haves.reduce((a, b) => a + b.have, 0)
  const totalNeed = needs.reduce((a, b) => a + b.need, 0)
  const totalPercent = Math.min(1, totalHave / totalNeed)

  for (const have of haves) have.percent = have.have / totalHave

  const payments = []
  for (const need of needs) {
    for (const have of haves) {
      const amount = need.need * have.percent * totalPercent
      need.need -= amount
      payments.push({ amount, from: have.name, to: need.name })
    }
  }
  return payments
}
export default function groupIncomeDistribution ({ getters, monthstamp, adjusted }) {
  const groupProfiles = getters.groupProfiles
  const mincomeAmount = getters.groupSettings.mincomeAmount
  const allPayments = getters.currentGroupState.payments
  const thisMonthPayments = getters.monthlyPayments ? getters.monthlyPayments[monthstamp] : null
  const paymentsFrom = thisMonthPayments && thisMonthPayments.paymentsFrom

  const haves = []
  const needs = []
  // calculate haves and needs from pledges and incomes:
  for (const username in groupProfiles) {
    const profile = groupProfiles[username]
    const incomeDetailsType = profile && profile.incomeDetailsType
    if (incomeDetailsType === 'incomeAmount') {
      needs.push({ name: username, need: mincomeAmount - profile.incomeAmount })
    } else if (incomeDetailsType === 'pledgeAmount') {
      haves.push({ name: username, have: profile.pledgeAmount })
    }
    haves.percent = 0
  }
  /// Adjust haves/needs if `adjusted = true`
  if (adjusted) {
    const alreadySent = {}
    const alreadyReceived = {}
    if (paymentsFrom) {
      for (const fromUser in paymentsFrom) {
        let totalSent = 0
        for (const toUser in paymentsFrom[fromUser]) {
          let totalReceved = 0
          if (!alreadyReceived[toUser]) alreadyReceived[toUser] = 0
          for (const paymentHash of paymentsFrom[fromUser][toUser]) {
            totalReceved += allPayments[paymentHash].data.amount
          }
          totalSent += totalReceved
          alreadyReceived[toUser] += totalReceved
        }
        alreadySent[fromUser] = totalSent
      }
      for (const have of haves) {
        have.have -= alreadySent[have.name] ? alreadySent[have.name] : 0
      }
      for (const need of needs) {
        need.need -= alreadyReceived[need.name] ? alreadyReceived[need.name] : 0
      }
    }
  }
  /// pass the haves and needs to distributeFromHavesToNeeds
  const dist = distibuteFromHavesToNeeds({ haves, needs }).filter((payment) => {
    return payment.amount > 0
  }).map((payment) => {
    payment.amount = saferFloat(payment.amount)
    return payment
  })
  return dist
}
