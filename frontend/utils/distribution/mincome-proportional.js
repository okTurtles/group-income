'use strict'

export type HaveNeedObject = {
  name: string;
  haveNeed: number
}

export default function mincomeProportional (haveNeeds: Array<HaveNeedObject>): Array<Object> {
  let totalHave = 0
  let totalNeed = 0
  const havers = []
  const needers = []
  for (const haveNeed of haveNeeds) {
    if (haveNeed.haveNeed > 0) {
      havers.push(haveNeed)
      totalHave += haveNeed.haveNeed
    } else if (haveNeed.haveNeed < 0) {
      needers.push(haveNeed)
      totalNeed += Math.abs(haveNeed.haveNeed)
    }
  }
  const totalPercent = Math.min(1, totalNeed / totalHave)
  const payments = []
  for (const haver of havers) {
    const distributionAmount = totalPercent * haver.haveNeed
    for (const needer of needers) {
      const belowPercentage = Math.abs(needer.haveNeed) / totalNeed
      payments.push({
        amount: distributionAmount * belowPercentage,
        from: haver.name,
        to: needer.name
      })
    }
  }
  return payments
}
