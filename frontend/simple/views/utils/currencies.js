const CURRENCIES = {
  'USD': '$',
  'EUR': '€',
  'BTC': 'Ƀ'
}

export const symbol = (code: string) => CURRENCIES[code] || code

export default CURRENCIES
