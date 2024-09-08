import { DAYS_MILLIS } from '~/frontend/model/contracts/shared/time.js'

// The maximum allowed age of read (resp. unread) stored notifications.
// Not to be confused with maximum storage duration.
// Notifications older than `MAX_AGE_READ` are automatically marked as read
export const MAX_AGE_READ = 60 * DAYS_MILLIS
// Notifications older than `MAX_AGE_UNREAD` are automatically discarded.
export const MAX_AGE_UNREAD = 180 * DAYS_MILLIS
// The maximum allowed number of stored notifications.
export const MAX_COUNT = 30
// The maximum allowed number of read (resp. unread) stored notifications.
export const MAX_COUNT_READ = 20
export const MAX_COUNT_UNREAD = 30
