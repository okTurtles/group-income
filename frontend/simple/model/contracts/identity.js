'use strict'

import Vue from 'vue'
import {DefineContract} from '../utils.js'

export default DefineContract({
  'IdentityContract': {
    constructor: true,
    validate: function (data) {},
    vuex: {
      mutation: (state, {data}) => {
        Object.assign(state, data)
      }
    }
  },
  'IdentitySetAttributes': {
    validate: function (data) {},
    vuex: {
      mutation: (state, {data}) => {
        for (var key in data) {
          Vue.set(state.attributes, key, data[key])
        }
      }
    }
  },
  'IdentityDeleteAttributes': {
    validate: function (data) {},
    vuex: {
      mutation: (state, {data}) => {
        for (var key of data) {
          Vue.delete(state.attributes, key)
        }
      }
    }
  }
})
