'use strict'

export const MINS_MILLIS = 60000
export const HOURS_MILLIS = 60 * MINS_MILLIS
export const DAYS_MILLIS = 24 * HOURS_MILLIS
export const MONTHS_MILLIS = 30 * DAYS_MILLIS

export function humanDate (
  date: number | Date | string,
  options = { month: 'short', day: 'numeric' }
) {
  const locale = typeof navigator === 'undefined'
    ? 'en-US'
    : navigator.language

  return new Date(date).toLocaleDateString(locale, options)
}

export function addMonthToDate (date: string | Date, months: number): Date {
  const now = new Date(date)
  return new Date(now.setMonth(now.getMonth() + months))
}

export function addTimeToDate (date: string | Date, timeMillis: number): Date {
  const d = new Date(date)
  d.setTime(d.getTime() + timeMillis)
  return d
}
