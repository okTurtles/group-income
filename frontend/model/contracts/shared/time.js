'use strict'

import { L } from '@common/common.js'

export const MINS_MILLIS = 60000
export const HOURS_MILLIS = 60 * MINS_MILLIS
export const DAYS_MILLIS = 24 * HOURS_MILLIS
export const MONTHS_MILLIS = 30 * DAYS_MILLIS

export function addMonthsToDate (date /*: string */, months /*: number */) /*: Date */ {
  const now = new Date(date)
  return new Date(now.setMonth(now.getMonth() + months))
}

// It might be tempting to deal directly with Dates and ISOStrings, since that's basically
// what a period stamp is at the moment, but keeping this abstraction allows us to change
// our mind in the future simply by editing these two functions.
// TODO: We may want to, for example, get the time from the server instead of relying on
// the client in case the client's clock isn't set correctly.
// See: https://github.com/okTurtles/group-income/issues/531
export function dateToPeriodStamp (date /*: string | Date */) /*: string */ {
  return new Date(date).toISOString()
}

export function dateFromPeriodStamp (daystamp /*: string */) /*: Date */ {
  return new Date(daystamp)
}

export function periodStampGivenDate ({ recentDate, periodStart, periodLength } /*: {
  recentDate: string, periodStart: string, periodLength: number
} */) /*: string */ {
  const periodStartDate = dateFromPeriodStamp(periodStart)
  let nextPeriod = addTimeToDate(periodStartDate, periodLength)
  const curDate = new Date(recentDate)
  let curPeriod
  if (curDate < nextPeriod) {
    if (curDate >= periodStartDate) {
      return periodStart // we're still in the same period
    } else {
      // we're in a period before the current one
      curPeriod = periodStartDate
      do {
        curPeriod = addTimeToDate(curPeriod, -periodLength)
      } while (curDate < curPeriod)
    }
  } else {
    // we're at least a period ahead of periodStart
    do {
      curPeriod = nextPeriod
      nextPeriod = addTimeToDate(nextPeriod, periodLength)
    } while (curDate >= nextPeriod)
  }
  return dateToPeriodStamp(curPeriod)
}

export function dateIsWithinPeriod ({ date, periodStart, periodLength } /*: {
  date: string, periodStart: string, periodLength: number
} */) /*: boolean */ {
  const dateObj = new Date(date)
  const start = dateFromPeriodStamp(periodStart)
  return dateObj > start && dateObj < addTimeToDate(start, periodLength)
}

export function addTimeToDate (date /*: string | Date */, timeMillis /*: number */) /*: Date */ {
  const d = new Date(date)
  d.setTime(d.getTime() + timeMillis)
  return d
}

export function dateToMonthstamp (date /*: string | Date */) /*: string */ {
  // we could use Intl.DateTimeFormat but that doesn't support .format() on Android
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat/format
  return new Date(date).toISOString().slice(0, 7)
}

export function dateFromMonthstamp (monthstamp /*: string */) /*: Date */ {
  // this is a hack to prevent new Date('2020-01').getFullYear() => 2019
  return new Date(`${monthstamp}-01T00:01:00.000Z`) // the Z is important
}

// TODO: to prevent conflicts among user timezones, we need
//       to use the server's time, and not our time here.
//       https://github.com/okTurtles/group-income/issues/531
export function currentMonthstamp () /*: string */ {
  return dateToMonthstamp(new Date())
}

export function prevMonthstamp (monthstamp /*: string */) /*: string */ {
  const date = dateFromMonthstamp(monthstamp)
  date.setMonth(date.getMonth() - 1)
  return dateToMonthstamp(date)
}

export function comparePeriodStamps (periodA /*: string */, periodB /*: string */) /*: number */ {
  return dateFromPeriodStamp(periodA).getTime() - dateFromPeriodStamp(periodB).getTime()
}

