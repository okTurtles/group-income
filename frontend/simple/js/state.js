'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import Vue from 'vue'
import Vuex from 'vuex'
import * as db from './database'
import * as Events from '../../../shared/events'
import * as contracts from '../js/events'
import backend from '../js/backend'
import _ from 'lodash'
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

Vue.events = new Vue() // global event bus, use: https://vuejs.org/v2/api/#Instance-Methods-Events
const state = {
  position: null, // TODO: get rid of this?
  currentGroupId: null,
  contracts: {}, // contractIds => { type:string, recentHash:string } (for contracts we've successfully subscribed to)
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
    state.currentGroupId = null
  },
  addContract (state, {contractId, recentHash, type, data}) {
    // "Mutations Follow Vue's Reactivity Rules" - important for modifying objects
    // See: https://vuex.vuejs.org/en/mutations.html
    Vue.set(state.contracts, contractId, { type, recentHash })
    store.registerModule(contractId, {...(Events[type] ? Events[type] : contracts[type]).vuex, ...{state: data}})
    // we've successfully received it back, so remove it from expectation pending
    const index = state.pending.indexOf(contractId)
    state.pending.includes(contractId) && state.pending.splice(index, 1)
  },
  setRecentHash (state, {contractId, hash}) {
    state.contracts[contractId] && Vue.set(state.contracts[contractId], 'recentHash', hash)
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
  deleteMessage (state, hash) {
    let mailboxContract = store.getters.mailboxContract
    let index = mailboxContract && mailboxContract.messages.findIndex(msg => msg.hash === hash)
    if (index > -1) { mailboxContract.messages.splice(index, 1) }
  },
  markMessageAsRead (state, hash) {
    let mailboxContract = store.getters.mailboxContract
    let index = mailboxContract && mailboxContract.messages.findIndex(msg => msg.hash === hash)
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
    return store.getters.currentUserIdentityContract && state[store.getters.currentUserIdentityContract.attributes.mailbox]
  },
  mailbox (state) {
    let mailboxContract = store.getters.mailboxContract
    return mailboxContract && mailboxContract.messages
  },
  unreadMessageCount (state) {
    let mailboxContract = store.getters.mailboxContract
    return mailboxContract && mailboxContract.messages.filter((msg) => !msg.read).length
  },
  // Logged In user's identity contract
  currentUserIdentityContract (state) {
    return state[state.loggedIn.identityContractId]
  },
  // list of group names and contractIds
  groupsByName (state) {
    return _.map(_.keys(_.pickBy(state.contracts, (value, key) => value.type === 'GroupContract')), key => ({groupName: state[key].groupName, contractId: key}))
  },
  proposals (state) {
    let proposals = []
    if (!state.currentGroupId) { return proposals }
    for (let groupContractId of Object.keys(state.contracts)
      .filter(key => state.contracts[key].type === 'GroupContract')
    ) {
      for (let proposal of Object.keys(state[groupContractId].proposals)) {
        if (state[groupContractId].proposals[proposal].initatior !== state.loggedIn.name &&
        !state[groupContractId].proposals[proposal].for.find(name => name === state.loggedIn.name) &&
        !state[groupContractId].proposals[proposal].against.find(name => name === state.loggedIn.name)
        ) {
          proposals.push({
            groupContractId,
            groupName: state[groupContractId].groupName,
            proposal,
            initiationDate: state[ groupContractId ].proposals[ proposal ].initiationDate
          })
        }
      }
    }
    return proposals
  }

}

const actions = {
  // Used to update contracts to the current state that the server is aware of
  async syncContractWithServer ({dispatch, state}: {dispatch: Function, state: Object}, contractId: string) {
    let latest = await backend.latestHash(contractId)
    // there is a chance two users are logged in to the same machine and must check their contracts before syncing
    let recent = state.contracts[contractId] ? state.contracts[contractId].recentHash : null
    if (latest !== recent) {
      console.log(`Now Synchronizing Contract: ${contractId} its most recent was ${recent} but the latest is ${latest}`)
      // TODO Do we need a since call that is inclusive? Since does not imply inclusion
      let events = await backend.eventsSince(contractId, recent || contractId)
      // remove the first element in cases where we are not getting the contract for the first time
      state.contracts[contractId] && events.shift()
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
    await db.saveCurrentUser(user.name)
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
    entry = Events[type] ? Events[type].fromObject(entry, hash) : contracts[type].fromObject(entry, hash)
    if (Events.HashableContract.prototype.isPrototypeOf(entry)) {
      console.log(`handleEvent for new ${type}:`, entry)
      if (entry.toObject().parentHash) {
        // TODO: use a global notification object to handle this and all other errors
        return console.error(`${type} has non-null parentHash!`, entry)
      }
      await db.addLogEntry(contractId, entry)
      commit('addContract', {contractId, type, data: entry.toVuexState()})
    } else if (Events.HashableAction.prototype.isPrototypeOf(entry)) {
      const contractType = state.contracts[contractId].type
      console.log(`handleEvent for ${type} on ${contractType}:`, entry)
      if (!contracts[contractType].isActionAllowed(state[contractType], entry)) {
        // TODO: implement isActionAllowed in all actions, and handle error better
        return console.error(`bad action ${type} on ${contractType} (${contractId}):`, entry)
      }
      // TODO: verify each entry is signed by a group member
      try {
        await db.addLogEntry(contractId, entry)
      } catch (ex) {
        console.log(ex)
        return // exit the function early if you cannot add the log entry
      }
      commit('setRecentHash', { contractId, hash: entry.toHash() })
      // If this is a duplicate the hash will be null but we must process further due to users who share the same
      // machine sharing data storage
      commit(`${contractId}/${type}`, {data: entry.data, hash})
      if (store.state[contractId]._async.length) {
        for (let asyncPayload of store.state[contractId]._async) {
          await dispatch(`${contractId}/${asyncPayload.type}`, asyncPayload)
        }
        commit(`${contractId}/clearAsync`)
      }
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
    if (state.loggedIn) {
      // TODO: encrypt these
      const settings = {
        position: state.position,
        currentGroupId: state.currentGroupId,
        contracts: Object.keys(state.contracts).map(contractId => ({
          contractId,
          ...state.contracts[ contractId ],
          data: state[ contractId ]
        }))
      }
      await db.saveSettings(state.loggedIn.name, settings)
      console.log('saveSettings:', settings)
    }
  },
  async loadSettings (
    {commit, state}: {commit: Function, state: Object}
  ) {
    const settings = await db.loadSettings(state.loggedIn.name)
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
    return (Events[e.entry.type] ? Events[e.entry.type].fromObject(e.entry, e.hash) : contracts[e.entry.type].fromObject(e.entry, e.hash))
  })
  let state = contract.toVuexState()
  actions.forEach(action => {
    let type = action.constructor.name
    contract.constructor.vuex.mutations[type](state, {data: action.data, hash: action.hash})
  })
  return state
}
store.subscribe((mutation) => debouncedSave(store.dispatch))
