'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import sbp from '~/shared/sbp.js'
import Vue from 'vue'
import Vuex from 'vuex'
import { GIMessage } from '~/shared/GIMessage.js'
import * as _ from '@utils/giLodash.js'
import L from '@view-utils/translations.js'
import currencies from '@view-utils/currencies.js'
import incomeDistribution from '@utils/distribution/mincome-proportional.js'
import { SETTING_CURRENT_USER } from './database.js'
import { ErrorDBBadPreviousHEAD, ErrorDBConnection } from '~/shared/domains/gi/db.js'
import { LOGIN, LOGOUT, EVENT_HANDLED, CONTRACTS_MODIFIED } from '@utils/events.js'
import Colors from './colors.js'
import { TypeValidatorError } from '@utils/flowTyper.js'
import { GIErrorUnrecoverable, GIErrorIgnoreAndBanIfGroup, GIErrorDropAndReprocess } from './errors.js'
import { STATUS_OPEN, PROPOSAL_REMOVE_MEMBER } from './contracts/voting/proposals.js'
import { VOTE_FOR } from '@model/contracts/voting/rules.js'
import { actionWhitelisted, CONTRACT_REGEX } from '@model/contracts/Contract.js'
import { currentMonthTimestamp } from '@utils/time.js'
import './contracts/group.js'
import './contracts/mailbox.js'
import './contracts/identity.js'

Vue.use(Vuex)
var store // this is set and made the default export at the bottom of the file.
// we have it declared here to make it accessible in mutations
// 'state' is the Vuex state object, and it can only store JSON-like data
var dropAllMessagesUntilRefresh = false
const contractIsSyncing: {[string]: boolean} = {}

const initialState = {
  currentGroupId: null,
  contracts: {}, // contractIDs => { type:string, HEAD:string } (for contracts we've successfully subscribed to)
  pending: [], // contractIDs we've just published but haven't received back yet
  loggedIn: false, // false | { username: string, identityContractID: string }
  theme: 'blue',
  paymentsByMonth: {},
  reducedMotion: false,
  fontSize: 1
}

// guard all sbp calls for contract actions with this function
function guardedSBP (sel: string, ...data: any): any {
  if (!actionWhitelisted(sel)) {
    throw new GIErrorIgnoreAndBanIfGroup(`guardedSBP('${sel}') not whitelisted!`)
  }
  return sbp(sel, ...data)
}

sbp('sbp/selectors/register', {
  'state/latestContractState': async (contractID: string) => {
    let events = await sbp('backend/eventsSince', contractID, contractID)
    let state = {}
    events = events.map(e => GIMessage.deserialize(e))
    for (const e of events) {
      const stateCopy = _.cloneDeep(state)
      try {
        guardedSBP(e.type(), state, { data: e.data(), meta: e.meta(), hash: e.hash() })
      } catch (err) {
        if (!(err instanceof GIErrorUnrecoverable)) {
          console.warn(`latestContractState: ignoring mutation ${e.hash()}|${e.type()} because of ${err.name}`)
          state = stateCopy
        } else {
          // TODO: make sure every location that calls latestContractState can handle this
          throw err
        }
      }
    }
    return state
  },
  'state/enqueueContractSync': function (contractID: string) {
    // enqueue this invocation in a serial queue to ensure
    // handleEvent does not get called on contractID while it's being sync,
    // but after it's finished syncing. This is used in tandem with
    // 'state/enqueueHandleEvent' defined below. This is all to prevent
    // handleEvent getting called with the wrong previousHEAD for an event.
    return sbp('okTurtles.eventQueue/queueEvent', contractID, [
      'state/vuex/dispatch', 'syncContractWithServer', contractID
    ])
  },
  'state/enqueueHandleEvent': function (event: GIMessage) {
    // make sure handleEvent is called AFTER any currently-running invocations
    // to syncContractWithServer(), to prevent gi.db from throwing
    // "bad previousHEAD" errors
    return sbp('okTurtles.eventQueue/queueEvent', event.contractID(), [
      'state/vuex/dispatch', 'handleEvent', event
    ])
  },
  'state/vuex/state': () => store.state,
  'state/vuex/getters': () => store.getters,
  'state/vuex/dispatch': (...args) => store.dispatch(...args)
})

