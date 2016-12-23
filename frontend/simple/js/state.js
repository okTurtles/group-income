'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import Vue from 'vue'
import Vuex from 'vuex'
import {default as EventLog, loaded} from './event-log'
import Promise from 'bluebird'

Vue.use(Vuex)

// TODO: save only relevant state to localforage
const state = {
  logPosition: null,
  // TODO: this should be managed by Keychain, not here
  loggedIn: false,
  offset: []
}
var db
var append
var get
loaded.then(() => {
  db = EventLog()
  append = Promise.promisify(db.append)
  get = Promise.promisify(db.get)
})
// Mutations must be synchronous! Never call these directly!
// http://vuex.vuejs.org/en/mutations.html
const mutations = {
  LOGIN (state) { state.loggedIn = true },
  LOGOUT (state) { state.loggedIn = false },
  UPDATELOG (state, hash) {
    let offset = state.offset
    if (typeof hash === 'object') {
      offset = hash.offset
      hash = hash.hash
    }
    state.logPosition = hash
    state.offset = offset
  }
}

export const actions = {
  async apppendLog ({commit}, value) {
    let hash = await append(value)
    commit('UPDATELOG', {hash, offset: []})
  },
  async backward ({commit, state}) {
    if (state.logPosition) {
      let hash = await get({ hash: state.logPosition, parentHash: true })
      let offset = state.offset.slice(0)
      offset.push(state.logPosition)
      commit('UPDATELOG', {hash, offset})
    }
  },
  async forward ({commit, state}) {
    if (state.offset.length) {
      let offset = state.offset.slice(0)
      let prior = offset.pop()
      await get({ hash: prior, parentHash: true })
      commit('UPDATELOG', {hash: prior, offset})
    }
  },
  loggedIn: state => state.loggedIn,
  login ({commit, state}) {
    if (state.loggedIn) {
      return
    }
    commit('LOGIN')
  },
  logout ({commit, state}) {
    if (!state.loggedIn) {
      return
    }
    commit('LOGOUT')
  }
}

// =======================
// Exports
// =======================

export const types = Object.keys(mutations)

// create the store
export default new Vuex.Store({state, mutations, actions})
