/* eslint-env mocha */

import should from 'should'
import mincomeProportional from './mincome-proportional.js'

describe('proportionalMincomeDistributionTest', function () {
  it('distribute income above mincome proportionally', function () {
    const members = [
      { memberID: 'a', haveNeed: -30 },
      { memberID: 'b', haveNeed: -20 },
      { memberID: 'c', haveNeed: 0 },
      { memberID: 'd', haveNeed: 10 },
      { memberID: 'e', haveNeed: 30 },
      { memberID: 'f', haveNeed: 60 }
    ]
    const expected = [
      { amount: 3, fromMemberID: 'd', toMemberID: 'a' },
      { amount: 2, fromMemberID: 'd', toMemberID: 'b' },
      { amount: 9, fromMemberID: 'e', toMemberID: 'a' },
      { amount: 6, fromMemberID: 'e', toMemberID: 'b' },
      { amount: 18, fromMemberID: 'f', toMemberID: 'a' },
      { amount: 12, fromMemberID: 'f', toMemberID: 'b' }
    ]

    should(mincomeProportional(members)).eql(expected)
  })

  it('distribute income above mincome proportionally when extra won\'t cover need', function () {
    const members = [
      { memberID: 'a', haveNeed: -30 },
      { memberID: 'b', haveNeed: -20 },
      { memberID: 'c', haveNeed: 0 },
      { memberID: 'd', haveNeed: 4 },
      { memberID: 'e', haveNeed: 4 },
      { memberID: 'f', haveNeed: 10 }
    ]
    const expected = [
      { amount: 2.4, fromMemberID: 'd', toMemberID: 'a' },
      { amount: 1.6, fromMemberID: 'd', toMemberID: 'b' },
      { amount: 2.4, fromMemberID: 'e', toMemberID: 'a' },
      { amount: 1.6, fromMemberID: 'e', toMemberID: 'b' },
      { amount: 6, fromMemberID: 'f', toMemberID: 'a' },
      { amount: 4, fromMemberID: 'f', toMemberID: 'b' }
    ]
    should(mincomeProportional(members)).eql(expected)
  })

  it('don\'t distribute anything if no one is above mincome', function () {
    const members = [
      { memberID: 'a', haveNeed: -30 },
      { memberID: 'b', haveNeed: -20 },
      { memberID: 'c', haveNeed: 0 },
      { memberID: 'd', haveNeed: -5 },
      { memberID: 'e', haveNeed: -20 },
      { memberID: 'f', haveNeed: -30 }
    ]
    const expected = []
    should(mincomeProportional(members)).eql(expected)
  })

  it('don\'t distribute anything if everyone is above mincome', function () {
    const members = [
      { memberID: 'a', haveNeed: 0 },
      { memberID: 'b', haveNeed: 5 },
      { memberID: 'c', haveNeed: 0 },
      { memberID: 'd', haveNeed: 10 },
      { memberID: 'e', haveNeed: 60 },
      { memberID: 'f', haveNeed: 12 }
    ]
    const expected = []
    should(mincomeProportional(members)).eql(expected)
  })
})
