import { L } from '@common/common.js'
import { INVITE_INITIAL_CREATOR, PROFILE_STATUS } from '@model/contracts/shared/constants.js'
import { INVITE_STATUS } from '@chelonia/lib/constants'
import { adjustedDistribution, unadjustedDistribution } from '@model/contracts/shared/distribution/distribution.js'
import { PAYMENT_NOT_RECEIVED } from '@model/contracts/shared/payments/index.js'
import chatroomGetters from './contracts/shared/getters/chatroom.js'
import groupGetters from './contracts/shared/getters/group.js'
import identityGetters from './contracts/shared/getters/identity.js'

const checkedUsername = (state: Object, username: string, userID: string) => {
  if (username && state.namespaceLookups?.[username] === userID) {
    return username
  }
}

// Find the 'anyone can join' invite ID. Since there could be multiple, and some
// of those could have exipred, we need a for loop
const anyoneCanJoinInviteId = (invites: Object, getters: Object): ?string =>
  Object.keys(invites).find(invite =>
    // First, we want 'anyone can join' invites
    invites[invite].creatorID === INVITE_INITIAL_CREATOR &&
    // and that haven't been revoked
    getters.currentGroupState._vm.invites[invite].status === INVITE_STATUS.VALID &&
    // and that haven't expired (using negative logic because expires could be
    // undefined for non expiring-invites)
    !(getters.currentGroupState._vm.invites[invite].expires < Date.now()) &&
    // and that that haven't been entirely used up
    !(getters.currentGroupState._vm.invites[invite].quantity <= 0)
  )

