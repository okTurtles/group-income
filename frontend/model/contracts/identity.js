'use strict'

import Vue from 'vue'
import { DefineContract } from './Contract.js'
import {
  objectOf,
  arrayOf,
  string,
  object
} from '~/frontend/utils/flowTyper.js'

export default DefineContract({
  name: 'gi.contracts/identity',
  contract: {
    validate: objectOf({
      attributes: object
    }),
    process (state, { data }) {
      Vue.set(state, 'attributes', data.attributes)
    }
  },
  actions: {
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

/*
export default DefineContract({
  'IdentityContract': {
    isConstructor: true,
    validate: objectOf({
      attributes: object
    }),
    vuexModuleConfig: {
      initialState: { attributes: {} },
      mutation: (state, { data }) => {
        state.attributes = data.attributes
      }
    }
  },
  'IdentitySetAttributes': {
    validate: object,
    vuexModuleConfig: {
      mutation: (state, { data }) => {
        for (var key in data) {
          Vue.set(state.attributes, key, data[key])
        }
      }
    }
  },
  'IdentityDeleteAttributes': {
    validate: arrayOf(string),
    vuexModuleConfig: {
      mutation: (state, { data }) => {
        for (var attribute of data) {
          Vue.delete(state.attributes, attribute)
        }
      }
    }
  }
})
*/
