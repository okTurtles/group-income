'use strict'

// This file handles application-level state (as opposed to component-level
// state) per: http://vuex.vuejs.org/en/intro.html

import sbp from '@sbp/sbp'
import { Vue, L } from '@common/common.js'
import { EVENT_HANDLED, CONTRACT_REGISTERED } from '~/shared/domains/chelonia/events.js'
import { LOGOUT } from '~/frontend/utils/events.js'
import Vuex from 'vuex'
import { MAX_SAVED_PERIODS, PROFILE_STATUS, PROPOSAL_GENERIC, INVITE_INITIAL_CREATOR } from '@model/contracts/shared/constants.js'
import { PAYMENT_COMPLETED, PAYMENT_NOT_RECEIVED } from '@model/contracts/shared/payments/index.js'
import { omit, cloneDeep, debounce } from '@model/contracts/shared/giLodash.js'
import { unadjustedDistribution, adjustedDistribution } from '@model/contracts/shared/distribution/distribution.js'
import { applyStorageRules } from '~/frontend/model/notifications/utils.js'

// Vuex modules.
import notificationModule from '~/frontend/model/notifications/vuexModule.js'
import settingsModule from '~/frontend/model/settings/vuexModule.js'
import chatroomModule from '~/frontend/model/chatroom/vuexModule.js'

import { addTimeToDate, dateToPeriodStamp, dateFromPeriodStamp, dateIsWithinPeriod, periodStampsForDate } from '@model/contracts/shared/time.js'
import { createPaymentInfo, paymentHashesFromPaymentPeriod } from '@model/contracts/shared/functions.js'
import { INVITE_STATUS } from '~/shared/domains/chelonia/constants.js'
import currencies from '@model/contracts/shared/currencies.js'

Vue.use(Vuex)

const initialState = {
  currentGroupId: null,
  contracts: {}, // contractIDs => { type:string, HEAD:string, height:number } (for contracts we've successfully subscribed to)
  loggedIn: false, // false | { username: string, identityContractID: string }
  namespaceLookups: Object.create(null), // { [username]: sbp('namespace/lookup') }
  periodicNotificationAlreadyFiredMap: {}, // { notificationKey: boolean },
  contractSigningKeys: Object.create(null),
  lastLoggedIn: {} // Group last logged in information
}

if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (sbp('state/vuex/getters').theme === 'system') {
      store.commit('setTheme', 'system')
    }
  })
}

const checkedUsername = (state: Object, username: string, userID: string) => {
  if (username && state.namespaceLookups[username] === userID) {
    return username
  }
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
  'state/vuex/reset': () => {
    const state = cloneDeep(initialState)
    state.notifications = notificationModule.state()
    state.settings = settingsModule.state()
    state.chatroom = chatroomModule.state()
    store.replaceState(state)
  },
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
  },
  'state/vuex/save': async function (encrypted: ?boolean, state: ?Object) {
    state = state || store.state
    // IMPORTANT! DO NOT CALL VUEX commit() in here in any way shape or form!
    //            Doing so will cause an infinite loop because of store.subscribe below!
    if (!state.loggedIn) {
      return
    }

    const { identityContractID, encryptionParams } = state.loggedIn
    state.notifications = applyStorageRules(state.notifications || [])
    if (encrypted) {
      await sbp('gi.db/settings/saveEncrypted', identityContractID, state, encryptionParams)
    } else {
      await sbp('gi.db/settings/save', identityContractID, state)
    }
  }
})

