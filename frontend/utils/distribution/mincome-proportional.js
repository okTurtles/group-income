'use strict'

import type { IncomeObject } from '~/shared/types.js'

function incomeDistribution (incomes: Array<IncomeObject>, minCome: number) {
  const membersBelow = []
  let belowMincomeTotalAmount = 0
  const membersAbove = []
  let aboveMincomeTotalAmount = 0

  for (const { name, amount } of incomes) {
    const belowMincome = minCome - amount
    if (belowMincome > 0) {
      membersBelow.push(name)
      belowMincomeTotalAmount += belowMincome
    }
    const aboveMincome = amount - minCome
    if (aboveMincome > 0) {
      membersAbove.push(name)
      aboveMincomeTotalAmount += aboveMincome
    }
  }

  const totalProportionalDistribution = Math.min(belowMincomeTotalAmount / aboveMincomeTotalAmount, 1)

  const payments = []
  for (const { name: fromName, amount: fromAmount } of incomes) {
    if (membersAbove.find(aboveName => fromName === aboveName)) {
      const aboveAmount = fromAmount - minCome
      const distributionAmount = totalProportionalDistribution * aboveAmount
      for (const { name: toName, amount: toAmount } of incomes) {
        if (membersBelow.find(belowName => toName === belowName)) {
          const belowAmount = minCome - toAmount
          const belowPercentage = belowAmount / belowMincomeTotalAmount
          const paymentAmount = distributionAmount * belowPercentage
          const payment = {
            amount: paymentAmount,
            from: fromName,
            to: toName
          }
          payments.push(payment)
        }
      }
    }
  }

  return payments
}

export default incomeDistribution
