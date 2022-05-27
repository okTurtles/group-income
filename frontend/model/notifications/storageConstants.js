import {
  DAYS_MILLIS
} from '/assets/js/common.js' // eslint-disable-line import/no-absolute-path

// The maximum allowed age of read (resp. unread) stored notifications.
// Not to be confused with maximum storage duration.
export const MAX_AGE_READ = 30 * DAYS_MILLIS
export const MAX_AGE_UNREAD = Infinity
// The maximum allowed number of stored notifications.
export const MAX_COUNT = 30
// The maximum allowed number of read (resp. unread) stored notifications.
export const MAX_COUNT_READ = 20
export const MAX_COUNT_UNREAD = 30
