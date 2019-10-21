'use strict'

export function decimalsOrInt (num, numDecimals) {
  const fixed = num.toFixed(numDecimals)
  return /\.0+$/.test(fixed) ? /^(.+)\.0+$/.exec(fixed)[1] : fixed
}

export default {
  USD: {
    symbol: '$',
    symbolWithCode: '$ USD',
    displayWithCurrency: n => '$' + decimalsOrInt(n, 0),
    displayWithoutCurrency: n => decimalsOrInt(n, 0)
  },
  EUR: {
    symbol: '€',
    symbolWithCode: '€ EUR',
    displayWithCurrency: n => '€' + decimalsOrInt(n, 0),
    displayWithoutCurrency: n => decimalsOrInt(n, 0)

  },
  BTC: {
    symbol: 'Ƀ',
    symbolWithCode: 'Ƀ BTC',
    displayWithCurrency: n => n.toFixed(6) + 'Ƀ',
    displayWithoutCurrency: n => n.toFixed(6)
  }
}
