'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import Vue from 'vue'
import Vuex from 'vuex'
import * as db from './database'
import * as Events from '../../../shared/events'
import backend from '../js/backend'
// babel transforms lodash imports: https://github.com/lodash/babel-plugin-lodash#faq
// for diff between 'lodash/map' and 'lodash/fp/map'
// see: https://github.com/lodash/lodash/wiki/FP-Guide
import debounce from 'lodash/debounce'
Vue.use(Vuex)
var store // this is set and made the default export at the bottom of the file.
          // we have it declared here to make it accessible in mutations
// 'state' is the Vuex state object
// NOTE: THE STATE CAN ONLY STORE *SERIALIZABLE* OBJECTS! THAT MEANS IF YOU TRY
//       TO STORE AN INSTANCE OF A CLASS (LIKE A CONTRACT), IT WILL NOT STORE
//       THE ACTUAL CONTRACT, BUT JSON.STRINGIFY(CONTRACT) INSTEAD!
const state = {
  position: null, // TODO: get rid of this?
  currentGroupId: null,
  contracts: {}, // contractIds => type (for contracts we've successfully subscribed to)
  pending: [], // contractIds we've just published but haven't received back yet
  loggedIn: false // TODO: properly handle this
}

// Mutations must be synchronous! Never call these directly!
// http://vuex.vuejs.org/en/mutations.html
const mutations = {
  login (state, user) {
    state.loggedIn = user
  },
  logout (state) {
    state.loggedIn = false
  },
  addContract (state, {contractId, type, data}) {
    // "Mutations Follow Vue's Reactivity Rules" - important for modifying objects
    // See: https://vuex.vuejs.org/en/mutations.html
    Vue.set(state.contracts, contractId, type)
    store.registerModule(contractId, {...Events[type].vuex, ...{state: data}})
    // we've successfully received it back, so remove it from expectation pending
    const index = state.pending.indexOf(contractId)
    state.pending.includes(contractId) && state.pending.splice(index, 1)
  },
  removeContract (state, contractId) {
    store.unregisterModule(contractId)
    Vue.delete(state.contracts, contractId)
  },
  setContracts (state, contracts) {
    for (let contract of contracts) {
      mutations.addContract(state, contract)
    }
  },
  deleteMessage (state, id) {
    let mailboxContract = store.getters.mailboxContract
    let index = mailboxContract && mailboxContract.messages.findIndex(msg => msg.id === id)
    if (index > -1) { mailboxContract.messages.splice(index, 1) }
  },
  markMessageAsRead (state, id) {
    let mailboxContract = store.getters.mailboxContract
    let index = mailboxContract && mailboxContract.messages.findIndex(msg => msg.id === id)
    if (index > -1) { mailboxContract.messages[index].read = true }
  },
  setCurrentGroupId (state, currentGroupId) {
    state.currentGroupId = currentGroupId
    state.position = currentGroupId
  },
  setPosition (state, position) {
    state.position = position
  },
  pending (state, contractId) {
    if (!state.contracts[contractId] && !state.pending.includes(contractId)) {
      state.pending.push(contractId)
    }
  }
}
// https://vuex.vuejs.org/en/getters.html
// https://vuex.vuejs.org/en/modules.html
const getters = {
  currentGroup (state) {
    return state[state.currentGroupId]
  },
  mailboxContract (state) {
    // TODO: If we a user is ever subscribed to multiple mailboxes, this will have to be rewritten
    for (let [key, value] of Object.entries(state.contracts)) {
      if (value === 'MailboxContract') {
        return state[key]
      }
    }
    return null
  },
  mailbox (state) {
    let mailboxContract = store.getters.mailboxContract
    return mailboxContract && mailboxContract.messages
  },
  unreadMessageCount (state) {
    let mailboxContract = store.getters.mailboxContract
    return mailboxContract && mailboxContract.messages.filter((msg) => !msg.read).length
  }
}

