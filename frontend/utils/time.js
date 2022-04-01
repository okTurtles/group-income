'use strict'
import L from '~/frontend/views/utils/translations.js'

export const MINS_MILLIS = 60000
export const HOURS_MILLIS = 60 * MINS_MILLIS
export const DAYS_MILLIS = 24 * HOURS_MILLIS
export const MONTHS_MILLIS = 30 * DAYS_MILLIS

export function addMonthsToDate (date: string, months: number): Date {
  const now = new Date(date)
  return new Date(now.setMonth(now.getMonth() + months))
}

export function dateToMonthstamp (date: string | Date): string {
  // we could use Intl.DateTimeFormat but that doesn't support .format() on Android
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat/format
  return new Date(date).toISOString().slice(0, 7)
}

// TODO: to prevent conflicts among user timezones, we need
//       to use the server's time, and not our time here.
//       https://github.com/okTurtles/group-income/issues/531
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

export function add30DaysToDate (date: string): string {
  const d = new Date(date)
  d.setTime(d.getTime() + MONTHS_MILLIS)
  return d
}

export function compareMonthstamps (monthstampA: string, monthstampB: string): number {
  const dateA = dateFromMonthstamp(monthstampA)
  const dateB = dateFromMonthstamp(monthstampB)
  const A = dateA.getMonth() + dateA.getFullYear() * 12
  const B = dateB.getMonth() + dateB.getFullYear() * 12
  return A - B
}

export function compareCycles (whenEnd: string, whenStart: string): number {
  return compareMonthstamps(dateToMonthstamp(whenEnd), dateToMonthstamp(whenStart))
}

export function compareISOTimestamps (a: string, b: string): number {
  const A = new Date(a).getTime()
  const B = new Date(b).getTime()
  return A - B
}

// TODO: this should be localized properly and renamed to dateToTimestamp
//       or timestampFromDate. There's probably some built-in thing to get
//       the timestamp in a localized way (e.g. with AM/PM vs 24hour)
//       for example, .toLocaleTimeString(). The only place this is currently
//       used is in the chatroom stuff
export function getTime (date: Date): string {
  return `${date.getHours()}:${date.getMinutes()}`
}

export function lastDayOfMonth (date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function firstDayOfMonth (date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

// TODO: Provide locale fallback in case navigator does not exist (e.g. server, Mocha, etc...)
const locale = (typeof navigator === 'undefined' && 'en-US') || (navigator.languages ? navigator.languages[0] : navigator.language)

export function humanDate (
  datems: number,
  opts: Intl$DateTimeFormatOptions = { month: 'short', day: 'numeric' }
): string {
  if (!datems) {
    console.error('humanDate:: 1st arg `datems` is required')
    return ''
  }
  return new Date(datems).toLocaleDateString(locale, opts)
}

export function isFullMonthstamp (arg: any): boolean {
  return typeof arg === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(arg)
}

export function isMonthstamp (arg: any): boolean {
  return isShortMonthstamp(arg) || isFullMonthstamp(arg)
}

export function isShortMonthstamp (arg: any): boolean {
  return typeof arg === 'string' && /^(0[1-9]|1[0-2])$/.test(arg)
}

export function monthName (monthstamp: string): string {
  const monthIndex = Number.parseInt(monthstamp.slice(-2), 10)

  if (!isMonthstamp(monthstamp)) {
    console.error('monthName:: 1st arg `monthstamp` must be a valid monthstamp')
    return ''
  }
  // Call the `L()` function on every individual month name directly so that the
  // `strings` tool can discover them when analyzing this file.
  return [
    L('January'),
    L('February'),
    L('March'),
    L('April'),
    L('May'),
    L('June'),
    L('July'),
    L('August'),
    L('September'),
    L('October'),
    L('November'),
    L('December')
  ][monthIndex - 1]
}

export function proximityDate (date: Date): string {
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

export function timeSince (datems: number, dateNow: number = Date.now()): string {
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

export function cycleAtDate (atDate: string | Date): number {
  const now = new Date(atDate) // Just in case the parameter is a string type.
  const partialCycles = now.getDate() / lastDayOfMonth(now).getDate()
  return partialCycles
}
