import parseMonthlyDistributionFromEvents from '~/frontend/utils/distribution/monthly-event-parser.js'
import minimizeTotalPaymentsCount from '~/frontend/utils/distribution/payments-minimizer.js'

export default function groupIncomeDistribution (distributionEvents: Array<Object>, { mincomeAmount, adjusted = false, minimizeTxns = false }: Object): any {
  const dist = parseMonthlyDistributionFromEvents(distributionEvents, mincomeAmount, adjusted).filter((payment) => {
    return payment.amount > 0
  })
  return minimizeTxns ? minimizeTotalPaymentsCount(dist) : dist
}