const actions = {
  // Used to update contracts to the current state that the server is aware of
  async syncContractWithServer ({dispatch}: {dispatch: Function}, contractId: string) {
    let latest = await backend.latestHash(contractId)
    let recent = await db.recentHash(contractId)
    if (latest !== recent) {
      // TODO Do we need a since call that is inclusive? Since does not imply inclusion
      let events = await backend.eventsSince(contractId, recent || contractId)
      // remove the first element in cases where we are not getting the contract for the first time
      recent && events.shift()
      for (let i = 0; i < events.length; i++) {
        let event = events[i]
        event.contractId = contractId
        await dispatch('handleEvent', event)
      }
    }
  },
  async login (
    {dispatch, commit, state}: {dispatch: Function, commit: Function, state: Object},
    user: string
  ) {
    commit('login', user)
    await dispatch('loadSettings')
    await db.saveCurrentUser(user)
    // This may seem unintuitive to use the state from the global store object
    // but the state object in scope is a copy that becomes stale if something modifies it
    // like an outside dispatch
    for (let key of Object.keys(store.state.contracts)) {
      await backend.subscribe(key)
      await dispatch('syncContractWithServer', key)
    }
    Vue.events.$emit('login', user)
  },
  async logout (
    {dispatch, commit, state}: {dispatch: Function, commit: Function, state: Object},
  ) {
    await dispatch('saveSettings')
    await db.clearCurrentUser()
    for (let key of Object.keys(state.contracts)) {
      await backend.unsubscribe(key)
    }
    commit('logout')
    Vue.events.$emit('logout')
  },
  deleteMessage ({dispatch, commit}, hash) {
    commit('deleteMessage', hash)
    debouncedSave(dispatch)
  },
  markMessageAsRead ({dispatch, commit}, hash) {
    commit('markMessageAsRead', hash)
    debouncedSave(dispatch)
  },
  // this function is called from ./pubsub.js and is the entry point
  // for getting events into the log.
  // mirrors `handleEvent` in backend/server.js
  async handleEvent (
    {dispatch, commit, state}: {dispatch: Function, commit: Function, state: Object},
    {contractId, hash, entry}: {contractId: string, hash: string, entry: Object}
  ) {
    // verify we're expecting to hear from this contract
    if (!state.pending.includes(contractId) && !state.contracts[contractId]) {
      // TODO: use a global notification system to both display a notification
      //       and throw an exception and write a log message.
      return console.error(`NOT EXPECTING EVENT!`, contractId, entry)
    }

    const type = entry.type
    entry = Events[type].fromObject(entry, hash)
    if (entry instanceof Events.HashableContract) {
      console.log(`handleEvent for new ${type}:`, entry)
      if (entry.toObject().parentHash) {
        // TODO: use a global notification object to handle this and all other errors
        return console.error(`${type} has non-null parentHash!`, entry)
      }
      await db.addLogEntry(contractId, entry)
      commit('addContract', {contractId, type, data: entry.toVuexState()})
    } else if (entry instanceof Events.HashableAction) {
      const contractType = state.contracts[contractId]
      console.log(`handleEvent for ${type} on ${contractType}:`, entry)
      if (!Events[contractType].isActionAllowed(state[contractType], entry)) {
        // TODO: implement isActionAllowed in all actions, and handle error better
        return console.error(`bad action ${type} on ${contractType} (${contractId}):`, entry)
      }
      // Subscribe to your fellow group member's identity contracts upon joining
      // TODO right an opposite series of operations for when someone leaves a group
      if (entry instanceof Events.AcceptInvitation && entry.data.username !== state.loggedIn) {
        let identity = await backend.lookup(entry.data.username)
        await backend.subscribe(identity)
        await dispatch('synchronize', identity)
      }
      // TODO: verify each entry is signed by a group member
      let hash = await db.addLogEntry(contractId, entry)
      // If this is a duplicate the hash will be null
      // This may occur if we get duplicate events over the network
      if (!hash) { return }
      commit(`${contractId}/${type}`, entry.data)

      // NOTE: this is to support EventLog.vue + TimeTravel.vue
      //       it's not super important and we'll probably get rid of it later
      if (contractId === state.currentGroupId) {
        commit('setPosition', hash)
      }
    } else {
      return console.error(`UNKNOWN EVENT TYPE!`, contractId, entry)
    }
    // handleEvent might be called very frequently, so save only after a pause
    debouncedSave(dispatch)
    // let any listening components know that we've received, processed, and stored the event
    Vue.events.$emit(hash, contractId, entry)
    Vue.events.$emit('eventHandled', contractId, entry)
  },

  // persisting the state
  async saveSettings (
    {state}: {state: Object}
  ) {
    // TODO: encrypt these
    const settings = {
      position: state.position,
      currentGroupId: state.currentGroupId,
      contracts: Object.keys(state.contracts).map(contractId => ({
        contractId,
        type: state.contracts[contractId],
        data: state[contractId]
      }))
    }
    await db.saveSettings(state.loggedIn, settings)
    console.log('saveSettings:', settings)
  },
  async loadSettings (
    {commit, state}: {commit: Function, state: Object}
  ) {
    const settings = await db.loadSettings(state.loggedIn)
    if (settings) {
      console.log('loadSettings:', settings)
      commit('setCurrentGroupId', settings.currentGroupId)
      commit('setContracts', settings.contracts || [])
    }
  }
}

const debouncedSave = debounce(dispatch => dispatch('saveSettings'), 500)

store = new Vuex.Store({state, mutations, getters, actions})
export default store
// This will build the current contract state from applying all its actions
export async function latestContractState (contractId) {
  let events = await backend.eventsSince(contractId, contractId)
  let [contract, ...actions] = events.map(e => {
    return Events[e.entry.type].fromObject(e.entry, e.hash)
  })
  let state = contract.toVuexState()
  actions.forEach(action => {
    let type = action.constructor.name
    contract.constructor.vuex.mutations[type](state, action.data)
  })
  return state
}
