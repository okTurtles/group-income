'use strict'

import sbp from '@sbp/sbp'
import { DECIMALS_MAX } from '@model/contracts/shared/currencies.js'

// Used to avoid creating a new NumberFormat object every time an amount is formatted.
// Note: if the user locale ever changes at runtime, cached currency formats won't update until page reload.
const currencyFormatsByCode = Object.create(null)
// $FlowIgnore[prop-missing]
const supportedCurrencies = new Set(Intl.supportedValuesOf('currency'))

export default (amount: number): string => {
  // Group currency code.
  const code = sbp('state/vuex/getters').groupSettings?.mincomeCurrency

  if (!currencyFormatsByCode[code]) {
    currencyFormatsByCode[code] = new Intl.NumberFormat(
      // $FlowIgnore[incompatible-call]
      navigator.languages ?? navigator.language,
      {
        style: 'currency',
        currency: code,
        // If the currency is unsupported, then it's likely a cryptocurrency,
        // in which case we have to set the number of decimal places explicitly.
        maximumFractionDigits: supportedCurrencies.has(code) ? undefined : DECIMALS_MAX,
        // Don't show fraction digits *if* they are all zero.
        trailingZeroDisplay: 'stripIfInteger'
      }
    )
  }
  return currencyFormatsByCode[code].format(amount)
}
