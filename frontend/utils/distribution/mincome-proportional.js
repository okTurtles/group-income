'use strict'

import type { IncomeObject } from '~/shared/types.js'

function incomeDistribution (incomes: Array<IncomeObject>, minCome: number) {
  let membersBelow = []
  let belowMincomeTotalAmount = 0
  let membersAbove = []
  let aboveMincomeTotalAmount = 0

  incomes.map(function (member) {
    let belowMincome = minCome - member.amount
    if (belowMincome > 0) {
      membersBelow.push(member.name)
      belowMincomeTotalAmount += belowMincome
    }
    let aboveMincome = member.amount - minCome
    if (aboveMincome > 0) {
      membersAbove.push(member.name)
      aboveMincomeTotalAmount += aboveMincome
    }
  })

  let totalProportionalDistribution = Math.min(belowMincomeTotalAmount / aboveMincomeTotalAmount, 1)

  let payments = []
  incomes.map(function (memberFrom) {
    if (membersAbove.find(function (memberAboveName) {
      return memberFrom.name === memberAboveName
    })) {
      let aboveAmount = memberFrom.amount - minCome
      let distributionAmount = totalProportionalDistribution * aboveAmount
      incomes.map(function (memberTo) {
        if (membersBelow.find(function (memberBelowName) {
          return memberTo.name === memberBelowName
        })) {
          let belowAmount = minCome - memberTo.amount
          let belowPercentage = belowAmount / belowMincomeTotalAmount
          let paymentAmount = distributionAmount * belowPercentage
          let payment = {
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