// Mutations must be synchronous! Never call these directly, instead use commit()
// http://vuex.vuejs.org/en/mutations.html
const mutations = {
  login (state, user) {
    // make sure each time we use the app a valid
    // paymentsByMonth exists for the current month
    const monthTimestamp = currentMonthTimestamp()
    if (!state.paymentsByMonth) {
      state.paymentsByMonth = {}
    }
    if (!state.paymentsByMonth[monthTimestamp]) {
      state.paymentsByMonth[monthTimestamp] = {}
    }
    state.loggedIn = user
    sbp('okTurtles.events/emit', LOGIN, user)
  },
  logout (state) {
    state.loggedIn = false
    state.currentGroupId = null
    sbp('okTurtles.events/emit', LOGOUT)
  },
  processMessage (state, { selector, message }) {
    guardedSBP(selector, state, message)
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
    try {
      store.unregisterModule(contractID)
      Vue.delete(state.contracts, contractID)
    } catch (e) {
      // it's possible this could get triggered if 'removeContract' gets called multiple times
      // with the same contractID
      console.warn(`removeContract: ${e.name} attempting to remove ${contractID}:`, e.message)
    }
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
    // TODO: unsubscribe from events for all members who are not in this group
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
  setReducedMotion (state, isChecked) {
    state.reducedMotion = isChecked
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
    const contract = getters.ourUserIdentityContract
    return (contract.attributes && state[contract.attributes.mailbox]) || {}
  },
  mailboxMessages (state, getters) {
    const mailboxContract = getters.mailboxContract
    return (mailboxContract && mailboxContract.messages) || []
  },
  unreadMessageCount (state, getters) {
    return getters.mailboxMessages.filter(msg => !msg.read).length
  },
  ourUsername (state) {
    return state.loggedIn && state.loggedIn.username
  },
  // Logged In user's identity contract
  ourUserIdentityContract (state) {
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
    return groupId && state[groupId] && Object.keys(state[groupId].profiles || {}).reduce(
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
  groupShouldPropose (state, getters) {
    return getters.groupMembersCount >= 3
  },
  groupMincomeAmount (state, getters) {
    return getters.groupSettings.mincomeAmount
  },
  groupMincomeFormatted (state, getters) {
    const settings = getters.groupSettings
    const currency = currencies[settings.mincomeCurrency]
    return currency && currency.displayWithCurrency(settings.mincomeAmount)
  },
  groupMincomeSymbolWithCode (state, getters) {
    const currency = currencies[getters.groupSettings.mincomeCurrency]
    return currency && currency.symbolWithCode
  },
  groupIncomeDistribution (state, getters) {
    const groupMembers = getters.groupMembers
    const mincomeAmount = getters.groupMincomeAmount
    const currentIncomeDistribution = []
    for (const username in groupMembers) {
      const member = groupMembers[username]
      const incomeDetailsType = member && member.groupProfile.incomeDetailsType
      if (incomeDetailsType) {
        const adjustment = incomeDetailsType === 'incomeAmount' ? 0 : mincomeAmount
        const adjustedAmount = adjustment + member.groupProfile[incomeDetailsType]
        currentIncomeDistribution.push({ name: username, amount: adjustedAmount })
      }
    }
    return incomeDistribution(currentIncomeDistribution, mincomeAmount)
  },
  thisMonthsPayments (state) {
    const payments = state.paymentsByMonth
    return payments && state.paymentsByMonth[currentMonthTimestamp()]
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
      contractIsSyncing[contractID] = true
      // TODO Do we need a since call that is inclusive? Since does not imply inclusion
      const events = await sbp('backend/eventsSince', contractID, recent || contractID)
      // remove the first element in cases where we are not getting the contract for the first time
      state.contracts[contractID] && events.shift()
      for (let i = 0; i < events.length; i++) {
        // this must be called directly, instead of via enqueueHandleEvent
        await dispatch('handleEvent', GIMessage.deserialize(events[i]))
      }
      contractIsSyncing[contractID] = false
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
      const contracts = store.state.contracts
      for (const contractID in contracts) {
        const { type } = contracts[contractID]
        commit('registerContract', { contractID, type })
        await sbp('state/enqueueContractSync', contractID)
      }
      // it's insane, and I'm not sure how this can happen, but it did... and
      // the following steps actually fixed it...
      // TODO: figure out what happened and prevent it from happening again
      //       maybe move this recovery stuff to a recovery page and redirect
      //       us there instead of doing it here.
      const currentGroupId = store.state.currentGroupId
      if (currentGroupId && !contracts[currentGroupId]) {
        console.error(`login: lost current group state somehow for ${currentGroupId}! attempting resync...`)
        await sbp('state/enqueueContractSync', currentGroupId)
      }
      if (!contracts[user.identityContractID]) {
        console.error(`login: lost current identity state somehow for ${user.username} / ${user.identityContractID}! attempting resync...`)
        await sbp('state/enqueueContractSync', user.identityContractID)
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
        console.error('[CRITICAL ERROR] NOT EXPECTING EVENT!', contractID, message)
        throw new GIErrorUnrecoverable(`not expecting ${message.hash()} ${message.serialize()}`)
      }
      // the order the following actions are done is critically important!
      // first we make sure we save this message to the db
      await handleEvent.addMessageToDB(message)
      // process the mutation on the state (everything here must be synchronous)
      handleEvent.processMutation(message)
      // process any side-effects (these must never result in any mutation to this contract state)
      await handleEvent.processSideEffects(message)
    } catch (e) {
      // For details about the rationale for how error handling works here see these links:
      // https://gitlab.okturtles.org/okturtles/group-income-simple/snippets/9
      // https://github.com/okTurtles/group-income-simple/issues/610
      // https://github.com/okTurtles/group-income-simple/issues/602
      // TODO: use a global notification system to both display a notification
      console.error(`[ERROR] exception ${e.name} in handleEvent!`, e.message, e)
      var updateContractHEAD = false
      var banUser = false
      var enterUnrecoverableState = false
      // handle all error types defined in ./errors.js + ErrorDBConnection
      if (e instanceof GIErrorUnrecoverable) {
        console.error('[CRITICAL ERROR] handleEvent:', e.message, e.stack)
        enterUnrecoverableState = true
        // TODO: allow the GIErrorUnrecoverable class a way to specify a potential manual recovery method
        //       that can be displayed on the recovery page?
      } else if (e instanceof GIErrorIgnoreAndBanIfGroup) {
        banUser = true
        updateContractHEAD = true
      } else if (e instanceof GIErrorDropAndReprocess) {
        dropAllMessagesUntilRefresh = true
      } else {
        console.error(`[CRITICAL ERROR] handleEvent: UNKNOWN ERROR ${e.name} SHOULD NEVER HAPPEN:`, e.message, e.stack)
        enterUnrecoverableState = true
      }
      // Take action based on the type of error.
      // The order of the statements below is very important
      handleEvent.restoreCachedState(cachedState)
      // do these after restoreCachedState, to ensure the modifications make it in
      if (updateContractHEAD) {
        commit('setContractHEAD', { contractID, HEAD: message.hash() })
      }
      if (enterUnrecoverableState) {
        // TODO: set state machine critical error state
        console.error('handleEvent: unrecoverable state unimplemented!')
        dropAllMessagesUntilRefresh = true
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
    if (dropAllMessagesUntilRefresh) {
      throw new GIErrorDropAndReprocess(`ignoring message until page refresh: ${message.type()}`)
    }
    try {
      return await sbp('gi.db/log/addEntry', message)
    } catch (e) {
      if (e instanceof ErrorDBBadPreviousHEAD) {
        // the server should never send us a bad previousHEAD (because)
        // it verifies that before adding it to its db. So if we receive
        // this error it means somehow we're getting valid messages out of order
        throw new GIErrorDropAndReprocess(e.message)
      } else if (e instanceof ErrorDBConnection) {
        // we cannot throw GIErrorDropAndReprocess because saving is clearly broken
        // so we re-throw this special error condition that means we can't do anything
        throw new GIErrorUnrecoverable(`${e.name} during addMessageToDB!`)
      } else {
        // we should never get here, but if we do...
        throw new GIErrorUnrecoverable(`${e.name} during addMessageToDB! SHOULD NEVER HAPPEN! ${e.message}`)
      }
    }
  },
  processMutation (message: GIMessage) {
    try {
      const contractID = message.contractID()
      const selector = message.type()
      const hash = message.hash()
      const data = message.data()
      const meta = message.meta()
      const type = CONTRACT_REGEX.exec(selector)[1]
      if (!type) {
        throw new GIErrorIgnoreAndBanIfGroup(`bad selector '${selector}' for message ${hash}`)
      }
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
        // this is likely a GUI-related error/bug, so it's safe to save and reprocess later
        throw new GIErrorDropAndReprocess(`${e.name} during processMutation: ${e.message}`)
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
        throw new GIErrorDropAndReprocess(`${e.name} during processSideEffects: ${e.message}`)
      }
    }
  },
  restoreCachedState (cachedState: Object) {
    try {
      console.error('reverting to previous state!', {
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
      // TODO: set state machine critical error state
    }
  },
  async autoBanSenderOfMessage (message: GIMessage, error: Object) {
    const contractID = message.contractID()
    try {
      // If we just joined, we're likely witnessing an old error that was handled
      // by the existing members, so we shouldn't attempt to participate in voting
      // in a proposal that has long since passed.
      //
      // TODO: we should still autoban them after the sync is finished
      //       if the proposal is still open. See #731
      if (contractIsSyncing[contractID]) {
        console.debug(`skipping autoBanSenderOfMessage since we're syncing ${contractID}`)
        return // don't do anything, assume the existing users handled this event
      }
      // NOTE: this random delay is here for multiple reasons:
      //       1. to avoid backend throwing 'bad previousHEAD' error
      //       https://github.com/okTurtles/group-income-simple/issues/608
      await _.delay(_.randomIntFromRange(1, 2000))
      //       2. because we need to make sure that if a proposal has been cast by someone,
      //       then we are likely to find it in store.state, so we have this random delay
      //       here a the top, before we iterate store.state[groupID].proposals, and
      //       3. to avoid weird errors like 'TypeError: "state[(intermediate value)] is undefined"'
      const username = message.meta().username
      if (message.type().indexOf('gi.contracts/group/') !== 0) {
        console.warn(`autoBanSenderOfMessage: removing & unsubscribing from ${username} contractID: ${contractID}`)
        store.commit('removeContract', contractID)
      }
      if (username && store.getters.memberProfile(username)) {
        console.warn(`autoBanSenderOfMessage: autobanning ${username}`)
        const groupID = store.state.currentGroupId
        var proposal
        var proposalHash
        // find existing proposal if it exists
        for (const hash in store.state[groupID].proposals) {
          const prop = store.state[groupID].proposals[hash]
          if (prop.status === STATUS_OPEN && prop.data.proposalType === PROPOSAL_REMOVE_MEMBER && prop.data.proposalData.member === username) {
            proposal = prop
            proposalHash = hash
            break
          }
        }
        if (proposal) {
          // cast our vote if we haven't already cast it
          if (!proposal.votes[store.getters.ourUsername]) {
            const vote = await sbp('gi.contracts/group/proposalVote/create',
              { proposalHash, vote: VOTE_FOR },
              groupID
            )
            await sbp('backend/publishLogEntry', vote)
          }
        } else {
          // create our proposal to ban the user
          proposal = await sbp('gi.contracts/group/proposal/create',
            {
              proposalType: PROPOSAL_REMOVE_MEMBER,
              proposalData: {
                member: username,
                reason: L("Automated ban because they're sending malformed messages resulting in: {error}", { error: error.message })
              },
              votingRule: store.getters.groupSettings.proposals[PROPOSAL_REMOVE_MEMBER].rule,
              expires_date_ms: Date.now() + store.getters.groupSettings.proposals[PROPOSAL_REMOVE_MEMBER].expires_ms
            },
            groupID
          )
          await sbp('backend/publishLogEntry', proposal)
        }
      }
    } catch (e) {
      console.error(`${e.name} during autoBanSenderOfMessage!`, message, e)
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
