'use strict'

import sbp from '@sbp/sbp'
import Vue from 'vue'
// HACK: work around esbuild code splitting / chunking bug: https://github.com/evanw/esbuild/issues/399
import '~/shared/domains/chelonia/chelonia.js'
import { objectOf, objectMaybeOf, arrayOf, string, object } from '~/frontend/utils/flowTyper.js'
import { merge } from '~/frontend/utils/giLodash.js'
import L from '~/frontend/views/utils/translations.js'

sbp('chelonia/defineContract', {
  name: 'gi.contracts/identity',
  getters: {
    currentIdentityState (state) {
      return state
    },
    loginState (state, getters) {
      return getters.currentIdentityState.loginState
    }
  },
  actions: {
    'gi.contracts/identity': {
      validate: objectMaybeOf({
        attributes: objectMaybeOf({
          username: string,
          email: string,
          picture: string
        })
      }),
      process ({ data }, { state }) {
        const initialState = merge({
          settings: {},
          attributes: {}
        }, data)
        for (const key in initialState) {
          Vue.set(state, key, initialState[key])
        }
      }
    },
    'gi.contracts/identity/setAttributes': {
      validate: object,
      process ({ data }, { state }) {
        for (const key in data) {
          Vue.set(state.attributes, key, data[key])
        }
      }
    },
    'gi.contracts/identity/deleteAttributes': {
      validate: arrayOf(string),
      process ({ data }, { state }) {
        for (const attribute of data) {
          Vue.delete(state.attributes, attribute)
        }
      }
    },
    'gi.contracts/identity/updateSettings': {
      validate: object,
      process ({ data }, { state }) {
        for (const key in data) {
          Vue.set(state.settings, key, data[key])
        }
      }
    },
    'gi.contracts/identity/setLoginState': {
      validate: objectOf({
        groupIds: arrayOf(string)
      }),
      process ({ data }, { state }) {
        Vue.set(state, 'loginState', data)
      },
      async sideEffect () {
        try {
          await sbp('gi.actions/identity/updateLoginStateUponLogin')
        } catch (e) {
          sbp('gi.notifications/emit', 'ERROR', {
            message: L("Failed to groups we're part of with other computer. Not catastrophic, but could lead to problems. {errName}: '{errMsg}'", {
              errName: e.name,
              errMsg: e.message || '?'
            })
          })
        }
      }
    }
  }
})
