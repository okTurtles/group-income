'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import sbp from '@sbp/sbp'
import { Vue } from '@common/common.js'
import { EVENT_HANDLED, CONTRACT_REGISTERED } from '~/shared/domains/chelonia/events.js'
import Vuex from 'vuex'
import Colors from './colors.js'
import { CHATROOM_PRIVACY_LEVEL } from '@model/contracts/shared/constants.js'
import { MINS_MILLIS } from '@model/contracts/shared/time.js'
import { omit, merge, cloneDeep, debounce } from '@model/contracts/shared/giLodash.js'
import { THEME_LIGHT, THEME_DARK } from '~/frontend/utils/themes.js'
import { unadjustedDistribution, adjustedDistribution } from '@model/contracts/shared/distribution/distribution.js'
import { applyStorageRules } from '~/frontend/model/notifications/utils.js'

// Vuex modules.
import notificationModule from '~/frontend/model/notifications/vuexModule.js'

Vue.use(Vuex)

const checkSystemColor = () => {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? THEME_DARK
    : THEME_LIGHT
}

const defaultTheme = 'system'
const defaultColor = checkSystemColor()

if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (store.state.theme === 'system') {
      store.commit('setTheme', 'system')
    }
  })
}

const initialState = {
  currentGroupId: null,
  currentChatRoomIDs: {}, // { [groupId]: currentChatRoomId }
  chatRoomScrollPosition: {}, // [chatRoomId]: messageId
  chatRoomUnread: {}, // [chatRoomId]: { since: { messageId, createdDate }, mentions: [{ messageId, createdDate }] }
  contracts: {}, // contractIDs => { type:string, HEAD:string } (for contracts we've successfully subscribed to)
  pending: [], // contractIDs we've just published but haven't received back yet
  loggedIn: false, // false | { username: string, identityContractID: string }
  namespaceLookups: Object.create(null), // { [username]: sbp('namespace/lookup') }
  theme: defaultTheme,
  themeColor: defaultColor,
  reducedMotion: false,
  notificationEnabled: true,
  increasedContrast: false,
  fontSize: 16,
  appLogsFilter: process.env.NODE_ENV === 'development'
    ? ['error', 'warn', 'info', 'debug', 'log']
    : ['error', 'warn', 'info']
}

