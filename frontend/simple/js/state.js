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
// Used by the getters and mutations to find the mailbox contracts
function getMailbox (state) {
  for (let [key, value] of Object.entries(state.contracts)) {
    if (value === 'MailboxContract') {
      return key
    }
  }
  return null
}
// 'state' is the Vuex state object
// NOTE: THE STATE CAN ONLY STORE *SERIALIZABLE* OBJECTS! THAT MEANS IF YOU TRY
//       TO STORE AN INSTANCE OF A CLASS (LIKE A CONTRACT), IT WILL NOT STORE
//       THE ACTUAL CONTRACT, BUT JSON.STRINGIFY(CONTRACT) INSTEAD!
const state = {
  position: null,
  offset: [],
  // NOTE: time travel is broken now. Should be implemented using `store.subscribe` instead of that
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
    let index = state.pending.indexOf(contractId)
    index > -1 && state.pending.splice(index, 1)
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
  deleteMail (state, hash) {
    let mailbox = getMailbox(state)
    if (mailbox) {
      let index = state[ mailbox ].messages.findIndex(msg => msg.hash === hash)
      if (index > -1) {
        state[ mailbox ].messages.splice(index, 1)
      }
    }
  },
  readMail (state, hash) {
    let mailbox = getMailbox(state)
    if (mailbox) {
      let index = state[ mailbox ].messages.findIndex(msg => msg.hash === hash)
      if (index > -1) {
        state[ mailbox ].messages[index].read = true
      }
    }
  },
  setCurrentGroupId (state, currentGroupId) {
    state.currentGroupId = currentGroupId
    state.offset = []
  },
  pending (state, contractId) {
    let index = state.pending.indexOf(contractId)
    index === -1 && state.pending.push(contractId)
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
// https://vuex.vuejs.org/en/modules.html
const getters = {
  currentGroup (state) {
    return state[state.currentGroupId]
  },
  mailbox (state) {
    return getMailbox(state)
  },
  unread (state) {
    let mailbox = getMailbox(state)
    return state[ mailbox ].messages.filter((msg) => !msg.read).length
  }
}

const actions = {
  // Used to update contracts to the current state that the server is aware of
  async synchronize ({dispatch}: {dispathc: Function}, contractId: string) {
    let latest = await backend.latestHash(contractId)
    let recent = await db.recentHash(contractId)
    if (latest !== recent) {
      let events = await backend.eventsSince(contractId, recent || contractId)
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
    for (let key of Object.keys(state.contracts)) {
      await backend.subscribe(key)
      await dispatch('synchronize', key)
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
  deleteMail ({dispatch, commit}, hash) {
    commit('deleteMail', hash)
    debouncedSave(dispatch)
  },
  readMail ({dispatch, commit}, hash) {
    commit('readMail', hash)
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
    if (state.pending.indexOf(contractId) === -1 && !state.contracts[contractId]) {
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
      // TODO: verify each entry is signed by a group member
      await db.addLogEntry(contractId, entry)
      entry.data.hash = hash
      commit(`${contractId}/${type}`, entry.data)
      if (state.currentGroupId === contractId) {
        commit('setPosition', hash)
      }
    } else {
      return console.error(`UNKNOWN EVENT TYPE!`, contractId, entry)
    }
    // handleEvent might be called very frequently, so save only after a pause
    debouncedSave(dispatch)
    // let any listening components know that we've received, processed, and stored the event
    Vue.events.$emit(hash, contractId, entry)
  },

  // persisting the state
  async saveSettings (
    {state}: {state: Object}
  ) {
    // TODO: encrypt these
    const settings = {
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

store = new Vuex.Store({state, mutations, getters, actions})
export default store
