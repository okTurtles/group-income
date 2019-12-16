'use strict'

export function decimalsOrInt (num: number, numDecimals: number): string {
  const fixed = num.toFixed(numDecimals)
  const integerPart = /^(.+)\.0+$/.exec(fixed)
  return integerPart ? integerPart[1] : fixed
}

export default {
  USD: {
    symbol: '$',
    symbolWithCode: '$ USD',
    displayWithCurrency: n => '$' + decimalsOrInt(n, 2),
    displayWithoutCurrency: n => decimalsOrInt(n, 2)
  },
  EUR: {
    symbol: '€',
    symbolWithCode: '€ EUR',
    displayWithCurrency: n => '€' + decimalsOrInt(n, 2),
    displayWithoutCurrency: n => decimalsOrInt(n, 2)

  },
  BTC: {
    symbol: 'Ƀ',
    symbolWithCode: 'Ƀ BTC',
    displayWithCurrency: n => decimalsOrInt(n, 6) + 'Ƀ',
    displayWithoutCurrency: n => decimalsOrInt(n, 6)
  }
}
