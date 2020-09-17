'use strict'

// https://github.com/okTurtles/group-income-simple/issues/813#issuecomment-593680834
// round all accounting to DECIMALS_MAX decimal places max to avoid consensus
// issues that can arise due to different floating point values
// at extreme precisions. If this becomes inadequate, instead of increasing
// this value, switch to a different currency base, e.g. from BTC to mBTC.
export const DECIMALS_MAX = 8

function commaToDots (value) {
  // ex: "1,55" -> "1.55"
  return typeof value === 'string' ? value.replace(/,/, '.') : value
}

function isNumeric (nr) {
  return !isNaN(nr - parseFloat(nr))
}

function isInDecimalsLimit (nr, currency) {
  const decimals = nr.toString().split('.')[1]
  return !decimals || decimals.length <= currencies[currency].decimalsMax
}

function validateMincome (value, currency) {
  const nr = commaToDots(value)
  return isNumeric(nr) && isInDecimalsLimit(nr, currency)
}

function decimalsOrInt (num: number, currency: string): string | number {
  const fixed = parseFloat(num.toFixed(currencies[currency].decimalsMax))
  const integerPart = /^(.+)\.0+$/.exec(fixed)
  return integerPart ? integerPart[1] : fixed
}

export function saferFloat (value): number {
  // ex: "1,333333333333333333" -> 1.33333333
  return parseFloat(parseFloat(commaToDots(value)).toFixed(DECIMALS_MAX))
}

export function mincomePositive (value): boolean {
  return parseFloat(commaToDots(value)) > 0
}

// NOTE: if we needed for some reason, this could also be defined in
//       a json file that's read in and generates this object. For
//       example, that would allow the addition of currencies without
//       having to "recompile" a new version of the app.
const currencies = {
  USD: {
    symbol: '$',
    symbolWithCode: '$ USD',
    decimalsMax: 2,
    displayWithCurrency: n => '$' + decimalsOrInt(n, 'USD'),
    displayWithoutCurrency: n => decimalsOrInt(n, 'USD'),
    validate: n => validateMincome(n, 'USD')
  },
  EUR: {
    symbol: '€',
    symbolWithCode: '€ EUR',
    decimalsMax: 2,
    displayWithCurrency: n => '€' + decimalsOrInt(n, 'EUR'),
    displayWithoutCurrency: n => decimalsOrInt(n, 'EUR'),
    validate: n => validateMincome(n, 'EUR')
  },
  BTC: {
    symbol: 'Ƀ',
    symbolWithCode: 'Ƀ BTC',
    decimalsMax: DECIMALS_MAX,
    displayWithCurrency: n => decimalsOrInt(n, 'BTC') + 'Ƀ',
    displayWithoutCurrency: n => decimalsOrInt(n, 'BTC'),
    validate: n => validateMincome(n, 'BTC')
  }
}

export default currencies
