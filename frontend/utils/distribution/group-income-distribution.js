import parseMonthlyDistributionFromEvents from '~/frontend/utils/distribution/monthly-event-parser.js'

export default function groupIncomeDistribution (distributionEvents: Array<Object>, { mincomeAmount, adjusted = false, minimizeTxns = false }: Object): any {
  const dist = parseMonthlyDistributionFromEvents(distributionEvents, mincomeAmount, adjusted, minimizeTxns).filter((payment) => {
    return payment.amount > 0
  })
  return dist
}
