/* eslint-env mocha */

const should = require('should')
const incomeDistribution = require('../frontend/utils/distribution/mincome-proportional').default

describe('proportionalMincomeDistributionTest', function () {
  it('distribute income above mincome proportionally', function () {
    const members = [
      { name: 'a', amount: 10 },
      { name: 'b', amount: 20 },
      { name: 'c', amount: 40 },
      { name: 'd', amount: 50 },
      { name: 'e', amount: 70 },
      { name: 'f', amount: 100 }
    ]
    const expected = [
      { amount: 3, from: 'd', to: 'a' },
      { amount: 2, from: 'd', to: 'b' },
      { amount: 9, from: 'e', to: 'a' },
      { amount: 6, from: 'e', to: 'b' },
      { amount: 18, from: 'f', to: 'a' },
      { amount: 12, from: 'f', to: 'b' }
    ]

    should(incomeDistribution(members, 40)).eql(expected)
  })

  it('distribute income above mincome proportionally when extra won\'t cover need', function () {
    const members = [
      { name: 'a', amount: 10 },
      { name: 'b', amount: 20 },
      { name: 'c', amount: 40 },
      { name: 'd', amount: 44 },
      { name: 'e', amount: 44 },
      { name: 'f', amount: 50 }
    ]
    const expected = [
      { amount: 2.4, from: 'd', to: 'a' },
      { amount: 1.6, from: 'd', to: 'b' },
      { amount: 2.4, from: 'e', to: 'a' },
      { amount: 1.6, from: 'e', to: 'b' },
      { amount: 6, from: 'f', to: 'a' },
      { amount: 4, from: 'f', to: 'b' }
    ]
    should(incomeDistribution(members, 40)).eql(expected)
  })

  it('don\'t distribute anything if no one is above mincome', function () {
    const members = [
      { name: 'a', amount: 10 },
      { name: 'b', amount: 20 },
      { name: 'c', amount: 40 },
      { name: 'd', amount: 35 },
      { name: 'e', amount: 20 },
      { name: 'f', amount: 10 }
    ]
    const expected = []
    should(incomeDistribution(members, 40)).eql(expected)
  })

  it('don\'t distribute anything if everyone is above mincome', function () {
    const members = [
      { name: 'a', amount: 40 },
      { name: 'b', amount: 45 },
      { name: 'c', amount: 40 },
      { name: 'd', amount: 50 },
      { name: 'e', amount: 100 },
      { name: 'f', amount: 52 }
    ]
    const expected = []
    should(incomeDistribution(members, 40)).eql(expected)
  })
})
