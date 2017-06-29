/* eslint-env mocha */

const should = require('should')
const incomeDistribution = require('../frontend/simple/js/distribution').default

describe('distributionTest', function () {
  it('should not change anything when there is only one member', function () {
    let members = [
      {name: 'a', amount: 10}
    ]
    let expected = [
      {name: 'a', amount: 10}
    ]
    should(incomeDistribution(members, 5)).eql(expected)
  })

  it('should not change anything but sort when all members are above mincome', function () {
    let members = [
      {name: 'b', amount: 30},
      {name: 'a', amount: 10},
      {name: 'd', amount: 60},
      {name: 'c', amount: 50}
    ]
    let expected = [
      {name: 'a', amount: 10},
      {name: 'b', amount: 30},
      {name: 'c', amount: 50},
      {name: 'd', amount: 60}
    ]
    should(incomeDistribution(members, 5)).eql(expected)
  })

  it('should not change anything but sot when all members are below mincome', function () {
    let members = [
      {name: 'a', amount: 30},
      {name: 'b', amount: 10},
      {name: 'c', amount: 25},
      {name: 'd', amount: 21}
    ]
    let expected = [
      {name: 'a', amount: 30},
      {name: 'b', amount: 10},
      {name: 'c', amount: 25},
      {name: 'd', amount: 21}
    ]
    should(incomeDistribution(members, 50)).eql(expected)
  })

  it('should redistribute incomes and keep index keys properly', function () {
    let members = [
      {name: 'b', amount: 30},
      {name: 'a', amount: 10},
      {name: 'd', amount: 60},
      {name: 'c', amount: 50}
    ]
    let expected = [
      {name: 'a', amount: 35},
      {name: 'b', amount: 35},
      {name: 'c', amount: 40},
      {name: 'd', amount: 40}
    ]
    should(incomeDistribution(members, 40)).eql(expected)
  })

  it('should redistribute one higher income equally', function () {
    let members = [
      {name: 'b', amount: 30},
      {name: 'a', amount: 30},
      {name: 'd', amount: 52},
      {name: 'c', amount: 30}
    ]
    let expected = [
      {name: 'a', amount: 34},
      {name: 'b', amount: 34},
      {name: 'c', amount: 34},
      {name: 'd', amount: 40}
    ]
    should(incomeDistribution(members, 40)).eql(expected)
  })

  it('should redistribute multiple identical higher income amounts equally', function () {
    let members = [
      {name: 'b', amount: 80},
      {name: 'a', amount: 80},
      {name: 'd', amount: 80},
      {name: 'c', amount: 10}
    ]
    let expected = [
      {name: 'a', amount: 70},
      {name: 'b', amount: 70},
      {name: 'c', amount: 40},
      {name: 'd', amount: 70}
    ]
    should(incomeDistribution(members, 40)).eql(expected)
  })

  it('should work with negative contributions as well', function () {
    let members = [
      {name: 'a', amount: -30},
      {name: 'b', amount: 60}
    ]
    let expected = [
      {name: 'a', amount: 10},
      {name: 'b', amount: 20}
    ]
    should(incomeDistribution(members, 10)).eql(expected)
  })
})
