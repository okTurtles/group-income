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
  currentGroupId: null,
  contracts: {}, // contractIds => { type:string, recentHash:string } (for contracts we've successfully subscribed to)
  pending: [], // contractIds we've just published but haven't received back yet
  loggedIn: false // false | { name: string, identityContractId: string }
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
  currentGroupState (state) {
    return state[state.currentGroupId]
  },
  mailboxContract (state, getters) {
    return getters.currentUserIdentityContract && state[getters.currentUserIdentityContract.attributes.mailbox]
  },
  mailbox (state, getters) {
    let mailboxContract = getters.mailboxContract
    return mailboxContract && mailboxContract.messages
  },
  unreadMessageCount (state, getters) {
    let mailboxContract = getters.mailboxContract
    return mailboxContract && mailboxContract.messages.filter((msg) => !msg.read).length
  },
  // Logged In user's identity contract
  currentUserIdentityContract (state) {
    return state[state.loggedIn.identityContractId]
  },
  // list of group names and contractIds
  groupsByName (state) {
    return _.map(
      _.keys(_.pickBy(state.contracts, (value, key) => value.type === 'GroupContract')),
      key => ({groupName: state[key].groupName, contractId: key})
    )
  },
  proposals (state) {
    let proposals = []
    if (!state.currentGroupId) { return proposals }
    for (let groupContractId of Object.keys(state.contracts)
      .filter(key => state.contracts[key].type === 'GroupContract')
    ) {
      for (let proposal of Object.keys(state[groupContractId].proposals || {})) {
        if (state[groupContractId].proposals[proposal].initatior !== state.loggedIn.name &&
        !state[groupContractId].proposals[proposal].for.find(name => name === state.loggedIn.name) &&
        !state[groupContractId].proposals[proposal].against.find(name => name === state.loggedIn.name)
        ) {
          proposals.push({
            groupContractId,
            groupName: state[groupContractId].groupName,
            proposal,
            initiationDate: state[groupContractId].proposals[proposal].initiationDate
          })
        }
      }
    }
    return proposals
  },
  memberProfile (state, getters) {
    return (username, groupId) => {
      var profile = state[groupId || state.currentGroupId].profiles[username]
      return profile && {
        globalProfile: state[profile.contractId].attributes,
        groupProfile: profile.groupProfile
      }
    }
  },
  membersForGroup (state, getters) {
    return groupId => {
      groupId = groupId || state.currentGroupId
      return groupId && _.reduce(
        Object.keys(state[groupId].profiles),
        (result, username) => {
          result[username] = getters.memberProfile(username, groupId)
          return result
        },
        {}
      )
    }
  }
}