// Mutations must be synchronous! Never call these directly, instead use commit()
// http://vuex.vuejs.org/en/mutations.html
const mutations = {
  login (state, user) {
    state.loggedIn = user
  },
  setCurrentGroupId (state, currentGroupId) {
    Vue.set(state, 'currentGroupId', currentGroupId)
    if (!currentGroupId) {
      sbp('controller/router').push({ path: '/' }).catch(() => {})
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
  ourUsername (state, getters) {
    return state.loggedIn && getters.usernameFromID(state.loggedIn.identityContractID)
  },
  ourProfileActive (state, getters) {
    return getters.profileActive(getters.ourIdentityContractId)
  },
  ourPendingAccept (state, getters) {
    return getters.pendingAccept(getters.ourIdentityContractId)
  },
  ourGroupProfile (state, getters) {
    return getters.groupProfile(getters.ourIdentityContractId)
  },
  ourUserDisplayName (state, getters) {
    // TODO - refactor Profile and Welcome and any other component that needs this
    const userContract = getters.currentIdentityState || {}
    return userContract.attributes?.displayName || getters.ourUsername || getters.ourIdentityContractId
  },
  ourIdentityContractId (state) {
    return state.loggedIn && state.loggedIn.identityContractID
  },
  currentGroupLastLoggedIn (state) {
    return state.lastLoggedIn[state.currentGroupId] || {}
  },
  // NOTE: since this getter is written using `getters.ourUsername`, which is based
  //       on vuexState.loggedIn (a user preference), we cannot use this getter
  //       into group.js
  ourContributionSummary (state, getters) {
    const groupProfiles = getters.groupProfiles
    const ourIdentityContractId = getters.ourIdentityContractId
    const ourGroupProfile = getters.ourGroupProfile

    if (!ourGroupProfile || !ourGroupProfile.incomeDetailsType) {
      return {}
    }

    const doWeNeedIncome = ourGroupProfile.incomeDetailsType === 'incomeAmount'
    const distribution = getters.groupIncomeDistribution

    const nonMonetaryContributionsOf = (memberID) => groupProfiles[memberID].nonMonetaryContributions || []

    return {
      givingMonetary: (() => {
        if (doWeNeedIncome) { return null }
        const who = []
        const total = distribution
          .filter(p => p.fromMemberID === ourIdentityContractId)
          .reduce((acc, payment) => {
            who.push(getters.userDisplayNameFromID(payment.toMemberID))
            return acc + payment.amount
          }, 0)

        return { who, total, pledged: ourGroupProfile.pledgeAmount }
      })(),
      receivingMonetary: (() => {
        if (!doWeNeedIncome) { return null }
        const needed = getters.groupSettings.mincomeAmount - ourGroupProfile.incomeAmount
        const who = []
        const total = distribution
          .filter(p => p.toMemberID === ourIdentityContractId)
          .reduce((acc, payment) => {
            who.push(getters.userDisplayNameFromID(payment.fromMemberID))
            return acc + payment.amount
          }, 0)

        return { who, total, needed }
      })(),
      receivingNonMonetary: (() => {
        const listWho = Object.keys(groupProfiles)
          .filter(memberID => memberID !== ourIdentityContractId && nonMonetaryContributionsOf(memberID).length > 0)
        const listWhat = listWho.reduce((contr, memberID) => {
          const displayName = getters.userDisplayNameFromID(memberID)
          const userContributions = nonMonetaryContributionsOf(memberID)

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
  usernameFromID (state, getters) {
    return (userID) => {
      const profile = getters.ourContactProfilesById[userID]
      return profile?.username || userID
    }
  },
  userDisplayNameFromID (state, getters) {
    return (userID) => {
      if (userID === getters.ourIdentityContractId) {
        return getters.ourUserDisplayName
      }
      const profile = getters.ourContactProfilesById[userID]
      return profile?.displayName || profile?.username || userID
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
    const ourIdentityContractId = getters.ourIdentityContractId
    const pPeriod = getters.periodBeforePeriod(getters.currentPaymentPeriod)
    const pPayments = periodPayments[pPeriod]
    if (pPayments) {
      return pPayments.lastAdjustedDistribution.filter(todo => todo.fromMemberID === ourIdentityContractId)
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
        const ourIdentityContractId = getters.ourIdentityContractId
        const allPayments = getters.currentGroupState.payments
        for (const toMemberID in paymentsFrom[ourIdentityContractId]) {
          for (const paymentHash of paymentsFrom[ourIdentityContractId][toMemberID]) {
            const { data, meta, height } = allPayments[paymentHash]

            payments.push({ hash: paymentHash, height, data, meta, amount: data.amount, period })
          }
        }
      }
      return payments.sort((paymentA, paymentB) => paymentB.height - paymentA.height)
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
        const ourIdentityContractId = getters.ourIdentityContractId
        const allPayments = getters.currentGroupState.payments
        for (const fromMemberID in paymentsFrom) {
          for (const toMemberID in paymentsFrom[fromMemberID]) {
            if (toMemberID === ourIdentityContractId) {
              for (const paymentHash of paymentsFrom[fromMemberID][toMemberID]) {
                const { data, meta, height } = allPayments[paymentHash]

                payments.push({ hash: paymentHash, height, data, meta, amount: data.amount })
              }
            }
          }
        }
      }
      return payments.sort((paymentA, paymentB) => paymentB.height - paymentA.height)
    }
  },
  ourPayments (state, getters) {
    const periodPayments = getters.groupPeriodPayments
    if (Object.keys(periodPayments).length === 0) return
    const ourIdentityContractId = getters.ourIdentityContractId
    const cPeriod = getters.currentPaymentPeriod
    const pPeriod = getters.periodBeforePeriod(cPeriod)
    const currentSent = getters.ourPaymentsSentInPeriod(cPeriod)
    const previousSent = getters.ourPaymentsSentInPeriod(pPeriod)
    const currentReceived = getters.ourPaymentsReceivedInPeriod(cPeriod)
    const previousReceived = getters.ourPaymentsReceivedInPeriod(pPeriod)

    // TODO: take into account pending payments that have been sent but not yet completed
    const todo = () => {
      return getters.groupIncomeAdjustedDistribution.filter(p => p.fromMemberID === ourIdentityContractId)
    }

    return {
      sent: [...currentSent, ...previousSent],
      received: [...currentReceived, ...previousReceived],
      todo: todo()
    }
  },
  ourPaymentsSummary (state, getters) {
    const isNeeder = getters.ourGroupProfile.incomeDetailsType === 'incomeAmount'
    const ourIdentityContractId = getters.ourIdentityContractId
    const isOurPayment = (payment) => {
      return isNeeder ? payment.toMemberID === ourIdentityContractId : payment.fromMemberID === ourIdentityContractId
    }
    const sumUpAmountReducer = (acc, payment) => acc + payment.amount
    const cPeriod = getters.currentPaymentPeriod
    const ourAdjustedPayments = getters.groupIncomeAdjustedDistribution.filter(isOurPayment)
    const receivedOrSent = isNeeder
      ? getters.ourPaymentsReceivedInPeriod(cPeriod)
      : getters.ourPaymentsSentInPeriod(cPeriod)

    const markedAsNotReceived = receivedOrSent.filter(payment => payment.data.status === PAYMENT_NOT_RECEIVED)
    const markedAsNotReceivedTotal = markedAsNotReceived.reduce(sumUpAmountReducer, 0)

    const paymentsTotal = ourAdjustedPayments.length + receivedOrSent.length
    const nonLateAdjusted = ourAdjustedPayments.filter((p) => !p.isLate)
    const paymentsDone = paymentsTotal - nonLateAdjusted.length - markedAsNotReceived.length
    const hasPartials = ourAdjustedPayments.some(p => p.partial)
    const amountDone = receivedOrSent.reduce(sumUpAmountReducer, 0) - markedAsNotReceivedTotal
    const amountLeft = ourAdjustedPayments.reduce((acc, payment) => acc + payment.amount, 0) + markedAsNotReceivedTotal
    const amountTotal = amountDone + amountLeft
    return {
      paymentsDone,
      hasPartials,
      paymentsTotal,
      amountDone,
      amountTotal
    }
  },
  currentWelcomeInvite (state, getters) {
    const invites = getters.currentGroupState.invites
    const inviteId = Object.keys(invites).find(invite => invites[invite].creatorID === INVITE_INITIAL_CREATOR)
    const expires = getters.currentGroupState._vm.authorizedKeys[inviteId].meta.expires
    return { inviteId, expires }
  },
  // list of group names and contractIDs
  groupsByName (state, getters) {
    const groups = state[getters.ourIdentityContractId]?.groups
    if (!groups) return []
    // The code below was originally Object.entries(...) but changed to .keys()
    // due to the same flow issue as https://github.com/facebook/flow/issues/5838
    // we return event pending groups that we haven't finished joining so that we are not stuck
    // on the /pending-approval page if we are part of another working group already
    return Object.keys(groups)
      .map(contractID => ({ groupName: state[contractID]?.settings?.groupName || L('Pending'), contractID }))
  },
  profilesByGroup (state, getters) {
    return groupID => {
      const profiles = {}
      if (state.contracts[groupID].type !== 'gi.contracts/group') {
        return profiles
      }
      const groupProfiles = state[groupID].profiles || {}
      for (const member in groupProfiles) {
        const profile = groupProfiles[member]
        if (profile.status === PROFILE_STATUS.ACTIVE) {
          profiles[member] = profile
        }
      }
      return profiles
    }
  },
  groupMembersSorted (state, getters) {
    const profiles = getters.currentGroupState.profiles
    if (!profiles || !profiles[getters.ourIdentityContractId]) return []
    const weJoinedHeight = profiles[getters.ourIdentityContractId].joinedHeight
    const isNewMember = (memberID) => {
      if (memberID === getters.ourIdentityContractId) { return false }
      const memberProfile = profiles[memberID]
      if (!memberProfile) return false
      const memberJoinedHeight = memberProfile.joinedHeight
      const memberJoinedMs = new Date(memberProfile.joinedDate).getTime()
      const joinedAfterUs = weJoinedHeight < memberJoinedHeight
      return joinedAfterUs && Date.now() - memberJoinedMs < 604800000 // joined less than 1w (168h) ago.
    }

    const groupMembersPending = getters.groupMembersPending

    // $FlowFixMe[method-unbinding]
    return [groupMembersPending, getters.groupProfiles].flatMap(Object.keys)
      .filter(memberID => getters.groupProfiles[memberID] ||
         getters.groupMembersPending[memberID].expires >= Date.now())
      .map(memberID => {
        const { contractID, displayName, username } = getters.globalProfile(memberID) || groupMembersPending[memberID] || {}
        return {
          id: memberID, // common unique ID: it can be either the contract ID or the invite key
          contractID,
          username,
          displayName: displayName || username || memberID,
          invitedBy: getters.groupMembersPending[memberID],
          isNew: isNewMember(memberID)
        }
      })
      .sort((userA, userB) => {
        const nameA = userA.displayName.normalize().toUpperCase()
        const nameB = userB.displayName.normalize().toUpperCase()
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
    return memberID => {
      return getters.ourContactProfilesById[memberID]
    }
  },
  ourContactProfilesByUsername (state, getters) {
    const profiles = {}
    Object.keys(state.contracts)
      .filter(contractID => state.contracts[contractID].type === 'gi.contracts/identity')
      .forEach(contractID => {
        const attributes = state[contractID].attributes
        if (attributes) { // NOTE: this is for fixing the error while syncing the identity contracts
          const username = checkedUsername(state, attributes.username, contractID)
          profiles[attributes.username] = {
            ...attributes,
            username,
            contractID
          }
        }
      })
    return profiles
  },
  ourContactProfilesById (state, getters) {
    const profiles = {}
    Object.keys(state.contracts)
      .filter(contractID => state.contracts[contractID].type === 'gi.contracts/identity')
      .forEach(contractID => {
        const attributes = state[contractID].attributes
        if (attributes) { // NOTE: this is for fixing the error while syncing the identity contracts
          const username = checkedUsername(state, attributes.username, contractID)
          profiles[contractID] = {
            ...attributes,
            username,
            contractID
          }
        }
      })
    return profiles
  },
  currentGroupContactProfilesById (state, getters) {
    const currentGroupProfileIds = Object.keys(getters.currentGroupState.profiles || {})
    const filtered = {}

    for (const identityContractID in getters.ourContactProfilesById) {
      if (currentGroupProfileIds.includes(identityContractID)) {
        filtered[identityContractID] = getters.ourContactProfilesById[identityContractID]
      }
    }
    return filtered
  },
  ourContactsById (state, getters) {
    return Object.keys(getters.ourContactProfilesById)
      .sort((userIdA, userIdB) => {
        const nameA = ((getters.ourContactProfilesById[userIdA].displayName)) || getters.ourContactProfilesById[userIdA].username || userIdA
        const nameB = ((getters.ourContactProfilesById[userIdB].displayName)) || getters.ourContactProfilesById[userIdB].username || userIdB
        return nameA.normalize().toUpperCase() > nameB.normalize().toUpperCase() ? 1 : -1
      })
  },
  ourContactsByUsername (state, getters) {
    return Object.keys(getters.ourContactProfilesByUsername)
      .sort((usernameA, usernameB) => {
        const nameA = getters.ourContactProfilesByUsername[usernameA].displayName || usernameA
        const nameB = getters.ourContactProfilesByUsername[usernameB].displayName || usernameB
        return nameA.normalize().toUpperCase() > nameB.normalize().toUpperCase() ? 1 : -1
      })
  },
  // identity getters follow
  loginState (state, getters) {
    return getters.currentIdentityState.loginState
  },
  ourDirectMessages (state, getters) {
    return getters.currentIdentityState.chatRooms || {}
  },
  // end identity getters
  // group getters follow
  currentGroupOwnerID (state, getters) {
    return getters.currentGroupState.groupOwnerID
  },
  groupSettings (state, getters) {
    return getters.currentGroupState.settings || {}
  },
  profileActive (state, getters) {
    return member => {
      const profiles = getters.currentGroupState.profiles
      return profiles?.[member]?.status === PROFILE_STATUS.ACTIVE
    }
  },
  pendingAccept (state, getters) {
    return member => {
      const profiles = getters.currentGroupState.profiles
      return profiles?.[member]?.status === PROFILE_STATUS.PENDING
    }
  },
  groupProfile (state, getters) {
    return member => {
      const profiles = getters.currentGroupState.profiles
      return profiles && profiles[member] && {
        ...profiles[member],
        get lastLoggedIn () {
          return getters.currentGroupLastLoggedIn[member] || this.joinedDate
        }
      }
    }
  },
  groupProfiles (state, getters) {
    const profiles = {}
    for (const member in (getters.currentGroupState.profiles || {})) {
      const profile = getters.groupProfile(member)
      if (profile.status === PROFILE_STATUS.ACTIVE) {
        profiles[member] = profile
      }
    }
    return profiles
  },
  groupCreatedDate (state, getters) {
    return getters.groupProfile(getters.currentGroupOwnerID).joinedDate
  },
  groupMincomeAmount (state, getters) {
    return getters.groupSettings.mincomeAmount
  },
  groupMincomeCurrency (state, getters) {
    return getters.groupSettings.mincomeCurrency
  },
  // Oldest period key first.
  groupSortedPeriodKeys (state, getters) {
    const { distributionDate, distributionPeriodLength } = getters.groupSettings
    if (!distributionDate) return []
    // The .sort() call might be only necessary in older browser which don't maintain object key ordering.
    // A comparator function isn't required for now since our keys are ISO strings.
    const keys = Object.keys(getters.groupPeriodPayments).sort()
    // Append the waiting period stamp if necessary.
    if (!keys.length && MAX_SAVED_PERIODS > 0) {
      keys.push(dateToPeriodStamp(addTimeToDate(distributionDate, -distributionPeriodLength)))
    }
    // Append the distribution date if necessary.
    if (keys[keys.length - 1] !== distributionDate) {
      keys.push(distributionDate)
    }
    return keys
  },
  // paymentTotalfromMembertoMemberID (state, getters) {
  // // this code was removed in https://github.com/okTurtles/group-income/pull/1691
  // // because it was unused. feel free to bring it back if needed.
  // },
  //
  // The following three getters return either a known period stamp for the given date,
  // or a predicted one according to the period length.
  // They may also return 'undefined', in which case the caller should check archived data.
  periodStampGivenDate (state, getters) {
    return (date: string | Date): string | void => {
      return periodStampsForDate(date, {
        knownSortedStamps: getters.groupSortedPeriodKeys,
        periodLength: getters.groupSettings.distributionPeriodLength
      }).current
    }
  },
  periodBeforePeriod (state, getters) {
    return (periodStamp: string): string | void => {
      return periodStampsForDate(periodStamp, {
        knownSortedStamps: getters.groupSortedPeriodKeys,
        periodLength: getters.groupSettings.distributionPeriodLength
      }).previous
    }
  },
  periodAfterPeriod (state, getters) {
    return (periodStamp: string): string | void => {
      return periodStampsForDate(periodStamp, {
        knownSortedStamps: getters.groupSortedPeriodKeys,
        periodLength: getters.groupSettings.distributionPeriodLength
      }).next
    }
  },
  dueDateForPeriod (state, getters) {
    return (periodStamp: string) => {
      // NOTE: logically it's should be 1 milisecond before the periodAfterPeriod
      //       1 mili-second doesn't make any difference to the users
      //       so periodAfterPeriod is used to make it simple
      return getters.periodAfterPeriod(periodStamp)
    }
  },
  paymentHashesForPeriod (state, getters) {
    return (periodStamp) => {
      const periodPayments = getters.groupPeriodPayments[periodStamp]
      if (periodPayments) {
        return paymentHashesFromPaymentPeriod(periodPayments)
      }
    }
  },
  groupMembersByContractID (state, getters) {
    return Object.keys(getters.groupProfiles)
  },
  groupMembersCount (state, getters) {
    return getters.groupMembersByContractID.length
  },
  groupMembersPending (state, getters) {
    const invites = getters.currentGroupState.invites
    const vmInvites = getters.currentGroupState._vm.invites
    const pendingMembers = Object.create(null)
    for (const inviteKeyId in invites) {
      if (
        vmInvites[inviteKeyId].status === INVITE_STATUS.VALID &&
        invites[inviteKeyId].creatorID !== INVITE_INITIAL_CREATOR
      ) {
        pendingMembers[inviteKeyId] = {
          displayName: invites[inviteKeyId].invitee,
          invitedBy: invites[inviteKeyId].creatorID,
          expires: vmInvites[inviteKeyId].expires
        }
      }
    }
    return pendingMembers
  },
  groupShouldPropose (state, getters) {
    return getters.groupMembersCount >= 3
  },
  groupDistributionStarted (state, getters) {
    return (currentDate: string) => currentDate >= getters.groupSettings?.distributionDate
  },
  groupProposalSettings (state, getters) {
    return (proposalType = PROPOSAL_GENERIC) => {
      return getters.groupSettings.proposals?.[proposalType]
    }
  },
  groupCurrency (state, getters) {
    const mincomeCurrency = getters.groupMincomeCurrency
    return mincomeCurrency && currencies[mincomeCurrency]
  },
  groupMincomeFormatted (state, getters) {
    return getters.withGroupCurrency?.(getters.groupMincomeAmount)
  },
  groupMincomeSymbolWithCode (state, getters) {
    return getters.groupCurrency?.symbolWithCode
  },
  groupPeriodPayments (state, getters): Object {
    // note: a lot of code expects this to return an object, so keep the || {} below
    return getters.currentGroupState.paymentsByPeriod || {}
  },
  groupThankYousFrom (state, getters): Object {
    return getters.currentGroupState.thankYousFrom || {}
  },
  groupStreaks (state, getters): Object {
    return getters.currentGroupState.streaks || {}
  },
  groupTotalPledgeAmount (state, getters): number {
    return getters.currentGroupState.totalPledgeAmount || 0
  },
  withGroupCurrency (state, getters) {
    // TODO: If this group has no defined mincome currency, not even a default one like
    //       USD, then calling this function is probably an error which should be reported.
    //       Just make sure the UI doesn't break if an exception is thrown, since this is
    //       bound to the UI in some location.
    return getters.groupCurrency?.displayWithCurrency
  },
  getGroupChatRooms (state, getters) {
    return getters.currentGroupState.chatRooms
  },
  generalChatRoomId (state, getters) {
    return getters.currentGroupState.generalChatRoomId
  },
  // getter is named haveNeedsForThisPeriod instead of haveNeedsForPeriod because it uses
  // getters.groupProfiles - and that is always based on the most recent values. we still
  // pass in the current period because it's used to set the "when" property
  haveNeedsForThisPeriod (state, getters) {
    return (currentPeriod: string) => {
      // NOTE: if we ever switch back to the "real-time" adjusted distribution algorithm,
      //       make sure that this function also handles userExitsGroupEvent
      const groupProfiles = getters.groupProfiles // TODO: these should use the haveNeeds for the specific period's distribution period
      const haveNeeds = []
      for (const memberID in groupProfiles) {
        const { incomeDetailsType, joinedDate } = groupProfiles[memberID]
        if (incomeDetailsType) {
          const amount = groupProfiles[memberID][incomeDetailsType]
          const haveNeed = incomeDetailsType === 'incomeAmount' ? amount - getters.groupMincomeAmount : amount
          // construct 'when' this way in case we ever use a pro-rated algorithm
          let when = dateFromPeriodStamp(currentPeriod).toISOString()
          if (dateIsWithinPeriod({
            date: joinedDate,
            periodStart: currentPeriod,
            periodLength: getters.groupSettings.distributionPeriodLength
          })) {
            when = joinedDate
          }
          haveNeeds.push({ memberID, haveNeed, when })
        }
      }
      return haveNeeds
    }
  },
  paymentsForPeriod (state, getters) {
    return (periodStamp) => {
      const hashes = getters.paymentHashesForPeriod(periodStamp)
      const events = []
      if (hashes && hashes.length > 0) {
        const payments = getters.currentGroupState.payments
        for (const paymentHash of hashes) {
          const payment = payments[paymentHash]
          if (payment.data.status === PAYMENT_COMPLETED) {
            events.push(createPaymentInfo(paymentHash, payment))
          }
        }
      }
      return events
    }
  },
  // end group getters
  // chatroom getters follow
  chatRoomSettings (state, getters) {
    return getters.currentChatRoomState.settings || {}
  },
  chatRoomAttributes (state, getters) {
    return getters.currentChatRoomState.attributes || {}
  },
  chatRoomMembers (state, getters) {
    return getters.currentChatRoomState.members || {}
  },
  chatRoomLatestMessages (state, getters) {
    return getters.currentChatRoomState.messages || []
  }
  // end chatroom getters
}

const store: any = new Vuex.Store({
  state: cloneDeep(initialState),
  mutations,
  getters,
  modules: {
    notifications: notificationModule,
    settings: settingsModule,
    chatroom: chatroomModule
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
let logoutInProgress = false
const debouncedSave = debounce(() => !logoutInProgress && sbp('state/vuex/save'), 500)
store.subscribe((commit) => {
  if (commit.type !== 'noop') {
    debouncedSave()
  }
}) // for e.g saving notifications that are markedAsRead
// since Chelonia updates do not pass through calls to 'commit', also save upon EVENT_HANDLED
sbp('okTurtles.events/on', EVENT_HANDLED, debouncedSave)
// logout will call 'state/vuex/save', so we clear any debounced calls to it before it gets run
sbp('sbp/filters/selector/add', 'gi.actions/identity/logout', function () {
  logoutInProgress = true
  debouncedSave.clear()
})
sbp('okTurtles.events/on', LOGOUT, () => { logoutInProgress = false })
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
  'gi.contracts/group': ['currentGroupState', 'currentGroupLastLoggedIn'],
  'gi.contracts/identity': ['currentIdentityState'],
  'gi.contracts/chatroom': ['currentChatRoomState']
}
sbp('okTurtles.events/on', CONTRACT_REGISTERED, async (contract) => {
  const { contracts: { manifests } } = await sbp('chelonia/config')
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
          // NOTE: `distributionStarted` allows distributionDate can be updated automatically ONLY after
          //       the distribution is started. And it fixes the issue mentioned above.
          const distributionDateInSettings = store.getters.groupSettings.distributionDate
          const distributionStarted = store.getters.groupDistributionStarted(reactiveDate.date)
          if (oldPeriod && newPeriod && distributionStarted && (newPeriod !== distributionDateInSettings)) {
            sbp('gi.actions/group/updateDistributionDate', { contractID: store.state.currentGroupId })
              .catch((e) => {
                console.error('okTurtles.events/on CONTRACT_REGISTERED Error calling updateDistributionDate', e)
              })
          }
        }
      )
    }
  }
})

export default store
