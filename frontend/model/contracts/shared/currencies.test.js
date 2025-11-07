/* eslint-env mocha */
import { withCurrency } from './currencies.js'
const should = require('should')

describe('withCurrency', function () {
  const nbsp = '\xA0'

  it('should format BTC amounts', () => {
    ;[
      [1, `₿${nbsp}1`],
      [1.5, `₿${nbsp}1.50`],
      [1.5555, `₿${nbsp}1.5555`],
      [1.555555555555, `₿${nbsp}1.55555556`]
    ].forEach(([amount, expected]) => {
      const actual = withCurrency('BTC', amount)
      should(actual).equal(expected, `BTC amount ${amount} incorrectly formatted`)
    })
  })

  it('should format EUR amounts', () => {
    ;[
      [1, '€1'],
      [1.5, '€1.50'],
      [1.5555, '€1.56'],
      [1.555555555555, '€1.56']
    ].forEach(([amount, expected]) => {
      const actual = withCurrency('EUR', amount)
      should(actual).equal(expected, `EUR amount ${amount} incorrectly formatted`)
    })
  })

  it('should format USD amounts', () => {
    ;[
      [1, '$1'],
      [1.5, '$1.50'],
      [1.5555, '$1.56'],
      [1.555555555555, '$1.56']
    ].forEach(([amount, expected]) => {
      const actual = withCurrency('USD', amount)
      should(actual).equal(expected, `USD amount ${amount} incorrectly formatted`)
    })
  })

  it('should gracefully reject unsupported currency codes', () => {
    should(withCurrency('?', 1)).equal('Error: unsupported currency')
  })
})
