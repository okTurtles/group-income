import parseMonthlyDistributionFromEvents from '~/frontend/utils/distribution/monthly-event-parser.js'
// import minimizeTotalPaymentsCount from '~/frontend/utils/distribution/payments-minimizer.js'

export default function groupIncomeDistribution (distributionEvents: Array<Object>, opts: Object = {}): Array<Object> {
  const { adjusted = false, minimizeTxns = false, latePayments = [] } = opts
  // TODO: use giLodash merge
  return parseMonthlyDistributionFromEvents(distributionEvents, adjusted, minimizeTxns, latePayments)
  // const dist = parseMonthlyDistributionFromEvents(distributionEvents, adjusted, minimizeTxns, latePayments)
  // return minimizeTxns ? minimizeTotalPaymentsCount(dist) : dist
}
