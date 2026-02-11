import { INVITE_STATUS } from '@chelonia/lib/constants'
import {
  INVITE_INITIAL_CREATOR,
  MAX_SAVED_PERIODS,
  PROFILE_STATUS,
  PROPOSAL_GENERIC,
  GROUP_PERMISSIONS_PRESET,
  GROUP_ROLES
} from '../constants.js'
import currencies from '../currencies.js'
import { createPaymentInfo, paymentHashesFromPaymentPeriod } from '../functions.js'
import { PAYMENT_COMPLETED } from '../payments/index.js'
import { addTimeToDate, dateFromPeriodStamp, dateIsWithinPeriod, dateToPeriodStamp, periodStampsForDate } from '../time.js'

/*
`-ForGroup` pattern:

Some getters (see, e.g., `groupSettings` and `groupSettingsForGroup`) are
implemented in pairs, with a variant having the `ForGroup` suffix. This is
because the non-suffixed version is supposed to work for the current group
(meaning the result of `currentGroupState`), while the suffixed version takes
a group state as a parameter. To avoid redundancy, the non-suffixed version is
implemented using the suffixed version (i.e., calling it with
`getters.currentGroupState` as a parameter).

Why state and not contract ID?

We don't use an `Id` version, e.g., `-ForGroupId`, because the ID isn't
necessarily known. Contracts rely on a different patter, a getter to get the
current state (e.g., `currentGroupState`) and using a `ForGroupId` pattern would
break this and require significant refactoring. By using the state, getters are
easily interoperable in all execution environments we support (i.e., browser
windows, SW and contracts)

Why do we need this?

The primary motivation for this pattern is to reduce redundancy and improve the
flexibility of getters, as well as being to re-use complex logic in getters
from most places. Currently, we use getters from three locations: in the 'app'
(e.g., a browser window), in a service worker and in contracts.

The 'app' has a current group, so the non-prefixed version
(e.g., `groupSettings`) is generally sufficient. Contracts have an implicit
current group, which is the current contract. In these cases, getters work by
injecting a `currentGroupState` getter that resolves to the current contract
state. However, the service worker doesn't have an implicit or explicit current
group, and 'injecting' a `currentGroupState` can't be done in a way that is
understandable and also is compatible with how Vuex getters work (*), should we
decide to move some of the SW code into the app.

Since we want the SW to be able to do things for all groups without having a
global 'current group', and we also don't want to be essentially re-defining
getters when they're needed, the prefixed version (e.g., `groupSettingsForGroup`)
can be used to bridge the gap and use existing definitions. This approach is
potentially also useful in the 'app', if we want to access information about a
group which isn't the current one (an example of this could be if we wanted to
say "User 'alice' and you also have group 'foo' in common").

(*) One potential alternative solution is using a prototype-inheritance or a
Proxy object on the getters object to override `currentGroupState`. This can be
made to work in the SW using `this` magic, but is incompatible with the way
Vuex works. Also, this approach is potentially confusing and hard to read.

*/

