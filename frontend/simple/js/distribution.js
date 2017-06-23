'use strict'

let frequencies = function (incomes) {
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

function findIncomeFrequencyByKey (incomeFrequencies, amount) {
  for (let incomeFrequencyAmount in incomeFrequencies) {
    if (parseInt(incomeFrequencyAmount) === amount) {
      return incomeFrequencies[amount]
    }
  }
}

function getSortedIncomeFrequencyAmounts (incomeFrequencies) {
  let frequencyAmounts = Object.keys(incomeFrequencies)
  frequencyAmounts.sort(function (a, b) {
    return parseInt(a) - parseInt(b)
  })
  return frequencyAmounts
}

function findIncreaseAmount (incomeFrequencies, minCome) {
  let sortedIncomeFrequencyAmounts = getSortedIncomeFrequencyAmounts(incomeFrequencies)
  return Math.min(sortedIncomeFrequencyAmounts[1], minCome)
}

function findDecreaseAmount (incomeFrequencies, minCome) {
  let sortedIncomeFrequencyAmounts = getSortedIncomeFrequencyAmounts(incomeFrequencies)
  return Math.max(sortedIncomeFrequencyAmounts[sortedIncomeFrequencyAmounts.length - 2], minCome)
}

function transferValue (incomes, indexAmount, transferAmount) {
  return incomes.map(function (income) {
    if (income.amount === indexAmount) {
      income.amount = income.amount + transferAmount
    }
    return income
  })
}

function incomeKeys (a, b) {
  return a.name > b.name
}

function incomeAmounts (a, b) {
  return a.amount - b.amount
}

function incomeDistribution (incomes, minCome) {
  let incomeLength = Object.keys(incomes).length

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
  incomes = transferValue(incomes, largestAmount, -(transferAmount / largestCount))
  incomes = transferValue(incomes, smallestAmount, (transferAmount / smallestCount))

  return incomeDistribution(incomes, minCome)
}

export default incomeDistribution
