'use strict'

export const MINS_MILLIS = 60000
export const HOURS_MILLIS = 60 * MINS_MILLIS
export const DAYS_MILLIS = 24 * HOURS_MILLIS

export function dateToMonthstamp (date: Date): string {
  // we could use Intl.DateTimeFormat but that doesn't support .format() on Android
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat/format
  return date.toISOString().slice(0, 7)
}

// TODO: to prevent conflicts among user timezones, we need
//       to use the server's time, and not our time here.
//       https://github.com/okTurtles/group-income-simple/issues/531
export function currentMonthstamp (): string {
  return dateToMonthstamp(new Date())
}

export function ISOStringToMonthstamp (date: string): string {
  return dateToMonthstamp(new Date(date))
}

export function dateFromMonthstamp (monthstamp: string): Date {
  // this is a hack to prevent new Date('2020-01').getFullYear() => 2019
  return new Date(`${monthstamp}-01T00:01`)
}

export function prevMonthstamp (monthstamp: string): string {
  const date = dateFromMonthstamp(monthstamp)
  date.setMonth(date.getMonth() - 1)
  return dateToMonthstamp(date)
}

export function compareMonthstamps (monthstampA: string, monthstampB): number {
  const A = dateFromMonthstamp(monthstampA).getTime()
  const B = dateFromMonthstamp(monthstampB).getTime()
  return A > B ? 1 : (A < B ? -1 : 0)
}

export function compareISOTimestamps (a: string, b: string): number {
  const A = new Date(a).getTime()
  const B = new Date(b).getTime()
  return A > B ? 1 : (A < B ? -1 : 0)
}

// Do not initialize locale here so that it runs on the server/travis (navigator is undefined there)
let locale

export function humanDate (
  datems = Date.now(),
  opts = { month: 'short', day: 'numeric' }
) {
  locale = locale || navigator.languages ? navigator.languages[0] : navigator.language
  return new Date(datems).toLocaleDateString(locale, opts)
}
