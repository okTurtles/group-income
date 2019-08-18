'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import sbp from '~/shared/sbp.js'
import Vue from 'vue'
import Vuex from 'vuex'
import { GIMessage } from '~/shared/GIMessage.js'
import * as _ from '@utils/giLodash.js'
import { SETTING_CURRENT_USER } from './database.js'
import { LOGIN, LOGOUT, EVENT_HANDLED, CONTRACTS_MODIFIED } from '@utils/events.js'
import Colors from './colors.js'
import './contracts/group.js'
import './contracts/mailbox.js'
import './contracts/identity.js'

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

const CONTRACT_REGEX = /^gi\.contracts\/(?:([^/]+)\/)(?:([^/]+)\/)?process$/
// guard all sbp calls for contract actions with this function
export function selectorIsContractOrAction (sel: string) {
  if (!CONTRACT_REGEX.test(sel)) {
    throw new Error(`bad selector '${sel}' for contract type!`)
  }
}

sbp('sbp/selectors/register', {
  // This will build the current contract state from applying all its actions
  'state/latestContractState': async (contractID: string) => {
    let events = await sbp('backend/eventsSince', contractID, contractID)
    events = events.map(e => GIMessage.deserialize(e))
    const state = {}
    for (const e of events) {
      selectorIsContractOrAction(e.type())
      sbp(e.type(), state, { data: e.data(), meta: e.meta(), hash: e.hash() })
    }
    return state
  },
  'state/vuex/state': () => store.state,
  'state/vuex/dispatch': (...args) => store.dispatch(...args)
})

