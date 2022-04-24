'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import sbp from '@sbp/spb'
import Vue from 'vue'
import Vuex from 'vuex'
// HACK: work around esbuild code splitting / chunking bug: https://github.com/evanw/esbuild/issues/399
import '~/shared/domains/chelonia/chelonia.js'
import { SETTING_CURRENT_USER } from './database.js'
import Colors from './colors.js'
import { CHATROOM_PRIVACY_LEVEL } from './contracts/constants.js'
import * as _ from '~/frontend/utils/giLodash.js'
import * as EVENTS from '~/frontend/utils/events.js'
import './contracts/mailbox.js'
import './contracts/identity.js'
import './contracts/chatroom.js'
import './contracts/group.js'
import { captureLogsStart, captureLogsPause } from '~/frontend/model/captureLogs.js'
import { THEME_LIGHT, THEME_DARK } from '~/frontend/utils/themes.js'
import { unadjustedDistribution, adjustedDistribution } from '~/frontend/model/contracts/distribution/distribution.js'
import { applyStorageRules } from '~/frontend/model/notifications/utils.js'

// Vuex modules.
import notificationModule from '~/frontend/model/notifications/vuexModule.js'

Vue.use(Vuex)

let defaultTheme = THEME_LIGHT
if (typeof (window) !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  defaultTheme = THEME_DARK
}

const initialState = {
  currentGroupId: null,
  currentChatRoomIDs: {}, // { [groupId]: currentChatRoomId }
  contracts: {}, // contractIDs => { type:string, HEAD:string } (for contracts we've successfully subscribed to)
  pending: [], // contractIDs we've just published but haven't received back yet
  loggedIn: false, // false | { username: string, identityContractID: string }
  theme: defaultTheme,
  reducedMotion: false,
  increasedContrast: false,
  fontSize: 16,
  appLogsFilter: process.env.NODE_ENV === 'development'
    ? ['error', 'warn', 'debug', 'log']
    : ['error', 'warn']
}

sbp('sbp/selectors/register', {
  // 'state' is the Vuex state object, and it can only store JSON-like data
  'state/vuex/state': () => store.state,
  'state/vuex/commit': (id, payload) => store.commit(id, payload),
  'state/vuex/dispatch': (...args) => store.dispatch(...args),
  'state/vuex/getters': () => store.getters
})

