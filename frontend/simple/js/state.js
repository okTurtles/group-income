'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import Vue from 'vue'
import Vuex from 'vuex'
import EventLog from './event-log'

Vue.use(Vuex)

// TODO: save only relevant state to localforage
const state = {
  logPosition: null,
  // TODO: this should be managed by Keychain, not here
  loggedIn: false,
  offset: []
}

// Mutations must be synchronous! Never call these directly!
// http://vuex.vuejs.org/en/mutations.html
const mutations = {
  LOGIN (state) { state.loggedIn = true },
  LOGOUT (state) { state.loggedIn = false },
  UPDATELOG (state, hash) { state.logPosition = hash },
  POPOFFSET (state) {},
  PUSHOFFSET (state) {}
}

export const actions = {
  apppendLog ({commit}, value) {
    (async function () {
      let db = await EventLog()
      db.append(value, (err, hash) => {
        if (err) {
          throw err
        }
        commit('UPDATELOG', hash)
      })
    })()
  },
  backward ({commit, state}) {
    (async function () {
      let db = await EventLog()
      db.get(state.logPosition, (err, entry) => {
        if (err) {
          throw err
        }
        commit('UPDATELOG', entry)
      })
    })()
  },
  forward () {

  },
  loggedIn: state => state.loggedIn
}

// =======================
// Exports
// =======================

export const types = Object.keys(mutations)

// If it gets more complicated, use modules:
// http://vuex.vuejs.org/en/structure.html

// create the store
export default new Vuex.Store({state, mutations, actions})
