/* eslint-env mocha */

// run with: ./node_modules/.bin/mocha -w --require @babel/register frontend/model/contracts/distribution/distribution.test.js

import should from 'should'
import { unadjustedDistribution, adjustedDistribution } from './distribution.js'

const setup = []

function distributionWrapper (events: Array<Object>, { adjusted }: { adjusted: boolean } = {}) {
  const haveNeeds = []
  const payments = []
  const handlers = {
    haveNeedEvent (e) { haveNeeds.push(e.data) },
    paymentEvent (e) { payments.push({ ...e.data, total: 0 }) }
  }
  for (const e of events) { handlers[e.type](e) }
  const distribution = unadjustedDistribution({ haveNeeds })
  return adjusted ? adjustedDistribution({ distribution, payments, dueOn: '2021-01' }) : distribution
}

describe('Test group-income-distribution.js', function () {
  it('Test empty distirbution event list for unadjusted distribution.', function () {
    should(distributionWrapper(setup)).eql([])
  })
  it('EVENTS: [u1, u2, u3 and u4] join the group and set haveNeeds of [100, 100, -50, and -50], respectively. Test unadjusted.', function () {
    setup.splice(setup.length, 0,
      { type: 'haveNeedEvent', data: { name: 'u1', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u2', haveNeed: 100 } },
      { type: 'haveNeedEvent', data: { name: 'u3', haveNeed: -50 } },
      { type: 'haveNeedEvent', data: { name: 'u4', haveNeed: -50 } }
    )
    should(distributionWrapper(setup)).eql([
      { amount: 50, from: 'u2', to: 'u4' },
      { amount: 50, from: 'u1', to: 'u3' }
    ])
  })
  it('Test the adjusted version of the previous event-list. Should be unchanged.', function () {
    should(distributionWrapper(setup, { adjusted: true })).eql([
      { amount: 50, from: 'u2', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 50, from: 'u1', to: 'u3', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('EVENT: a payment of $10 is made from u1 to u3.', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u3', amount: 10 } })
    should(distributionWrapper(setup, { adjusted: true })).eql([
      { amount: 50, from: 'u2', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' },
      { amount: 40, from: 'u1', to: 'u3', total: 50, partial: true, isLate: false, dueOn: '2021-01' }
    ])
  })
  it('EVENT: a payment of $40 is made from u1 to u3.', function () {
    setup.push({ type: 'paymentEvent', data: { from: 'u1', to: 'u3', amount: 40 } })
    should(distributionWrapper(setup, { adjusted: true })).eql([
      { amount: 50, from: 'u2', to: 'u4', total: 50, partial: false, isLate: false, dueOn: '2021-01' }
    ])
  })
})
