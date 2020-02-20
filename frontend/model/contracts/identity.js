'use strict'

import sbp from '~/shared/sbp.js'
import Vue from 'vue'
import { DefineContract } from './Contract.js'
import { objectOf, objectMaybeOf, arrayOf, string, object } from '~/frontend/utils/flowTyper.js'

DefineContract({
  name: 'gi.contracts/identity',
  state (contractID) {
    return sbp('state/vuex/state')[contractID]
  },
  actions: {
    'gi.contracts/identity': {
      validate: objectOf({
        attributes: objectMaybeOf({
          name: string,
          email: string,
          picture: string
        })
      }),
      process (state, { data }) {
        for (const key in data) {
          Vue.set(state, key, data[key])
        }
      }
    },
    'gi.contracts/identity/setAttributes': {
      validate: object,
      process (state, { data }) {
        for (var key in data) {
          Vue.set(state.attributes, key, data[key])
        }
      }
    },
    'gi.contracts/identity/deleteAttributes': {
      validate: arrayOf(string),
      process (state, { data }) {
        for (var attribute of data) {
          Vue.delete(state.attributes, attribute)
        }
      }
    }
  }
})
