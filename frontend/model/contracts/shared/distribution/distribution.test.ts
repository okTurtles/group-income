// Can run directly with:
// deno test --import-map=import-map-for-tests.json frontend/model/contracts/shared/distribution/distribution.test.ts

import { assertEquals } from 'asserts'

import { adjustedDistribution, unadjustedDistribution } from './distribution.js'

type DistributionEvent = HaveNeedEvent | PaymentEvent

type HaveNeed = {
  name: string
  haveNeed: number
}

type HaveNeedEvent = {
  type: 'haveNeedEvent'
  data: HaveNeed
}

type Payment = {
  amount: number
  from: string
  to: string
}

type PaymentEvent = {
  type: 'paymentEvent'
  data: Payment
}

const setup: DistributionEvent[] = []

function distributionWrapper (events: DistributionEvent[], { adjusted }: { adjusted?: boolean } = {}) {
  const haveNeeds: HaveNeed[] = []
  const payments: Array<Payment & { total: number }> = []
  const handlers: Record<DistributionEvent['type'], (e: DistributionEvent) => void> = {
    haveNeedEvent (e: DistributionEvent) { haveNeeds.push((e as HaveNeedEvent).data) },
    paymentEvent (e: DistributionEvent) { payments.push({ ...(e as PaymentEvent).data, total: 0 }) }
  }
  for (const e of events) { handlers[e.type](e) }
  const distribution = unadjustedDistribution({ haveNeeds })
  return adjusted ? adjustedDistribution({ distribution, payments, dueOn: '2021-01' }) : distribution
}

Deno.test('Tests for group-income-distribution', async function (tests) {
  await tests.step('Test empty distribution event list for unadjusted distribution.', async function () {
    assertEquals(distributionWrapper(setup), [])
  })

  await tests.step('EVENTS: [u1, u2, u3 and u4] join the group and set haveNeeds of [100, 100, -50, and -50], respectively. Test unadjusted.', function () {
    setup.splice(setup.length, 0,
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -50 } },
      { type: 'haveNeedEvent', data: { name: 'u4', haveNeed: -50 } }
    )
    assertEquals(distributionWrapper(setup), [
      { amount: 50, from: 'u2', to: 'u4' },
      { amount: 50, from: 'u1', to: 'u3' }
    ])
  })

  await tests.step('Test the adjusted version of the previous event-list. Should be unchanged.', async function () {
    assertEquals(distributionWrapper(setup, { adjusted: true }), [
      { amount: 50, from: 'u2', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u1', to: 'u3', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })

  await tests.step('EVENT: a payment of $10 is made from u1 to u3.', async function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u3', amount: 10 } })
    assertEquals(distributionWrapper(setup, { adjusted: true }), [
      { amount: 50, from: 'u2', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u1', to: 'u3', total: 50, partial: true, isLate: false, dueOn: '2021-01' }
    ])
  })

  await tests.step('EVENT: a payment of $40 is made from u1 to u3.', async function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u3', amount: 40 } })
    assertEquals(distributionWrapper(setup, { adjusted: true }), [
      { amount: 50, from: 'u2', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
})
