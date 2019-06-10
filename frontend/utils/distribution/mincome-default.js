'use strict'

import type { IncomeObject } from '~/shared/types.js'

let frequencies = function (incomes: Array<IncomeObject>) {
  let freqs = {}
  incomes.map(function (a) {
    let amount = a.amount
    if (!(amount in this)) {
      this[amount] = 1
    } else {
      this[amount] += 1
    }
    return amount
  }, freqs)
  return freqs
}

function findIncomeFrequencyByKey (incomeFrequencies, amount: number): number {
  for (let incomeFrequencyAmount in incomeFrequencies) {
    if (parseInt(incomeFrequencyAmount) === amount) {
      return incomeFrequencies[amount]
    }
  }
  return 0
}

function getSortedIncomeFrequencyAmounts (incomeFrequencies) {
  let frequencyAmounts = Object.keys(incomeFrequencies)
  frequencyAmounts.sort(function (a, b) {
    return parseInt(a) - parseInt(b)
  })
  return frequencyAmounts
}

function findIncreaseAmount (incomeFrequencies, minCome: number): number {
  let sortedIncomeFrequencyAmounts = getSortedIncomeFrequencyAmounts(incomeFrequencies)
  return Math.min(parseInt(sortedIncomeFrequencyAmounts[1]), minCome)
}

function findDecreaseAmount (incomeFrequencies, minCome: number): number {
  let sortedIncomeFrequencyAmounts = getSortedIncomeFrequencyAmounts(incomeFrequencies)
  return Math.max(parseInt(sortedIncomeFrequencyAmounts[sortedIncomeFrequencyAmounts.length - 2]), minCome)
}

function transferValue (incomes: Array<IncomeObject>, indexAmount: number, transferAmount: number): Array<Object> {
  return incomes.map(function (income) {
    if (income.amount === indexAmount) {
      income.amount += transferAmount
    }
    return income
  })
}

function incomeKeys (a: IncomeObject, b: IncomeObject): number {
  if (a.name > b.name) {
    return 1
  }
  if (a.name < b.name) {
    return -1
  }
  return 0
}

function incomeAmounts (a: IncomeObject, b: IncomeObject): number {
  return a.amount - b.amount
}

function floorTo (number): number {
  const numberMatch = number.toString().match(/^-?\d+(?:\.\d{0,2})?/)
  if (numberMatch) {
    return parseFloat(numberMatch[0])
  }
  throw new TypeError('Not a valid number.')
}

function incomeDistribution (incomes: Array<IncomeObject>, minCome: number) {
  let incomeLength = incomes.length

  if (incomeLength === 1) {
    incomes.sort(incomeKeys)
    return incomes
  }

  incomes.sort(incomeAmounts)
  let incomeFrequencies = frequencies(incomes)

  // --- left side ---
  let smallestAmount = incomes[0].amount
  let smallestCount = findIncomeFrequencyByKey(incomeFrequencies, smallestAmount)
  if (smallestAmount >= minCome) {
    incomes.sort(incomeKeys)
    return incomes
  }
  let smallestIncreaseAmount = findIncreaseAmount(incomeFrequencies, minCome)
  let smallestMaxIncrease = smallestIncreaseAmount - smallestAmount

  // --- right side
  let largestAmount = incomes[incomeLength - 1].amount
  let largestCount = findIncomeFrequencyByKey(incomeFrequencies, largestAmount)
  if (largestAmount <= minCome) {
    incomes.sort(incomeKeys)
    return incomes
  }
  let smallestDecreaseAmount = findDecreaseAmount(incomeFrequencies, minCome)
  let smallestMaxDecrease = largestAmount - smallestDecreaseAmount

  // --- calculate transfer
  let totalRequired = smallestMaxIncrease * smallestCount
  let totalAvailable = smallestMaxDecrease * largestCount
  let transferAmount = Math.min(totalRequired, totalAvailable)

  // --- transfer amounts from largest element(s) to smallest element(s)
  let decreasePerMember = -floorTo(transferAmount / largestCount)
  let decreaseTotal = decreasePerMember * largestCount
  let increasePerMember = -floorTo(decreaseTotal / smallestCount)
  let increaseTotal = increasePerMember * smallestCount

  incomes = transferValue(incomes, largestAmount, decreasePerMember)
  incomes = transferValue(incomes, smallestAmount, increasePerMember)

  // --- add the remainder for fractional transfers for the smallest on the left
  let remainder = Math.ceil((-decreaseTotal - increaseTotal) * 100) / 100
  incomes[0].amount += remainder

  return incomeDistribution(incomes, minCome)
}

export default incomeDistribution
