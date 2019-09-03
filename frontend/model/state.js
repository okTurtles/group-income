'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import sbp from '~/shared/sbp.js'
import Vue from 'vue'
import Vuex from 'vuex'
import { GIMessage } from '~/shared/GIMessage.js'
import * as _ from '@utils/giLodash.js'
import L from '@view-utils/translations.js'
import { SETTING_CURRENT_USER } from './database.js'
import { ErrorDBMalformed, ErrorDBConnection } from '~/shared/domains/gi/db.js'
import { LOGIN, LOGOUT, EVENT_HANDLED, CONTRACTS_MODIFIED } from '@utils/events.js'
import Colors from './colors.js'
import { TypeValidatorError } from '@utils/flowTyper.js'
import { GIErrorIgnore, GIErrorIgnoreAndBanIfGroup, GIErrorSaveAndReprocess } from './errors.js'
import { STATUS_OPEN, PROPOSAL_REMOVE_MEMBER } from './contracts/voting/proposals.js'
import { VOTE_FOR } from '@model/contracts/voting/rules.js'
import './contracts/group.js'
import './contracts/mailbox.js'
import './contracts/identity.js'

Vue.use(Vuex)
var store // this is set and made the default export at the bottom of the file.
// we have it declared here to make it accessible in mutations
// 'state' is the Vuex state object, and it can only store JSON-like data

const CONTRACT_REGEX = /^gi\.contracts\/(?:([^/]+)\/)(?:([^/]+)\/)?process$/
// guard all sbp calls for contract actions with this function
export function selectorIsContractOrAction (sel: string) {
  if (!CONTRACT_REGEX.test(sel)) {
    throw new GIErrorIgnoreAndBanIfGroup(`bad selector '${sel}' for contract type!`)
  }
}

sbp('sbp/selectors/register', {
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
  fontSize: 1,
  savedMessagesQueue: []
}

// Mutations must be synchronous! Never call these directly, instead use commit()
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
    sbp('okTurtles.events/emit', CONTRACTS_MODIFIED, state.contracts)
  },
  setContractHEAD (state, { contractID, HEAD }) {
    state.contracts[contractID].HEAD = HEAD
  },
  removeContract (state, contractID) {
    store.unregisterModule(contractID)
    Vue.delete(state.contracts, contractID)
    // calling this will make pubsub unsubscribe for events on `contractID`!
    sbp('okTurtles.events/emit', CONTRACTS_MODIFIED, state.contracts)
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
  },
  savedQueueAddMessage (state, messageID) {
    if (!state.savedMessagesQueue.includes(messageID)) {
      state.savedMessagesQueue.push(messageID)
    }
  },
  savedQueueRemoveMessage (state, messageID) {
    const index = state.savedMessagesQueue.indexOf(messageID)
    index !== -1 && state.savedMessagesQueue.splice(index, 1)
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
  groupMembers (state, getters) {
    const groupId = state.currentGroupId
    return groupId && Object.keys(state[groupId].profiles).reduce(
      (result, username) => {
        result[username] = getters.memberProfile(username, groupId)
        return result
      },
      {}
    )
  },
  groupMembersByUsername (state) {
    var profiles = state.currentGroupId && state[state.currentGroupId] && state[state.currentGroupId].profiles
    return Object.keys(profiles || {})
  },
  groupMembersCount (state, getters) {
    return getters.groupMembersByUsername.length
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
        const { type } = store.state.contracts[contractID]
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
    // prepare for any errors
    const cachedState = _.cloneDeep(state)
    const contractID = message.contractID()
    try {
      // TODO: verify each message is signed by a group member
      // verify we're expecting to hear from this contract
      if (!state.pending.includes(contractID) && !state.contracts[contractID]) {
        console.error(`[CRITICAL ERROR] NOT EXPECTING EVENT!`, contractID, message)
        throw new GIErrorIgnore(`not expecting ${message.hash()} ${message.serialize()}`)
      }
      // the order the following actions are done is critically important!
      // first we make sure we save this message to the db
      await handleEvent.addMessageToDB(message)
      // then, before processing this message, we process any saved messages
      await handleEvent.processSavedMessages(message)
      // process the mutation on the state (everything here must be synchronous)
      handleEvent.processMutation(message)
      // process any side-effects (these must never result in any mutation to this contract state)
      await handleEvent.processSideEffects(message)
    } catch (e) {
      // For details about the rational for how error handling works here see these two issues:
      // https://github.com/okTurtles/group-income-simple/issues/610
      // https://github.com/okTurtles/group-income-simple/issues/602
      // TODO: use a global notification system to both display a notification
      console.error('[ERROR] exception in handleEvent!', e.message, e)
      var restoreCachedState = false
      var updateContractHEAD = false
      var reprocessMessage = false
      var banUser = false
      // handle all error types defined in ./errors.js + ErrorDBConnection
      if (e instanceof ErrorDBConnection) {
        console.error(`[CRITICAL ERROR] handleEvent: ErrorDBConnection:`, e.message, e.stack)
        restoreCachedState = true
        // TODO: place state machine into critical error state
      } else if (e instanceof GIErrorIgnore) {
        updateContractHEAD = true
        restoreCachedState = true
      } else if (e instanceof GIErrorIgnoreAndBanIfGroup) {
        banUser = true
        restoreCachedState = true
        updateContractHEAD = true
      } else if (e instanceof GIErrorSaveAndReprocess) {
        restoreCachedState = true
        reprocessMessage = true
      } else {
        console.error(`[CRITICAL ERROR] handleEvent: UNKNOWN ERROR SHOULD NEVER HAPPEN:`, e)
        restoreCachedState = true
        // TODO: place state machine into critical error state
      }
      if (restoreCachedState) {
        handleEvent.restoreCachedState(cachedState)
      }
      // do these after restoreCachedState, to ensure the modifications make it in
      if (reprocessMessage) {
        commit('savedQueueAddMessage', message.hash())
      }
      if (updateContractHEAD) {
        commit('setContractHEAD', { contractID, HEAD: message.hash() })
      }
      if (banUser) {
        await handleEvent.autoBanSenderOfMessage(message, e)
      }
    }
  }
}

