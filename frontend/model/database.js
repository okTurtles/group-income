'use strict'

import sbp from '~/shared/sbp.js'
import localforage from 'localforage'
import '~/shared/domains/gi/log.js'

const log = localforage.createInstance({
  name: 'Group Income',
  storeName: 'Contracts'
})

// make gi.log use localforage for storage
sbp('sbp/selectors/overwrite', {
  'gi.log/get': key => log.getItem(key),
  'gi.log/set': (key, value) => log.setItem(key, value)
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
  'gi/settings/save': function (user: string, value: any): Promise<*> {
    return appSettings.setItem(user, value)
  },
  'gi/settings/load': function (user: string): Promise<any> {
    return appSettings.getItem(user)
  },
  'gi/settings/delete': function (user: string): Promise<Object> {
    return appSettings.removeItem(user)
  }
})
