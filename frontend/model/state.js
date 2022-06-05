'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import sbp from '@sbp/sbp'
import Vue from 'vue'
import Vuex from 'vuex'
// HACK: work around esbuild code splitting / chunking bug: https://github.com/evanw/esbuild/issues/399
import { EVENT_HANDLED } from '~/shared/domains/chelonia/events.js'
import Colors from './colors.js'
import { CHATROOM_PRIVACY_LEVEL } from './contracts/constants.js'
import * as _ from '~/frontend/utils/giLodash.js'
import './contracts/mailbox.js'
import './contracts/identity.js'
import './contracts/chatroom.js'
import './contracts/group.js'
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
    ? ['error', 'warn', 'info', 'debug', 'log']
    : ['error', 'warn', 'info']
}

sbp('sbp/selectors/register', {
  // 'state' is the Vuex state object, and it can only store JSON-like data
  'state/vuex/state': () => store.state,
  'state/vuex/replace': (state) => store.replaceState(state),
  'state/vuex/commit': (id, payload) => store.commit(id, payload),
  'state/vuex/getters': () => store.getters,
  'state/vuex/postUpgradeVerification': function (state: Object) {
    // Note: Update this function when renaming a Vuex module, or implementing a new one,
    // or adding new settings to the initialState above
    if (!state.notifications) {
      state.notifications = []
    }
    if (!state.currentChatRoomIDs) {
      state.currentChatRoomIDs = {}
    }
  },
  'state/vuex/save': async function () {
    const state = store.state
    // IMPORTANT! DO NOT CALL VUEX commit() in here in any way shape or form!
    //            Doing so will cause an infinite loop because of store.subscribe below!
    if (state.loggedIn) {
      state.notifications = applyStorageRules(state.notifications || [])
      // TODO: encrypt this
      await sbp('gi.db/settings/save', state.loggedIn.username, state)
    }
  }
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
  },
  // Since Chelonia directly modifies contract state without using 'commit', we
  // need this hack to tell the vuex developer tool it needs to refresh the state
  noop () {}
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
  ..._.omit(sbp('gi.contracts/identity/getters'), ['currentIdentityState']),
  ..._.omit(sbp('gi.contracts/chatroom/getters'), ['currentChatRoomState']),
  currentGroupState (state) {
    return state[state.currentGroupId] || {} // avoid "undefined" vue errors at inoportune times
  },
  currentIdentityState (state) {
    return (state.loggedIn && state[state.loggedIn.identityContractID]) || {}
  },
  currentChatRoomState (state, getters) {
    return state[getters.currentChatRoomId] || {} // avoid "undefined" vue errors at inoportune times
  },
  mailboxContract (state, getters) {
    const contract = getters.currentIdentityState
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
    const userContract = getters.currentIdentityState || {}
    return (userContract.attributes && userContract.attributes.displayName) || getters.ourUsername
  },
  ourIdentityContractId (state) {
    return state.loggedIn && state.loggedIn.identityContractID
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

const store: any = new Vuex.Store({
  state: _.cloneDeep(initialState),
  mutations,
  getters,
  modules: {
    notifications: notificationModule
  },
  strict: false // we're intentionally modifying state outside of commits
})

// save the state each time it's modified, but debounce it to avoid saving too frequently
const debouncedSave = _.debounce(() => sbp('state/vuex/save'), 500)
store.subscribe(debouncedSave) // for e.g saving notifications that are markedAsRead
// since Chelonia updates do not pass through calls to 'commit', also save upon EVENT_HANDLED
sbp('okTurtles.events/on', EVENT_HANDLED, debouncedSave)
// logout will call 'state/vuex/save', so we clear any debounced calls to it before it gets run
sbp('sbp/filters/selector/add', 'gi.actions/identity/logout', function () {
  debouncedSave.clear()
})
// Since Chelonia directly modifies contract state without using 'commit', we
// need this hack to tell the vuex developer tool it needs to refresh the state
if (process.env.NODE_ENV === 'development') {
  sbp('okTurtles.events/on', EVENT_HANDLED, _.debounce(() => {
    store.commit('noop')
  }, 500))
}

export default store