const actions = {
  // Used to update contracts to the current state that the server is aware of
  async syncContractWithServer (
    {dispatch, commit, state}: {dispatch: Function, state: Object},
    contractId: string
  ) {
    let latest = await backend.latestHash(contractId)
    // there is a chance two users are logged in to the same machine and must check their contracts before syncing
    var recent
    if (state.contracts[contractId]) {
      recent = state.contracts[contractId].recentHash
    } else {
      // we're syncing a contract for the first time, make sure to add to pending
      // so that handleEvents knows to expect events from this contract
      commit('pending', contractId)
    }
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
    user: Object
  ) {
    const settings = await db.loadSettings(user.name)
    if (settings) {
      console.log('loadSettings:', settings)
      commit('setCurrentGroupId', settings.currentGroupId)
      commit('setContracts', settings.contracts || [])
    }
    await db.saveCurrentUser(user.name)
    // This may seem unintuitive to use the state from the global store object
    // but the state object in scope is a copy that becomes stale if something modifies it
    // like an outside dispatch
    for (let key of Object.keys(store.state.contracts)) {
      await backend.subscribe(key) // TODO: https://github.com/okTurtles/group-income-simple/issues/298
      await dispatch('syncContractWithServer', key)
    }
    commit('login', user)
    Vue.events.$emit('login', user)
  },
  async logout (
    {dispatch, commit, state}: {dispatch: Function, commit: Function, state: Object}
  ) {
    debouncedSave.cancel()
    await dispatch('saveSettings', state)
    await db.clearCurrentUser()
    for (let key of Object.keys(state.contracts)) {
      // TODO: https://github.com/okTurtles/group-income-simple/issues/298
      await backend.unsubscribe(key)
    }
    commit('logout')
    Vue.events.$emit('logout')
  },
  // persisting the state
  async saveSettings (
      {state}: {state: Object}
  ) {
    if (state.loggedIn) {
      // var stateCopy = _.cloneDeep(state) // don't think this is necessary
      // TODO: encrypt these
      const settings = {
        position: state.position,
        currentGroupId: state.currentGroupId,
        contracts: Object.keys(state.contracts).map(contractId => ({
          contractId,
          ...state.contracts[contractId], // inserts `recentHash` and `type`
          data: state[contractId]
        }))
      }
      console.log('saveSettings:', settings)
      await db.saveSettings(state.loggedIn.name, settings)
    }
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
    entry = (Events[type] || contracts[type]).fromObject(entry, hash)

    if (Events.HashableContract.prototype.isPrototypeOf(entry)) {
      console.log(`handleEvent for new ${type}:`, entry)
      if (entry.toObject().parentHash) {
        // TODO: use a global notification object to handle this and all other errors,
        //       and figure out if an exception should be thrown
        return console.error(`${type} has non-null parentHash!`, entry)
      }
    } else if (Events.HashableAction.prototype.isPrototypeOf(entry)) {
      const contractType = state.contracts[contractId].type
      console.log(`handleEvent for ${type} on ${contractType}:`, entry)
      if (!contracts[contractType].isActionAllowed(state[contractType], entry)) {
        // TODO: implement isActionAllowed in all actions, and handle error better
        // TODO: throw an exception?
        return console.error(`bad action ${type} on ${contractType} (${contractId}):`, entry)
      }
    } else {
      return console.error(`UNKNOWN EVENT TYPE!`, contractId, entry)
    }

    // TODO: verify each entry is signed by a group member
    // TODO: certainly we should have a larger try/catch block wrapping the entire function
    await db.addLogEntry(contractId, entry)

    if (contractId === hash) {
      commit('addContract', {contractId, type, data: entry.toVuexState()})
    }
    commit('setRecentHash', {contractId, hash})

    // TODO: all of these might throw an exception -- handle those appropriately!
    commit(`${contractId}/${type}`, { data: entry.data, hash })
    if (store.state[contractId]._async.length) {
      for (let type of store.state[contractId]._async) {
        await dispatch(`${contractId}/${type}`, {type, store, data: entry.data, hash})
      }
      commit(`${contractId}/clearAsync`)
    }

    // handleEvent might be called very frequently, so save only after a pause
    debouncedSave(dispatch)
    // let any listening components know that we've received, processed, and stored the event
    Vue.events.$emit(hash, contractId, entry)
    Vue.events.$emit('eventHandled', contractId, entry)
  }
}
const debouncedSave = debounce((dispatch, savedState) => dispatch('saveSettings', savedState), 500)

store = new Vuex.Store({state, mutations, getters, actions})
export default store
// This will build the current contract state from applying all its actions
export async function latestContractState (contractId: string) {
  let events = await backend.eventsSince(contractId, contractId)
  events = events.map(e => {
    return (Events[e.entry.type] || contracts[e.entry.type]).fromObject(e.entry, e.hash)
  })
  let contract = events[0]
  let state = contract.toVuexState()
  events.forEach(e => {
    let type = e.constructor.name
    contract.constructor.vuex.mutations[type](state, {data: e.data, hash: e.toHash()})
  })
  return state
}
store.subscribe(() => debouncedSave(store.dispatch))
