'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import sbp from '@sbp/sbp'
import { Vue } from '@common/common.js'
import { EVENT_HANDLED, CONTRACT_REGISTERED } from '~/shared/domains/chelonia/events.js'
import Vuex from 'vuex'
import { CHATROOM_PRIVACY_LEVEL, MESSAGE_NOTIFY_SETTINGS, MESSAGE_TYPES } from '@model/contracts/shared/constants.js'
import { compareISOTimestamps } from '@model/contracts/shared/time.js'
import { omit, merge, cloneDeep, debounce } from '@model/contracts/shared/giLodash.js'
import { unadjustedDistribution, adjustedDistribution } from '@model/contracts/shared/distribution/distribution.js'
import { applyStorageRules } from '~/frontend/model/notifications/utils.js'

// Vuex modules.
import notificationModule from '~/frontend/model/notifications/vuexModule.js'
import settingsModule from '~/frontend/model/settings/vuexModule.js'

Vue.use(Vuex)

const initialState = {
  currentGroupId: null,
  currentChatRoomIDs: {}, // { [groupId]: currentChatRoomId }
  chatRoomScrollPosition: {}, // [chatRoomId]: messageHash
  chatRoomUnread: {}, // [chatRoomId]: { readUntil: { messageHash, createdDate }, messages: [{ messageHash, createdDate, type, deletedDate? }]}
  chatNotificationSettings: {}, // { messageNotification: MESSAGE_NOTIFY_SETTINGS, messageSound: MESSAGE_NOTIFY_SETTINGS }
  contracts: {}, // contractIDs => { type:string, HEAD:string } (for contracts we've successfully subscribed to)
  pending: [], // contractIDs we've just published but haven't received back yet
  loggedIn: false, // false | { username: string, identityContractID: string }
  namespaceLookups: Object.create(null), // { [username]: sbp('namespace/lookup') }
  periodicNotificationAlreadyFiredMap: {} // { notificationKey: boolean }
}

if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (sbp('state/vuex/getters').theme === 'system') {
      store.commit('setTheme', 'system')
    }
  })
}

const reactiveDate = Vue.observable({ date: new Date() })
setInterval(function () {
  // We want the getters to recalculate all of the payments within 1 minute of us entering a new period.
  const rememberedPeriodStamp = store.getters.periodStampGivenDate?.(reactiveDate.date)
  const currentPeriodStamp = store.getters.periodStampGivenDate?.(new Date())
  if (rememberedPeriodStamp !== currentPeriodStamp) {
    reactiveDate.date = new Date()
  }
}, 60 * 1000)

