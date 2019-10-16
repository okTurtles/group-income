'use strict'

import type { IncomeObject } from '~/shared/types.js'

const frequencies = function (incomes: Array<IncomeObject>) {
  const freqs = {}
  for (const { amount } of incomes) {
    if (!freqs[amount]) {
      freqs[amount] = 1
    } else {
      freqs[amount] += 1
    }
  }
  return freqs
}

function findIncomeFrequencyByKey (incomeFrequencies, amount: number): number {
  for (const incomeFrequencyAmount in incomeFrequencies) {
    if (parseInt(incomeFrequencyAmount) === amount) {
      return incomeFrequencies[amount]
    }
  }
  return 0
}

function getSortedIncomeFrequencyAmounts (incomeFrequencies) {
  const frequencyAmounts = Object.keys(incomeFrequencies)
  frequencyAmounts.sort(function (a, b) {
    return parseInt(a) - parseInt(b)
  })
  return frequencyAmounts
}

function findIncreaseAmount (incomeFrequencies, minCome: number): number {
  const sortedIncomeFrequencyAmounts = getSortedIncomeFrequencyAmounts(incomeFrequencies)
  return Math.min(parseInt(sortedIncomeFrequencyAmounts[1]), minCome)
}

function findDecreaseAmount (incomeFrequencies, minCome: number): number {
  const sortedIncomeFrequencyAmounts = getSortedIncomeFrequencyAmounts(incomeFrequencies)
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
  const incomeLength = incomes.length

  if (incomeLength === 1) {
    incomes.sort(incomeKeys)
    return incomes
  }

  incomes.sort(incomeAmounts)
  const incomeFrequencies = frequencies(incomes)

  // --- left side ---
  const smallestAmount = incomes[0].amount
  const smallestCount = findIncomeFrequencyByKey(incomeFrequencies, smallestAmount)
  if (smallestAmount >= minCome) {
    incomes.sort(incomeKeys)
    return incomes
  }
  const smallestIncreaseAmount = findIncreaseAmount(incomeFrequencies, minCome)
  const smallestMaxIncrease = smallestIncreaseAmount - smallestAmount

  // --- right side
  const largestAmount = incomes[incomeLength - 1].amount
  const largestCount = findIncomeFrequencyByKey(incomeFrequencies, largestAmount)
  if (largestAmount <= minCome) {
    incomes.sort(incomeKeys)
    return incomes
  }
  const smallestDecreaseAmount = findDecreaseAmount(incomeFrequencies, minCome)
  const smallestMaxDecrease = largestAmount - smallestDecreaseAmount

  // --- calculate transfer
  const totalRequired = smallestMaxIncrease * smallestCount
  const totalAvailable = smallestMaxDecrease * largestCount
  const transferAmount = Math.min(totalRequired, totalAvailable)

  // --- transfer amounts from largest element(s) to smallest element(s)
  const decreasePerMember = -floorTo(transferAmount / largestCount)
  const decreaseTotal = decreasePerMember * largestCount
  const increasePerMember = -floorTo(decreaseTotal / smallestCount)
  const increaseTotal = increasePerMember * smallestCount

  incomes = transferValue(incomes, largestAmount, decreasePerMember)
  incomes = transferValue(incomes, smallestAmount, increasePerMember)

  // --- add the remainder for fractional transfers for the smallest on the left
  const remainder = Math.ceil((-decreaseTotal - increaseTotal) * 100) / 100
  incomes[0].amount += remainder

  return incomeDistribution(incomes, minCome)
}

export default incomeDistribution
