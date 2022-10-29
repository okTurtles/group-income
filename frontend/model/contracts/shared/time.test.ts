// Can run directly with:
// deno test --import-map=import-map.json frontend/model/contracts/shared/time.test.ts

import { assertEquals } from 'asserts'

import {
  DAYS_MILLIS,
  HOURS_MILLIS,
  MINS_MILLIS,
  timeSince
} from './time.js'

Deno.test('Tests for time.js', async function (tests) {
  const defaultLocale = 'en-US'
  // In Deno ^v1.27.0, `navigator.language` is defined,
  // which results in failed tests on devices using another locale than en-US.
  if (navigator.language !== undefined) {
    Object.defineProperty(navigator, 'language', { configurable: true, enumerable: true, writable: false, value: defaultLocale })
  }
  if (navigator.languages !== undefined) {
    Object.defineProperty(navigator, 'languages', { configurable: true, enumerable: true, writable: false, value: [defaultLocale] })
  }

  await tests.step('timeSince', async function (tests) {
    const currentDate = 1590823007327

    await tests.step('Current date is "May 30, 7:16 AM"', () => {
      const humanDate = new Date(currentDate).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })
      assertEquals(humanDate, 'May 30, 7:16 AM')
    })

    await tests.step('assertEquals return "<1m" when 59s have passed', () => {
      assertEquals(timeSince(
        currentDate - 59e3,
        currentDate
      ), '<1m')
    })

    await tests.step('assertEquals return "1m" when 60s have passed', () => {
      assertEquals(timeSince(
        currentDate - MINS_MILLIS,
        currentDate
      ), '1m')
    })

    await tests.step('assertEquals return "11m" when 11min have passed', () => {
      assertEquals(timeSince(
        currentDate - MINS_MILLIS * 11,
        currentDate
      ), '11m')
    })

    await tests.step('assertEquals return "1h" when 60min have passed', () => {
      assertEquals(timeSince(
        currentDate - MINS_MILLIS * 60,
        currentDate
      ), '1h')
    })

    await tests.step('assertEquals return "4h" when 4h25m have passed', () => {
      assertEquals(timeSince(
        currentDate - HOURS_MILLIS * 4.25,
        currentDate
      ), '4h')
    })

    await tests.step('assertEquals return "1d" when 24h have passed', () => {
      assertEquals(timeSince(
        currentDate - HOURS_MILLIS * 24,
        currentDate
      ), '1d')
    })

    await tests.step('assertEquals return "1d" when 40h have passed', () => {
      assertEquals(timeSince(
        currentDate - HOURS_MILLIS * 40,
        currentDate
      ), '1d')
    })

    await tests.step('assertEquals return current day when +48h have passed', () => {
      assertEquals(timeSince(
        currentDate - DAYS_MILLIS * 23,
        currentDate
      ), 'May 7')
    })
  })
})
