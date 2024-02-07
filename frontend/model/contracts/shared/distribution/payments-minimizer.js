'use strict'

// greedy algorithm responsible for "balancing" payments
// such that the least number of payments are made.
export default function minimizeTotalPaymentsCount (
  distribution: Array<Object>
): Array<any | {|fromMemberID: string, toMemberID: string, amount: number|}> {
  const neederTotalReceived = {}
  const haverTotalHave = {}
  const haversSorted = []
  const needersSorted = []
  const minimizedDistribution = []
  for (const todo of distribution) {
    neederTotalReceived[todo.toMemberID] = (neederTotalReceived[todo.toMemberID] || 0) + todo.amount
    haverTotalHave[todo.fromMemberID] = (haverTotalHave[todo.fromMemberID] || 0) + todo.amount
  }
  for (const memberID in haverTotalHave) {
    haversSorted.push({ memberID, amount: haverTotalHave[memberID] })
  }
  for (const memberID in neederTotalReceived) {
    needersSorted.push({ memberID, amount: neederTotalReceived[memberID] })
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
      minimizedDistribution.push({ amount: mostHaver.amount, fromMemberID: mostHaver.memberID, toMemberID: mostNeeder.memberID })
      mostNeeder.amount -= mostHaver.amount
      needersSorted.push(mostNeeder)
    } else if (diff > 0) {
      // we completely filled up the needer's need and still have some left over
      minimizedDistribution.push({ amount: mostNeeder.amount, fromMemberID: mostHaver.memberID, toMemberID: mostNeeder.memberID })
      mostHaver.amount -= mostNeeder.amount
      haversSorted.push(mostHaver)
    } else {
      // a perfect match
      minimizedDistribution.push({ amount: mostNeeder.amount, fromMemberID: mostHaver.memberID, toMemberID: mostNeeder.memberID })
    }
  }
  return minimizedDistribution
}
