'use strict'

import Vue from 'vue'
import {DefineContract} from '../utils.js'

export default DefineContract({
  'IdentityContract': {
    constructor: true,
    validate: function (data) {
      // NOTE: now this is just an object of key/values
      // ['attributes', 'Attribute', 'repeated']
    },
    vuex: {
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
    vuex: {
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
    vuex: {
      mutation: (state, {data}) => {
        for (var attribute of data) {
          Vue.delete(state.attributes, attribute)
        }
      }
    }
  }
})
