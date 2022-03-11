import parseMonthlyDistributionFromEvents from '~/frontend/utils/distribution/monthly-event-parser.js'
import minimizeTotalPaymentsCount from '~/frontend/utils/distribution/payments-minimizer.js'

export default function groupIncomeDistribution (distributionEvents: Array<Object>, opts: Object = {}): Array<Object> {
  const { adjusted = false, minimizeTxns = false, latePayments = [] } = opts
  const dist = parseMonthlyDistributionFromEvents(distributionEvents, adjusted, latePayments)
  return minimizeTxns ? minimizeTotalPaymentsCount(dist) : dist
}
