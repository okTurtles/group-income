'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import Vue from 'vue'
import Vuex from 'vuex'
import * as db from './database'
import * as Events from '../../../shared/events'

// babel transforms lodash imports: https://github.com/lodash/babel-plugin-lodash#faq
// for diff between 'lodash/map' and 'lodash/fp/map'
// see: https://github.com/lodash/lodash/wiki/FP-Guide
import debounce from 'lodash/debounce'
import {mapValues} from './utils'

Vue.use(Vuex)

// This is the Vuex state object
const state = {
  position: null,
  offset: [],
  currentGroupId: null,
  contracts: {}, // contracts we've successfully subscribed to
  whitelist: [], // contracts we're expecting to subscribe to
  loggedIn: false // TODO: properly handle this
}

// Mutations must be synchronous! Never call these directly!
// http://vuex.vuejs.org/en/mutations.html
const mutations = {
  addContract (state, {contractId, contract}) {
    // "Mutations Follow Vue's Reactivity Rules" - important for modifying objects
    // See: https://vuex.vuejs.org/en/mutations.html
    Vue.set(state.contracts, contractId, contract)
  },
  removeContract (state, contractId) {
    Vue.delete(state.contracts, contractId)
    let index = state.whitelist.indexOf(contractId)
    index > -1 && state.whitelist.splice(index, 1)
  },
  setContracts (state, groups) {
    state.contracts = groups
  },
  setCurrentGroupId (state, currentGroupId) {
    state.currentGroupId = currentGroupId
    state.offset = []
  },
  whitelist (state, contractId) {
    let index = state.whitelist.indexOf(contractId)
    index === -1 && state.whitelist.push(contractId)
  },
  setWhitelist (state, whitelist) {
    state.whitelist = whitelist
  },
  // time travel related
  setPosition (state, position: string) {
    state.position = position
    state.offset = []
  },
  backward (state, offset) {
    state.offset.push(state.position)
    state.position = offset
  },
  forward (state) {
    if (state.offset.length > 0) {
      state.position = state.offset.pop()
    }
  }
}

// https://vuex.vuejs.org/en/getters.html
const getters = {
  currentGroup (state) {
    return state.contracts[state.currentGroupId]
  }
}

const actions = {
  // this function is called from ./pubsub.js and is the entry point
  // for getting events into the log.
  // mirrors `handleEvent` in backend/server.js
  async handleEvent (
    {dispatch, commit, state}: {dispatch: Function, commit: Function, state: Object},
    {contractId, hash, entry}: {contractId: string, hash: string, entry: Object}
  ) {
    // verify we're expecting to hear from this contract
    if (state.whitelist.indexOf(contractId) === -1) {
      // TODO: use a global notification system to both display a notification
      //       and throw an exception and write a log message.
      return console.error(`EVENT NOT WHITELISTED:`, contractId, entry)
    }

    entry = Events[entry.type].fromObject(entry, hash)
    const aName = entry.constructor.name
    if (entry instanceof Events.HashableContract) {
      console.log(`handleEvent for new ${aName}:`, entry)
      if (entry.toObject().parentHash) {
        // TODO: use a global notification object to handle this and all other errors
        return console.error(`${aName} has non-null parentHash!`, entry)
      }
      await db.addLogEntry(contractId, entry)
      entry.initStateFromData()
      commit('addContract', {contractId, contract: entry})
    } else if (entry instanceof Events.HashableAction) {
      var contract = state.contracts[contractId]
      const cName = contract.constructor.name
      console.log(`handleEvent for ${aName} on ${cName}:`, entry)
      if (!contract.isActionAllowed(entry)) {
        // TODO: implement isActionAllowed in all actions, and handle error better
        return console.error(`bad action ${aName} on ${cName} (${contractId}):`, entry)
      }
      // TODO: verify each entry is signed by a group member
      await db.addLogEntry(contractId, entry)
      entry.apply(contract, Vue)
    } else {
      return console.error(`UNKNOWN EVENT TYPE!`, contractId, entry)
    }
    // handleEvent might be called very frequently, so save only after a pause
    debouncedSave(dispatch)
    Vue.events.$emit(hash, contractId, entry)
  },

  // persisting the state
  async saveSettings (
    {state}: {state: Object}
  ) {
    // TODO: encrypt these
    const settings = {
      currentGroupId: state.currentGroupId,
      contracts: mapValues(state.contracts, v => ({type: v.constructor.name, state: v.state})),
      whitelist: state.whitelist
    }
    await db.saveSettings(settings)
    console.log('saveSettings:', settings)
  },
  async loadSettings (
    {commit, state}: {commit: Function, state: Object}
  ) {
    const settings = await db.loadSettings()
    console.log('loadSettings:', settings)
    let {contracts, currentGroupId, whitelist} = settings
    contracts = mapValues(contracts, v => Events[v.type].fromState(v.state))
    commit('setCurrentGroupId', currentGroupId)
    commit('setContracts', contracts || [])
    commit('setWhitelist', whitelist || [])
  },

  // time travel related
  async backward (
    {commit, state}: {commit: Function, state: Object}
  ) {
    if (state.currentGroupId) {
      let entry = await db.getLogEntry(state.currentGroupId, state.position)
      commit('backward', entry.toObject().parentHash)
    }
  },
  forward (
    {commit, state}: {commit: Function, state: Object}
  ) {
    state.currentGroupId && commit('forward')
  }
}

const debouncedSave = debounce(dispatch => dispatch('saveSettings'), 500)

export default new Vuex.Store({state, mutations, getters, actions})
