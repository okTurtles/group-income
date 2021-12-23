import type { Notification } from './types.flow.js'

import { notificationStorageLimits } from '@model/database.js'

import { DAYS_MILLIS as ONE_DAY, HOURS_MILLIS as ONE_HOUR } from '~/frontend/utils/time.js'

const {
  MAX_AGE_READ,
  MAX_AGE_UNREAD,
  MAX_COUNT,
  MAX_COUNT_READ,
  MAX_COUNT_UNREAD
} = notificationStorageLimits

// How much time a notification can stay in the "new" state.
export const NEW_STATUS_MAX_AGE = 2 * ONE_HOUR

export function age (notification: Notification): number {
  return Date.now() - notification.timestamp
}

export function applyStorageRules (notifications: Notification[]): Notification[] {
  // Apply the MAX_AGE constraint by selecting items that have not yet expired.
  let items = notifications.filter(item => !isExpired(item))

  if (items.length > MAX_COUNT) {
    // Sort the list by descending priority order.
    items.sort(compareOnPriority)

    // Apply the MAX_COUNT_READ and MAX_COUNT_UNREAD constraints if necessary.
    ;[
      [item => item.read, MAX_COUNT_READ],
      [item => !item.read, MAX_COUNT_UNREAD]
    ].forEach(([condition, associatedMaxCount]) => {
      if (associatedMaxCount !== -1 && associatedMaxCount < MAX_COUNT) {
        let count = 0

        items = items.filter(item => !condition(item) || (count++, count <= associatedMaxCount))
      }
    })
  }
  // Check if there are still too many items to store.
  if (items.length > MAX_COUNT) {
    // Truncate the list to discard items which have the lowest "weights".
    items.length = MAX_COUNT
  }
  // Sort items in chronological order, newest items first.
  // In case two items have the same age, then make the higher priority item come first.
  return items.sort((itemA, itemB) => age(itemA) - age(itemB))
}

export function compareOnPriority (notificationA: Notification, notificationB: Notification): -1 | 0 | 1 {
  const TWO_DAYS = 2 * ONE_DAY
  const FIFTEEN_DAYS = 15 * ONE_DAY
  const THREE_WEEKS = 21 * ONE_DAY
  const preferA = -1
  const preferB = 1

  if (notificationA.read && !notificationB.read) {
    if (age(notificationA) < ONE_DAY && age(notificationB) > FIFTEEN_DAYS) {
      return preferA
    }
    if (age(notificationA) < TWO_DAYS && age(notificationB) > THREE_WEEKS) {
      return preferA
    }
    return preferB
  }
  if (!notificationA.read && notificationB.read) {
    if (age(notificationA) > FIFTEEN_DAYS && age(notificationB) < ONE_DAY) {
      return preferB
    }
    if (age(notificationA) > THREE_WEEKS && age(notificationB) < TWO_DAYS) {
      return preferB
    }
    return preferA
  }
  return age(notificationA) <= age(notificationB) ? preferA : preferB
}

export function isExpired (notification: Notification): boolean {
  return age(notification) > maxAge(notification)
}

export function isNew (notification: Notification): boolean {
  return Date.now() - notification.timestamp < NEW_STATUS_MAX_AGE
}

export function isOlder (notification: Notification): boolean {
  return !isNew(notification)
}

export function maxAge (notification: Notification): number {
  return notification.read ? MAX_AGE_READ : MAX_AGE_UNREAD
}
