'use strict'

export const MINS_MILLIS = 60000
export const HOURS_MILLIS = 60 * MINS_MILLIS
export const DAYS_MILLIS = 24 * HOURS_MILLIS

// TODO: to prevent conflicts among user timezones, we need
//       to use the server's time, and not our time here.
//       https://github.com/okTurtles/group-income-simple/issues/531
export function currentMonthTimestamp () {
  // we could use Intl.DateTimeFormat but that doesn't support .format() on Android
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat/format
  const date = new Date()
  return `${date.getFullYear()}-${date.getMonth() + 1}`
}
