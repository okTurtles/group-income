'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import Vue from 'vue'
import Vuex from 'vuex'
import EventLog from './event-log'
import bluebird from 'bluebird'

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
    let db = await EventLog()
    let append = bluebird.promisify(db.append)
    try {
      let hash = await append(value)
      commit('UPDATELOG', {hash, offset: []})
    } catch (ex) {
      throw ex
    }
  },
  async backward ({commit, state}) {
    let db = await EventLog()
    if (state.logPosition) {
      let get = bluebird.promisify(db.get)
      let hash = await get({ hash: state.logPosition, parentHash: true })
      try {
        let offset = state.offset.slice(0)
        offset.push(state.logPosition)
        commit('UPDATELOG', {hash, offset})
      } catch (ex) {
        throw ex
      }
    }
  },
  async forward ({commit, state}) {
    let db = await EventLog()
    if (state.offset.length) {
      let get = bluebird.promisify(db.get)
      let offset = state.offset.slice(0)
      let prior = offset.pop()
      try {
        await get({ hash: prior, parentHash: true })
        commit('UPDATELOG', {hash: prior, offset})
      } catch (ex) {
        throw ex
      }
    }
  },
  loggedIn: state => state.loggedIn
}

// =======================
// Exports
// =======================

export const types = Object.keys(mutations)

// create the store
export default new Vuex.Store({state, mutations, actions})
