'use strict'

import sbp from '~/shared/sbp.js'
import localforage from 'localforage'
import '~/shared/domains/gi/db.js'

const log = localforage.createInstance({
  name: 'Group Income',
  storeName: 'Contracts'
})

// make gi.log use localforage for storage
sbp('sbp/selectors/overwrite', {
  'gi.db/log/get': key => log.getItem(key),
  'gi.db/log/set': (key, value) => log.setItem(key, value)
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
