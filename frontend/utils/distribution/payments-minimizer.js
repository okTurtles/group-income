'use strict'

import { saferFloat } from '~/frontend/views/utils/currencies.js'

// greedy algorithm responsible for "balancing" payments
// such that the least number of payments are made.
export default function minimizeTotalPaymentsCount (
  distribution: Array<Object>,
  groupMembers: Array<Object>,
  payments: Array<Object>
): Array<any | {|from: string, to: string, amount: number|}> {
  // return distribution
  const neederTotalReceived = {}
  const haverTotalHave = {}
  const haversSorted = []
  const needersSorted = []
  const getUser = (name) => groupMembers.find(member => member.name === name)
  let minimizedDistribution = []
  for (const todo of distribution) {
    neederTotalReceived[todo.to] = (neederTotalReceived[todo.to] || 0) + todo.amount
    haverTotalHave[todo.from] = (haverTotalHave[todo.from] || 0) + todo.amount
  }
  for (const name in haverTotalHave) {
    haversSorted.push({ name, amount: haverTotalHave[name] })
  }
  for (const name in neederTotalReceived) {
    needersSorted.push({ name, amount: neederTotalReceived[name] })
  }
  // sort haves and needs: greatest to least
  haversSorted.sort((a, b) => b.amount - a.amount)
  needersSorted.sort((a, b) => b.amount - a.amount)
  while (haversSorted.length > 0 && needersSorted.length > 0) {
    const mostHaver = haversSorted.pop()
    const mostNeeder = needersSorted.pop()
    const diff = mostHaver.amount - mostNeeder.amount
    if (diff < 0) {
      // we used up everything the haver had
      minimizedDistribution.push({ amount: mostHaver.amount, from: mostHaver.name, to: mostNeeder.name })
      mostNeeder.amount -= mostHaver.amount
      needersSorted.push(mostNeeder)
    } else if (diff > 0) {
      // we completely filled up the needer's need and still have some left over
      minimizedDistribution.push({ amount: mostNeeder.amount, from: mostHaver.name, to: mostNeeder.name })
      mostHaver.amount -= mostNeeder.amount
      haversSorted.push(mostHaver)
    } else {
      // a perfect match
      minimizedDistribution.push({ amount: mostNeeder.amount, from: mostHaver.name, to: mostNeeder.name })
    }
  }
  if (minimizedDistribution.length > 0) {
    while (true) {
      let lowestSeen = minimizedDistribution[0]
      for (const todo of minimizedDistribution) {
        if (todo.amount < lowestSeen.amount) {
          lowestSeen = todo
        }
      }
      let lowestSeenAmt = lowestSeen.amount
      const otherInputs = minimizedDistribution.filter(todo => {
        return todo.to === lowestSeen.to && todo.from !== lowestSeen.from
      })
      let totalHaveNeed = 0
      const inputRoomRemaining = {}
      for (const input of otherInputs) {
        const totalTodoAmount = minimizedDistribution.filter(todo => {
          return todo.from === input.from
        }).reduce((a, i) => a + i.amount, 0)
        const totalPayments = payments.filter(p => {
          return p.from === input.from
        }).reduce((a, i) => a + i.amount, 0)
        inputRoomRemaining[input.from] = getUser(input.from).haveNeed - (totalTodoAmount + totalPayments)
        totalHaveNeed += inputRoomRemaining[input.from]
      }
      // console.log({ lowestSeen, otherInputs, inputRoomRemaining, totalHaveNeed, lowestSeenAmt })
      if (lowestSeenAmt <= totalHaveNeed) {
        // console.log(lowestSeenAmt)
        // if lowestSeen.amount < sum(availableFunds(otherInputs))
        // here we'd proportionally add the value of lowestSeen
        // to the otherInputs, filling them up until they max out,
        // then moving on to the remaining inputs and adding what remains
        minimizedDistribution = minimizedDistribution.filter(todo => {
          return todo !== lowestSeen
        })
        for (const input of otherInputs) {
          if (lowestSeenAmt > 0) {
            const amtToAdd = inputRoomRemaining[input.from] - lowestSeenAmt >= 0
              ? lowestSeenAmt
              : lowestSeenAmt - inputRoomRemaining[input.from]
            // console.log({ adding: amtToAdd, name: input.from, room: inputRoomRemaining[input.from] })
            lowestSeenAmt -= amtToAdd
            input.amount += amtToAdd
          }
        }
      } else {
        // console.log('break!')
        break
      }
    }
    // we could do this in a loop until we can no longer do it
  }
  return minimizedDistribution.map(todo => {
    todo.amount = saferFloat(todo.amount)
    return todo
  })
}
