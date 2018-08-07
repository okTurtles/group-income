'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import sbp from '../../../shared/sbp.js'
import Vue from 'vue'
import Vuex from 'vuex'
import {GIMessage} from '../../../shared/GIMessage.js'
import contracts from './contracts.js'
import * as _ from '../utils/giLodash.js'
import * as db from './database.js'
import { LOGIN, LOGOUT, EVENT_HANDLED } from '../utils/events.js'

// babel transforms lodash imports: https://github.com/lodash/babel-plugin-lodash#faq
// for diff between 'lodash/map' and 'lodash/fp/map'
// see: https://github.com/lodash/lodash/wiki/FP-Guide

Vue.use(Vuex)
var store // this is set and made the default export at the bottom of the file.
// we have it declared here to make it accessible in mutations
// 'state' is the Vuex state object
// NOTE: THE STATE CAN ONLY STORE *SERIALIZABLE* OBJECTS! THAT MEANS IF YOU TRY
//       TO STORE AN INSTANCE OF A CLASS (LIKE A CONTRACT), IT WILL NOT STORE
//       THE ACTUAL CONTRACT, BUT JSON.STRINGIFY(CONTRACT) INSTEAD!

sbp('sbp/selectors/register', {
  'state/vuex/dispatch': (...args) => {
    return store.dispatch(...args)
  },
  // This will build the current contract state from applying all its actions
  'state/latestContractState': async (contractID: string) => {
    let events = await sbp('backend/eventsSince', contractID, contractID)
    events = events.map(e => GIMessage.deserialize(e))
    let contract = contracts[events[0].type()]
    let state = _.cloneDeep(contract.vuexModule.state)
    for (let e of events) {
      contracts[e.type()].validate(e.data())
      contract.vuexModule.mutations[e.type()](state, {
        data: e.data(),
        hash: e.hash()
      })
    }
    return state
  }
})

const state = {
  currentGroupId: null,
  contracts: {}, // contractIDs => { type:string, HEAD:string } (for contracts we've successfully subscribed to)
  pending: [], // contractIDs we've just published but haven't received back yet
  loggedIn: false // false | { name: string, identityContractId: string }
}