const reactiveDate = Vue.observable({ date: new Date() })
setInterval(function () {
  const date = new Date()
  // payments recalculation happen within a minute of day switchover
  if (Math.abs(reactiveDate.date.getTime() - date.getTime()) >= MINS_MILLIS) {
    reactiveDate.date = date
  }
}, 60 * 1000)

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
    if (!state.chatRoomScrollPosition) {
      state.chatRoomScrollPosition = {}
    }
    if (!state.chatRoomUnread) {
      state.chatRoomUnread = {}
    }
    if (!state.namespaceLookups) {
      state.namespaceLookups = Object.create(null)
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
  setCurrentGroupId (state, currentGroupId) {
    // TODO: unsubscribe from events for all members who are not in this group
    Vue.set(state, 'currentGroupId', currentGroupId)
  },
  setTheme (state, theme) {
    state.theme = theme
    state.themeColor = theme === 'system' ? checkSystemColor() : theme
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
  setNotificationEnabled (state, enabled) {
    state.notificationEnabled = enabled
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
    if (groupId && state[groupId] && chatRoomId) { // useful when initialize when syncing in another device
      Vue.set(state.currentChatRoomIDs, groupId, chatRoomId)
    } else if (chatRoomId) { // set chatRoomId as the current chatroomId of current group
      Vue.set(state.currentChatRoomIDs, state.currentGroupId, chatRoomId)
    } else if (groupId && state[groupId]) { // set defaultChatRoomId as the current chatroomId of current group
      Vue.set(state.currentChatRoomIDs, state.currentGroupId, state[groupId].generalChatRoomId || null)
    } else { // reset
      Vue.set(state.currentChatRoomIDs, state.currentGroupId, null)
    }
  },
  setChatRoomScrollPosition (state, { chatRoomId, messageId }) {
    Vue.set(state.chatRoomScrollPosition, chatRoomId, messageId)
  },
  deleteChatRoomScrollPosition (state, { chatRoomId }) {
    Vue.delete(state.chatRoomScrollPosition, chatRoomId)
  },
  setChatRoomUnreadSince (state, { chatRoomId, messageId, createdDate }) {
    const prevMentions = state.chatRoomUnread[chatRoomId] ? state.chatRoomUnread[chatRoomId].mentions : []
    Vue.set(state.chatRoomUnread, chatRoomId, {
      since: { messageId, createdDate, deletedDate: null },
      mentions: prevMentions.filter(m => new Date(m.createdDate).getTime() > new Date(createdDate).getTime())
    })
  },
  deleteChatRoomUnreadSince (state, { chatRoomId, deletedDate }) {
    Vue.set(state.chatRoomUnread[chatRoomId], 'since', {
      ...state.chatRoomUnread[chatRoomId].since,
      deletedDate
    })
  },
  addChatRoomUnreadMention (state, { chatRoomId, messageId, createdDate }) {
    const prevUnread = state.chatRoomUnread[chatRoomId]
    if (!prevUnread) {
      Vue.set(state.chatRoomUnread, chatRoomId, {
        since: { messageId, createdDate, deletedDate: null, fromBeginning: true },
        mentions: [{ messageId, createdDate }]
      })
    } else {
      prevUnread.mentions.push({ messageId, createdDate })
    }
  },
  deleteChatRoomUnreadMention (state, { chatRoomId, messageId }) {
    const prevUnread = state.chatRoomUnread[chatRoomId]
    if (!prevUnread) {
      return
    }

    prevUnread.mentions = prevUnread.mentions.filter(m => m.messageId !== messageId)
  },
  deleteChatRoomUnread (state, { chatRoomId }) {
    Vue.delete(state.chatRoomUnread, chatRoomId)
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
  // We register pure Vuex getters here, but later on at the bottom of this file,
  // we will also import into Vuex the contract getters so that they can be reused
  // without having to be redefined. This is possible because Chelonia contract getters
  // are designed to be compatible with Vuex getters.
  //
  // We will use the getters 'currentGroupState', 'currentIdentityState', and
  // 'currentChatRoomState' as a "bridge" between the contract getters and Vuex.
  //
  // This makes it possible for the getters inside of contracts to refer to each
  // specific contractID instance, while the Vuex version of those getters that
  // are imported at the bottom of this file (in the listener for CONTRACT_REGISTERED
  // will reference the state for the specific contractID for either the current group,
  // the current user identity contract, or the current chatroom we're looking at.
  //
  // For getters that get data from only contract state, write them
  // under the 'getters' key of the object passed to 'chelonia/defineContract'.
  // See for example: frontend/model/contracts/group.js
  //
  // Again, for convenience, we've defined the same getter, `currentGroupState`,
  // twice, so that we can reuse the same getter definitions both here with Vuex,
  // and inside of the contracts (e.g. in group.js).
  //
  // The 'currentGroupState' here is based off the value of `state.currentGroupId`,
  // a user preference that does not exist in the group contract state.
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
  // this getter gets recomputed automatically according to the setInterval on reactiveDate
  currentPaymentPeriod (state, getters) {
    return getters.periodStampGivenDate(reactiveDate.date)
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
    const ourAdjustedPayments = getters.groupIncomeAdjustedDistribution.filter(isOurPayment)
    const receivedOrSent = isNeeder
      ? getters.ourPaymentsReceivedInPeriod(cPeriod)
      : getters.ourPaymentsSentInPeriod(cPeriod)
    const paymentsTotal = ourAdjustedPayments.length + receivedOrSent.length
    const nonLateAdjusted = ourAdjustedPayments.filter((p) => !p.isLate)
    const paymentsDone = paymentsTotal - nonLateAdjusted.length
    const hasPartials = ourAdjustedPayments.some(p => p.partial)
    const amountDone = receivedOrSent.reduce((acc, payment) => acc + payment.amount, 0)
    const amountLeft = ourAdjustedPayments.reduce((acc, payment) => acc + payment.amount, 0)
    const amountTotal = amountDone + amountLeft
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
    if (!profiles || !profiles[getters.ourUsername]) return []
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
      .filter(username => getters.groupProfiles[username] ||
         getters.groupMembersPending[username].expires >= Date.now())
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
  groupProposals (state, getters) {
    return contractID => state[contractID]?.proposals
  },
  globalProfile (state, getters) {
    // get profile from username who is part of current group
    return username => {
      const groupProfile = getters.groupProfile(username)
      const identityState = groupProfile && state[groupProfile.contractID]
      return identityState && identityState.attributes
    }
  },
  globalProfile2 (state, getters) {
    // get profile from username who is part of the group identified by it's group ID
    return (groupID, username) => {
      const groupProfile = state[groupID]?.profiles[username]
      const identityState = groupProfile && state[groupProfile.contractID]
      return identityState && identityState.attributes
    }
  },
  groupMembers (state, getters) {
    return contractID => {
      const profiles = state[contractID]?.profiles || {}
      return Object.keys(profiles).map(username => {
        return getters.globalProfile2(contractID, username)
      })
    }
  },
  ourContactProfiles (state, getters) {
    const profiles = {}
    const allProfiles = getters.groupsByName
      .map(({ groupName, contractID }) => getters.groupMembers(contractID))
      .flat()
    const profilesSet = allProfiles
      .filter((profile, pos) => profile && profile.username !== getters.ourUsername &&
        allProfiles.findIndex(p => p.username === profile.username) === pos)
    for (const profile of profilesSet) {
      profiles[profile.username] = profile
    }
    return profiles
  },
  ourContacts (state, getters) {
    return Object.keys(getters.ourContactProfiles)
      .sort((usernameA, usernameB) => {
        const nameA = getters.ourContactProfiles[usernameA].displayName?.toUpperCase()
        const nameB = getters.ourContactProfiles[usernameB].displayName?.toUpperCase()
        return nameA > nameB ? 1 : -1
      })
  },
  isDirectMessage (state, getters) {
    // NOTE: mailbox contract could not be synced at the time of calling this getter
    return chatRoomId => Object.keys(getters.mailboxContract.users || {})
      .map(username => getters.mailboxContract.users[username].contractID)
      .includes(chatRoomId)
  },
  colors (state) {
    return Colors[state.themeColor]
  },
  fontSize (state) {
    return state.fontSize
  },
  theme (state) {
    return state.theme
  },
  isDarkTheme (state) {
    return state.themeColor === THEME_DARK
  },
  currentChatRoomId (state, getters) {
    return state.currentChatRoomIDs[state.currentGroupId] || null
  },
  currentChatRoomScrollPosition (state, getters) {
    return state.chatRoomScrollPosition[getters.currentChatRoomId] // undefined means to the latest
  },
  ourUnreadMessages (state, getters) {
    return state.chatRoomUnread
  },
  currentChatRoomUnreadSince (state, getters) {
    return getters.ourUnreadMessages[getters.currentChatRoomId]?.since // undefined means to the latest
  },
  currentChatRoomUnreadMentions (state, getters) {
    return getters.ourUnreadMessages[getters.currentChatRoomId]?.mentions || []
  },
  chatRoomUnreadMentions (state, getters) {
    return (chatRoomId: string) => {
      return getters.ourUnreadMessages[chatRoomId]?.mentions || []
    }
  },
  directMessageIDFromUsername (state, getters) {
    return (username: string) => getters.mailboxContract.users[username]?.contractID
  },
  usernameFromDirectMessageID (state, getters) {
    return (chatRoomId: string) => {
      if (!getters.isDirectMessage(chatRoomId)) {
        return
      }
      return Object.keys(getters.mailboxContract.users)
        .find(username => getters.directMessageIDFromUsername(username) === chatRoomId)
    }
  },
  groupIdFromChatRoomId (state, getters) {
    return (chatRoomId: string) => Object.keys(state.contracts)
      .find(cId => state.contracts[cId].type === 'gi.contracts/group' &&
        Object.keys(state[cId].chatRooms).includes(chatRoomId))
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
    const chatRoomsInDetail = merge({}, getters.getChatRooms)
    for (const contractID in chatRoomsInDetail) {
      const chatRoom = state[contractID]
      if (chatRoom && chatRoom.attributes &&
        chatRoom.users[state.loggedIn.username]) {
        const unreadMentionsCount = getters.chatRoomUnreadMentions(contractID).length
        chatRoomsInDetail[contractID] = {
          ...chatRoom.attributes,
          id: contractID,
          unreadMentionsCount,
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
  state: cloneDeep(initialState),
  mutations,
  getters,
  modules: {
    notifications: notificationModule
  },
  strict: false // we're intentionally modifying state outside of commits
})

// Somewhat of a hack, I'm not sure why this is necessary now, but ever since changing how
// getters.currentPaymentPeriod works, this is necessary to force the UI to update immediately
// after a payment is made.
store.watch(function (state, getters) {
  return getters.currentGroupState.settings?.distributionDate
}, function () {
  reactiveDate.date = new Date()
})

// save the state each time it's modified, but debounce it to avoid saving too frequently
const debouncedSave = debounce(() => sbp('state/vuex/save'), 500)
store.subscribe((commit) => {
  if (commit.type !== 'noop') {
    debouncedSave()
  }
}) // for e.g saving notifications that are markedAsRead
// since Chelonia updates do not pass through calls to 'commit', also save upon EVENT_HANDLED
sbp('okTurtles.events/on', EVENT_HANDLED, debouncedSave)
// logout will call 'state/vuex/save', so we clear any debounced calls to it before it gets run
sbp('sbp/filters/selector/add', 'gi.actions/identity/logout', function () {
  debouncedSave.clear()
})
// Since Chelonia directly modifies contract state without using 'commit', we
// need this hack to tell the vuex developer tool it needs to refresh the state
if (process.env.NODE_ENV === 'development') {
  sbp('okTurtles.events/on', EVENT_HANDLED, debounce(() => {
    store.commit('noop')
  }, 500))
}

// See the "IMPORTANT" comment above where the Vuex getters are defined for details.
// handle contracts being registered
const omitGetters = {
  'gi.contracts/group': ['currentGroupState'],
  'gi.contracts/identity': ['currentIdentityState'],
  'gi.contracts/chatroom': ['currentChatRoomState']
}
sbp('okTurtles.events/on', CONTRACT_REGISTERED, (contract) => {
  const { contracts: { manifests } } = sbp('chelonia/config')
  // check to make sure we're only loading the getters for the version of the contract
  // that this build of GI was compiled with
  if (manifests[contract.name] === contract.manifest) {
    console.debug(`registering getters for '${contract.name}' (${contract.manifest})`)
    store.registerModule(contract.name, {
      getters: omit(contract.getters, omitGetters[contract.name] || [])
    })
  }
})

export default store
