import parseMonthlyDistributionFromEvents from '~/frontend/utils/distribution/monthly-event-parser.js'
import minimizeTotalPaymentsCount from '~/frontend/utils/distribution/payments-minimizer.js'

export default function groupIncomeDistribution (distributionEvents: Array<Object>, { mincomeAmount, adjusted = false, minimizeTxns = false, monthlyRated = true }: Object): any {
  const dist = parseMonthlyDistributionFromEvents(distributionEvents, mincomeAmount, monthlyRated, adjusted)
  const sortObject = obj => Object.keys(obj).sort().reverse().reduce((res, key) => (res[key] = obj[key], res), {})
  return (minimizeTxns ? minimizeTotalPaymentsCount(dist) : dist).map(sortObject)
}
