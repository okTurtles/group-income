import type { Notification } from './types.flow.js'

import { DAYS_MILLIS as ONE_DAY, HOURS_MILLIS as ONE_HOUR } from '~/frontend/utils/time.js'

import {
  MAX_AGE_READ,
  MAX_AGE_UNREAD,
  MAX_COUNT,
  MAX_COUNT_READ,
  MAX_COUNT_UNREAD
} from './storageConstants.js'

// How much time a notification can stay in the "new" state.
export const NEW_STATUS_DURATION = 2 * ONE_HOUR

export function age (notification: Notification): number {
  return Date.now() - notification.timestamp
}

/*
 * Creates a copy of the given notification list, possibly sorted and/or truncated to
 * make it suitable for offline storage.
 *
 * Algorithm steps taken on the copy:
 *
 * 1. Discard any expired notification, e.g. read notifications older than `MAX_AGE_READ`.
 * 2. If `MAX_COUNT_READ` is defined and more than `MAX_COUNT_READ` read
 *    notifications remain, then:
 *   2a. discard every read notification older than the `MAX_COUNT_READ` newest ones.
 * 3. Same step for `MAX_COUNT_UNREAD`.
 * 4. If `MAX_COUNT` is undefined or no more than `MAX_COUNT` notifications remain, then:
 *   4a. sort them by their creation timestamp, in descending order;
 *   4b. return them.
 * 5. Otherwise, take these steps until no more than `MAX_COUNT` notifications remain:
 *   5a. discard read notifications older than 48h;
 *   5b. discard unread notifications older than three weeks;
 *   5c. discard read notifications older than 25h;
 *   5d. discard unread notifications older than two weeks;
 *   5e. discard read notifications;
 *   5f. discard unread notifications, older ones first.
 * 6. Return the remaining notifications.
 */
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
  return items.sort(compareOnAge)
}

// Compares notifications, so that newer ones come first.
export function compareOnAge (notificationA: Notification, notificationB: Notification): -1 | 1 {
  return age(notificationA) <= age(notificationB) ? -1 : 1
}

// Compares notifications, so that higher priority ones come first.
export function compareOnPriority (notificationA: Notification, notificationB: Notification): -1 | 1 {
  const TWO_DAYS = 2 * ONE_DAY
  const FIFTEEN_DAYS = 15 * ONE_DAY
  const THREE_WEEKS = 21 * ONE_DAY
  const preferA = -1
  const preferB = 1

  // If the given notifications are both read or both unread, then prefer the newer one.
  if (notificationA.read === notificationB.read) {
    return age(notificationA) <= age(notificationB) ? preferA : preferB
  } else {
    // Here, one notification is read, the other is unread.
    const read = notificationA.read ? notificationA : notificationB
    const unread = !notificationA.read ? notificationA : notificationB

    // Prefer the unread one by default.
    let preferred = unread

    // However, under certain conditions we might want to keep the already read one instead.
    // Note: use a condition array so that it is easy to add/remove conditions later.
    const conditions = [
      (read, unread) => age(read) < ONE_DAY && age(unread) > FIFTEEN_DAYS,
      (read, unread) => age(read) < TWO_DAYS && age(unread) > THREE_WEEKS
    ]
    if (conditions.some(condition => condition(read, unread))) {
      preferred = read
    }
    return preferred === notificationA ? preferA : preferB
  }
}

export function isExpired (notification: Notification): boolean {
  return age(notification) > maxAge(notification)
}

export function isNew (notification: Notification): boolean {
  return Date.now() - notification.timestamp < NEW_STATUS_DURATION
}

export function isOlder (notification: Notification): boolean {
  return !isNew(notification)
}

export function maxAge (notification: Notification): number {
  return notification.read ? MAX_AGE_READ : MAX_AGE_UNREAD
}