export default ({
  currentGroupOwnerID (state, getters) {
    return getters.currentGroupState.groupOwnerID
  },
  groupSettingsForGroup (state, getters) {
    return (state) => state.settings || {}
  },
  groupSettings (state, getters) {
    return getters.groupSettingsForGroup(getters.currentGroupState)
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
  groupProfileForGroup (state, getters) {
    return (state, member) => {
      const profiles = state.profiles
      return profiles && profiles[member] && {
        ...profiles[member],
        get lastLoggedIn () {
          // Yes, technically `currentGroupLastLoggedIn` is for the current
          // group, but we don't necessarily know the correct group ID here.
          return getters.currentGroupLastLoggedIn[member] || this.joinedDate
        }
      }
    }
  },
  groupProfile (state, getters) {
    return member => getters.groupProfileForGroup(getters.currentGroupState, member)
  },
  groupProfilesForGroup (state, getters) {
    return (state) => {
      const profiles = {}
      for (const member in (state.profiles || {})) {
        const profile = getters.groupProfileForGroup(state, member)
        if (profile.status === PROFILE_STATUS.ACTIVE) {
          profiles[member] = profile
        }
      }
      return profiles
    }
  },
  groupProfiles (state, getters) {
    return getters.groupProfilesForGroup(getters.currentGroupState)
  },
  groupPledgerProfiles (state, getters) {
    return Object.fromEntries(Object.entries(getters.groupProfiles).filter(
      ([memberID, profile]: [string, any]) => profile.incomeDetailsType === 'pledgeAmount' && profile.pledgeAmount > 0
    ))
  },
  groupReceiverProfiles (state, getters) {
    return Object.fromEntries(Object.entries(getters.groupProfiles).filter(
      ([memberID, profile]: [string, any]) => profile.incomeDetailsType === 'incomeAmount'
    ))
  },
  allGroupMemberRolesAndPermissions (state, getters) {
    return Object.entries(getters.groupProfiles)
      .filter(([, profile]: [string, any]) => !!profile.role)
      .map(([memberID, profile]: [string, any]) => ({
        roleName: profile.role.name,
        permissions: profile.role.name === GROUP_ROLES.CUSTOM
          ? profile.role.permissions
          : GROUP_PERMISSIONS_PRESET[profile.role.name],
        memberID
      }))
  },
  getGroupMemberPermissionsById (state, getters) {
    return (memberID) => {
      const profile = getters.groupProfiles[memberID]
      return profile?.role?.name === GROUP_ROLES.CUSTOM
        ? profile.role.permissions
        : GROUP_PERMISSIONS_PRESET[profile.role.name]
    }
  },
  getGroupMemberRoleNameById (state, getters) {
    return (memberID) => {
      const profile = getters.groupProfiles[memberID]
      return profile?.role?.name || ''
    }
  },
  groupCreatedDate (state, getters) {
    return getters.groupProfile(getters.currentGroupOwnerID).joinedDate
  },
  groupMincomeAmountForGroup (state, getters) {
    return state => getters.groupSettingsForGroup(state).mincomeAmount
  },
  groupMincomeAmount (state, getters) {
    return getters.groupMincomeAmountForGroup(getters.currentGroupState)
  },
  groupMincomeCurrencyForGroup (state, getters) {
    return state => {
      return getters.groupSettingsForGroup(state).mincomeCurrency
    }
  },
  groupMincomeCurrency (state, getters) {
    return getters.groupMincomeCurrencyForGroup(getters.currentGroupState)
  },
  // Oldest period key first.
  groupSortedPeriodKeysForGroup (state, getters) {
    return state => {
      const { distributionDate, distributionPeriodLength } = getters.groupSettingsForGroup(state)
      if (!distributionDate) return []
      // The .sort() call might be only necessary in older browser which don't maintain object key ordering.
      // A comparator function isn't required for now since our keys are ISO strings.
      const keys = Object.keys(getters.groupPeriodPaymentsForGroup(state)).sort()
      // Append the waiting period stamp if necessary.
      if (!keys.length && MAX_SAVED_PERIODS > 0) {
        keys.push(dateToPeriodStamp(addTimeToDate(distributionDate, -distributionPeriodLength)))
      }
      // Append the distribution date if necessary.
      if (keys[keys.length - 1] !== distributionDate) {
        keys.push(distributionDate)
      }
      return keys
    }
  },
  groupSortedPeriodKeys (state, getters) {
    return getters.groupSortedPeriodKeysForGroup(getters.currentGroupState)
  },
  // paymentTotalfromMembertoMemberID (state, getters) {
  // // this code was removed in https://github.com/okTurtles/group-income/pull/1691
  // // because it was unused. feel free to bring it back if needed.
  // },
  //
  // The following three getters return either a known period stamp for the given date,
  // or a predicted one according to the period length.
  // They may also return 'undefined', in which case the caller should check archived data.
  periodStampGivenDateForGroup (state, getters) {
    return (state, date: string | Date, periods?: string[]): string | void => {
      return periodStampsForDate(date, {
        knownSortedStamps: periods || getters.groupSortedPeriodKeysForGroup(state),
        periodLength: getters.groupSettingsForGroup(state).distributionPeriodLength
      }).current
    }
  },
  periodStampGivenDate (state, getters) {
    return (date: string | Date, periods?: string[]): string | void => {
      return getters.periodStampGivenDateForGroup(getters.currentGroupState, date, periods)
    }
  },
  periodBeforePeriodForGroup (state, getters) {
    return (groupState: Object, periodStamp: string, periods?: string[]): string | void => {
      return periodStampsForDate(periodStamp, {
        knownSortedStamps: periods || getters.groupSortedPeriodKeysForGroup(groupState),
        periodLength: getters.groupSettingsForGroup(groupState).distributionPeriodLength
      }).previous
    }
  },
  periodBeforePeriod (state, getters) {
    return (periodStamp: string, periods?: string[]) => getters.periodBeforePeriodForGroup(getters.currentGroupState, periodStamp, periods)
  },
  periodAfterPeriodForGroup (state, getters) {
    return (groupState: Object, periodStamp: string, periods?: string[]): string | void => {
      return periodStampsForDate(periodStamp, {
        knownSortedStamps: periods || getters.groupSortedPeriodKeysForGroup(groupState),
        periodLength: getters.groupSettingsForGroup(groupState).distributionPeriodLength
      }).next
    }
  },
  periodAfterPeriod (state, getters) {
    return (periodStamp: string, periods?: string[]) => getters.periodAfterPeriodForGroup(getters.currentGroupState, periodStamp, periods)
  },
  dueDateForPeriodForGroup (state, getters) {
    return (state, periodStamp: string, periods?: string[]) => {
      // NOTE: logically it's should be 1 milisecond before the periodAfterPeriod
      //       1 mili-second doesn't make any difference to the users
      //       so periodAfterPeriod is used to make it simple
      return getters.periodAfterPeriodForGroup(state, periodStamp, periods)
    }
  },
  dueDateForPeriod (state, getters) {
    return (periodStamp: string, periods?: string[]) => {
      return getters.dueDateForPeriodForGroup(getters.currentGroupState, periodStamp, periods)
    }
  },
  paymentHashesForPeriodForGroup (state, getters) {
    return (state, periodStamp) => {
      const periodPayments = getters.groupPeriodPaymentsForGroup(state)[periodStamp]
      if (periodPayments) {
        return paymentHashesFromPaymentPeriod(periodPayments)
      }
    }
  },
  paymentHashesForPeriod (state, getters) {
    return (periodStamp) => {
      return getters.paymentHashesForPeriodForGroup(getters.currentGroupState, periodStamp)
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
    return (currentDate: string) => {
      return new Date(currentDate) >= new Date(getters.groupSettings?.distributionDate)
    }
  },
  groupProposalSettings (state, getters) {
    return (proposalType = PROPOSAL_GENERIC) => {
      return getters.groupSettings.proposals?.[proposalType]
    }
  },
  groupCurrencyForGroup (state, getters) {
    return state => {
      const mincomeCurrency = getters.groupMincomeCurrencyForGroup(state)
      return mincomeCurrency && currencies[mincomeCurrency]
    }
  },
  groupCurrency (state, getters) {
    return getters.groupCurrencyForGroup(getters.currentGroupState)
  },
  groupMincomeSymbolWithCode (state, getters) {
    return getters.groupCurrency?.symbolWithCode
  },
  groupPeriodPaymentsForGroup (state, getters): Object {
    // note: a lot of code expects this to return an object, so keep the || {} below
    return (state) => {
      return state.paymentsByPeriod || {}
    }
  },
  groupPeriodPayments (state, getters): Object {
    return getters.groupPeriodPaymentsForGroup(getters.currentGroupState)
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
  groupChatRooms (state, getters) {
    return getters.currentGroupState.chatRooms
  },
  groupGeneralChatRoomId (state, getters) {
    return getters.currentGroupState.generalChatRoomId
  },
  // getter is named haveNeedsForThisPeriod instead of haveNeedsForPeriod because it uses
  // getters.groupProfiles - and that is always based on the most recent values. we still
  // pass in the current period because it's used to set the "when" property
  haveNeedsForThisPeriodForGroup (state, getters) {
    return (state, currentPeriod: string) => {
      // NOTE: if we ever switch back to the "real-time" adjusted distribution algorithm,
      //       make sure that this function also handles userExitsGroupEvent
      const groupProfiles = getters.groupProfilesForGroup(state) // TODO: these should use the haveNeeds for the specific period's distribution period
      const haveNeeds = []
      for (const memberID in groupProfiles) {
        const { incomeDetailsType, joinedDate } = groupProfiles[memberID]
        if (incomeDetailsType) {
          const amount = groupProfiles[memberID][incomeDetailsType]
          const haveNeed = incomeDetailsType === 'incomeAmount' ? amount - getters.groupMincomeAmountForGroup(state) : amount
          // construct 'when' this way in case we ever use a pro-rated algorithm
          let when = dateFromPeriodStamp(currentPeriod).toISOString()
          if (dateIsWithinPeriod({
            date: joinedDate,
            periodStart: currentPeriod,
            periodLength: getters.groupSettingsForGroup(state).distributionPeriodLength
          })) {
            when = joinedDate
          }
          haveNeeds.push({ memberID, haveNeed, when })
        }
      }
      return haveNeeds
    }
  },
  haveNeedsForThisPeriod (state, getters) {
    return (currentPeriod: string) => {
      return getters.haveNeedsForThisPeriodForGroup(getters.currentGroupState, currentPeriod)
    }
  },
  paymentsForPeriodForGroup (state, getters) {
    return (state, periodStamp) => {
      const hashes = getters.paymentHashesForPeriodForGroup(state, periodStamp)
      const events = []
      if (hashes && hashes.length > 0) {
        const payments = state.payments
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
  paymentsForPeriod (state, getters) {
    return (periodStamp) => {
      return getters.paymentsForPeriodForGroup(getters.currentGroupState, periodStamp)
    }
  }
  // distributionEventsForMonth (state, getters) {
  //   return (monthstamp) => {
  //     // NOTE: if we ever switch back to the "real-time" adjusted distribution
  //     // algorithm, make sure that this function also handles userExitsGroupEvent
  //     const distributionEvents = getters.haveNeedEventsForMonth(monthstamp)
  //     const paymentEvents = getters.paymentEventsForMonth(monthstamp)
  //     distributionEvents.splice(distributionEvents.length, 0, paymentEvents)
  //     return distributionEvents.sort((a, b) => compareISOTimestamps(a.data.when, b.data.when))
  //   }
  // }
}: Object)
