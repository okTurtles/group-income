'use strict'

type Currency = {|
  decimalsMax: number;
  displayWithCurrency(n: number): string;
  displayWithoutCurrency(n: number): string;
  isCrypto: boolean;
  numberFormat: Object;
  symbol: string;
  symbolWithCode: string;
  validate(n: string): boolean;
|}

// https://github.com/okTurtles/group-income/issues/813#issuecomment-593680834
// round all accounting to DECIMALS_MAX decimal places max to avoid consensus
// issues that can arise due to different floating point values
// at extreme precisions. If this becomes inadequate, instead of increasing
// this value, switch to a different currency base, e.g. from BTC to mBTC.
export const DECIMALS_MAX = 8

function commaToDots (value: string | number): string {
  // ex: "1,55" -> "1.55"
  return typeof value === 'string' ? value.replace(/,/, '.') : value.toString()
}

function isNumeric (nr: string): boolean {
  return !isNaN((nr: any) - parseFloat(nr))
}

function isInDecimalsLimit (nr: string, decimalsMax: number) {
  const decimals = nr.split('.')[1]
  return !decimals || decimals.length <= decimalsMax
}

// NOTE: Unsure whether this is *always* string; it comes from 'validators' in other files
function validateMincome (value: string, decimalsMax: number) {
  const nr = commaToDots(value)
  return isNumeric(nr) && isInDecimalsLimit(nr, decimalsMax)
}

function decimalsOrInt (num: number, decimalsMax: number): string {
  // ex: 12.5 -> "12.50", but 250 -> "250"
  return num.toFixed(decimalsMax).replace(/\.0+$/, '')
}

export function saferFloat (value: number): number {
  // ex: 1.333333333333333333 -> 1.33333333
  return parseFloat(value.toFixed(DECIMALS_MAX))
}

export function normalizeCurrency (value: string): number {
  // ex: "1,333333333333333333" -> 1.33333333
  return saferFloat(parseFloat(commaToDots(value)))
}

// NOTE: Unsure whether this is *always* string; it comes from 'validators' in other files
export function mincomePositive (value: string): boolean {
  return parseFloat(commaToDots(value)) > 0
}

/**
 *
 * @param {string} code A three-character currency code.
 * @param {number} amount
 * @returns A monetary string formatted according to the user locale.
 */
export function withCurrency (code: string, amount: number): string {
  if (!currencies[code]) {
    console.error('withCurrency: unsupported currency', code)
    return 'Error: unsupported currency'
  }
  const { isCrypto, numberFormat, symbol } = currencies[code]
  // Intl.NumberFormat doesn't know symbols for cryptos.
  return (isCrypto && symbol)
    ? numberFormat.format(amount).replace(code, symbol)
    : numberFormat.format(amount)
}

function makeCurrency (options): Currency {
  const { code, symbol, decimalsMax, isCrypto = false } = options
  return {
    numberFormat: new Intl.NumberFormat(
      // $FlowIgnore[incompatible-call]
      typeof navigator === 'object' ? (navigator.languages ?? navigator.language) : 'en-US',
      {
        style: 'currency',
        currency: code,
        // For cryptos we have to set the number of decimal places explicitly.
        maximumFractionDigits: isCrypto ? decimalsMax : undefined,
        // Don't show fraction digits *if* they are all zero.
        trailingZeroDisplay: 'stripIfInteger'
      }
    ),
    symbol,
    symbolWithCode: `${symbol} ${code}`,
    decimalsMax,
    isCrypto,
    displayWithCurrency: (n: number) => withCurrency(code, n),
    displayWithoutCurrency: (n: number) => decimalsOrInt(n, decimalsMax),
    validate: (n: string) => validateMincome(n, decimalsMax)
  }
}

// NOTE: if we needed for some reason, this could also be defined in
//       a json file that's read in and generates this object. For
//       example, that would allow the addition of currencies without
//       having to "recompile" a new version of the app.
const currencies: { [string]: Currency } = {
  USD: makeCurrency({
    code: 'USD',
    symbol: '$',
    decimalsMax: 2
  }),
  EUR: makeCurrency({
    code: 'EUR',
    symbol: '€',
    decimalsMax: 2
  }),
  BTC: makeCurrency({
    code: 'BTC',
    symbol: '₿',
    decimalsMax: 8,
    isCrypto: true
  })
}

export default currencies