// Mutations must be synchronous! Never call these directly!
// http://vuex.vuejs.org/en/mutations.html
const mutations = {
  login (state, user) {
    state.loggedIn = user
    sbp('okTurtles.events/emit', LOGIN, user)
  },
  logout (state) {
    state.loggedIn = false
    state.currentGroupId = null
    sbp('okTurtles.events/emit', LOGOUT)
  },
  addContract (state, {contractID, type, HEAD, data}) {
    // "Mutations Follow Vue's Reactivity Rules" - important for modifying objects
    // See: https://vuex.vuejs.org/en/mutations.html
    Vue.set(state.contracts, contractID, { type, HEAD })
    // copy over the initial state, making sure *not* to use cloneDeep on
    // the entire vuexModule object (because cloneDeep doesn't clone functions)
    var vuexModule = Object.assign({}, contracts[type].vuexModule)
    // make sure we restore any previously saved state (e.g. after login)
    vuexModule.state = Object.assign(_.cloneDeep(vuexModule.state), data)
    store.registerModule(contractID, vuexModule)
    // we've successfully received it back, so remove it from expectation pending
    const index = state.pending.indexOf(contractID)
    index !== -1 && state.pending.splice(index, 1)
    // calling this will make pubsub subscribe for events on `contractID`!
    sbp('okTurtles.events/emit', 'contractsModified', {add: contractID})
  },
  setContractHEAD (state, {contractID, HEAD}) {
    state.contracts[contractID] && Vue.set(state.contracts[contractID], 'HEAD', HEAD)
  },
  removeContract (state, contractID) {
    store.unregisterModule(contractID)
    Vue.delete(state.contracts, contractID)
    // calling this will make pubsub unsubscribe for events on `contractID`!
    sbp('okTurtles.events/emit', 'contractsModified', {remove: contractID})
  },
  setContracts (state, contracts) {
    for (let contractID of Object.keys(state.contracts)) {
      mutations.removeContract(state, contractID)
    }
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
  pending (state, contractID) {
    if (!state.contracts[contractID] && !state.pending.includes(contractID)) {
      state.pending.push(contractID)
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
    return getters.currentUserIdentityContract &&
      state[getters.currentUserIdentityContract.attributes.mailbox]
  },
  mailbox (state, getters) {
    let mailboxContract = getters.mailboxContract
    return mailboxContract && mailboxContract.messages
  },
  unreadMessageCount (state, getters) {
    let messages = getters.mailbox
    return messages && messages.filter(msg => !msg.read).length
  },
  // Logged In user's identity contract
  currentUserIdentityContract (state) {
    return state.loggedIn && state[state.loggedIn.identityContractId]
  },
  // list of group names and contractIDs
  groupsByName (state) {
    return Object.entries(store.state.contracts)
      .filter(([key, value]) => value.type === 'GroupContract')
      .map(([key]) => ({groupName: state[key].groupName, contractID: key}))
  },
  memberProfile (state, getters) {
    return (username, groupId) => {
      var profile = state[groupId || state.currentGroupId].profiles[username]
      return profile && {
        globalProfile: state[profile.contractID].attributes,
        groupProfile: profile.groupProfile
      }
    }
  },
  profilesForGroup (state, getters) {
    return groupId => {
      groupId = groupId || state.currentGroupId
      return groupId && Object.keys(state[groupId].profiles).reduce(
        (result, username) => {
          result[username] = getters.memberProfile(username, groupId)
          return result
        },
        {}
      )
    }
  },
  memberCount (state, getters) {
    return groupId => {
      if (!groupId) groupId = state.currentGroupId
      if (!groupId) return 0
      return Object.keys(state[groupId].profiles).length
    }
  },
  proposalData (state, getters) {
    return (proposalHash, groupId) => {
      if (!groupId) groupId = state.currentGroupId
      if (!groupId) return null
      const groupData = getters.currentGroupState
      const userData = getters.currentUserIdentityContract.attributes
      const proposal = state[groupId].proposals[proposalHash]
      return {
        ...proposal,
        hash: proposalHash,
        voterCount: Object.entries(groupData.profiles).length,
        fromWhat: groupData[proposal.doWhat] || null,
        myVote: proposal.votes.find(vote => vote.username === userData.name) || 0,
        isMyProposal: proposal.whoProposed === userData.name
      }
    }
  }
}

// TODO: convert all these to SBP... and/or call dispatch through SBP only!
const actions = {
  // Used to update contracts to the current state that the server is aware of
  async syncContractWithServer (
    {dispatch, commit, state}: {dispatch: Function, commit: Function, state: Object},
    contractID: string
  ) {
    let latest = await sbp('backend/latestHash', contractID)
    console.log(`syncContractWithServer(): ${contractID} latestHash is: ${latest}`)
    // there is a chance two users are logged in to the same machine and must check their contracts before syncing
    var recent
    if (state.contracts[contractID]) {
      recent = state.contracts[contractID].HEAD
    } else {
      // we're syncing a contract for the first time, make sure to add to pending
      // so that handleEvents knows to expect events from this contract
      commit('pending', contractID)
    }
    if (latest !== recent) {
      console.log(`Now Synchronizing Contract: ${contractID} its most recent was ${recent || 'undefined'} but the latest is ${latest}`)
      // TODO Do we need a since call that is inclusive? Since does not imply inclusion
      let events = await sbp('backend/eventsSince', contractID, recent || contractID)
      // remove the first element in cases where we are not getting the contract for the first time
      state.contracts[contractID] && events.shift()
      for (let i = 0; i < events.length; i++) {
        await dispatch('handleEvent', GIMessage.deserialize(events[i]))
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
      await dispatch('syncContractWithServer', key)
    }
    commit('login', user)
  },
  async logout (
    {dispatch, commit, state}: {dispatch: Function, commit: Function, state: Object}
  ) {
    debouncedSave.cancel()
    await dispatch('saveSettings', state)
    await db.clearCurrentUser()
    for (let contractID of Object.keys(state.contracts)) {
      mutations.removeContract(state, contractID)
    }
    commit('logout')
  },
  // persisting the state
  async saveSettings (
    {state}: {state: Object}
  ) {
    if (state.loggedIn) {
      // var stateCopy = _.cloneDeep(state) // don't think this is necessary
      // TODO: encrypt these
      const settings = {
        currentGroupId: state.currentGroupId,
        contracts: Object.keys(state.contracts).map(contractID => ({
          contractID,
          ...state.contracts[contractID], // inserts `HEAD` and `type`
          data: state[contractID]
        }))
      }
      console.log('saveSettings:', settings)
      await db.saveSettings(state.loggedIn.name, settings)
    }
  },
  // this function is called from ../controller/utils/pubsub.js and is the entry point
  // for getting events into the log.
  async handleEvent (
    {dispatch, commit, state}: {dispatch: Function, commit: Function, state: Object},
    message: GIMessage
  ) {
    try {
      const contractID = message.isFirstMessage() ? message.hash() : message.message().contractID
      const type = message.type()
      const HEAD = message.hash()
      const data = message.data()
      // ensure valid message
      // TODO: verify each message is signed by a group member
      contracts[type].validate(data)
      // verify we're expecting to hear from this contract
      if (!state.pending.includes(contractID) && !state.contracts[contractID]) {
        // TODO: use a global notification system to both display a notification
        //       and throw an exception and write a log message.
        return console.error(`NOT EXPECTING EVENT!`, contractID, message)
      }

      await db.addLogEntry(message)

      if (message.isFirstMessage()) {
        commit('addContract', {contractID, type, HEAD, data})
      }
      commit('setContractHEAD', {contractID, HEAD})

      const mutation = { data, hash: HEAD }
      commit(`${contractID}/${type}`, mutation)
      // if this mutation has a corresponding action, perform it after thet mutation
      await dispatch(`${contractID}/${type}`, mutation)

      // handleEvent might be called very frequently, so save only after a pause
      debouncedSave(dispatch)
      // let any listening components know that we've received, processed, and stored the event
      sbp('okTurtles.events/emit', HEAD, contractID, message)
      sbp('okTurtles.events/emit', EVENT_HANDLED, contractID, message)
    } catch (e) {
      console.error('[ERROR] exception in handleEvent!', e.message, e)
      throw e // TODO: handle this better
    }
  }
}
const debouncedSave = _.debounce((dispatch, savedState) => dispatch('saveSettings', savedState), 500)

store = new Vuex.Store({state, mutations, getters, actions})
store.subscribe(() => debouncedSave(store.dispatch))

export default store
