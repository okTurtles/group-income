'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

const state = { count: 0 }

// Mutations must be synchronous! Note that you neve call these directly!
// http://vuex.vuejs.org/en/mutations.html
const mutations = { INCREMENT (state) { state.count++ } }

// =======================
// Exports
// =======================

export const types = Object.keys(mutations)

// Async operations performed within actions
// http://vuex.vuejs.org/en/actions.html
export const actions = {
  increment: ({ dispatch }) => dispatch(types.INCREMENT)
}

// If it gets more complicated use modules:
// http://vuex.vuejs.org/en/structure.html

// create the store
export default new Vuex.Store({state, mutations})
