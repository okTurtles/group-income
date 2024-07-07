import { INVITE_STATUS } from '~/shared/domains/chelonia/constants.js'
import {
  INVITE_INITIAL_CREATOR,
  MAX_SAVED_PERIODS,
  PROFILE_STATUS,
  PROPOSAL_GENERIC
} from '../constants.js'
import currencies from '../currencies.js'
import { createPaymentInfo, paymentHashesFromPaymentPeriod } from '../functions.js'
import { PAYMENT_COMPLETED } from '../payments/index.js'
import { addTimeToDate, dateFromPeriodStamp, dateIsWithinPeriod, dateToPeriodStamp, periodStampsForDate } from '../time.js'

export default ({
  currentGroupLastLoggedIn () {
    return {}
  },
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
  groupChatRooms (state, getters) {
    return getters.currentGroupState.chatRooms
  },
  groupGeneralChatRoomId (state, getters) {
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
