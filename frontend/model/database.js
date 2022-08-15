'use strict'

import sbp from '@sbp/sbp'
import localforage from 'localforage'

if (process.env.LIGHTWEIGHT_CLIENT !== 'true') {
  const log = localforage.createInstance({
    name: 'Group Income',
    storeName: 'Contracts'
  })
  // use localforage for storage
  sbp('sbp/selectors/overwrite', {
    'chelonia/db/get': key => log.getItem(key),
    // TODO: handle QuotaExceededError
    'chelonia/db/set': (key, value) => log.setItem(key, value),
    'chelonia/db/delete': (key: string) => log.removeItem(key)
  })
  sbp('sbp/selectors/lock', ['chelonia/db/get', 'chelonia/db/set', 'chelonia/db/delete'])
}

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

// ======================================
// Archve for proposals and anything else
// ======================================

const archive = localforage.createInstance({
  name: 'Group Income',
  storeName: 'Archive'
})

sbp('sbp/selectors/register', {
  'gi.db/archive/save': function (key: string, value: any): Promise<*> {
    return archive.setItem(key, value)
  },
  'gi.db/archive/load': function (key: string): Promise<any> {
    return archive.getItem(key)
  },
  'gi.db/archive/delete': function (key: string): Promise<Object> {
    return archive.removeItem(key)
  }
})
