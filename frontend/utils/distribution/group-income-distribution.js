import { saferFloat } from '~/frontend/views/utils/currencies.js'
import parseMonthlyDistributionFromEvents from '~/frontend/utils/distribution/monthly-event-parser.js'
import minimizeTotalPaymentsCount from '~/frontend/utils/distribution/payments-minimizer.js'

export default function groupIncomeDistribution (distributionEvents: Array<Object>, { mincomeAmount, adjusted = false, minimizeTxns = false, monthlyRated = true }: Object): any {
  let dist = parseMonthlyDistributionFromEvents(distributionEvents, mincomeAmount, monthlyRated)
  if (!adjusted) {
    for (const p of dist) {
      const alreadyPaid = distributionEvents.reduce((acc, e) => {
        if (e.type === 'paymentEvent' && e.data.from === p.from && e.data.to === p.to) {
          return acc + e.data.amount
        } else {
          return acc
        }
      }, 0)
      p.amount = saferFloat(Math.max(0, p.amount + alreadyPaid))
    }
    dist = dist.filter(p => p.amount > 0)
  }
  return minimizeTxns ? minimizeTotalPaymentsCount(dist) : dist
}
