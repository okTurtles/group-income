'use strict'

import Vue from 'vue'
import { DefineContract } from '../utils.js'
import {
  objectOf,
  arrayOf,
  string,
  object
} from '../../utils/flow-typer.js'
// } from 'flow-typer-js'

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
