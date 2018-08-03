'use strict'

import Vue from 'vue'
import {DefineContract} from '../utils.js'

export default DefineContract({
  'IdentityContract': {
    isConstructor: true,
    validate: function (data) {
      // NOTE: now this is just an object of key/values
      // ['attributes', 'Attribute', 'repeated']
    },
    vuexModuleConfig: {
      initialState: {attributes: {}},
      mutation: (state, {data}) => {
        state.attributes = data.attributes
      }
    }
  },
  'IdentitySetAttributes': {
    validate: function (data) {
      // now just an object of key/values
    },
    vuexModuleConfig: {
      mutation: (state, {data}) => {
        for (var key in data) {
          Vue.set(state.attributes, key, data[key])
        }
      }
    }
  },
  'IdentityDeleteAttributes': {
    validate: function (data) {
      // now an array of keys
    },
    vuexModuleConfig: {
      mutation: (state, {data}) => {
        for (var attribute of data) {
          Vue.delete(state.attributes, attribute)
        }
      }
    }
  }
})