export function compareMonthstamps (monthstampA /*: string */, monthstampB /*: string */) /*: number */ {
  return dateFromMonthstamp(monthstampA).getTime() - dateFromMonthstamp(monthstampB).getTime()
  // const A = dateA.getMonth() + dateA.getFullYear() * 12
  // const B = dateB.getMonth() + dateB.getFullYear() * 12
  // return A - B
}

export function compareISOTimestamps (a /*: string */, b /*: string */) /*: number */ {
  return new Date(a).getTime() - new Date(b).getTime()
}

export function lastDayOfMonth (date /*: Date */) /*: Date */ {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function firstDayOfMonth (date /*: Date */) /*: Date */ {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function humanDate (
  date /*: number | Date | string */,
  options /*: Intl$DateTimeFormatOptions */ = { month: 'short', day: 'numeric' }
) /*: string */ {
  const locale = typeof navigator === 'undefined'
    // Fallback for Mocha tests.
    ? 'en-US'
    // Flow considers `navigator.languages` to be of type `$ReadOnlyArray<string>`,
    // which is not compatible with the `string[]` expected by `.toLocaleDateString()`.
    // Casting to `string[]` through `any` as a workaround.
    : ((navigator.languages /*: any */) /*: string[] */) ?? navigator.language ?? ('en-US' /* For `deno test`. */)
  // NOTE: `.toLocaleDateString()` automatically takes local timezone differences into account.
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString
  return new Date(date).toLocaleDateString(locale, options)
}

export function isPeriodStamp (arg /*: string */) /*: boolean */ {
  return /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(arg)
}

export function isFullMonthstamp (arg /*: string */) /*: boolean */ {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(arg)
}

export function isMonthstamp (arg /*: string */) /*: boolean */ {
  return isShortMonthstamp(arg) || isFullMonthstamp(arg)
}

export function isShortMonthstamp (arg /*: string */) /*: boolean */ {
  return /^(0[1-9]|1[0-2])$/.test(arg)
}

export function monthName (monthstamp /*: string */) /*: string */ {
  return humanDate(dateFromMonthstamp(monthstamp), { month: 'long' })
}

export function proximityDate (date /*: Date */) /*: string */ {
  date = new Date(date)
  const today = new Date()
  const yesterday = (d => new Date(d.setDate(d.getDate() - 1)))(new Date())
  const lastWeek = (d => new Date(d.setDate(d.getDate() - 7)))(new Date())

  for (const toReset of [date, today, yesterday, lastWeek]) {
    toReset.setHours(0)
    toReset.setMinutes(0)
    toReset.setSeconds(0, 0)
  }

  const datems = Number(date)
  let pd = date > lastWeek ? humanDate(datems, { month: 'short', day: 'numeric', year: 'numeric' }) : humanDate(datems)
  if (date.getTime() === yesterday.getTime()) pd = L('Yesterday')
  if (date.getTime() === today.getTime()) pd = L('Today')

  return pd
}

export function timeSince (datems /*: number */, dateNow /*: number */ = Date.now()) /*: string */ {
  const interval = dateNow - datems

  if (interval >= DAYS_MILLIS * 2) {
    // Make sure to replace any ordinary space character by a non-breaking one.
    return humanDate(datems).replace(/\x32/g, '\xa0')
  }
  if (interval >= DAYS_MILLIS) {
    return L('1d')
  }
  if (interval >= HOURS_MILLIS) {
    return L('{hours}h', { hours: Math.floor(interval / HOURS_MILLIS) })
  }
  if (interval >= MINS_MILLIS) {
    // Maybe use 'min' symbol rather than 'm'?
    return L('{minutes}m', { minutes: Math.max(1, Math.floor(interval / MINS_MILLIS)) })
  }
  return L('<1m')
}

export function cycleAtDate (atDate /*: string | Date */) /*: number */ {
  const now = new Date(atDate) // Just in case the parameter is a string type.
  const partialCycles = now.getDate() / lastDayOfMonth(now).getDate()
  return partialCycles
}
