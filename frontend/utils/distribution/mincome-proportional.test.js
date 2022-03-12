/* eslint-env mocha */

import should from 'should'
import mincomeProportional from './mincome-proportional.js'

describe('proportionalMincomeDistributionTest', function () {
  it('distribute income above mincome proportionally', function () {
    const members = [
      { name: 'a', haveNeed: -30 },
      { name: 'b', haveNeed: -20 },
      { name: 'c', haveNeed: 0 },
      { name: 'd', haveNeed: 10 },
      { name: 'e', haveNeed: 30 },
      { name: 'f', haveNeed: 60 }
    ]
    const expected = [
      { amount: 3, from: 'd', to: 'a' },
      { amount: 2, from: 'd', to: 'b' },
      { amount: 9, from: 'e', to: 'a' },
      { amount: 6, from: 'e', to: 'b' },
      { amount: 18, from: 'f', to: 'a' },
      { amount: 12, from: 'f', to: 'b' }
    ]

    should(mincomeProportional(members)).eql(expected)
  })

  it('distribute income above mincome proportionally when extra won\'t cover need', function () {
    const members = [
      { name: 'a', haveNeed: -30 },
      { name: 'b', haveNeed: -20 },
      { name: 'c', haveNeed: 0 },
      { name: 'd', haveNeed: 4 },
      { name: 'e', haveNeed: 4 },
      { name: 'f', haveNeed: 10 }
    ]
    const expected = [
      { amount: 2.4, from: 'd', to: 'a' },
      { amount: 1.6, from: 'd', to: 'b' },
      { amount: 2.4, from: 'e', to: 'a' },
      { amount: 1.6, from: 'e', to: 'b' },
      { amount: 6, from: 'f', to: 'a' },
      { amount: 4, from: 'f', to: 'b' }
    ]
    should(mincomeProportional(members)).eql(expected)
  })

  it('don\'t distribute anything if no one is above mincome', function () {
    const members = [
      { name: 'a', haveNeed: -30 },
      { name: 'b', haveNeed: -20 },
      { name: 'c', haveNeed: 0 },
      { name: 'd', haveNeed: -5 },
      { name: 'e', haveNeed: -20 },
      { name: 'f', haveNeed: -30 }
    ]
    const expected = []
    should(mincomeProportional(members)).eql(expected)
  })

  it('don\'t distribute anything if everyone is above mincome', function () {
    const members = [
      { name: 'a', haveNeed: 0 },
      { name: 'b', haveNeed: 5 },
      { name: 'c', haveNeed: 0 },
      { name: 'd', haveNeed: 10 },
      { name: 'e', haveNeed: 60 },
      { name: 'f', haveNeed: 12 }
    ]
    const expected = []
    should(mincomeProportional(members)).eql(expected)
  })
})
