'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import sbp from '~/shared/sbp.js'
import Vue from 'vue'
import Vuex from 'vuex'
import { GIMessage } from '~/shared/GIMessage.js'
import * as _ from '@utils/giLodash.js'
import { SETTING_CURRENT_USER } from './database.js'
import { LOGIN, LOGOUT, EVENT_HANDLED } from '@utils/events.js'
import Colors from './colors.js'

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

const CONTRACT_TYPE_REGEX = /^gi\.contracts\/(?:([^/]+)\/)(?:([^/]+)\/)?process$/
// guard all sbp calls for contract actions with this function
export function selectorIsContract (sel: string) {
  if (!CONTRACT_TYPE_REGEX.test(sel)) {
    throw new Error(`bad selector '${sel}' for contract type!`)
  }
}

sbp('sbp/selectors/register', {
  'state/vuex/dispatch': (...args) => {
    return store.dispatch(...args)
  },
  // This will build the current contract state from applying all its actions
  'state/latestContractState': async (contractID: string) => {
    let events = await sbp('backend/eventsSince', contractID, contractID)
    events = events.map(e => GIMessage.deserialize(e))
    const state = {}
    for (const e of events) {
      selectorIsContract(e.type())
      sbp(e.type(), state, {
        data: e.data(),
        meta: e.meta(),
        hash: e.hash()
      })
    }
    return state
  },
  'state/vuex/state': () => {
    return store.state
  }
})