// Mutations must be synchronous! Never call these directly, instead use commit()
// http://vuex.vuejs.org/en/mutations.html
const mutations = {
  login (state, user) {
    state.loggedIn = user
  },
  logout (state) {
    state.loggedIn = false
    state.currentGroupId = null
  },
  processMessage (state, { message }) {
    sbp('chelonia/private/in/processMessage', message, state)
  },
  registerContract (state, { contractID, type }) {
    const firstTimeRegistering = !state[contractID]
    const vuexModule = {
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
    sbp('okTurtles.events/emit', EVENTS.CONTRACTS_MODIFIED, state.contracts)
  },
  setContractHEAD (state, { contractID, HEAD }) {
    const contract = state.contracts[contractID]
    if (!contract) {
      console.error(`This contract ${contractID} doesn't exist anymore. Probably you left the group just now.`)
      return
    }
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
    sbp('okTurtles.events/emit', EVENTS.CONTRACTS_MODIFIED, state.contracts)
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
    Vue.set(state, 'currentGroupId', currentGroupId)
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
  setTemporaryReducedMotion (state) {
    const tempSettings = state.reducedMotion
    state.reducedMotion = true
    setTimeout(() => {
      state.reducedMotion = tempSettings
    }, 300)
  },
  setIncreasedContrast (state, isChecked) {
    state.increasedContrast = isChecked
  },
  setFontSize (state, fontSize) {
    state.fontSize = fontSize
  },
  setAppLogsFilters (state, filters) {
    state.appLogsFilter = filters
  },
  setCurrentChatRoomId (state, { groupId, chatRoomId }) {
    if (chatRoomId) {
      Vue.set(state.currentChatRoomIDs, state.currentGroupId, chatRoomId)
    } else if (groupId && state[groupId]) {
      Vue.set(state.currentChatRoomIDs, state.currentGroupId, state[groupId].generalChatRoomId || null)
    } else {
      Vue.set(state.currentChatRoomIDs, state.currentGroupId, null)
    }
  }
}

// https://vuex.vuejs.org/en/getters.html
// https://vuex.vuejs.org/en/modules.html
const getters = {
  // !!  IMPORTANT  !!
  //
  // For getters that get data from only contract state, write them
  // under the 'getters' key of the object passed to DefineContract.
  // See for example: frontend/model/contracts/group.js
  //
  // For convenience, we've defined the same getter, `currentGroupState`,
  // twice, so that we can reuse the same getter definitions both here with Vuex,
  // and inside of the contracts (e.g. in group.js).
  //
  // The one here is based off the value of `state.currentGroupId` — a user
  // preference that does not exist in the group contract state.
  //
  // The getters in DefineContract are designed to be compatible with Vuex!
  // When they're used in the context of DefineContract, their 'state' always refers
  // to the state of the contract whose messages are being processed, regardless
  // of what group we're in. That is why the definition of 'currentGroupState' in
  // group.js simply returns the state.
  //
  // Since the getter functions are compatible between Vuex and our contract chain
  // library, we can simply import them here, while excluding the getter for
  // `currentGroupState`, and redefining it here based on the Vuex rootState.
  ..._.omit(sbp('gi.contracts/group/getters'), ['currentGroupState']),
  ..._.omit(sbp('gi.contracts/chatroom/getters'), ['currentChatRoomState']),
  currentGroupState (state) {
    return state[state.currentGroupId] || {} // avoid "undefined" vue errors at inoportune times
  },
  currentChatRoomState (state, getters) {
    return state[getters.currentChatRoomId] || {} // avoid "undefined" vue errors at inoportune times
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
  ourGroupProfile (state, getters) {
    return getters.groupProfile(getters.ourUsername)
  },
  ourUserDisplayName (state, getters) {
    // TODO - refactor Profile and Welcome and any other component that needs this
    const userContract = getters.ourUserIdentityContract || {}
    return (userContract.attributes && userContract.attributes.displayName) || getters.ourUsername
  },
  ourIdentityContractId (state) {
    return state.loggedIn && state.loggedIn.identityContractID
  },
  // Logged In user's identity contract
  ourUserIdentityContract (state) {
    return (state.loggedIn && state[state.loggedIn.identityContractID]) || {}
  },
  // NOTE: since this getter is written using `getters.ourUsername`, which is based
  //       on vuexState.loggedIn (a user preference), we cannot use this getter
  //       into group.js
  ourContributionSummary (state, getters) {
    const groupProfiles = getters.groupProfiles
    const ourUsername = getters.ourUsername
    const ourGroupProfile = getters.ourGroupProfile

    if (!ourGroupProfile || !ourGroupProfile.incomeDetailsType) {
      return {}
    }

    const doWeNeedIncome = ourGroupProfile.incomeDetailsType === 'incomeAmount'
    const distribution = getters.groupIncomeDistribution

    const nonMonetaryContributionsOf = (username) => groupProfiles[username].nonMonetaryContributions || []
    const getDisplayName = (username) => getters.globalProfile(username).displayName || username

    return {
      givingMonetary: (() => {
        if (doWeNeedIncome) { return null }
        const who = []
        const total = distribution
          .filter(p => p.from === ourUsername)
          .reduce((acc, payment) => {
            who.push(getDisplayName(payment.to))
            return acc + payment.amount
          }, 0)

        return { who, total, pledged: ourGroupProfile.pledgeAmount }
      })(),
      receivingMonetary: (() => {
        if (!doWeNeedIncome) { return null }
        const needed = getters.groupSettings.mincomeAmount - ourGroupProfile.incomeAmount
        const who = []
        const total = distribution
          .filter(p => p.to === ourUsername)
          .reduce((acc, payment) => {
            who.push(getDisplayName(payment.from))
            return acc + payment.amount
          }, 0)

        return { who, total, needed }
      })(),
      receivingNonMonetary: (() => {
        const listWho = Object.keys(groupProfiles)
          .filter(username => username !== ourUsername && nonMonetaryContributionsOf(username).length > 0)
        const listWhat = listWho.reduce((contr, username) => {
          const displayName = getDisplayName(username)
          const userContributions = nonMonetaryContributionsOf(username)

          userContributions.forEach((what) => {
            const contributionIndex = contr.findIndex(c => c.what === what)
            contributionIndex >= 0
              ? contr[contributionIndex].who.push(displayName)
              : contr.push({ who: [displayName], what })
          })
          return contr
        }, [])

        return listWho.length > 0 ? { what: listWhat, who: listWho } : null
      })(),
      givingNonMonetary: (() => {
        const contributions = ourGroupProfile.nonMonetaryContributions

        return contributions.length > 0 ? contributions : null
      })()
    }
  },
  userDisplayName (state, getters) {
    return (username) => {
      const profile = getters.globalProfile(username) || {}
      return profile.displayName || username
    }
  },
  currentPaymentPeriod (state, getters) {
    return getters.periodStampGivenDate(new Date())
  },
  thisPeriodPaymentInfo (state, getters) {
    return getters.groupPeriodPayments[getters.currentPaymentPeriod]
  },
  latePayments (state, getters) {
    const periodPayments = getters.groupPeriodPayments
    if (Object.keys(periodPayments).length === 0) return
    const ourUsername = getters.ourUsername
    const pPeriod = getters.periodBeforePeriod(getters.currentPaymentPeriod)
    const pPayments = periodPayments[pPeriod]
    if (pPayments) {
      return pPayments.lastAdjustedDistribution.filter(todo => todo.from === ourUsername)
    }
  },
  // used with graphs like those in the dashboard and in the income details modal
  groupIncomeDistribution (state, getters) {
    return unadjustedDistribution({
      haveNeeds: getters.haveNeedsForThisPeriod(getters.currentPaymentPeriod),
      minimize: false
    })
  },
  // adjusted version of groupIncomeDistribution, used by the payments system
  groupIncomeAdjustedDistribution (state, getters) {
    const paymentInfo = getters.thisPeriodPaymentInfo
    if (paymentInfo && paymentInfo.lastAdjustedDistribution) {
      return paymentInfo.lastAdjustedDistribution
    } else {
      const period = getters.currentPaymentPeriod
      return adjustedDistribution({
        distribution: unadjustedDistribution({
          haveNeeds: getters.haveNeedsForThisPeriod(period),
          minimize: getters.groupSettings.minimizeDistribution
        }),
        payments: getters.paymentsForPeriod(period),
        dueOn: getters.dueDateForPeriod(period)
      })
    }
  },
  ourPaymentsSentInPeriod (state, getters) {
    return (period) => {
      const periodPayments = getters.groupPeriodPayments
      if (Object.keys(periodPayments).length === 0) return
      const payments = []
      const thisPeriodPayments = periodPayments[period]
      const paymentsFrom = thisPeriodPayments && thisPeriodPayments.paymentsFrom
      if (paymentsFrom) {
        const ourUsername = getters.ourUsername
        const allPayments = getters.currentGroupState.payments
        for (const toUser in paymentsFrom[ourUsername]) {
          for (const paymentHash of paymentsFrom[ourUsername][toUser]) {
            const { data, meta } = allPayments[paymentHash]
            payments.push({ hash: paymentHash, data, meta, amount: data.amount, username: toUser })
          }
        }
      }
      return payments
    }
  },
  ourPaymentsReceivedInPeriod (state, getters) {
    return (period) => {
      const periodPayments = getters.groupPeriodPayments
      if (Object.keys(periodPayments).length === 0) return
      const payments = []
      const thisPeriodPayments = periodPayments[period]
      const paymentsFrom = thisPeriodPayments && thisPeriodPayments.paymentsFrom
      if (paymentsFrom) {
        const ourUsername = getters.ourUsername
        const allPayments = getters.currentGroupState.payments
        for (const fromUser in paymentsFrom) {
          for (const toUser in paymentsFrom[fromUser]) {
            if (toUser === ourUsername) {
              for (const paymentHash of paymentsFrom[fromUser][toUser]) {
                const { data, meta } = allPayments[paymentHash]
                payments.push({ hash: paymentHash, data, meta, amount: data.amount, username: toUser })
              }
            }
          }
        }
      }
      return payments
    }
  },
  ourPayments (state, getters) {
    const periodPayments = getters.groupPeriodPayments
    if (Object.keys(periodPayments).length === 0) return
    const ourUsername = getters.ourUsername
    const cPeriod = getters.currentPaymentPeriod
    const pPeriod = getters.periodBeforePeriod(cPeriod)
    const currentSent = getters.ourPaymentsSentInPeriod(cPeriod)
    const previousSent = getters.ourPaymentsSentInPeriod(pPeriod)
    const currentReceived = getters.ourPaymentsReceivedInPeriod(cPeriod)
    const previousReceived = getters.ourPaymentsReceivedInPeriod(pPeriod)

    // TODO: take into account pending payments that have been sent but not yet completed
    const todo = () => {
      return getters.groupIncomeAdjustedDistribution.filter(p => p.from === ourUsername)
    }

    return {
      sent: [...currentSent, ...previousSent],
      received: [...currentReceived, ...previousReceived],
      todo: todo()
    }
  },
  ourPaymentsSummary (state, getters) {
    const isNeeder = getters.ourGroupProfile.incomeDetailsType === 'incomeAmount'
    const ourUsername = getters.ourUsername
    const isOurPayment = (payment) => {
      return isNeeder ? payment.to === ourUsername : payment.from === ourUsername
    }
    const cPeriod = getters.currentPaymentPeriod
    const ourUnadjustedPayments = getters.groupIncomeDistribution.filter(isOurPayment)
    const ourAdjustedPayments = getters.groupIncomeAdjustedDistribution.filter(isOurPayment)

    const receivedOrSent = isNeeder
      ? getters.ourPaymentsReceivedInPeriod(cPeriod)
      : getters.ourPaymentsSentInPeriod(cPeriod)
    const paymentsTotal = ourAdjustedPayments.length + receivedOrSent.length
    const nonLateAdjusted = ourAdjustedPayments.filter((p) => !p.isLate)
    const paymentsDone = paymentsTotal - nonLateAdjusted.length
    const hasPartials = ourAdjustedPayments.some(p => p.partial)
    const amountTotal = ourUnadjustedPayments.reduce((acc, payment) => acc + payment.amount, 0)
    const amountDone = receivedOrSent.reduce((acc, payment) => acc + payment.amount, 0)
    return {
      paymentsDone,
      hasPartials,
      paymentsTotal,
      amountDone,
      amountTotal
    }
  },
  // list of group names and contractIDs
  groupsByName (state) {
    const contracts = state.contracts
    // The code below was originally Object.entries(...) but changed to .keys()
    // due to the same flow issue as https://github.com/facebook/flow/issues/5838
    return Object.keys(contracts || {})
      .filter(contractID => contracts[contractID].type === 'gi.contracts/group' && state[contractID].settings)
      .map(contractID => ({ groupName: state[contractID].settings.groupName, contractID }))
  },
  groupMembersSorted (state, getters) {
    const profiles = getters.currentGroupState.profiles
    if (!profiles) return []
    const weJoinedMs = new Date(profiles[getters.ourUsername].joinedDate).getTime()
    const isNewMember = (username) => {
      if (username === getters.ourUsername) { return false }
      const memberProfile = profiles[username]
      if (!memberProfile) return false
      const memberJoinedMs = new Date(memberProfile.joinedDate).getTime()
      const joinedAfterUs = weJoinedMs <= memberJoinedMs
      return joinedAfterUs && Date.now() - memberJoinedMs < 604800000 // joined less than 1w (168h) ago.
    }

    return Object.keys({ ...getters.groupMembersPending, ...getters.groupProfiles })
      .map(username => {
        const { displayName } = getters.globalProfile(username) || {}
        return {
          username,
          displayName: displayName || username,
          invitedBy: getters.groupMembersPending[username],
          isNew: isNewMember(username)
        }
      })
      .sort((userA, userB) => {
        const nameA = userA.displayName.toUpperCase()
        const nameB = userB.displayName.toUpperCase()
        // Show pending members first
        if (userA.invitedBy && !userB.invitedBy) { return -1 }
        if (!userA.invitedBy && userB.invitedBy) { return 1 }
        // Then new members...
        if (userA.isNew && !userB.isNew) { return -1 }
        if (!userA.isNew && userB.isNew) { return 1 }
        // and sort them all by A-Z
        return nameA < nameB ? -1 : 1
      })
  },
  globalProfile (state, getters) {
    return username => {
      const groupProfile = getters.groupProfile(username)
      const identityState = groupProfile && state[groupProfile.contractID]
      return identityState && identityState.attributes
    }
  },
  colors (state) {
    return Colors[state.theme]
  },
  fontSize (state) {
    return state.fontSize
  },
  isDarkTheme (state) {
    return Colors[state.theme].theme === THEME_DARK
  },
  currentChatRoomId (state, getters) {
    return state.currentChatRoomIDs[state.currentGroupId] || null
  },
  isPrivateChatRoom (state, getters) {
    return (chatRoomId: string) => {
      return state[chatRoomId]?.attributes.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE
    }
  },
  isJoinedChatRoom (state, getters) {
    return (chatRoomId: string, username?: string) => {
      username = username || state.loggedIn.username
      return !!state[chatRoomId]?.users?.[username]
    }
  },
  chatRoomsInDetail (state, getters) {
    const chatRoomsInDetail = _.merge({}, getters.getChatRooms)
    for (const contractID in chatRoomsInDetail) {
      const chatRoom = state[contractID]
      if (chatRoom && chatRoom.attributes &&
        chatRoom.users[state.loggedIn.username]) {
        chatRoomsInDetail[contractID] = {
          ...chatRoom.attributes,
          id: contractID,
          unreadCount: 0, // TODO: need to implement
          joined: true
        }
      } else {
        const { name, privacyLevel } = chatRoomsInDetail[contractID]
        chatRoomsInDetail[contractID] = { id: contractID, name, privacyLevel, joined: false }
      }
    }
    return chatRoomsInDetail
  },
  chatRoomUsersInSort (state, getters) {
    return getters.groupMembersSorted
      .map(member => ({ username: member.username, displayName: member.displayName }))
      .filter(member => !!getters.chatRoomUsers[member.username]) || []
  }
}

// TODO: convert all these to SBP... and/or call dispatch through SBP only!
const actions = {
  // TODO: Move this into controller/actions/identity? See #804
  async login (
    { dispatch, commit, state }: {dispatch: Function, commit: Function, state: Object},
    user: Object
  ) {
    const settings = await sbp('gi.db/settings/load', user.username)
    // NOTE: login can be called when no settings are saved (e.g. from Signup.vue)
    if (settings) {
      // The retrieved local data might need to be completed in case it was originally saved
      // under an older version of the app where fewer/other Vuex modules were implemented.
      postUpgradeVerification(settings)
      console.debug('loadSettings:', settings)
      store.replaceState(settings)
      captureLogsStart(user.username)
      // This may seem unintuitive to use the store.state from the global store object
      // but the state object in scope is a copy that becomes stale if something modifies it
      // like an outside dispatch
      const contracts = store.state.contracts
      await sbp('chelonia/contract/sync', Object.keys(contracts))
      // it's insane, and I'm not sure how this can happen, but it did... and
      // the following steps actually fixed it...
      // TODO: figure out what happened and prevent it from happening again
      //       maybe move this recovery stuff to a recovery page and redirect
      //       us there instead of doing it here.
      // TODO: fetch events from localStorage instead of server if we have them
      const currentGroupId = store.state.currentGroupId
      if (currentGroupId && !contracts[currentGroupId]) {
        console.error(`login: lost current group state somehow for ${currentGroupId}! attempting resync...`)
        await sbp('chelonia/contract/sync', currentGroupId)
      }
      // TODO: resync for the chatroom contract, because current chatroom contract id could be what the user is not part of
      if (!contracts[user.identityContractID]) {
        console.error(`login: lost current identity state somehow for ${user.username} / ${user.identityContractID}! attempting resync...`)
        await sbp('chelonia/contract/sync', user.identityContractID)
      }
    } else {
      captureLogsStart(user.username)
    }
    await sbp('gi.db/settings/save', SETTING_CURRENT_USER, user.username)
    commit('login', user)
    Vue.nextTick(() => sbp('okTurtles.events/emit', EVENTS.LOGIN, user))
  },
  // TODO: Move this into controller/actions/identity? See #804
  async logout (
    { dispatch, commit, state }: {dispatch: Function, commit: Function, state: Object}
  ) {
    debouncedSave.clear()
    const username = state.loggedIn.username
    await dispatch('saveSettings')
    await sbp('gi.db/settings/save', SETTING_CURRENT_USER, null)
    await sbp('chelonia/contract/remove', Object.keys(state.contracts))
    commit('logout')
    Vue.nextTick(() => {
      sbp('okTurtles.events/emit', EVENTS.LOGOUT)
      captureLogsPause({
        // Let's clear all stored logs to prevent someone else
        // accessing sensitve data after the user logs out.
        wipeOut: true,
        username
      })
    })
  },
  // persisting the state
  async saveSettings (
    { state }: { state: Object}
  ) {
    if (state.loggedIn) {
      let stateToSave = state
      if (!state.notifications) {
        console.warn('saveSettings: No `state.notifications`')
      } else {
        stateToSave = { ...state, notifications: applyStorageRules(state.notifications) }
      }
      // TODO: encrypt this
      await sbp('gi.db/settings/save', state.loggedIn.username, stateToSave)
    }
  }
}

// Note: Update this function when renaming a Vuex module or implementing a new one (except contracts).
const postUpgradeVerification = (settings: Object) => {
  if (!settings.notifications) {
    settings.notifications = []
  }
  if (!settings.currentChatRoomIDs) {
    settings.currentChatRoomIDs = {}
  }
}

const store: any = new Vuex.Store({
  state: _.cloneDeep(initialState),
  mutations,
  getters,
  actions,
  modules: {
    notifications: notificationModule
  },
  strict: process.env.VUEX_STRICT === 'true'
})
const debouncedSave = _.debounce(() => store.dispatch('saveSettings'), 500)
store.subscribe(debouncedSave)

export default store
