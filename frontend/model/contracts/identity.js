'use strict'

import sbp from '@sbp/sbp'
import { Vue, L } from '@common/common.js'
import { merge } from './shared/giLodash.js'
import { objectOf, objectMaybeOf, arrayOf, string, object } from '~/frontend/model/contracts/misc/flowTyper.js'

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
      sideEffect ({ contractID }) {
        // it only makes sense to call updateLoginStateUponLogin for ourselves
        if (contractID === sbp('state/vuex/getters').ourIdentityContractId) {
          // makes sure that updateLoginStateUponLogin gets run after the entire identity
          // state has been synced, this way we don't end up joining groups we've left, etc.
          sbp('chelonia/queueInvocation', contractID, ['gi.actions/identity/updateLoginStateUponLogin'])
            .catch((e) => {
              sbp('gi.notifications/emit', 'ERROR', {
                message: L("Failed to join groups we're part of on another device. Not catastrophic, but could lead to problems. {errName}: '{errMsg}'", {
                  errName: e.name,
                  errMsg: e.message || '?'
                })
              })
            })
        }
      }
    }
  }
})