const state = {
  currentGroupId: null,
  contracts: {}, // contractIDs => { type:string, HEAD:string } (for contracts we've successfully subscribed to)
  pending: [], // contractIDs we've just published but haven't received back yet
  loggedIn: false, // false | { username: string, identityContractID: string }
  theme: 'blue',
  fontSize: 1
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
  processMessage (state, { selector, message }) {
    selectorIsContract(selector)
    sbp(selector, message)
  },
  addContract (state, { contractID, type, HEAD, data }) {
    // copy over the initial state, making sure *not* to use cloneDeep on
    // the entire vuexModule object (because cloneDeep doesn't clone functions)
    // var vuexModule = Object.assign({}, contracts[type].vuexModule)
    var vuexModule = {
      // vuex module namespaced under this contract's hash
      // see details: https://vuex.vuejs.org/en/modules.html
      namespaced: true,
      // make sure we restore any previously saved state (e.g. after login)
      state: data,
      mutations: { processMessage: mutations.processMessage }
    }
    store.registerModule(contractID, vuexModule)
    // NOTE: we modify state.contracts __AFTER__ calling registerModule, to
    //       ensure that any reactive Vue components that depend on
    //       `state.contracts` for their reactivity (e.g. `groupsByName` getter)
    //       will not result in errors like "state[contractID] is undefined"
    // 'Mutations Follow Vue's Reactivity Rules' - important for modifying objects
    // See: https://vuex.vuejs.org/en/mutations.html
    Vue.set(state.contracts, contractID, { type, HEAD })
    // we've successfully received it back, so remove it from expectation pending
    const index = state.pending.indexOf(contractID)
    index !== -1 && state.pending.splice(index, 1)
    // calling this will make pubsub subscribe for events on `contractID`!
    sbp('okTurtles.events/emit', 'contractsModified', { add: contractID })
  },
  setContractHEAD (state, { contractID, HEAD }) {
    state.contracts[contractID] && Vue.set(state.contracts[contractID], 'HEAD', HEAD)
  },
  removeContract (state, contractID) {
    store.unregisterModule(contractID)
    Vue.delete(state.contracts, contractID)
    // calling this will make pubsub unsubscribe for events on `contractID`!
    sbp('okTurtles.events/emit', 'contractsModified', { remove: contractID })
  },
  setContracts (state, contracts) {
    for (const contractID of Object.keys(state.contracts)) {
      mutations.removeContract(state, contractID)
    }
    for (const contract of contracts) {
      mutations.addContract(state, contract)
    }
  },
  deleteMessage (state, hash) {
    const mailboxContract = store.getters.mailboxContract
    const index = mailboxContract && mailboxContract.messages.findIndex(msg => msg.hash === hash)
    if (index > -1) { mailboxContract.messages.splice(index, 1) }
  },
  markMessageAsRead (state, hash) {
    const mailboxContract = store.getters.mailboxContract
    const index = mailboxContract && mailboxContract.messages.findIndex(msg => msg.hash === hash)
    if (index > -1) { mailboxContract.messages[index].read = true }
  },
  setCurrentGroupId (state, currentGroupId) {
    state.currentGroupId = currentGroupId
  },
  pending (state, contractID) {
    if (!state.contracts[contractID] && !state.pending.includes(contractID)) {
      state.pending.push(contractID)
    }
  },
  setTheme (state, color) {
    state.theme = color
  },
  setFontSize (state, fontSize) {
    state.fontSize = fontSize
  }
}
// https://vuex.vuejs.org/en/getters.html
// https://vuex.vuejs.org/en/modules.html
const getters = {
  currentGroupState (state) {
    return state[state.currentGroupId] || {} // avoid "undefined" vue errors at inoportune times
  },
  mailboxContract (state, getters) {
    return getters.currentUserIdentityContract &&
      state[getters.currentUserIdentityContract.attributes.mailbox]
  },
  mailbox (state, getters) {
    const mailboxContract = getters.mailboxContract
    return mailboxContract && mailboxContract.messages
  },
  unreadMessageCount (state, getters) {
    const messages = getters.mailbox
    return messages && messages.filter(msg => !msg.read).length
  },
  // Logged In user's identity contract
  currentUserIdentityContract (state) {
    return state.loggedIn && state[state.loggedIn.identityContractID]
  },
  // list of group names and contractIDs
  groupsByName (state) {
    const { contracts } = store.state
    // The code below was originally Object.entries(...) but changed to .keys()
    // due to the same flow issue as https://github.com/facebook/flow/issues/5838
    return Object.keys(contracts)
      .filter(contractID => contracts[contractID].type === 'group')
      .map(contractID => ({ groupName: state[contractID].groupName, contractID }))
  },
  proposals (state) {
    // TODO: clean this up
    const proposals = []
    if (!state.currentGroupId) { return proposals }
    for (const groupContractId of Object.keys(state.contracts)
      .filter(key => state.contracts[key].type === 'group')
    ) {
      for (const proposal of Object.keys(state[groupContractId].proposals || {})) {
        if (state[groupContractId].proposals[proposal].initatior !== state.loggedIn.username &&
        !state[groupContractId].proposals[proposal].for.find(name => name === state.loggedIn.username) &&
        !state[groupContractId].proposals[proposal].against.find(name => name === state.loggedIn.username)
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
  colors (state) {
    return Colors[state.theme]
  },
  isDarkTheme () {
    return Colors[state.theme].theme === 'dark'
  },
  fontSize (state) {
    return state.fontSize
  }
}

// TODO: convert all these to SBP... and/or call dispatch through SBP only!
const actions = {
  // Used to update contracts to the current state that the server is aware of
  async syncContractWithServer (
    { dispatch, commit, state }: {dispatch: Function, commit: Function, state: Object},
    contractID: string
  ) {
    const latest = await sbp('backend/latestHash', contractID)
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
      const events = await sbp('backend/eventsSince', contractID, recent || contractID)
      // remove the first element in cases where we are not getting the contract for the first time
      state.contracts[contractID] && events.shift()
      for (let i = 0; i < events.length; i++) {
        await dispatch('handleEvent', GIMessage.deserialize(events[i]))
      }
    }
  },
  async login (
    { dispatch, commit, state }: {dispatch: Function, commit: Function, state: Object},
    user: Object
  ) {
    const settings = await sbp('gi.db/settings/load', user.name)
    if (settings) {
      console.log('loadSettings:', settings)
      commit('setCurrentGroupId', settings.currentGroupId)
      commit('setContracts', settings.contracts || [])
      commit('setTheme', settings.theme || 'blue')
      commit('setFontSize', settings.fontSize || 1)
    }
    await sbp('gi.db/settings/save', SETTING_CURRENT_USER, user.name)
    // This may seem unintuitive to use the state from the global store object
    // but the state object in scope is a copy that becomes stale if something modifies it
    // like an outside dispatch
    for (const key of Object.keys(store.state.contracts)) {
      await dispatch('syncContractWithServer', key)
    }
    commit('login', user)
  },
  async logout (
    { dispatch, commit, state }: {dispatch: Function, commit: Function, state: Object}
  ) {
    debouncedSave.cancel()
    await dispatch('saveSettings', state)
    await sbp('gi.db/settings/save', SETTING_CURRENT_USER, null)
    for (const contractID of Object.keys(state.contracts)) {
      mutations.removeContract(state, contractID)
    }
    commit('logout')
  },
  // persisting the state
  async saveSettings (
    { state }: {state: Object}
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
        })),
        theme: state.theme
      }
      console.log('saveSettings:', settings)
      await sbp('gi.db/settings/save', state.loggedIn.username, settings)
    }
  },
  // this function is called from ../controller/utils/pubsub.js and is the entry point
  // for getting events into the log.
  async handleEvent (
    { dispatch, commit, state }: {dispatch: Function, commit: Function, state: Object},
    message: GIMessage
  ) {
    try {
      const contractID = message.isFirstMessage() ? message.hash() : message.message().contractID
      const selector = message.type()
      const type = CONTRACT_TYPE_REGEX.exec(selector)[1]
      const hash = message.hash()
      const data = message.data()
      const meta = message.meta()
      // ensure valid message
      selectorIsContract(selector)
      // TODO: verify each message is signed by a group member
      // verify we're expecting to hear from this contract
      if (!state.pending.includes(contractID) && !state.contracts[contractID]) {
        // TODO: use a global notification system to both display a notification
        //       and throw an exception and write a log message.
        return console.error(`NOT EXPECTING EVENT!`, contractID, message)
      }

      await sbp('gi.db/log/addEntry', message)

      if (message.isFirstMessage()) {
        commit('addContract', { contractID, type, HEAD: hash, data })
      }

      const mutation = { data, meta, hash }
      commit(`${contractID}/processMessage`, { selector, message: mutation })
      // TODO: delete this or reimplement it
      // if this mutation has a corresponding action, perform it after thet mutation
      // await dispatch(`${contractID}/${type}`, mutation)

      // all's good, so update our contract HEAD
      // TODO: handle malformed message DoS
      //       https://github.com/okTurtles/group-income-simple/issues/602
      commit('setContractHEAD', { contractID, HEAD: hash })

      // handleEvent might be called very frequently, so save only after a pause
      debouncedSave(dispatch)
      // let any listening components know that we've received, processed, and stored the event
      sbp('okTurtles.events/emit', hash, contractID, message)
      sbp('okTurtles.events/emit', EVENT_HANDLED, contractID, message)
      sbp('okTurtles.events/emit', selector, contractID, message)
    } catch (e) {
      console.error('[ERROR] exception in handleEvent!', e.message, e)
      throw e // TODO: handle this better
      // See: https://github.com/okTurtles/group-income-simple/issues/602
      // note that we should be able to recover even if the very first line
      // fails, e.g. if something like CONTRACT_TYPE_REGEX.exec(selector)[1]
      // throws an exception.
    }
  },
  async setTheme (
    { commit }: {commit: Function},
    colors: String
  ) {
    commit('setTheme', colors)
  },
  async setFontSize (
    { commit }: {commit: Function},
    colors: String
  ) {
    commit('setFontSize', colors)
  }
}
const debouncedSave = _.debounce((dispatch, savedState) => dispatch('saveSettings', savedState), 500)

store = new Vuex.Store({ state, mutations, getters, actions })
store.subscribe(() => debouncedSave(store.dispatch))

export default store