// to make handleEvent() easier to read and reason about, it has been split up into
// the following functions below, each of which must throw one of the error types
// defined in ./errors.js if there is any error, with the exception of functions
// called from within the handleEvent catch() error handler (like restoreCachedState()
// and autoBanSenderOfMessage() functions).
const handleEvent = {
  async addMessageToDB (message: GIMessage) {
    try {
      return await sbp('gi.db/log/addEntry', message)
    } catch (e) {
      if (e instanceof ErrorDBMalformed) {
        if (message.type().indexOf('gi.contracts/group/') === 0) {
          throw new GIErrorIgnoreAndBanIfGroup(e.message)
        } else {
          throw new GIErrorIgnore(e.message)
        }
      } else if (e instanceof ErrorDBConnection) {
        // we cannot throw GIErrorSaveAndReprocess because saving is clearly broken
        // so we re-throw this special error condition that means we can't do anything
        throw e
      } else {
        // we should never get here, but if we do...
        // TODO: set state machine critical error state
        throw new GIErrorSaveAndReprocess(`${e.name} during addMessageToDB! SHOULD NEVER HAPPEN! ${e.message}`)
      }
    }
  },
  async processSavedMessages (message: GIMessage) {
    try {
      // if the message that is currently being processed
      // is not in savedMessagesQueue, it means we're currently processing
      // a new message, so it's safe to loop through and process any saved
      // messages before processing this one.
      if (!store.state.savedMessagesQueue.includes(message.hash())) {
        while (store.state.savedMessagesQueue.length > 0) {
          const messageID = store.state.savedMessagesQueue[0]
          const rMessage = await sbp('gi.db/log/getEntry', messageID)
          console.debug('processSavedMessages', rMessage.type(), messageID)
          await sbp('state/vuex/dispatch', 'handleEvent', rMessage)
          // remove the messageID from the queue if we successfully processed the message
          store.commit('savedQueueRemoveMessage', messageID)
        }
      }
    } catch (e) {
      throw new GIErrorSaveAndReprocess(`${e.name} during processSavedMessages! ${e.message}`)
    }
  },
  processMutation (message: GIMessage) {
    var preValidationFinished = false
    try {
      const contractID = message.contractID()
      const selector = message.type()
      const hash = message.hash()
      const data = message.data()
      const meta = message.meta()
      const type = CONTRACT_REGEX.exec(selector)[1]
      selectorIsContractOrAction(selector)
      preValidationFinished = true
      if (message.isFirstMessage()) {
        store.commit('registerContract', { contractID, type })
      }
      const mutation = { data, meta, hash }
      // this selector is created by Contract.js
      store.commit(`${contractID}/processMessage`, { selector, message: mutation })
      // all's good, so update our contract HEAD
      store.commit('setContractHEAD', { contractID, HEAD: hash })
    } catch (e) {
      console.error(`processMutation: error ${e.name}`, e)
      if (e.name.indexOf('GIError') === 0) {
        throw e // simply rethrow whatever error the contract has decided should be thrown
      } else if (!(e instanceof TypeValidatorError) && !(e instanceof TypeError)) {
        if (preValidationFinished) {
          // this is likely a GUI-related error/bug, so it's safe to save and reprocess later
          throw new GIErrorSaveAndReprocess(`${e.name} during processMutation: ${e.message}`)
        }
      }
      throw new GIErrorIgnoreAndBanIfGroup(`${e.name} during processMutation: ${e.message}`)
    }
  },
  async processSideEffects (message: GIMessage) {
    try {
      const contractID = message.contractID()
      const selector = message.type()
      const hash = message.hash()
      // this selector is created by Contract.js
      if (sbp('sbp/selectors/fn', `${selector}/sideEffect`)) {
        await sbp(`${selector}/sideEffect`, message)
      }
      // let any listening components know that we've received, processed, and stored the event
      sbp('okTurtles.events/emit', hash, contractID, message)
      sbp('okTurtles.events/emit', EVENT_HANDLED, contractID, message)
    } catch (e) {
      console.error(`processSideEffects: ${e.name}:`, e)
      // if an error happens at this point, it's almost certainly not due to malformed data
      // (since all of the validations successfully passed in processMutation)
      if (e.name.indexOf('GIError') === 0) {
        // unlikely to happen but this most likely means the contract's side effect is deciding
        // for us how to handle the error, so rethrow
        throw e
      } else {
        throw new GIErrorSaveAndReprocess(`${e.name} during processSideEffects: ${e.message}`)
      }
    }
  },
  restoreCachedState (cachedState: Object) {
    try {
      console.error(`reverting to previous state!`, {
        corrupt: JSON.stringify(store.state),
        reverted: JSON.stringify(cachedState)
      })
      store.replaceState(cachedState)
      // if replaceState resulted in any contracts being added or removed
      // make sure our web sockets are either subscribed or unsubscribed as needed
      try {
        sbp('okTurtles.events/emit', CONTRACTS_MODIFIED, store.state.contracts)
      } catch (e) {
        console.error(e.message, e.stack)
      }
    } catch (e) {
      // pretty much f*'d here
      console.error(`[CRITICAL ERROR] ${e.name} couldn't revert state!`, e.message, e)
    }
  },
  async autoBanSenderOfMessage (message: GIMessage, error: Object) {
    try {
      if (message.type().indexOf('gi.contracts/group/') === 0) {
        var proposal
        var proposalHash
        // find existing proposal if it exists
        for (const hash in store.state[message.contractID()].proposals) {
          const prop = store.state[message.contractID()].proposals[hash]
          if (prop.status === STATUS_OPEN && prop.data.proposalType === PROPOSAL_REMOVE_MEMBER && prop.data.proposalData.member === message.meta().username) {
            proposal = prop
            proposalHash = hash
            break
          }
        }
        if (proposal) {
          // cast our vote if we haven't already cast it
          if (!proposal.votes[store.state.loggedIn.username]) {
            const vote = await sbp('gi.contracts/group/proposalVote/create',
              { proposalHash, vote: VOTE_FOR },
              message.contractID()
            )
            await sbp('backend/publishLogEntry', vote)
          }
        } else {
          // create our proposal to ban the user
          proposal = await sbp('gi.contracts/group/proposal/create',
            {
              proposalType: PROPOSAL_REMOVE_MEMBER,
              proposalData: {
                member: message.meta().username,
                reason: L("Automated ban because they're sending malformed messages resulting in: {error}", { error: error.message })
              },
              votingRule: store.getters.groupSettings.proposals[PROPOSAL_REMOVE_MEMBER].rule,
              expires_date_ms: Date.now() + store.getters.groupSettings.proposals[PROPOSAL_REMOVE_MEMBER].expires_ms
            },
            message.contractID()
          )
          await sbp('backend/publishLogEntry', proposal)
        }
      }
    } catch (e) {
      console.error(`${e.name} during autoBanSenderOfMessage!`, e)
      // we really can't do much at this point since this is an exception
      // inside of the exception handler :-(
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
