'use strict'

import type { IncomeObject } from '~/shared/types.js'

function incomeDistribution (incomes: Array<IncomeObject>, minCome: number) {
  const membersBelow = []
  let belowMincomeTotalAmount = 0
  const membersAbove = []
  let aboveMincomeTotalAmount = 0

  incomes.map(function (member) {
    const belowMincome = minCome - member.amount
    if (belowMincome > 0) {
      membersBelow.push(member.name)
      belowMincomeTotalAmount += belowMincome
    }
    const aboveMincome = member.amount - minCome
    if (aboveMincome > 0) {
      membersAbove.push(member.name)
      aboveMincomeTotalAmount += aboveMincome
    }
  })

  const totalProportionalDistribution = Math.min(belowMincomeTotalAmount / aboveMincomeTotalAmount, 1)

  const payments = []
  incomes.map(function (memberFrom) {
    if (membersAbove.find(function (memberAboveName) {
      return memberFrom.name === memberAboveName
    })) {
      const aboveAmount = memberFrom.amount - minCome
      const distributionAmount = totalProportionalDistribution * aboveAmount
      incomes.map(function (memberTo) {
        if (membersBelow.find(function (memberBelowName) {
          return memberTo.name === memberBelowName
        })) {
          const belowAmount = minCome - memberTo.amount
          const belowPercentage = belowAmount / belowMincomeTotalAmount
          const paymentAmount = distributionAmount * belowPercentage
          const payment = {
            amount: paymentAmount,
            from: memberFrom.name,
            to: memberTo.name
          }
          payments.push(payment)
        }
      })
    }
  })

  return payments
}

export default incomeDistribution
