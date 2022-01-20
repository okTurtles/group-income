'use strict'

import sbp from '~/shared/sbp.js'
import localforage from 'localforage'
import '~/shared/domains/gi/db.js'

const log = localforage.createInstance({
  name: 'Group Income',
  storeName: 'Contracts'
})

const isLightweightClient = process.env.LIGHTWEIGHT_CLIENT === 'true'

// make gi.log use localforage for storage
sbp('sbp/selectors/overwrite',
  isLightweightClient
    ? {
        'gi.db/get': key => {
          const contractId = sbp('gi.db/log/contractIdFromLogHEAD', key)
          if (!contractId) {
            return null
          }
          const state = sbp('state/vuex/state')
          if (state.contracts[contractId]?.HEAD) {
            return state.contracts[contractId].HEAD
          }
          return null
        },
        'gi.db/set': (key, value) => {
          return Promise.resolve(value)
        },
        'gi.db/delete': () => {
          return Promise.resolve()
        }
      }
    : {
        'gi.db/get': key => {
          return log.getItem(`${key}`)
        },
        // TODO: handle QuotaExceededError
        'gi.db/set': (key, value) => {
          return log.setItem(key, value)
        },
        'gi.db/delete': (key: string) => {
          return log.removeItem(`${key}`)
        }
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
