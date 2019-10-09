/*
- When storing dates, do it based on UTC time.
- When displaying a date to the user, use convertDateToLocale().
- If you need to convert a date back to UTC, use convertDateToUTC

// NOTE: Half done to close #531
*/

// Create date always based on UTC time
export function createDateUTC (date) {
  const now = date ? new Date(date) : new Date()
  const offset = now.getTimezoneOffset()
  const minutes = now.getMinutes()
  now.setMinutes(minutes + offset)

  return now
}

// Convert UTC date to date based on Locale
// ex: 1570599537334 (06:38:57) (UTC)
// ->  1570603137334 (07:38:57) (locale, +01 WEST)
export function convertDateToLocale (date) {
  const now = new Date(date)
  const offset = now.getTimezoneOffset()
  const minutes = now.getMinutes()
  now.setMinutes(minutes - offset)

  return now
}

// Convert Locale date to date based on UTC
// ex: 1570603137334 (07:38:57) (locale, +01 WEST)
// ->  1570599537334 (06:38:57) (UTC time)
export function convertDateToUTC (date) {
  return createDateUTC(date)
}
