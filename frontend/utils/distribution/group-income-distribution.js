import parseMonthlyDistributionFromEvents from '~/frontend/utils/distribution/monthly-event-parser.js'
import minimizeTotalPaymentsCount from '~/frontend/utils/distribution/payments-minimizer.js'

export default function groupIncomeDistribution (distributionEvents: Array<Object>, { mincomeAmount, adjusted = false, minimizeTxns = false, monthlyRated = true }: Object): any {
  const dist = parseMonthlyDistributionFromEvents(distributionEvents, mincomeAmount, monthlyRated, adjusted)
  return minimizeTxns ? minimizeTotalPaymentsCount(dist) : dist
}