sbp('sbp/selectors/register', {
  // 'state' is the Vuex state object, and it can only store JSON-like data
  'state/vuex/state': () => store.state,
  'state/vuex/replace': (state) => store.replaceState(state),
  'state/vuex/commit': (id, payload) => store.commit(id, payload),
  'state/vuex/getters': () => store.getters,
  'state/vuex/settings': () => store.state.settings,
  'state/vuex/postUpgradeVerification': function (state: Object) {
    // Note: Update this function when renaming a Vuex module, or implementing a new one,
    // or adding new settings to the initialState above
    // Example:
    // if (!state.notifications) {
    //   state.notifications = []
    // }

    // TODO: need to remove the whole content after we release 0.2.*
    for (const chatRoomId in state.chatRoomUnread) {
      if (!state.chatRoomUnread[chatRoomId].messages) {
        state.chatRoomUnread[chatRoomId].messages = []
      }
      if (state.chatRoomUnread[chatRoomId].mentions) {
        state.chatRoomUnread[chatRoomId].mentions.forEach(m => {
          state.chatRoomUnread[chatRoomId].messages.push(Object.assign({ type: MESSAGE_TYPES.TEXT }, m))
        })
        Vue.delete(state.chatRoomUnread[chatRoomId], 'mentions')
      }
      if (state.chatRoomUnread[chatRoomId].others) {
        state.chatRoomUnread[chatRoomId].others.forEach(o => {
          state.chatRoomUnread[chatRoomId].messages.push(Object.assign({ type: MESSAGE_TYPES.INTERACTIVE }, o))
        })
        Vue.delete(state.chatRoomUnread[chatRoomId], 'others')
      }
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
    Object.assign(state, cloneDeep(initialState))
  },
  setCurrentGroupId (state, currentGroupId) {
    // TODO: unsubscribe from events for all members who are not in this group
    Vue.set(state, 'currentGroupId', currentGroupId)
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
  setChatRoomScrollPosition (state, { chatRoomId, messageHash }) {
    Vue.set(state.chatRoomScrollPosition, chatRoomId, messageHash)
  },
  deleteChatRoomScrollPosition (state, { chatRoomId }) {
    Vue.delete(state.chatRoomScrollPosition, chatRoomId)
  },
  setChatRoomReadUntil (state, { chatRoomId, messageHash, createdDate }) {
    Vue.set(state.chatRoomUnread, chatRoomId, {
      readUntil: { messageHash, createdDate, deletedDate: null },
      messages: state.chatRoomUnread[chatRoomId].messages
        ?.filter(m => new Date(m.createdDate).getTime() > new Date(createdDate).getTime()) || []
    })
    // eslint-disable-next-line no-lone-blocks
    {
      // hack: delete me after upgrade to 0.2.x!
      Vue.set(state.chatRoomUnread[chatRoomId], 'mentions', [])
      Vue.set(state.chatRoomUnread[chatRoomId], 'others', [])
    }
  },
  deleteChatRoomReadUntil (state, { chatRoomId, deletedDate }) {
    Vue.set(state.chatRoomUnread[chatRoomId].readUntil, 'deletedDate', deletedDate)
  },
  addChatRoomUnreadMessage (state, { chatRoomId, messageHash, createdDate, type }) {
    state.chatRoomUnread[chatRoomId].messages.push({ messageHash, createdDate, type })
  },
  deleteChatRoomUnreadMessage (state, { chatRoomId, messageHash }) {
    Vue.set(
      state.chatRoomUnread[chatRoomId],
      'messages',
      state.chatRoomUnread[chatRoomId].messages.filter(m => m.messageHash !== messageHash)
    )
  },
  deleteChatRoomUnread (state, { chatRoomId }) {
    Vue.delete(state.chatRoomUnread, chatRoomId)
  },
  setChatroomNotificationSettings (state, { chatRoomId, settings }) {
    if (chatRoomId) {
      if (!state.chatNotificationSettings[chatRoomId]) {
        Vue.set(state.chatNotificationSettings, chatRoomId, {})
      }
      for (const key in settings) {
        Vue.set(state.chatNotificationSettings[chatRoomId], key, settings[key])
      }
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
  currentMailboxState (state, getters) {
    const contract = getters.currentIdentityState
    return (contract.attributes && state[contract.attributes.mailbox]) || {}
  },
  chatNotificationSettings (state) {
    return Object.assign({
      default: {
        messageNotification: MESSAGE_NOTIFY_SETTINGS.DIRECT_MESSAGES,
        messageSound: MESSAGE_NOTIFY_SETTINGS.DIRECT_MESSAGES
      }
    }, state.chatNotificationSettings || {})
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
      if (username === getters.ourUsername) {
        return getters.ourUserDisplayName
      }
      const profile = getters.ourContactProfiles[username] || {}
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
            payments.push({ hash: paymentHash, data, meta, amount: data.amount, period })
          }
        }
      }
      return payments.sort((paymentA, paymentB) => compareISOTimestamps(paymentB.meta.createdDate, paymentA.meta.createdDate))
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
                payments.push({ hash: paymentHash, data, meta, amount: data.amount })
              }
            }
          }
        }
      }
      return payments.sort((paymentA, paymentB) => compareISOTimestamps(paymentB.meta.createdDate, paymentA.meta.createdDate))
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
  ourContactProfiles (state, getters) {
    const profiles = {}
    Object.keys(state.contracts)
      .filter(contractID => state.contracts[contractID].type === 'gi.contracts/identity')
      .forEach(contractID => {
        const attributes = state[contractID].attributes
        if (attributes) { // NOTE: this is for fixing the error while syncing the identity contracts
          profiles[attributes.username] = { ...attributes, contractID }
        }
      })
    return profiles
  },
  ourContacts (state, getters) {
    return Object.keys(getters.ourContactProfiles)
      .sort((usernameA, usernameB) => {
        const nameA = getters.ourContactProfiles[usernameA].displayName?.toUpperCase() || usernameA
        const nameB = getters.ourContactProfiles[usernameB].displayName?.toUpperCase() || usernameB
        return nameA > nameB ? 1 : -1
      })
  },
  ourPrivateDirectMessages (state, getters) {
    const privateDMs = {}
    const contractIDs = Object.keys(getters.ourDirectMessages)
      .filter(cID => getters.ourDirectMessages[cID].privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE && state[cID])
    for (const contractID of contractIDs) {
      const usernames = Object.keys(state[contractID].users || {}) // NOTE: empty object is used while syncing the contract
      const partner = usernames[0] === getters.ourUsername ? usernames[1] : usernames[0]
      if (partner) {
        privateDMs[partner] = {
          ...getters.ourDirectMessages[contractID],
          contractID
        }
      }
    }
    return privateDMs
  },
  ourGroupDirectMessages (state, getters) {
    const groupDMs = {}
    for (const cID of Object.keys(getters.ourDirectMessages)) {
      if (getters.ourDirectMessages[cID].privacyLevel === CHATROOM_PRIVACY_LEVEL.GROUP && state[cID]) {
        groupDMs[cID] = getters.ourDirectMessages[cID]
      }
    }
    return groupDMs
  },
  isDirectMessage (state, getters) {
    // NOTE: mailbox contract could not be synced at the time of calling this getter
    return chatRoomId => {
      const contractID = chatRoomId || getters.currentChatRoomId
      return getters.isJoinedChatRoom(contractID) && !!getters.ourDirectMessages[contractID]
    }
  },
  isPrivateDirectMessage (state, getters) {
    // NOTE: mailbox contract could not be synced at the time of calling this getter
    return chatRoomId => {
      const contractID = chatRoomId || getters.currentChatRoomId
      return getters.ourDirectMessages[contractID]?.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE
    }
  },
  isGroupDirectMessage (state, getters) {
    return chatRoomId => {
      const contractID = chatRoomId || getters.currentChatRoomId
      return getters.ourDirectMessages[contractID]?.privacyLevel === CHATROOM_PRIVACY_LEVEL.GROUP
    }
  },
  isPrivateChatRoom (state, getters) {
    return (chatRoomId: string) => {
      const contractID = chatRoomId || getters.currentChatRoomId
      return state[contractID]?.attributes.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE
    }
  },
  isJoinedChatRoom (state, getters) {
    return (chatRoomId: string, username?: string) => {
      username = username || state.loggedIn.username
      return !!state[chatRoomId]?.users?.[username]
    }
  },
  groupDirectMessageInfo (state, getters) {
    return chatRoomId => {
      const usernames = Object.keys(state[chatRoomId].users).filter(username => username !== getters.ourUsername)
      const lastJoined = usernames.reduce((lastJoined, username) => {
        const lastJoinedDate = state[chatRoomId].users[lastJoined].joinedDate
        const currentJoinedDate = state[chatRoomId].users[username].joinedDate
        return lastJoinedDate > currentJoinedDate ? lastJoined : username
      }, usernames[0])
      return {
        contractID: chatRoomId,
        title: usernames.join(', '),
        othersCount: usernames.length,
        picture: getters.ourContactProfiles[lastJoined]?.picture
      }
    }
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
  currentChatRoomReadUntil (state, getters) {
    // NOTE: Optional Chaining (?) is necessary when user viewing the chatroom which he is not part of
    return getters.ourUnreadMessages[getters.currentChatRoomId]?.readUntil // undefined means to the latest
  },
  chatRoomUnreadMessages (state, getters) {
    return (chatRoomId: string) => {
      // NOTE: Optional Chaining (?) is necessary when user tries to get mentions of the chatroom which he is not part of
      return getters.ourUnreadMessages[chatRoomId]?.messages || []
    }
  },
  chatRoomUnreadMentions (state, getters) {
    return (chatRoomId: string) => {
      // NOTE: Optional Chaining (?) is necessary when user tries to get mentions of the chatroom which he is not part of
      return (getters.ourUnreadMessages[chatRoomId]?.messages || []).filter(m => m.type === MESSAGE_TYPES.TEXT)
    }
  },
  groupUnreadMessages (state, getters) {
    return (groupID: string) => Object.keys(getters.ourUnreadMessages)
      .filter(cID => getters.isDirectMessage(cID) || Object.keys(state[groupID]?.chatRooms || {}).includes(cID))
      .map(cID => getters.ourUnreadMessages[cID].messages.length)
      .reduce((sum, n) => sum + n, 0)
  },
  directMessageIDFromUsername (state, getters) {
    return (username: string) => getters.ourPrivateDirectMessages[username]?.contractID
  },
  usernameFromDirectMessageID (state, getters) {
    return (chatRoomId: string) => {
      for (const username of Object.keys(getters.ourPrivateDirectMessages)) {
        if (getters.ourPrivateDirectMessages[username].contractID === chatRoomId) {
          return username
        }
      }
    }
  },
  groupIdFromChatRoomId (state, getters) {
    return (chatRoomId: string) => Object.keys(state.contracts)
      .find(cId => state.contracts[cId].type === 'gi.contracts/group' &&
        Object.keys(state[cId].chatRooms).includes(chatRoomId))
  },
  chatRoomsInDetail (state, getters) {
    const chatRoomsInDetail = merge({}, getters.getGroupChatRooms)
    for (const contractID in chatRoomsInDetail) {
      const chatRoom = state[contractID]
      if (chatRoom && chatRoom.attributes &&
        chatRoom.users[state.loggedIn.username]) {
        chatRoomsInDetail[contractID] = {
          ...chatRoom.attributes,
          id: contractID,
          unreadMessagesCount: getters.chatRoomUnreadMessages(contractID).length,
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
    notifications: notificationModule,
    settings: settingsModule
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
  'gi.contracts/chatroom': ['currentChatRoomState'],
  'gi.contracts/mailbox': ['currentMailboxState']
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

    if (contract.name === 'gi.contracts/group') {
      store.watch(
        (state, getters) => getters.currentPaymentPeriod,
        (newPeriod, oldPeriod) => {
          // This watcher is for automatically syncing 'currentPaymentPeriod' with 'groupSettings.distributionDate'.
          // Before bringing this logic in, how the app updates the state related to group distribution period was,
          // 'currentPaymentPeriod': gets auto-updated(t1) in response to the change of 'reactiveDate.date' when it passes into the new period.
          // 'groupSettings.distributionDate': gets updated manually by calling 'updateCurrentDistribution' function(t2) in group.js
          // This logic removes the inconsistency that exists between these two from the point of time t1 till t2.

          // Note: if this code gets called when we're in the period before the 1st distribution
          //       period, then the distributionDate will get updated to the previous distribution date
          //       (incorrectly). That in turn will cause the Payments page to update and display TODOs
          //       before it should.
          const distributionDateInSettings = store.getters.groupSettings.distributionDate
          if (oldPeriod && newPeriod && (newPeriod !== distributionDateInSettings)) {
            sbp('gi.actions/group/updateDistributionDate', { contractID: store.state.currentGroupId })
          }
        }
      )
    }
  }
})

export default store
