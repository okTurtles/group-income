'use strict'

import sbp from '@sbp/sbp'
import Vue from 'vue'
import { maxLength } from 'vuelidate/lib/validators'
// HACK: work around esbuild code splitting / chunking bug: https://github.com/evanw/esbuild/issues/399
import '~/shared/domains/chelonia/chelonia.js'
import { objectOf, objectMaybeOf, arrayOf, string, object } from '~/frontend/utils/flowTyper.js'
import { merge } from '~/frontend/utils/giLodash.js'
import { alphanumericOrHyphens, noConsecutiveHyphens, noLeadingOrTrailingHyphen, noUppercase } from '~/frontend/views/utils/validators.js'
import L from '~/frontend/views/utils/translations.js'

import { IDENTITY_USERNAME_MAX_CHARS } from './constants.js'

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
      validate: (data, { state, meta }) => {
        objectMaybeOf({
          attributes: objectMaybeOf({
            username: string,
            email: string,
            picture: string
          })
        })(data)
        const { username } = data.attributes
        if (!maxLength(IDENTITY_USERNAME_MAX_CHARS)(username)) {
          throw new TypeError(`A username cannot exceed ${IDENTITY_USERNAME_MAX_CHARS} characters.`)
        }
        if (!alphanumericOrHyphens(username)) {
          throw new TypeError('A username cannot contain non-alphanumeric characters.')
        }
        if (!noConsecutiveHyphens(username)) {
          throw new TypeError('A username cannot contain two consecutive hyphens.')
        }
        if (!noLeadingOrTrailingHyphen(username)) {
          throw new TypeError('A username cannot start or end with a hyphen.')
        }
        if (!noUppercase(username)) {
          throw new TypeError('A username cannot contain uppercase letters.')
        }
      },
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
