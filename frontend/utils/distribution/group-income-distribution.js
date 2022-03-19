import parseMonthlyDistributionFromEvents from '~/frontend/utils/distribution/monthly-event-parser.js'
// import minimizeTotalPaymentsCount from '~/frontend/utils/distribution/payments-minimizer.js'
import { merge } from '~/frontend/utils/giLodash.js'

export default function groupIncomeDistribution (distributionEvents: Array<Object>, opts: Object = {}): Array<Object> {
  opts = merge({ adjusted: false, minimizeTxns: false, latePayments: [] }, opts)
  if (opts.minimizeTxns && !opts.adjusted) {
    throw new Error('minimizeTxns = true means adjusted must be true too!')
  }
  const dist = parseMonthlyDistributionFromEvents(distributionEvents, opts)
  return dist
  // return opts.minimizeTxns ? minimizeTotalPaymentsCount(dist) : dist
}