const initialState = {
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
    selectorIsContractOrAction(selector)
    sbp(selector, state, message)
  },
  registerContract (state, { contractID, type }) {
    const firstTimeRegistering = !state[contractID]
    var vuexModule = {
      // vuex module namespaced under this contract's hash
      // see details: https://vuex.vuejs.org/en/modules.html
      namespaced: true,
      state: {},
      mutations: { processMessage: mutations.processMessage }
    }
    // we set preserveState because 'login' action does 'replaceState'
    store.registerModule(contractID, vuexModule, { preserveState: !firstTimeRegistering })
    // NOTE: we modify state.contracts __AFTER__ calling registerModule, to
    //       ensure that any reactive Vue components that depend on
    //       `state.contracts` for their reactivity (e.g. `groupsByName` getter)
    //       will not result in errors like "state[contractID] is undefined"
    // 'Mutations Follow Vue's Reactivity Rules' - important for modifying objects
    // See: https://vuex.vuejs.org/en/mutations.html
    if (firstTimeRegistering) {
      // this if block will get called when we first subscribe to a contract
      // and won't get called upon login (becase replaceState will have been called)
      Vue.set(state.contracts, contractID, { type, HEAD: contractID })
    }
    // we've successfully received it back, so remove it from expectation pending
    const index = state.pending.indexOf(contractID)
    index !== -1 && state.pending.splice(index, 1)
    // calling this will make pubsub subscribe for events on `contractID`!
    sbp('okTurtles.events/emit', CONTRACTS_MODIFIED, { add: contractID })
  },
  setContractHEAD (state, { contractID, HEAD }) {
    state.contracts[contractID].HEAD = HEAD
  },
  removeContract (state, contractID) {
    store.unregisterModule(contractID)
    Vue.delete(state.contracts, contractID)
    // calling this will make pubsub unsubscribe for events on `contractID`!
    sbp('okTurtles.events/emit', CONTRACTS_MODIFIED, { remove: contractID })
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
  groupSettings (state, getters) {
    return getters.currentGroupState.settings || {}
  },
  mailboxContract (state, getters) {
    const contract = getters.currentUserIdentityContract
    return (contract.attributes && state[contract.attributes.mailbox]) || {}
  },
  mailboxMessages (state, getters) {
    const mailboxContract = getters.mailboxContract
    return (mailboxContract && mailboxContract.messages) || []
  },
  unreadMessageCount (state, getters) {
    return getters.mailboxMessages.filter(msg => !msg.read).length
  },
  // Logged In user's identity contract
  currentUserIdentityContract (state) {
    return (state.loggedIn && state[state.loggedIn.identityContractID]) || {}
  },
  // list of group names and contractIDs
  groupsByName (state) {
    const { contracts } = store.state
    // The code below was originally Object.entries(...) but changed to .keys()
    // due to the same flow issue as https://github.com/facebook/flow/issues/5838
    return Object.keys(contracts)
      .filter(contractID => contracts[contractID].type === 'group' && state[contractID].settings)
      .map(contractID => ({ groupName: state[contractID].settings.groupName, contractID }))
  },
  memberProfile (state, getters) {
    return (username, groupId) => {
      var profile = state[groupId || state.currentGroupId].profiles[username]
      return profile && state[profile.contractID] && {
        contractID: profile.contractID,
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
  memberUsernames (state) {
    var profiles = state.currentGroupId && state[state.currentGroupId] && state[state.currentGroupId].profiles
    return Object.keys(profiles || {})
  },
  memberCount (state, getters) {
    return getters.memberUsernames.length
  },
  colors (state) {
    return Colors[state.theme]
  },
  isDarkTheme (state) {
    return Colors[state.theme].theme === 'dark'
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
    const settings = await sbp('gi.db/settings/load', user.username)
    // NOTE: login can be called when no settings are saved (e.g. from SignUp.vue)
    if (settings) {
      console.debug('loadSettings:', settings)
      store.replaceState(settings)
      // This may seem unintuitive to use the store.state from the global store object
      // but the state object in scope is a copy that becomes stale if something modifies it
      // like an outside dispatch
      for (const contractID in store.state.contracts) {
        const type = store.state.contracts[contractID].type
        commit('registerContract', { contractID, type })
        await dispatch('syncContractWithServer', contractID)
      }
    }
    await sbp('gi.db/settings/save', SETTING_CURRENT_USER, user.username)
    commit('login', user)
  },
  async logout (
    { dispatch, commit, state }: {dispatch: Function, commit: Function, state: Object}
  ) {
    debouncedSave.cancel()
    await dispatch('saveSettings')
    await sbp('gi.db/settings/save', SETTING_CURRENT_USER, null)
    for (const contractID in state.contracts) {
      commit('removeContract', contractID)
    }
    commit('logout')
  },
  // persisting the state
  async saveSettings (
    { state }: {state: Object}
  ) {
    if (state.loggedIn) {
      // TODO: encrypt this
      await sbp('gi.db/settings/save', state.loggedIn.username, state)
    }
  },
  // this function is called from ../controller/utils/pubsub.js and is the entry point
  // for getting events into the log.
  async handleEvent (
    { dispatch, commit, state }: {dispatch: Function, commit: Function, state: Object},
    message: GIMessage
  ) {
    // const clonedState = _.cloneDeep(state)
    try {
      const contractID = message.contractID()
      const selector = message.type()
      const type = CONTRACT_REGEX.exec(selector)[1]
      const hash = message.hash()
      const data = message.data()
      const meta = message.meta()
      // ensure valid message
      selectorIsContractOrAction(selector)
      // TODO: verify each message is signed by a group member
      // verify we're expecting to hear from this contract
      if (!state.pending.includes(contractID) && !state.contracts[contractID]) {
        // TODO: use a global notification system to both display a notification
        //       and throw an exception and write a log message.
        return console.error(`NOT EXPECTING EVENT!`, contractID, message)
      }

      await sbp('gi.db/log/addEntry', message)

      if (message.isFirstMessage()) {
        commit('registerContract', { contractID, type })
      }

      const mutation = { data, meta, hash }
      commit(`${contractID}/processMessage`, { selector, message: mutation })

      // all's good, so update our contract HEAD
      // TODO: handle malformed message DoS
      //       https://github.com/okTurtles/group-income-simple/issues/602
      commit('setContractHEAD', { contractID, HEAD: hash })

      // let any listening components know that we've received, processed, and stored the event
      sbp('okTurtles.events/emit', hash, contractID, message)
      sbp('okTurtles.events/emit', EVENT_HANDLED, contractID, message)
      sbp('okTurtles.events/emit', selector, contractID, message)
      // TODO: handle any exception generated by any of the above events
    } catch (e) {
      console.error('[ERROR] exception in handleEvent!', e.message, e)
      throw e // TODO: handle this better
      // TODO: mutations passed to processMessage should throw exceptions
      //       if there's anything wrong with the message or internal state
      //       to ensure that none of the event emitters get triggered
      // See: https://github.com/okTurtles/group-income-simple/issues/602
      // note that we should be able to recover even if the very first line
      // fails, e.g. if something like CONTRACT_REGEX.exec(selector)[1]
      // throws an exception.
    }
  }
}

store = new Vuex.Store({
  state: _.cloneDeep(initialState),
  mutations,
  getters,
  actions,
  strict: !!process.env.VUEX_STRICT
})
const debouncedSave = _.debounce(() => store.dispatch('saveSettings'), 500)
store.subscribe(debouncedSave)

export default store