// https://vuex.vuejs.org/en/getters.html
// https://vuex.vuejs.org/en/modules.html
const getters: { [x: string]: (state: Object, getters: { [x: string]: any }) => any } = {
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
    // The service worker should not be using this getter.
    if (process.env.NODE_ENV === 'development' || process.env.CI) {
      // $FlowFixMe[cannot-resolve-name]
      if (typeof Window === 'undefined') {
        const error = new Error('Tried to access currentGroupState from outside a browsing context')
        Promise.reject(error)
        throw error
      }
    }
    return state[state.currentGroupId] || {} // avoid "undefined" vue errors at inoportune times
  },
  currentIdentityState (state) {
    return (state.loggedIn && state[state.loggedIn.identityContractID]) || {}
  },
  ourUsername (state, getters) {
    return state.loggedIn && getters.usernameFromID(state.loggedIn.identityContractID)
  },
  ourPreferences (state) {
    return state.preferences
  },
  ourProfileActive (state, getters) {
    return getters.profileActive(getters.ourIdentityContractId)
  },
  ourPendingAccept (state, getters) {
    return getters.pendingAccept(getters.ourIdentityContractId)
  },
  ourGroupProfileForGroup (state, getters) {
    return (state) => getters.groupProfileForGroup(state, getters.ourIdentityContractId)
  },
  ourGroupProfile (state, getters) {
    return getters.ourGroupProfileForGroup(getters.currentGroupState)
  },
  ourGroupPermissions (state, getters) {
    return getters.ourGroupProfile?.role?.permissions || []
  },
  ourGroupPermissionsHas (state, getters) {
    return (permission) => getters.ourGroupPermissions.includes(permission)
  },
  getGroupMemberRoleNameById (state, getters) {
    return (memberID) => {
      const profile = getters.groupProfiles[memberID]
      return profile?.role?.name || ''
    }
  },
  getGroupMemberPermissionsById (state, getters) {
    return (memberID) => {
      const profile = getters.groupProfiles[memberID]
      return profile?.role?.permissions || []
    }
  },
  allGroupMemberPermissions (state, getters) {
    return Object.entries(getters.groupProfiles)
      .filter(([, profile]: [string, any]) => Boolean(profile.role))
      .map(([memberID, profile]: [string, any]) => ({ roleName: profile.role.name, permissions: profile.role.permissions, memberID }))
  },
  ourUserDisplayName (state, getters) {
    // TODO - refactor Profile and Welcome and any other component that needs this
    const userContract = getters.currentIdentityState || {}
    return userContract.attributes?.displayName || getters.ourUsername || getters.ourIdentityContractId
  },
  ourIdentityContractId (state) {
    return state.loggedIn && state.loggedIn.identityContractID
  },
  ourGroups (state, getters) {
    const identityContractID = getters.ourIdentityContractId
    if (!identityContractID) return []

    return Object.keys(state[identityContractID]?.groups || {}).filter(
      (gId) => !state[identityContractID].groups[gId].hasLeft && state[gId]
    )
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
        const whoIds = []
        const total = distribution
          .filter(p => p.fromMemberID === ourIdentityContractId)
          .reduce((acc, payment) => {
            who.push(getters.userDisplayNameFromID(payment.toMemberID))
            whoIds.push(payment.toMemberID)

            return acc + payment.amount
          }, 0)

        return { who, whoIds, total, pledged: ourGroupProfile.pledgeAmount }
      })(),
      receivingMonetary: (() => {
        if (!doWeNeedIncome) { return null }
        const needed = getters.groupSettings.mincomeAmount - ourGroupProfile.incomeAmount
        const who = []
        const whoIds = []
        const total = distribution
          .filter(p => p.toMemberID === ourIdentityContractId)
          .reduce((acc, payment) => {
            who.push(getters.userDisplayNameFromID(payment.fromMemberID))
            whoIds.push(payment.fromMemberID)

            return acc + payment.amount
          }, 0)

        return { who, whoIds, total, needed }
      })(),
      receivingNonMonetary: (() => {
        const listWho = Object.keys(groupProfiles)
          .filter(memberID => memberID !== ourIdentityContractId && nonMonetaryContributionsOf(memberID).length > 0)
        const listWhat = listWho.reduce((contr, memberID) => {
          const displayName = getters.userDisplayNameFromID(memberID)
          const userContributions = nonMonetaryContributionsOf(memberID)

          userContributions.forEach((what) => {
            const contributionIndex = contr.findIndex(c => c.what === what)

            if (contributionIndex >= 0) {
              contr[contributionIndex].who.push(displayName)
              contr[contributionIndex].whoIds.push(memberID)
            } else {
              contr.push({ who: [displayName], whoIds: [memberID], what })
            }
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
      return profile?.username || state.reverseNamespaceLookups[userID] || userID
    }
  },
  userDisplayNameFromID (state, getters) {
    return (userID) => {
      if (userID === getters.ourIdentityContractId) {
        return getters.ourUserDisplayName
      }
      const profile = getters.ourContactProfilesById[userID]
      return profile?.displayName || profile?.username || state.reverseNamespaceLookups[userID] || userID
    }
  },
  thisPeriodPaymentInfoForGroup (state, getters) {
    return (state) => {
      return getters.groupPeriodPaymentsForGroup(state)[getters.currentPaymentPeriodForGroup(state)]
    }
  },
  thisPeriodPaymentInfo (state, getters) {
    return getters.thisPeriodPaymentInfoForGroup(getters.currentGroupState)
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
  groupIncomeAdjustedDistributionForGroup (state, getters) {
    return (state) => {
      const paymentInfo = getters.thisPeriodPaymentInfoForGroup(state)
      if (paymentInfo && paymentInfo.lastAdjustedDistribution) {
        return paymentInfo.lastAdjustedDistribution
      } else {
        const period = getters.currentPaymentPeriodForGroup(state)
        return adjustedDistribution({
          distribution: unadjustedDistribution({
            haveNeeds: getters.haveNeedsForThisPeriodForGroup(state, period),
            minimize: getters.groupSettingsForGroup(state).minimizeDistribution
          }),
          payments: getters.paymentsForPeriodForGroup(state, period),
          dueOn: getters.dueDateForPeriodForGroup(state, period)
        })
      }
    }
  },
  groupIncomeAdjustedDistribution (state, getters) {
    return getters.groupIncomeAdjustedDistributionForGroup(getters.currentGroupState)
  },
  ourPaymentsSentInPeriodForGroup (state, getters) {
    return (state, period) => {
      const periodPayments = getters.groupPeriodPaymentsForGroup(state)
      if (Object.keys(periodPayments).length === 0) return
      const payments = []
      const thisPeriodPayments = periodPayments[period]
      const paymentsFrom = thisPeriodPayments && thisPeriodPayments.paymentsFrom
      if (paymentsFrom) {
        const ourIdentityContractId = getters.ourIdentityContractId
        const allPayments = state.payments
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
  ourPaymentsSentInPeriod (state, getters) {
    return (period) => getters.ourPaymentsSentInPeriodForGroup(getters.currentGroupState, period)
  },
  ourPaymentsReceivedInPeriodForGroup (state, getters) {
    return (state, period) => {
      const periodPayments = getters.groupPeriodPaymentsForGroup(state)
      if (Object.keys(periodPayments).length === 0) return
      const payments = []
      const thisPeriodPayments = periodPayments[period]
      const paymentsFrom = thisPeriodPayments && thisPeriodPayments.paymentsFrom
      if (paymentsFrom) {
        const ourIdentityContractId = getters.ourIdentityContractId
        const allPayments = state.payments
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
  ourPaymentsReceivedInPeriod (state, getters) {
    return (period) => getters.ourPaymentsReceivedInPeriodForGroup(getters.currentGroupState, period)
  },
  ourPaymentsForGroup (state, getters) {
    return (state) => {
      const periodPayments = getters.groupPeriodPaymentsForGroup(state)
      if (Object.keys(periodPayments).length === 0) return
      const ourIdentityContractId = getters.ourIdentityContractId
      const cPeriod = getters.currentPaymentPeriodForGroup(state)
      const pPeriod = getters.periodBeforePeriodForGroup(state, cPeriod)
      const currentSent = getters.ourPaymentsSentInPeriodForGroup(state, cPeriod)
      const previousSent = getters.ourPaymentsSentInPeriodForGroup(state, pPeriod)
      const currentReceived = getters.ourPaymentsReceivedInPeriodForGroup(state, cPeriod)
      const previousReceived = getters.ourPaymentsReceivedInPeriodForGroup(state, pPeriod)

      // TODO: take into account pending payments that have been sent but not yet completed
      const todo = () => {
        return getters.groupIncomeAdjustedDistributionForGroup(state).filter(p => p.fromMemberID === ourIdentityContractId)
      }

      return {
        sent: [...currentSent, ...previousSent],
        received: [...currentReceived, ...previousReceived],
        todo: todo()
      }
    }
  },
  ourPayments (state, getters) {
    return getters.ourPaymentsForGroup(getters.currentGroupState)
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
    const inviteId = anyoneCanJoinInviteId(invites, getters)
    const expires = getters.currentGroupState._vm.invites[inviteId].expires
    return { inviteId, expires }
  },
  // list of group names and contractIDs
  groupsByName (state, getters) {
    const identityContractID = getters.ourIdentityContractId
    const groups = state[identityContractID]?.groups
    if (!groups) return []
    // The code below was originally Object.entries(...) but changed to .keys()
    // due to the same flow issue as https://github.com/facebook/flow/issues/5838
    // we return event pending groups that we haven't finished joining so that we are not stuck
    // on the /pending-approval page if we are part of another working group already
    return Object.entries(groups)
    // $FlowFixMe[incompatible-use]
      .filter(([, { hasLeft }]) => !hasLeft)
      .map(([contractID]) => ({ groupName: state[contractID]?.settings?.groupName || L('Pending'), contractID, active: state[contractID]?.profiles?.[identityContractID]?.status === PROFILE_STATUS.ACTIVE }))
  },
  profilesByGroup (state, getters) {
    return groupID => {
      const profiles = {}
      if (state.contracts[groupID]?.type !== 'gi.contracts/group') {
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
          !(getters.groupMembersPending[memberID].expires < Date.now()))
      .map(memberID => {
        const { contractID, displayName, username } = getters.globalProfile(memberID) || groupMembersPending[memberID] || (getters.groupProfiles[memberID] ? { contractID: memberID } : {})
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
      .filter(contractID => state.contracts[contractID]?.type === 'gi.contracts/identity')
      .forEach(contractID => {
        const attributes = state[contractID].attributes
        if (attributes) { // NOTE: this is for fixing the error while syncing the identity contracts
          const username = checkedUsername(state, attributes.username, contractID)
          if (!username) return
          profiles[username] = {
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
      .filter(contractID => state.contracts[contractID]?.type === 'gi.contracts/identity')
      .forEach(contractID => {
        const attributes = state[contractID]?.attributes
        if (attributes) { // NOTE: this is for fixing the error while syncing the identity contracts
          const username = checkedUsername(state, attributes.username, contractID)
          profiles[contractID] = {
            ...attributes,
            username,
            contractID
          }
        } else {
          profiles[contractID] = {
            contractID
          }
        }
      })
    // For consistency, add users that were known in the past (since those
    // contracts will be removed). This keeps mentions working in existing
    // devices
    Object.keys(state.reverseNamespaceLookups).forEach((contractID) => {
      if (profiles[contractID] || state.contracts[contractID] === null) return
      profiles[contractID] = {
        username: state.reverseNamespaceLookups[contractID],
        contractID
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
  seenWelcomeScreen (state, getters) {
    return (
      getters.currentIdentityState?.groups?.[state.currentGroupId]?.hasLeft ||
      (
        getters.ourProfileActive &&
        getters.currentIdentityState?.groups?.[state.currentGroupId]?.seenWelcomeScreen
      )
    )
  },
  ...chatroomGetters,
  ...groupGetters,
  ...identityGetters
}

export default getters
