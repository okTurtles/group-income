'use strict'

import { chompRight } from '~/shared/string.js'

export function twoDecimalsOrInt (num) {
  return chompRight(num.toFixed(2), '.00')
}

export default {
  USD: {
    symbol: '$',
    symbolWithCode: '$ USD',
    displayWithCurrency: n => '$' + twoDecimalsOrInt(n),
    displayWithoutCurrency: twoDecimalsOrInt
  },
  EUR: {
    symbol: '€',
    symbolWithCode: '€ EUR',
    displayWithCurrency: n => '€' + twoDecimalsOrInt(n),
    displayWithoutCurrency: twoDecimalsOrInt

  },
  BTC: {
    symbol: 'Ƀ',
    symbolWithCode: 'Ƀ BTC',
    displayWithCurrency: n => n.toFixed(6) + 'Ƀ',
    displayWithoutCurrency: n => n.toFixed(6)
  }
}
