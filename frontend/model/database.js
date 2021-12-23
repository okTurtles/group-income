'use strict'

import type { Notification } from '@model/notifications/types.flow.js'

import sbp from '~/shared/sbp.js'
import localforage from 'localforage'
import '~/shared/domains/gi/db.js'
import { DAYS_MILLIS } from '~/frontend/utils/time.js'

const log = localforage.createInstance({
  name: 'Group Income',
  storeName: 'Contracts'
})

// make gi.log use localforage for storage
sbp('sbp/selectors/overwrite', {
  'gi.db/get': key => log.getItem(key),
  // TODO: handle QuotaExceededError
  'gi.db/set': (key, value) => log.setItem(key, value)
})

// =======================
// App settings to persist state across sessions
// =======================

const appSettings = localforage.createInstance({
  name: 'Group Income',
  storeName: 'Settings'
})

export const SETTING_CURRENT_USER = '@settings/currentUser'

sbp('sbp/selectors/register', {
  'gi.db/settings/save': function (user: string, value: any): Promise<*> {
    return appSettings.setItem(user, value)
  },
  'gi.db/settings/load': function (user: string): Promise<any> {
    return appSettings.getItem(user)
  },
  'gi.db/settings/delete': function (user: string): Promise<Object> {
    return appSettings.removeItem(user)
  }
})

// =======================
// Save file blobs here
//
// TODO: handle automatically deleting old files when we
//       approach cache limits.
// =======================

const files = localforage.createInstance({
  name: 'Group Income',
  storeName: 'Files'
})

sbp('sbp/selectors/register', {
  'gi.db/files/save': function (url: string, blob: Blob): Promise<*> {
    return files.setItem(url, blob).then(v => {
      console.log('successfully saved:', url)
    }).catch(e => {
      console.error('error saving:', url, e)
    })
  },
  'gi.db/files/load': function (url: string): Promise<Blob> {
    return files.getItem(url)
  },
  'gi.db/files/delete': function (url: string): Promise<Blob> {
    return files.removeItem(url)
  }
})

// =======================
// Save recent notifications here
// =======================

const notificationStorage = localforage.createInstance({
  name: 'Group Income',
  storeName: 'Notifications'
})

/*
 * Updating the notification offline storage:
 * ------------------------------------------
 * 1. Discard any expired notification, e.g. read notifications older than `MAX_AGE_READ`.
 * 2. If MAX_COUNT_READ is defined and valid, and more than MAX_COUNT_READ read notifications remain,
 *   then discard every read notification older than the MAX_COUNT_READ newest ones.
 * 3. Same for MAX_COUNT_UNREAD.
 * 4. If `MAX_COUNT` or less notifications remain candidate for storage,
 *   then store them, sorted by their creation timestamp in descending order.
 * 5. Otherwise,
 *   5a. discard read notifications older than 48h;
 *   5b. discard unread notifications older than three weeks;
 *   5c. discard read notifications older than 25h;
 *   5d. discard unread notifications older than two weeks;
 *   5e. discard read notifications;
 *   5f. discard unread notifications, older ones first.
 */
export const notificationStorageLimits = Object.freeze({
  MAX_AGE_READ: 30 * DAYS_MILLIS,
  MAX_AGE_UNREAD: Infinity,
  // The maximum number of notifications allowed in offline storage.
  MAX_COUNT: 30,
  MAX_COUNT_READ: 20,
  MAX_COUNT_UNREAD: 30
})

sbp('sbp/selectors/register', {
  'gi.db/notifications/save': function (username: string, items: Notification[]): Promise<void> {
    return notificationStorage.setItem(username, items)
  },
  'gi.db/notifications/load': function (username: string): Promise<Notification[]> {
    return notificationStorage.getItem(username)
  },
  'gi.db/notifications/delete': function (username: string): Promise<void> {
    return notificationStorage.removeItem(username)
  }
})
