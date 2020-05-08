'use strict'

// https://github.com/okTurtles/group-income-simple/issues/813#issuecomment-593680834
// round all accounting to DECIMALS_MAX decimal places max to avoid consensus
// issues that can arise due to different floating point values
// at extreme precisions. If this becomes inadequate, instead of increasing
// this value, switch to a different currency base, e.g. from BTC to mBTC.
export const DECIMALS_MAX = 8

export function saferFloat (value: number): number {
  return parseFloat(value.toFixed(DECIMALS_MAX))
}

// NOTE: if we needed for some reason, this could also be defined in
//       a json file that's read in and generates this object. For
//       example, that would allow the addition of currencies without
//       having to "recompile" a new version of the app.
const currencies = {
  USD: {
    code: 'USD',
    symbol: '$',
    symbolWithCode: '$ USD',
    decimalsMax: 2,
    displayWithCurrency: n => '$' + decimalsOrInt(n, 'USD'),
    displayWithoutCurrency: n => decimalsOrInt(n, 'USD')
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    symbolWithCode: '€ EUR',
    decimalsMax: 2,
    displayWithCurrency: n => '€' + decimalsOrInt(n, 'EUR'),
    displayWithoutCurrency: n => decimalsOrInt(n, 'EUR')

  },
  BTC: {
    code: 'BTC',
    symbol: 'Ƀ',
    symbolWithCode: 'Ƀ BTC',
    decimalsMax: DECIMALS_MAX,
    displayWithCurrency: n => decimalsOrInt(n, 'BTC') + 'Ƀ',
    displayWithoutCurrency: n => decimalsOrInt(n, 'BTC')
  }
}

function decimalsOrInt (num: number, currency: string): string {
  const fixed = num.toFixed(currencies[currency].decimalsMax)
  const integerPart = /^(.+)\.0+$/.exec(fixed)
  return integerPart ? integerPart[1] : fixed
}

export default currencies
