const CURRENCIES = {
  'USD': '$',
  'EUR': '€',
  'BTC': 'Ƀ'
}

export const symbol = (code) => CURRENCIES[code] || code

export default CURRENCIES
