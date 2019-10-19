'use strict'

import { chompRight } from '~/shared/string.js'

export function twoDecimalsOrInt (num) {
  return chompRight(num.toFixed(2), '.00')
}

export default {
  USD: {
    symbol: '$',
    displayWithCurrency: n => '$' + twoDecimalsOrInt(n),
    displayWithoutCurrency: twoDecimalsOrInt,
    symbolWithCode: '$ USD'
  },
  EUR: {
    symbol: '€',
    displayWithCurrency: n => '€' + twoDecimalsOrInt(n),
    displayWithoutCurrency: twoDecimalsOrInt,
    symbolWithCode: '€ EUR'

  },
  BTC: {
    symbol: 'Ƀ',
    displayWithCurrency: n => n.toFixed(6) + 'Ƀ',
    displayWithoutCurrency: n => n.toFixed(6),
    symbolWithCode: 'Ƀ BTC'
  }
}
