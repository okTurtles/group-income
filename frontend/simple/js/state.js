'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import Vue from 'vue'
import Vuex from 'vuex'

const S = require('string')

Vue.use(Vuex)

const state = {
  // TODO: this should be managed by Keychain, not here
  loggedIn: false
}

// Mutations must be synchronous! Never call these directly!
// http://vuex.vuejs.org/en/mutations.html
const mutations = {
  LOGIN (state) { state.loggedIn = true },
  LOGOUT (state) { state.loggedIn = false }
}

// =======================
// Exports
// =======================

export const types = Object.keys(mutations)

// For now we dynamically generate all the actions like this.
// It's rare when anything more complicated is needed, but there
// is an example here:
// http://vuex.vuejs.org/en/actions.html
export const actions = types.reduce((o, el) => {
  var action = S(el.toLowerCase()).camelize().s
  o[action] = ({dispatch}, ...args) => dispatch(el, ...args)
  return o
}, {})

// If it gets more complicated, use modules:
// http://vuex.vuejs.org/en/structure.html

// create the store
export default new Vuex.Store({state, mutations})
