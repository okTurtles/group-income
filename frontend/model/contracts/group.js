/* globals fetchServerTime */

'use strict'

import sbp from '@sbp/sbp'
import { Vue, Errors, L } from '@common/common.js'
import votingRules, { ruleType, VOTE_FOR, VOTE_AGAINST, RULE_PERCENTAGE, RULE_DISAGREEMENT } from './shared/voting/rules.js'
import proposals, { proposalType, proposalSettingsType, archiveProposal } from './shared/voting/proposals.js'
import { INVITE_STATUS } from '~/shared/domains/chelonia/constants.js'
import {
  PROPOSAL_INVITE_MEMBER, PROPOSAL_REMOVE_MEMBER, PROPOSAL_GROUP_SETTING_CHANGE, PROPOSAL_PROPOSAL_SETTING_CHANGE, PROPOSAL_GENERIC,
  STATUS_OPEN, STATUS_CANCELLED, STATUS_EXPIRED, MAX_ARCHIVED_PROPOSALS, MAX_ARCHIVED_PERIODS, PROPOSAL_ARCHIVED, PAYMENTS_ARCHIVED, MAX_SAVED_PERIODS,
  INVITE_INITIAL_CREATOR, PROFILE_STATUS, INVITE_EXPIRES_IN_DAYS,
  CHATROOM_GENERAL_NAME
} from './shared/constants.js'
import { paymentStatusType, paymentType, PAYMENT_COMPLETED } from './shared/payments/index.js'
import { createPaymentInfo, paymentHashesFromPaymentPeriod } from './shared/functions.js'
import { cloneDeep, deepEqualJSONType, has, omit, merge } from './shared/giLodash.js'
import { addTimeToDate, dateToPeriodStamp, compareISOTimestamps, dateFromPeriodStamp, isPeriodStamp, comparePeriodStamps, dateIsWithinPeriod, DAYS_MILLIS, periodStampsForDate, plusOnePeriodLength } from './shared/time.js'
import { unadjustedDistribution, adjustedDistribution } from './shared/distribution/distribution.js'
import currencies from './shared/currencies.js'
import { inviteType, chatRoomAttributesType } from './shared/types.js'
import { arrayOf, objectOf, objectMaybeOf, optional, string, number, boolean, object, unionOf, tupleOf } from '~/frontend/model/contracts/misc/flowTyper.js'
import { findKeyIdByName, findForeignKeysByContractID } from '~/shared/domains/chelonia/utils.js'
import { REMOVE_NOTIFICATION } from '~/frontend/model/notifications/mutationKeys.js'

function vueFetchInitKV (obj: Object, key: string, initialValue: any): any {
  let value = obj[key]
  if (!value) {
    Vue.set(obj, key, initialValue)
    value = obj[key]
  }
  return value
}

function initGroupProfile (joinedDate: string) {
  return {
    globalUsername: '', // TODO: this? e.g. groupincome:greg / namecoin:bob / ens:alice
    joinedDate,
    lastLoggedIn: joinedDate,
    nonMonetaryContributions: [],
    status: PROFILE_STATUS.ACTIVE,
    departedDate: null,
    incomeDetailsLastUpdatedDate: null
  }
}

function initPaymentPeriod ({ meta, getters }) {
  const start = getters.periodStampGivenDate(meta.createdDate)
  return {
    start,
    end: plusOnePeriodLength(start, getters.groupSettings.distributionPeriodLength),
    // this saved so that it can be used when creating a new payment
    initialCurrency: getters.groupMincomeCurrency,
    // TODO: should we also save the first period's currency exchange rate..?
    // all payments during the period use this to set their exchangeRate
    // see notes and code in groupIncomeAdjustedDistribution for details.
    // TODO: for the currency change proposal, have it update the mincomeExchangeRate
    //       using .mincomeExchangeRate *= proposal.exchangeRate
    mincomeExchangeRate: 1, // modified by proposals to change mincome currency
    paymentsFrom: {}, // fromUser => toUser => Array<paymentHash>
    // snapshot of adjusted distribution after each completed payment
    // yes, it is possible a payment began in one period and completed in another
    // in which case lastAdjustedDistribution for the previous period will be updated
    lastAdjustedDistribution: null,
    // snapshot of haveNeeds. made only when there are no payments
    haveNeedsSnapshot: null
  }
}

// NOTE: do not call any of these helper functions from within a getter b/c they modify state!

function clearOldPayments ({ contractID, state, getters }) {
  const sortedPeriodKeys = Object.keys(state.paymentsByPeriod).sort()
  // save two periods worth of payments, max
  const archivingPayments = { paymentsByPeriod: {}, payments: {} }
  while (sortedPeriodKeys.length > MAX_SAVED_PERIODS) {
    const period = sortedPeriodKeys.shift()
    archivingPayments.paymentsByPeriod[period] = cloneDeep(state.paymentsByPeriod[period])
    for (const paymentHash of getters.paymentHashesForPeriod(period)) {
      archivingPayments.payments[paymentHash] = cloneDeep(state.payments[paymentHash])
      Vue.delete(state.payments, paymentHash)
    }
    Vue.delete(state.paymentsByPeriod, period)
  }

  sbp('gi.contracts/group/pushSideEffect', contractID,
    ['gi.contracts/group/archivePayments', contractID, archivingPayments]
  )
}

function initFetchPeriodPayments ({ contractID, meta, state, getters }) {
  const period = getters.periodStampGivenDate(meta.createdDate)
  const periodPayments = vueFetchInitKV(state.paymentsByPeriod, period, initPaymentPeriod({ meta, getters }))
  const previousPeriod = getters.periodBeforePeriod(period)
  // Update the '.end' field of the previous in-memory period, if any.
  if (previousPeriod in state.paymentsByPeriod) {
    state.paymentsByPeriod[previousPeriod].end = period
  }
  clearOldPayments({ contractID, state, getters })
  return periodPayments
}

function initGroupStreaks () {
  return {
    lastStreakPeriod: null,
    fullMonthlyPledges: 0, // group streaks for 100% monthly payments - every pledging members have completed their payments
    fullMonthlySupport: 0, // group streaks for 100% monthly supports - total amount of pledges done is equal to the group's monthly contribution goal
    onTimePayments: {}, // { username: number, ... }
    missedPayments: {}, // { username: number, ... }
    noVotes: {} // { username: number, ... }
  }
}

// this function is called each time a payment is completed or a user adjusts their income details.
// TODO: call also when mincome is adjusted
function updateCurrentDistribution ({ contractID, meta, state, getters }) {
  const curPeriodPayments = initFetchPeriodPayments({ contractID, meta, state, getters })
  const period = getters.periodStampGivenDate(meta.createdDate)
  const noPayments = Object.keys(curPeriodPayments.paymentsFrom).length === 0
  // update distributionDate if we've passed into the next period
  if (comparePeriodStamps(period, getters.groupSettings.distributionDate) > 0) {
    updateGroupStreaks({ state, getters })
    getters.groupSettings.distributionDate = period
  }
  // save haveNeeds if there are no payments or the haveNeeds haven't been saved yet
  if (noPayments || !curPeriodPayments.haveNeedsSnapshot) {
    curPeriodPayments.haveNeedsSnapshot = getters.haveNeedsForThisPeriod(period)
  }
  // if there are payments this period, save the adjusted distribution
  if (!noPayments) {
    updateAdjustedDistribution({ period, getters })
  }
}

function updateAdjustedDistribution ({ period, getters }) {
  const payments = getters.groupPeriodPayments[period]
  if (payments && payments.haveNeedsSnapshot) {
    const minimize = getters.groupSettings.minimizeDistribution

    // IMPORTANT! This code must be kept in sync with updateAdjustedDistribution!
    // TODO: see if it's possible to DRY this with the code inside of updateAdjustedDistribution
    payments.lastAdjustedDistribution = adjustedDistribution({
      distribution: unadjustedDistribution({ haveNeeds: payments.haveNeedsSnapshot, minimize }),
      payments: getters.paymentsForPeriod(period),
      dueOn: getters.dueDateForPeriod(period)
    }).filter(todo => {
      // only return todos for active members
      return getters.groupProfile(todo.to).status === PROFILE_STATUS.ACTIVE
    })
  }
}

function memberLeaves ({ username, dateLeft }, { contractID, meta, state, getters }) {
  state.profiles[username].status = PROFILE_STATUS.REMOVED
  state.profiles[username].departedDate = dateLeft
  // remove any todos for this member from the adjusted distribution
  updateCurrentDistribution({ contractID, meta, state, getters })

  Object.keys(state.chatRooms).forEach((chatroomID) => {
    removeGroupChatroomProfile(state, chatroomID, username)
  })

  // When a member is leaving, we need to mark the CSK and the CEK as needing
  // to be rotated. Later, this will be used by 'gi.contracts/group/rotateKeys'
  // (to actually perform the rotation) and Chelonia (to unset the flag if
  // they are rotated by somebody else)
  // TODO: Improve this API. Developers should not modify state that is managed
  // by Chelonia.
  // Example: sbp('chelonia/contract/markKeyForRevocation', contractID, 'csk')
  if (!state._volatile) Vue.set(state, '_volatile', Object.create(null))
  if (!state._volatile.pendingKeyRevocations) Vue.set(state._volatile, 'pendingKeyRevocations', Object.create(null))

  const CSKid = findKeyIdByName(state, 'csk')
  const CEKid = findKeyIdByName(state, 'cek')

  Vue.set(state._volatile.pendingKeyRevocations, CSKid, true)
  Vue.set(state._volatile.pendingKeyRevocations, CEKid, true)
}

function isActionYoungerThanUser (actionMeta: Object, userProfile: ?Object): boolean {
  // A util function that checks if an action (or event) in a group occurred after a particular user joined a group.
  // This is used mostly for checking if a notification should be sent for that user or not.
  // e.g.) user-2 who joined a group later than user-1 (who is the creator of the group) doesn't need to receive
  // 'MEMBER_ADDED' notification for user-1.
  // In some situations, userProfile is undefined, for example, when inviteAccept is called in
  // certain situations. So we need to check for that here.
  if (!userProfile) {
    return false
  }
  return compareISOTimestamps(actionMeta.createdDate, userProfile.joinedDate) > 0
}

function updateGroupStreaks ({ state, getters }) {
  const streaks = vueFetchInitKV(state, 'streaks', initGroupStreaks())
  const cPeriod = getters.groupSettings.distributionDate
  const thisPeriodPayments = getters.groupPeriodPayments[cPeriod]
  const noPaymentsAtAll = !thisPeriodPayments

  if (streaks.lastStreakPeriod === cPeriod) return
  else {
    Vue.set(streaks, 'lastStreakPeriod', cPeriod)
  }

  // IMPORTANT! This code must be kept in sync with updateAdjustedDistribution!
  // TODO: see if it's possible to DRY this with the code inside of updateAdjustedDistribution
  const thisPeriodDistribution = thisPeriodPayments?.lastAdjustedDistribution || adjustedDistribution({
    distribution: unadjustedDistribution({
      haveNeeds: getters.haveNeedsForThisPeriod(cPeriod),
      minimize: getters.groupSettings.minimizeDistribution
    }) || [],
    payments: getters.paymentsForPeriod(cPeriod),
    dueOn: getters.dueDateForPeriod(cPeriod)
  }).filter(todo => {
    return getters.groupProfile(todo.to).status === PROFILE_STATUS.ACTIVE
  })

  // --- update 'fullMonthlyPledgesCount' streak ---
  // if the group has made 100% pledges in this period, +1 the streak value.
  // or else, reset the value to '0'
  Vue.set(
    streaks,
    'fullMonthlyPledges',
    noPaymentsAtAll
      ? 0
      : thisPeriodDistribution.length === 0
        ? streaks.fullMonthlyPledges + 1
        : 0
  )

  const thisPeriodPaymentDetails = getters.paymentsForPeriod(cPeriod)
  const thisPeriodHaveNeeds = thisPeriodPayments?.haveNeedsSnapshot || getters.haveNeedsForThisPeriod(cPeriod)
  const filterMyItems = (array, username) => array.filter(item => item.from === username)
  const isPledgingMember = username => thisPeriodHaveNeeds.some(entry => entry.name === username && entry.haveNeed > 0)

  // --- update 'fullMonthlySupport' streak. ---
  const totalContributionGoal = thisPeriodHaveNeeds.reduce(
    (total, item) => item.haveNeed < 0 ? total + (-1 * item.haveNeed) : total, 0
  )
  const totalPledgesDone = thisPeriodPaymentDetails.reduce(
    (total, paymentItem) => paymentItem.amount + total, 0
  )
  const fullMonthlySupportCurrent = vueFetchInitKV(streaks, 'fullMonthlySupport', 0)

  Vue.set(
    streaks,
    'fullMonthlySupport',
    totalPledgesDone > 0 && totalPledgesDone >= totalContributionGoal ? fullMonthlySupportCurrent + 1 : 0
  )

  // --- update 'onTimePayments' & 'missedPayments' streaks for 'pledging' members of the group ---
  for (const username in getters.groupProfiles) {
    if (!isPledgingMember(username)) continue

    // 1) update 'onTimePayments'
    const myMissedPaymentsInThisPeriod = filterMyItems(thisPeriodDistribution, username)
    const userCurrentStreak = vueFetchInitKV(streaks.onTimePayments, username, 0)
    Vue.set(
      streaks.onTimePayments,
      username,
      noPaymentsAtAll
        ? 0
        : myMissedPaymentsInThisPeriod.length === 0 &&
          filterMyItems(thisPeriodPaymentDetails, username).every(p => p.isLate === false)
          // check-1. if the user made all the pledgeds assigned to them in this period.
          // check-2. all those payments by the user were done on time.
          ? userCurrentStreak + 1
          : 0
    )

    // 2) update 'missedPayments'
    const myMissedPaymentsStreak = vueFetchInitKV(streaks.missedPayments, username, 0)
    Vue.set(
      streaks.missedPayments,
      username,
      noPaymentsAtAll
        ? myMissedPaymentsStreak + 1
        : myMissedPaymentsInThisPeriod.length >= 1
          ? myMissedPaymentsStreak + 1
          : 0
    )
  }
}

const removeGroupChatroomProfile = (state, chatRoomID, member) => {
  Vue.set(state.chatRooms[chatRoomID], 'users',
    Object.fromEntries(
      Object.entries(state.chatRooms[chatRoomID].users)
        .map(([memberKey, profile]) => {
          if (memberKey === member && (profile: any)?.status === PROFILE_STATUS.ACTIVE) {
            return [memberKey, { ...profile, status: PROFILE_STATUS.REMOVED }]
          }
          return [memberKey, profile]
        })
    )
  )
}

const leaveChatRoomAction = (state, { chatRoomID, member }, meta, leavingGroup) => {
  const sendingData = leavingGroup
    ? { member: member }
    : { member: member, username: meta.username }

  if (state?.chatRooms?.[chatRoomID]?.users?.[member]?.status !== PROFILE_STATUS.REMOVED) {
    return
  }

  const extraParams = {}

  // When a group is being left, we want to also leave chatrooms,
  // including private chatrooms. Since the user issuing the action
  // may not be a member of the chatroom, we use the group's CSK
  // unconditionally in this situation, which should be a key in the
  // chatroom (either the CSK or the groupKey)
  if (leavingGroup) {
    const encryptionKeyId = sbp('chelonia/contract/currentKeyIdByName', state, 'cek', true)
    const signingKeyId = sbp('chelonia/contract/currentKeyIdByName', state, 'csk', true)

    // If we don't have a CSK, it is because we've already been removed.
    // Proceeding would cause an error
    if (!signingKeyId) {
      return
    }

    // Set signing key to the CEK; this allows for managing joining and leaving
    // the chatroom transparently to group members
    extraParams.encryptionKeyId = encryptionKeyId
    // Set signing key to the CSK; this allows group members to remove members
    // from chatrooms they're not part of (e.g., when a group member is removed)
    extraParams.signingKeyId = signingKeyId
    // Explicitly opt out of inner signatures. By default, actions will be signed
    // by the currently logged in user.
    extraParams.innerSigningContractID = null
  }

  return sbp('gi.actions/chatroom/leave', {
    contractID: chatRoomID,
    data: sendingData,
    ...extraParams,
    hooks: {
      preSendCheck: (_, state) => {
        // Avoid sending a duplicate action if the person has already
        // left or been removed from the chatroom
        return state && !!state.users?.[member]
      }
    }
  }).catch((e) => {
    if (
      leavingGroup &&
      (e?.name === 'ChelErrorSignatureKeyNotFound' || (
        e?.name === 'GIErrorUIRuntimeError' &&
        ['ChelErrorSignatureKeyNotFound', 'GIErrorMissingSigningKeyError'].includes(e?.cause?.name)
      ))
    ) {
      // This is fine; it just means we were removed by someone else
      return
    }
    throw e
  })
}

const leaveAllChatRoomsUponLeaving = (state, member, meta) => {
  const chatRooms = state.chatRooms

  return Promise.all(Object.keys(chatRooms)
    .filter(cID => chatRooms[cID].users?.[member]?.status === PROFILE_STATUS.REMOVED)
    .map((chatRoomID) => leaveChatRoomAction(state, {
      chatRoomID,
      member
    }, meta, true))
  )
}

sbp('chelonia/defineContract', {
  name: 'gi.contracts/group',
  metadata: {
    validate: objectOf({
      createdDate: string,
      username: string,
      identityContractID: string
    }),
    async create () {
      const { username, identityContractID } = sbp('state/vuex/state').loggedIn
      return {
        createdDate: await fetchServerTime(),
        username,
        identityContractID
      }
    }
  },
  // These getters are restricted only to the contract's state.
  // Do not access state outside the contract state inside of them.
  // For example, if the getter you use tries to access `state.loggedIn`,
  // that will break the `latestContractState` function in state.js.
  // It is only safe to access state outside of the contract in a contract action's
  // `sideEffect` function (as long as it doesn't modify contract state)
  getters: {
    // we define `currentGroupState` here so that we can redefine it in state.js
    // so that we can re-use these getter definitions in state.js since they are
    // compatible with Vuex getter definitions.
    // Here `state` refers to the individual group contract's state, the equivalent
    // of `vuexRootState[someGroupContractID]`.
    currentGroupState (state) {
      return state
    },
    groupSettings (state, getters) {
      return getters.currentGroupState.settings || {}
    },
    profileActive (state, getters) {
      return username => {
        const profiles = getters.currentGroupState.profiles
        return profiles?.[username]?.status === PROFILE_STATUS.ACTIVE
      }
    },
    pendingAccept (state, getters) {
      return username => {
        const profiles = getters.currentGroupState.profiles
        return profiles?.[username]?.status === PROFILE_STATUS.PENDING
      }
    },
    groupProfile (state, getters) {
      return username => {
        const profiles = getters.currentGroupState.profiles
        return profiles && profiles[username]
      }
    },
    groupProfiles (state, getters) {
      const profiles = {}
      for (const username in (getters.currentGroupState.profiles || {})) {
        const profile = getters.groupProfile(username)
        if (profile.status === PROFILE_STATUS.ACTIVE) {
          profiles[username] = profile
        }
      }
      return profiles
    },
    groupCreatedDate (state, getters) {
      const creator = getters.groupSettings.groupCreator
      return getters.groupProfile(creator).joinedDate
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
    // paymentTotalFromUserToUser (state, getters) {
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
    groupMembersByUsername (state, getters) {
      return Object.keys(getters.groupProfiles)
    },
    groupMembersCount (state, getters) {
      return getters.groupMembersByUsername.length
    },
    groupMembersPending (state, getters) {
      const invites = getters.currentGroupState.invites
      const vmInvites = getters.currentGroupState._vm.invites
      const pendingMembers = Object.create(null)
      for (const inviteKeyId in invites) {
        if (
          vmInvites[inviteKeyId].status === INVITE_STATUS.VALID &&
          invites[inviteKeyId].creator !== INVITE_INITIAL_CREATOR
        ) {
          pendingMembers[invites[inviteKeyId].invitee] = {
            invitedBy: invites[inviteKeyId].creator,
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
        for (const username in groupProfiles) {
          const { incomeDetailsType, joinedDate } = groupProfiles[username]
          if (incomeDetailsType) {
            const amount = groupProfiles[username][incomeDetailsType]
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
            haveNeeds.push({ name: username, haveNeed, when })
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
  },
  // NOTE: All mutations must be atomic in their edits of the contract state.
  //       THEY ARE NOT to farm out any further mutations through the async actions!
  actions: {
    // this is the constructor
    'gi.contracts/group': {
      validate: objectMaybeOf({
        settings: objectMaybeOf({
          // TODO: add 'groupPubkey'
          groupName: string,
          groupPicture: string,
          sharedValues: string,
          mincomeAmount: number,
          mincomeCurrency: string,
          distributionDate: isPeriodStamp,
          distributionPeriodLength: number,
          minimizeDistribution: boolean,
          proposals: objectOf({
            [PROPOSAL_INVITE_MEMBER]: proposalSettingsType,
            [PROPOSAL_REMOVE_MEMBER]: proposalSettingsType,
            [PROPOSAL_GROUP_SETTING_CHANGE]: proposalSettingsType,
            [PROPOSAL_PROPOSAL_SETTING_CHANGE]: proposalSettingsType,
            [PROPOSAL_GENERIC]: proposalSettingsType
          })
        })
      }),
      process ({ data, meta, contractID }, { state, getters }) {
        // TODO: checkpointing: https://github.com/okTurtles/group-income/issues/354
        const initialState = merge({
          payments: {},
          paymentsByPeriod: {},
          thankYousFrom: {}, // { fromUser1: { toUser1: msg1, toUser2: msg2, ... }, fromUser2: {}, ...  }
          invites: {},
          proposals: {}, // hashes => {} TODO: this, see related TODOs in GroupProposal
          settings: {
            groupCreator: meta.username,
            distributionPeriodLength: 30 * DAYS_MILLIS,
            inviteExpiryOnboarding: INVITE_EXPIRES_IN_DAYS.ON_BOARDING,
            inviteExpiryProposal: INVITE_EXPIRES_IN_DAYS.PROPOSAL,
            allowPublicChannels: false
          },
          streaks: initGroupStreaks(),
          profiles: {},
          chatRooms: {},
          totalPledgeAmount: 0
        }, data)
        for (const key in initialState) {
          Vue.set(state, key, initialState[key])
        }
        initFetchPeriodPayments({ contractID, meta, state, getters })
      }
    },
    'gi.contracts/group/payment': {
      validate: objectMaybeOf({
        // TODO: how to handle donations to okTurtles?
        // TODO: how to handle payments to groups or users outside of this group?
        toUser: string,
        amount: number,
        currencyFromTo: tupleOf(string, string), // must be one of the keys in currencies.js (e.g. USD, EUR, etc.) TODO: handle old clients not having one of these keys, see OP_PROTOCOL_UPGRADE https://github.com/okTurtles/group-income/issues/603
        // multiply 'amount' by 'exchangeRate', which must always be
        // based on the initialCurrency of the period in which this payment was created.
        // it is then further multiplied by the period's 'mincomeExchangeRate', which
        // is modified if any proposals pass to change the mincomeCurrency
        exchangeRate: number,
        txid: string,
        status: paymentStatusType,
        paymentType: paymentType,
        details: optional(object),
        memo: optional(string)
      }),
      process ({ data, meta, hash, contractID }, { state, getters }) {
        if (data.status === PAYMENT_COMPLETED) {
          console.error(`payment: payment ${hash} cannot have status = 'completed'!`, { data, meta, hash })
          throw new Errors.GIErrorIgnoreAndBan('payments cannot be instantly completed!')
        }
        Vue.set(state.payments, hash, {
          data: {
            ...data,
            groupMincome: getters.groupMincomeAmount
          },
          meta,
          history: [[meta.createdDate, hash]]
        })
        const { paymentsFrom } = initFetchPeriodPayments({ contractID, meta, state, getters })
        const fromUser = vueFetchInitKV(paymentsFrom, meta.username, {})
        const toUser = vueFetchInitKV(fromUser, data.toUser, [])
        toUser.push(hash)
        // TODO: handle completed payments here too! (for manual payment support)
      }
    },
    'gi.contracts/group/paymentUpdate': {
      validate: objectMaybeOf({
        paymentHash: string,
        updatedProperties: objectMaybeOf({
          status: paymentStatusType,
          details: object,
          memo: string
        })
      }),
      process ({ data, meta, hash, contractID }, { state, getters }) {
        // TODO: we don't want to keep a history of all payments in memory all the time
        //       https://github.com/okTurtles/group-income/issues/426
        const payment = state.payments[data.paymentHash]
        // TODO: move these types of validation errors into the validate function so
        //       that they can be done before sending as well as upon receiving
        if (!payment) {
          console.error(`paymentUpdate: no payment ${data.paymentHash}`, { data, meta, hash })
          throw new Errors.GIErrorIgnoreAndBan('paymentUpdate without existing payment')
        }
        // if the payment is being modified by someone other than the person who sent or received it, throw an exception
        if (meta.username !== payment.meta.username && meta.username !== payment.data.toUser) {
          console.error(`paymentUpdate: bad username ${meta.username} != ${payment.meta.username} != ${payment.data.username}`, { data, meta, hash })
          throw new Errors.GIErrorIgnoreAndBan('paymentUpdate from bad user!')
        }
        payment.history.push([meta.createdDate, hash])
        merge(payment.data, data.updatedProperties)
        // we update "this period"'s snapshot 'lastAdjustedDistribution' on each completed payment
        if (data.updatedProperties.status === PAYMENT_COMPLETED) {
          payment.data.completedDate = meta.createdDate
          // update the current distribution unless this update is for a payment from the previous period
          const updatePeriodStamp = getters.periodStampGivenDate(meta.createdDate)
          const paymentPeriodStamp = getters.periodStampGivenDate(payment.meta.createdDate)
          if (comparePeriodStamps(updatePeriodStamp, paymentPeriodStamp) > 0) {
            updateAdjustedDistribution({ period: paymentPeriodStamp, getters })
          } else {
            updateCurrentDistribution({ contractID, meta, state, getters })
          }

          // NOTE: if 'PAYMENT_REVERSED' is implemented, subtract
          //       the amount from 'totalPledgeAmount'.
          const currentTotalPledgeAmount = vueFetchInitKV(state, 'totalPledgeAmount', 0)
          state.totalPledgeAmount = currentTotalPledgeAmount + payment.data.amount
        }
      },
      sideEffect ({ meta, contractID, data }, { state, getters }) {
        if (data.updatedProperties.status === PAYMENT_COMPLETED) {
          const { loggedIn } = sbp('state/vuex/state')
          const payment = state.payments[data.paymentHash]

          if (loggedIn.username === payment.data.toUser) {
            sbp('gi.notifications/emit', 'PAYMENT_RECEIVED', {
              createdDate: meta.createdDate,
              groupID: contractID,
              creator: meta.username,
              paymentHash: data.paymentHash,
              amount: getters.withGroupCurrency(payment.data.amount)
            })
          }
        }
      }
    },
    'gi.contracts/group/sendPaymentThankYou': {
      validate: objectOf({
        fromUser: string,
        toUser: string,
        memo: string
      }),
      process ({ data }, { state }) {
        const fromUser = vueFetchInitKV(state.thankYousFrom, data.fromUser, {})
        Vue.set(fromUser, data.toUser, data.memo)
      },
      sideEffect ({ contractID, meta, data }) {
        const { loggedIn } = sbp('state/vuex/state')

        if (data.toUser === loggedIn.username) {
          sbp('gi.notifications/emit', 'PAYMENT_THANKYOU_SENT', {
            createdDate: meta.createdDate,
            groupID: contractID,
            creator: meta.username, // username of the from user. to be used with sbp('namespace/lookup') in 'AvatarUser.vue'
            fromUser: data.fromUser, // display name of the from user
            toUser: data.toUser
          })
        }
      }
    },
    'gi.contracts/group/proposal': {
      validate: (data, { state, meta }) => {
        objectOf({
          proposalType: proposalType,
          proposalData: object, // data for Vue widgets
          votingRule: ruleType,
          expires_date_ms: number // calculate by grabbing proposal expiry from group properties and add to `meta.createdDate`
        })(data)

        const dataToCompare = omit(data.proposalData, ['reason'])

        // Validate this isn't a duplicate proposal
        for (const hash in state.proposals) {
          const prop = state.proposals[hash]
          if (prop.status !== STATUS_OPEN || prop.data.proposalType !== data.proposalType) {
            continue
          }

          if (deepEqualJSONType(omit(prop.data.proposalData, ['reason']), dataToCompare)) {
            throw new TypeError(L('There is an identical open proposal.'))
          }

          // TODO - verify if type of proposal already exists (SETTING_CHANGE).
        }
      },
      process ({ data, meta, hash }, { state }) {
        Vue.set(state.proposals, hash, {
          data,
          meta,
          votes: { [meta.username]: VOTE_FOR },
          status: STATUS_OPEN,
          notifiedBeforeExpire: false,
          payload: null // set later by group/proposalVote
        })
        // TODO: save all proposals disk so that we only keep open proposals in memory
        // TODO: create a global timer to auto-pass/archive expired votes
        //       make sure to set that proposal's status as STATUS_EXPIRED if it's expired
      },
      sideEffect ({ contractID, meta, data }, { getters }) {
        const { loggedIn } = sbp('state/vuex/state')
        const typeToSubTypeMap = {
          [PROPOSAL_INVITE_MEMBER]: 'ADD_MEMBER',
          [PROPOSAL_REMOVE_MEMBER]: 'REMOVE_MEMBER',
          [PROPOSAL_GROUP_SETTING_CHANGE]: {
            mincomeAmount: 'CHANGE_MINCOME',
            distributionDate: 'CHANGE_DISTRIBUTION_DATE'
          }[data.proposalData.setting],
          [PROPOSAL_PROPOSAL_SETTING_CHANGE]: 'CHANGE_VOTING_RULE',
          [PROPOSAL_GENERIC]: 'GENERIC'
        }

        const myProfile = getters.groupProfile(loggedIn.username)

        if (isActionYoungerThanUser(meta, myProfile)) {
          sbp('gi.notifications/emit', 'NEW_PROPOSAL', {
            createdDate: meta.createdDate,
            groupID: contractID,
            creator: meta.username,
            subtype: typeToSubTypeMap[data.proposalType]
          })
        }
      }
    },
    'gi.contracts/group/proposalVote': {
      validate: objectOf({
        proposalHash: string,
        vote: string,
        passPayload: optional(unionOf(object, string)) // TODO: this, somehow we need to send an OP_KEY_ADD GIMessage to add a generated once-only writeonly message public key to the contract, and (encrypted) include the corresponding invite link, also, we need all clients to verify that this message/operation was valid to prevent a hacked client from adding arbitrary OP_KEY_ADD messages, and automatically ban anyone generating such messages
      }),
      process (message, { state, getters }) {
        const { data, hash, meta } = message
        const proposal = state.proposals[data.proposalHash]
        if (!proposal) {
          // https://github.com/okTurtles/group-income/issues/602
          console.error(`proposalVote: no proposal for ${data.proposalHash}!`, { data, meta, hash })
          throw new Errors.GIErrorIgnoreAndBan('proposalVote without existing proposal')
        }
        Vue.set(proposal.votes, meta.username, data.vote)
        // TODO: handle vote pass/fail
        // check if proposal is expired, if so, ignore (but log vote)
        if (new Date(meta.createdDate).getTime() > proposal.data.expires_date_ms) {
          console.warn('proposalVote: vote on expired proposal!', { proposal, data, meta })
          // TODO: display warning or something
          return
        }
        // see if this is a deciding vote
        const result = votingRules[proposal.data.votingRule](state, proposal.data.proposalType, proposal.votes)
        if (result === VOTE_FOR || result === VOTE_AGAINST) {
          // handles proposal pass or fail, will update proposal.status accordingly
          proposals[proposal.data.proposalType][result](state, message)
          Vue.set(proposal, 'dateClosed', meta.createdDate)

          // update 'streaks.noVotes' which records the number of proposals that each member did NOT vote for
          const votedMembers = Object.keys(proposal.votes)
          for (const member of getters.groupMembersByUsername) {
            const memberCurrentStreak = vueFetchInitKV(getters.groupStreaks.noVotes, member, 0)
            const memberHasVoted = votedMembers.includes(member)

            Vue.set(getters.groupStreaks.noVotes, member, memberHasVoted ? 0 : memberCurrentStreak + 1)
          }
        }
      },
      sideEffect ({ contractID, data, meta }, { state, getters }) {
        const proposal = state.proposals[data.proposalHash]
        const { loggedIn } = sbp('state/vuex/state')
        const myProfile = getters.groupProfile(loggedIn.username)

        if (proposal?.dateClosed &&
          isActionYoungerThanUser(meta, myProfile)) {
          sbp('gi.notifications/emit', 'PROPOSAL_CLOSED', {
            createdDate: meta.createdDate,
            groupID: contractID,
            creator: meta.username,
            proposalStatus: proposal.status
          })
        }
      }
    },
    'gi.contracts/group/proposalCancel': {
      validate: objectOf({
        proposalHash: string
      }),
      process ({ data, meta, contractID }, { state }) {
        const proposal = state.proposals[data.proposalHash]
        if (!proposal) {
          // https://github.com/okTurtles/group-income/issues/602
          console.error(`proposalCancel: no proposal for ${data.proposalHash}!`, { data, meta })
          throw new Errors.GIErrorIgnoreAndBan('proposalVote without existing proposal')
        } else if (proposal.meta.username !== meta.username) {
          console.error(`proposalCancel: proposal ${data.proposalHash} belongs to ${proposal.meta.username} not ${meta.username}!`, { data, meta })
          throw new Errors.GIErrorIgnoreAndBan('proposalWithdraw for wrong user!')
        }
        Vue.set(proposal, 'status', STATUS_CANCELLED)
        Vue.set(proposal, 'dateClosed', meta.createdDate)
        archiveProposal({ state, proposalHash: data.proposalHash, proposal, contractID })
      }
    },
    'gi.contracts/group/markProposalsExpired': {
      validate: objectOf({
        proposalIds: arrayOf(string)
      }),
      process ({ data, meta, contractID }, { state }) {
        if (data.proposalIds.length) {
          for (const proposalId of data.proposalIds) {
            const proposal = state.proposals[proposalId]

            if (proposal) {
              Vue.set(proposal, 'status', STATUS_EXPIRED)
              Vue.set(proposal, 'dateClosed', meta.createdDate)
              archiveProposal({ state, proposalHash: proposalId, proposal, contractID })
            }
          }
        }
      }
    },
    'gi.contracts/group/notifyExpiringProposals': {
      validate: arrayOf(string),
      process ({ data, meta, contractID }, { state }) {
        for (const proposalId of data) {
          Vue.set(state.proposals[proposalId], 'notifiedBeforeExpire', true)
        }
      }
    },
    'gi.contracts/group/removeMember': {
      validate: (data, { state, getters, meta }) => {
        objectOf({
          member: string, // username to remove
          reason: optional(string),
          automated: optional(boolean),
          // In case it happens in a big group (by proposal)
          // we need to validate the associated proposal.
          proposalHash: optional(string),
          // TODO: Figure out error happening here
          proposalPayload: optional(objectOf({
            secret: string // NOTE: simulate the OP_KEY_* stuff for now
          }))
        })(data)

        const memberToRemove = data.member
        const membersCount = getters.groupMembersCount
        const isGroupCreator = meta.username === state.settings.groupCreator

        if (!state.profiles[memberToRemove]) {
          throw new TypeError(L('Not part of the group.'))
        }
        if (membersCount === 1 || memberToRemove === meta.username) {
          throw new TypeError(L('Cannot remove yourself.'))
        }

        if (isGroupCreator) {
          return true
        } else if (membersCount < 3) {
          // In a small group only the creator can remove someone
          // TODO: check whether meta.username has required admin permissions
          throw new TypeError(L('Only the group creator can remove members.'))
        } else {
          // In a big group a removal can only happen through a proposal
          const proposal = state.proposals[data.proposalHash]
          if (!proposal) {
            // TODO this
            throw new TypeError(L('Admin credentials needed and not implemented yet.'))
          }

          if (!proposal.payload || proposal.payload.secret !== data.proposalPayload.secret) {
            throw new TypeError(L('Invalid associated proposal.'))
          }
        }
      },
      process ({ data, meta, contractID }, { state, getters }) {
        memberLeaves(
          { username: data.member, dateLeft: meta.createdDate },
          { contractID, meta, state, getters }
        )
      },
      sideEffect ({ data, meta, contractID }, { state, getters }) {
        // Put this invocation at the end of a sync to ensure that leaving and
        // re-joining works
        sbp('chelonia/queueInvocation', contractID, () => sbp('gi.contracts/group/leaveGroup', { data, meta, contractID, getters })).catch(e => {
          console.error(`[gi.contracts/group/removeMember/sideEffect] Error ${e.name} during queueInvocation for ${contractID}`, e)
        })
      }
    },
    'gi.contracts/group/removeOurselves': {
      validate: objectMaybeOf({
        reason: string
      }),
      process ({ data, meta, contractID }, { state, getters }) {
        memberLeaves(
          { username: meta.username, dateLeft: meta.createdDate },
          { contractID, meta, state, getters }
        )

        sbp('gi.contracts/group/pushSideEffect', contractID,
          ['gi.contracts/group/removeMember/sideEffect', {
            meta,
            data: { member: meta.username, reason: data.reason || '' },
            contractID
          }]
        )
      }
    },
    'gi.contracts/group/invite': {
      validate: inviteType,
      process ({ data, meta }, { state }) {
        Vue.set(state.invites, data.inviteKeyId, data)
      }
    },
    'gi.contracts/group/inviteAccept': {
      validate: Boolean,
      process ({ data, meta, innerSigningKeyId }, { state }) {
        // TODO: ensure `meta.username` is unique for the lifetime of the username
        //       since we are making it possible for the same username to leave and
        //       rejoin the group. All of their past posts will be re-associated with
        //       them upon re-joining.
        Vue.set(state.profiles, meta.username, initGroupProfile(meta.createdDate))
        // If we're triggered by handleEvent in state.js (and not latestContractState)
        // then the asynchronous sideEffect function will get called next
        // and we will subscribe to this new user's identity contract
      },
      // !! IMPORANT!!
      // Actions here MUST NOT modify contract state!
      // They MUST NOT call 'commit'!
      // They should only coordinate the actions of outside contracts.
      // Otherwise `latestContractState` and `handleEvent` will not produce same state!
      sideEffect ({ meta, contractID }, { state }) {
        const { loggedIn } = sbp('state/vuex/state')

        sbp('chelonia/queueInvocation', contractID, async () => {
          const rootState = sbp('state/vuex/state')
          const rootGetters = sbp('state/vuex/getters')
          const state = rootState[contractID]

          if (!state) {
            console.info(`[gi.contracts/group/inviteAccept] Contract ${contractID} has been removed`)
            return
          }

          const { profiles = {} } = state

          if (profiles[meta.username].status !== PROFILE_STATUS.ACTIVE) {
            return
          }

          // TODO: per #257 this will ,have to be encompassed in a recoverable transaction
          // however per #610 that might be handled in handleEvent (?), or per #356 might not be needed
          if (meta.username === loggedIn.username) {
          // we're the person who just accepted the group invite

            const userID = loggedIn.identityContractID

            // Add the group's CSK to our identity contract so that we can receive
            // DMs.
            await sbp('gi.actions/identity/addJoinDirectMessageKey', userID, contractID, 'csk')

            const generalChatRoomId = state.generalChatRoomId
            if (generalChatRoomId) {
              // Join the general chatroom
              if (state.chatRooms[generalChatRoomId]?.users?.[loggedIn.username]?.status !== PROFILE_STATUS.ACTIVE) {
                sbp('gi.actions/group/joinChatRoom', {
                  contractID,
                  data: {
                    chatRoomID: generalChatRoomId
                  },
                  hooks: {
                    preSendCheck: (_, state) => {
                      return state.chatRooms[generalChatRoomId]?.users?.[loggedIn.username]?.status !== PROFILE_STATUS.ACTIVE
                    }
                  }
                }).catch((e) => {
                  console.error('Error while joining the #General chatroom', e)
                  // setTimeout to avoid blocking the main thread
                  setTimeout(() => {
                    // TODO: Replace alert()
                    alert(L("Couldn't join the #{chatroomName} in the group. An error occurred: #{error}.", { chatroomName: CHATROOM_GENERAL_NAME, error: e?.message || e }))
                  }, 0)
                })
              }
            } else {
              // setTimeout to avoid blocking the main thread
              setTimeout(() => {
                // TODO: Replace alert()
                alert(L("Couldn't join the #{chatroomName} in the group. Doesn't exist.", { chatroomName: CHATROOM_GENERAL_NAME }))
              }, 0)
            }

            // subscribe to founder's IdentityContract & everyone else's
            const lookupResult = await Promise.allSettled(
              Object.keys(profiles)
                .filter((name) =>
                  !rootGetters.ourContactProfiles[name] && name !== loggedIn.username)
                .map(async (name) => await sbp('namespace/lookup', name).then((r) => {
                  if (!r) throw new Error('Cannot lookup username: ' + name)
                  return r
                }))
            )
            const errors = lookupResult
              .filter(({ status }) => status === 'rejected')
              .map((r) => (r: any).reason)

            await sbp('chelonia/contract/sync',
              lookupResult
                .filter(({ status }) => status === 'fulfilled')
                .map((r) => (r: any).value)
            ).catch(e => errors.push(e))

            if (errors.length) {
              const msg = `Encountered ${errors.length} errors while accepting invites`
              console.error(msg, errors)
              throw new Error(msg)
            }

            // If we don't have a current group ID, select the group we've just
            // joined
            if (!rootState.currentGroupId) {
              sbp('state/vuex/commit', 'setCurrentChatRoomId', {})
              sbp('state/vuex/commit', 'setCurrentGroupId', contractID)
            }
          } else {
            // we're an existing member of the group getting notified that a
            // new member has joined, so subscribe to their identity contract
            await sbp('chelonia/contract/sync', meta.identityContractID)
          }
        }).catch(e => {
          console.error('[gi.contracts/group/inviteAccept/sideEffect]: An error occurred', e)
        })

        if (meta.username !== loggedIn.username) {
          const { profiles = {} } = state
          const myProfile = profiles[loggedIn.username]

          if (isActionYoungerThanUser(meta, myProfile)) {
            sbp('gi.notifications/emit', 'MEMBER_ADDED', { // emit a notification for a member addition.
              createdDate: meta.createdDate,
              groupID: contractID,
              username: meta.username
            })
          }
        }
      }
    },
    'gi.contracts/group/inviteRevoke': {
      validate: (data, { state, meta }) => {
        objectOf({
          inviteKeyId: string
        })(data)

        if (!state._vm.invites[data.inviteKeyId]) {
          throw new TypeError(L('The link does not exist.'))
        }
      },
      process () {
        // Handled by Chelonia
      }
    },
    'gi.contracts/group/updateSettings': {
      // OPTIMIZE: Make this custom validation function
      // reusable accross other future validators
      validate: (data, { getters, meta }) => {
        objectMaybeOf({
          groupName: x => typeof x === 'string',
          groupPicture: x => typeof x === 'string',
          sharedValues: x => typeof x === 'string',
          mincomeAmount: x => typeof x === 'number' && x > 0,
          mincomeCurrency: x => typeof x === 'string',
          distributionDate: x => typeof x === 'string',
          allowPublicChannels: x => typeof x === 'boolean'
        })(data)

        const isGroupCreator = meta.username === getters.groupSettings.groupCreator
        if ('allowPublicChannels' in data && !isGroupCreator) {
          throw new TypeError(L('Only group creator can allow public channels.'))
        } else if ('distributionDate' in data && !isGroupCreator) {
          throw new TypeError(L('Only group creator can update distribution date.'))
        } else if ('distributionDate' in data &&
          (getters.groupDistributionStarted(meta.createdDate) || Object.keys(getters.groupPeriodPayments).length > 1)) {
          throw new TypeError(L('Can\'t change distribution date because distribution period has already started.'))
        }
      },
      process ({ contractID, meta, data }, { state, getters }) {
        // If mincome has been updated, cache the old value and use it later to determine if the user should get a 'MINCOME_CHANGED' notification.
        const mincomeCache = 'mincomeAmount' in data ? state.settings.mincomeAmount : null

        for (const key in data) {
          Vue.set(state.settings, key, data[key])
        }

        if ('distributionDate' in data) {
          Vue.set(state, 'paymentsByPeriod', {})
          initFetchPeriodPayments({ contractID, meta, state, getters })
        }

        if (mincomeCache !== null) {
          sbp('gi.contracts/group/pushSideEffect', contractID,
            ['gi.contracts/group/sendMincomeChangedNotification',
              contractID,
              meta,
              {
                toAmount: data.mincomeAmount,
                fromAmount: mincomeCache
              }
            ]
          )
        }
      }
    },
    'gi.contracts/group/groupProfileUpdate': {
      validate: objectMaybeOf({
        incomeDetailsType: x => ['incomeAmount', 'pledgeAmount'].includes(x),
        incomeAmount: x => typeof x === 'number' && x >= 0,
        pledgeAmount: x => typeof x === 'number' && x >= 0,
        nonMonetaryAdd: string,
        nonMonetaryEdit: objectOf({
          replace: string,
          with: string
        }),
        nonMonetaryRemove: string,
        paymentMethods: arrayOf(
          objectOf({
            name: string,
            value: string
          })
        )
      }),
      process ({ data, meta, contractID }, { state, getters }) {
        const groupProfile = state.profiles[meta.username]
        const nonMonetary = groupProfile.nonMonetaryContributions
        for (const key in data) {
          const value = data[key]
          switch (key) {
            case 'nonMonetaryAdd':
              nonMonetary.push(value)
              break
            case 'nonMonetaryRemove':
              nonMonetary.splice(nonMonetary.indexOf(value), 1)
              break
            case 'nonMonetaryEdit':
              nonMonetary.splice(nonMonetary.indexOf(value.replace), 1, value.with)
              break
            default:
              Vue.set(groupProfile, key, value)
          }
        }
        if (data.incomeDetailsType) {
          // someone updated their income details, create a snapshot of the haveNeeds
          Vue.set(groupProfile, 'incomeDetailsLastUpdatedDate', meta.createdDate)
          updateCurrentDistribution({ contractID, meta, state, getters })
        }
      }
    },
    'gi.contracts/group/updateAllVotingRules': {
      validate: objectMaybeOf({
        ruleName: x => [RULE_PERCENTAGE, RULE_DISAGREEMENT].includes(x),
        ruleThreshold: number,
        expires_ms: number
      }),
      process ({ data, meta }, { state }) {
        // Update all types of proposal settings for simplicity
        if (data.ruleName && data.ruleThreshold) {
          for (const proposalSettings in state.settings.proposals) {
            Vue.set(state.settings.proposals[proposalSettings], 'rule', data.ruleName)
            Vue.set(state.settings.proposals[proposalSettings].ruleSettings[data.ruleName], 'threshold', data.ruleThreshold)
          }
        }

        // TODO later - support update expires_ms
        // if (data.ruleName && data.expires_ms) {
        //   for (const proposalSetting in state.settings.proposals) {
        //     Vue.set(state.settings.proposals[proposalSetting].ruleSettings[data.ruleName], 'expires_ms', data.expires_ms)
        //   }
        // }
      }
    },
    'gi.contracts/group/addChatRoom': {
      validate: objectOf({
        chatRoomID: string,
        attributes: chatRoomAttributesType
      }),
      process ({ data, meta }, { state }) {
        const { name, type, privacyLevel, description } = data.attributes
        Vue.set(state.chatRooms, data.chatRoomID, {
          creator: meta.username,
          name,
          description,
          type,
          privacyLevel,
          deletedDate: null,
          users: {}
        })
        if (!state.generalChatRoomId) {
          Vue.set(state, 'generalChatRoomId', data.chatRoomID)
        }
      }
    },
    'gi.contracts/group/deleteChatRoom': {
      validate: (data, { getters, meta }) => {
        objectOf({ chatRoomID: string })(data)

        if (getters.getGroupChatRooms[data.chatRoomID].creator !== meta.username) {
          throw new TypeError(L('Only the channel creator can delete channel.'))
        }
      },
      process ({ data, meta }, { state }) {
        Vue.delete(state.chatRooms, data.chatRoomID)
      }
    },
    'gi.contracts/group/leaveChatRoom': {
      validate: objectOf({
        chatRoomID: string,
        member: string
      }),
      process ({ data, meta }, { state }) {
        removeGroupChatroomProfile(state, data.chatRoomID, data.member)
      },
      sideEffect ({ meta, data, contractID, innerSigningContractID }, { state }) {
        const rootState = sbp('state/vuex/state')
        if (innerSigningContractID === rootState.loggedIn.identityContractID && !sbp('okTurtles.data/get', 'JOINING_GROUP-' + contractID)) {
          sbp('chelonia/queueInvocation', contractID, () => {
            const rootState = sbp('state/vuex/state')
            if (rootState[contractID]?.profiles?.[meta.username]?.status === PROFILE_STATUS.ACTIVE) {
              return leaveChatRoomAction(state, data, meta)
            }
          }).catch((e) => {
            console.error(`[gi.contracts/group/leaveChatRoom/sideEffect] Error for ${contractID}`, { contractID, data, error: e })
          })
        }
      }
    },
    'gi.contracts/group/joinChatRoom': {
      validate: objectMaybeOf({
        username: string,
        chatRoomID: string
      }),
      process ({ data, meta }, { state }) {
        const username = data.username || meta.username
        if (state.profiles[username]?.status !== PROFILE_STATUS.ACTIVE) {
          throw new Error('Cannot join a chatroom for a group you\'re not a member of')
        }
        // Here, we could use a list of active members or we could use a
        // dictionary with an explicit status (as is being done). The reason
        // to choose the explicit approach is to avoid syncing all the chatroom
        // contracts in the event that a member leaves the group (in which case
        // they are removed from all chatrooms).
        // This leaving process is done in two steps, with the process function
        // setting the status and the side-effect issuing the relevant action
        // in the chatroom contract. If we didn't have a way of checking for
        // removed members, we would need to possibly fetch every chatroom
        // contract to account for chatrooms for which the removed member is
        // a part of.
        Vue.set(state.chatRooms[data.chatRoomID].users, username, { status: PROFILE_STATUS.ACTIVE })
      },
      sideEffect ({ meta, data, contractID, innerSigningContractID }, { state }) {
        const rootState = sbp('state/vuex/state')
        const username = data.username || meta.username

        // If we added someone to the chatroom (including ourselves), we issue
        // the relevant action to the chatroom contract
        if (innerSigningContractID === rootState.loggedIn.identityContractID) {
          sbp('chelonia/queueInvocation', contractID, () => sbp('gi.contracts/group/joinGroupChatrooms', contractID, data.chatRoomID, username, rootState.loggedIn.username)).catch((e) => {
            console.error(`[gi.contracts/group/joinChatRoom/sideEffect] Error adding member to group chatroom for ${contractID}`, { e, data })
          })
        } else if (username === rootState.loggedIn.username) {
          // If we were the ones added to the chatroom, we sync the chatroom.
          // This is an `else` block because joinGroupChatrooms already calls
          // sync
          sbp('chelonia/queueInvocation', contractID, () => {
            const rootState = sbp('state/vuex/state')

            if (rootState[contractID]?.chatRooms[data.chatRoomID]?.users[username]?.status === PROFILE_STATUS.ACTIVE) {
              sbp('chelonia/contract/sync', data.chatRoomID).catch((e) => {
                console.error(`[gi.contracts/group/joinChatRoom/sideEffect] Error syncing chatroom contract for ${contractID}`, { e, data })
              })
            }
          })
        }
      }
    },
    'gi.contracts/group/renameChatRoom': {
      validate: objectOf({
        chatRoomID: string,
        name: string
      }),
      process ({ data, meta }, { state, getters }) {
        Vue.set(state.chatRooms[data.chatRoomID], 'name', data.name)
      }
    },
    'gi.contracts/group/changeChatRoomDescription': {
      validate: objectOf({
        chatRoomID: string,
        description: string
      }),
      process ({ data, meta }, { state, getters }) {
        Vue.set(state.chatRooms[data.chatRoomID], 'description', data.description)
      }
    },
    'gi.contracts/group/updateLastLoggedIn': {
      validate () {},
      process ({ meta }, { getters }) {
        const profile = getters.groupProfiles[meta.username]

        if (profile) {
          Vue.set(profile, 'lastLoggedIn', meta.createdDate)
        }
      }
    },
    'gi.contracts/group/updateDistributionDate': {
      validate: optional,
      process ({ meta }, { state, getters }) {
        const period = getters.periodStampGivenDate(meta.createdDate)
        const current = getters.groupSettings?.distributionDate
        if (current !== period) {
          // right before updating to the new distribution period, make sure to update various payment-related group streaks.
          updateGroupStreaks({ state, getters })
          getters.groupSettings.distributionDate = period
        }
      }
    },
    ...((process.env.NODE_ENV === 'development' || process.env.CI) && {
      'gi.contracts/group/forceDistributionDate': {
        validate: optional,
        process ({ meta, contractID }, { state, getters }) {
          getters.groupSettings.distributionDate = dateToPeriodStamp(meta.createdDate)
        }
      },
      'gi.contracts/group/malformedMutation': {
        validate: objectOf({ errorType: string, sideEffect: optional(boolean) }),
        process ({ data }) {
          const ErrorType = Errors[data.errorType]
          if (data.sideEffect) return
          if (ErrorType) {
            throw new ErrorType('malformedMutation!')
          } else {
            throw new Error(`unknown error type: ${data.errorType}`)
          }
        },
        sideEffect (message, { state }) {
          if (!message.data.sideEffect) return
          sbp('gi.contracts/group/malformedMutation/process', {
            ...message,
            data: omit(message.data, ['sideEffect'])
          }, state)
        }
      }
    })
    // TODO: remove group profile when leave group is implemented
  },
  // methods are SBP selectors that are version-tracked for each contract.
  // in other words, you can use them to define SBP selectors that will
  // contain functions that you can modify across different contract versions,
  // and when the contract calls them, it will use that specific version of the
  // method.
  //
  // They are useful when used in conjunction with pushSideEffect from process
  // functions.
  //
  // IMPORTANT: they MUST begin with the name of the contract.
  methods: {
    'gi.contracts/group/_cleanup': ({ contractID, resync }) => {
      const rootState = sbp('state/vuex/state')
      const rootGetters = sbp('state/vuex/getters')
      const contracts = rootState.contracts || {}
      const { username, identityContractID } = rootState.loggedIn

      // NOTE: should remove archived data from IndexedStorage
      //       regarding the current group (proposals, payments)
      Promise.all([
        () => sbp('gi.contracts/group/removeArchivedProposals', contractID),
        () => sbp('gi.contracts/group/removeArchivedPayments', contractID)]
      ).catch(e => {
        console.error(`[gi.contracts/group/_cleanup] Error removing entries for archive for ${contractID}`, e)
      })

      // If we're only cleaning up after receiving new keys, we're not actually
      // leaving the group and we don't need to do any of the actions related
      // to leaving
      if (resync) return

      // grab the groupID of any group that we're a part of
      if (!rootState.currentGroupId || rootState.currentGroupId === contractID) {
        const groupIdToSwitch = Object.keys(contracts)
          .filter(cID =>
            contracts[cID].type === 'gi.contracts/group' &&
              cID !== contractID
          ).sort(cID =>
          // prefer successfully joined groups
            rootState[cID]?.profiles?.[username] ? -1 : 1
          )[0] || null
        sbp('state/vuex/commit', 'setCurrentChatRoomId', {})
        sbp('state/vuex/commit', 'setCurrentGroupId', groupIdToSwitch)
      }

      // Destructors are synchronous
      sbp('gi.actions/identity/leaveGroup', {
        contractID: identityContractID,
        data: {
          groupContractID: contractID
        },
        hooks: {
          preSendCheck: (_, state) => {
            return state && has(state.groups, contractID)
          }
        }
      }).catch(e => {
        console.error(`[gi.contracts/group/_cleanup] ${e.name} thrown by gi.contracts/identity/leaveGroup ${identityContractID} for ${contractID}:`, e)
      })
        // this looks crazy, but doing this was necessary to fix a race condition in the
        // group-member-removal Cypress tests where due to the ordering of asynchronous events
        // we were getting the same latestHash upon re-logging in for test "user2 rejoins groupA".
        // We add it to the same queue as '/remove' above gets run on so that it is run after
        // contractID is removed. See also comments in 'gi.actions/identity/login'.
        .then(() => {
          const router = sbp('controller/router')
          const switchFrom = router.currentRoute.path
          const switchTo = rootState.currentGroupId ? '/dashboard' : '/'
          if (switchFrom !== '/join' && switchFrom !== switchTo) {
            router.push({ path: switchTo }).catch(console.warn)
          }
        })
        .catch(e => {
          console.error(`gi.contracts/group/_cleanup: ${e.name} thrown updating routes:`, e)
        })
        .then(() => sbp('gi.contracts/group/revokeGroupKeyAndRotateOurPEK', contractID, true))
        .catch(e => {
          console.error(`gi.contracts/group/_cleanup: ${e.name} thrown during revokeGroupKeyAndRotateOurPEK to ${contractID}:`, e)
        })
        // TODO - #828 remove other group members contracts if applicable

      // NOTE: remove all notifications whose scope is in this group
      for (const notification of rootGetters.notificationsByGroup(contractID)) {
        sbp('state/vuex/commit', REMOVE_NOTIFICATION, notification)
      }
    },
    'gi.contracts/group/archiveProposal': async function (contractID, proposalHash, proposal) {
      const { identityContractID } = sbp('state/vuex/state').loggedIn
      const key = `proposals/${identityContractID}/${contractID}`
      const proposals = await sbp('gi.db/archive/load', key) || []
      // Check for duplicates
      if (proposals.some(([archivedProposalHash]) => archivedProposalHash === proposalHash)) {
        return
      }
      // newest at the front of the array, oldest at the back
      proposals.unshift([proposalHash, proposal])
      while (proposals.length > MAX_ARCHIVED_PROPOSALS) {
        proposals.pop()
      }
      await sbp('gi.db/archive/save', key, proposals)
      sbp('okTurtles.events/emit', PROPOSAL_ARCHIVED, contractID, proposalHash, proposal)
    },
    'gi.contracts/group/archivePayments': async function (contractID, archivingPayments) {
      const { paymentsByPeriod, payments } = archivingPayments
      const { identityContractID, username } = sbp('state/vuex/state').loggedIn

      // NOTE: we save payments by period and also in types of 'Sent' and 'Received' as well
      // because it's not efficient to find all sent/received payments from the payments list
      const archPaymentsByPeriodKey = `paymentsByPeriod/${identityContractID}/${contractID}`
      const archPaymentsByPeriod = await sbp('gi.db/archive/load', archPaymentsByPeriodKey) || {}
      const archSentOrReceivedPaymentsKey = `sentOrReceivedPayments/${identityContractID}/${contractID}`
      const archSentOrReceivedPayments = await sbp('gi.db/archive/load', archSentOrReceivedPaymentsKey) || { sent: [], received: [] }

      // sort payments in order to keep the same sorting format as the recent data in vuex
      const sortPayments = payments => payments.sort((f, l) => compareISOTimestamps(l.meta.createdDate, f.meta.createdDate))

      // prepare to archive by the period
      for (const period of Object.keys(paymentsByPeriod).sort()) {
        archPaymentsByPeriod[period] = paymentsByPeriod[period]

        // filter sent/received payments from the current period
        const newSentOrReceivedPayments = { sent: [], received: [] }
        const { paymentsFrom } = paymentsByPeriod[period]
        for (const fromUser of Object.keys(paymentsFrom)) {
          for (const toUser of Object.keys(paymentsFrom[fromUser])) {
            if (toUser === username || fromUser === username) {
              const receivedOrSent = toUser === username ? 'received' : 'sent'
              for (const hash of paymentsFrom[fromUser][toUser]) {
                const { data, meta } = payments[hash]
                newSentOrReceivedPayments[receivedOrSent].push({ hash, period, data, meta, amount: data.amount })
              }
            }
          }
        }

        // merge sent/received payments by their types
        archSentOrReceivedPayments.sent = [...sortPayments(newSentOrReceivedPayments.sent), ...archSentOrReceivedPayments.sent]
        archSentOrReceivedPayments.received = [...sortPayments(newSentOrReceivedPayments.received), ...archSentOrReceivedPayments.received]

        const archPaymentsKey = `payments/${identityContractID}/${period}/${contractID}`
        const hashes = paymentHashesFromPaymentPeriod(paymentsByPeriod[period])
        const archPayments = Object.fromEntries(hashes.map(hash => [hash, payments[hash]]))

        // remove exceeded payments data in storage
        while (Object.keys(archPaymentsByPeriod).length > MAX_ARCHIVED_PERIODS) {
          const shouldBeDeletedPeriod = Object.keys(archPaymentsByPeriod).sort().shift()
          const paymentHashes = paymentHashesFromPaymentPeriod(archPaymentsByPeriod[shouldBeDeletedPeriod])

          await sbp('gi.db/archive/delete', `payments/${shouldBeDeletedPeriod}/${identityContractID}/${contractID}`)
          delete archPaymentsByPeriod[shouldBeDeletedPeriod]

          archSentOrReceivedPayments.sent = archSentOrReceivedPayments.sent.filter(payment => !paymentHashes.includes(payment.hash))
          archSentOrReceivedPayments.received = archSentOrReceivedPayments.received.filter(payment => !paymentHashes.includes(payment.hash))
        }

        await sbp('gi.db/archive/save', archPaymentsKey, archPayments)
      }

      await sbp('gi.db/archive/save', archPaymentsByPeriodKey, archPaymentsByPeriod)
      await sbp('gi.db/archive/save', archSentOrReceivedPaymentsKey, archSentOrReceivedPayments)

      sbp('okTurtles.events/emit', PAYMENTS_ARCHIVED, { paymentsByPeriod, payments })
    },
    'gi.contracts/group/removeArchivedProposals': async function (contractID) {
      const { identityContractID } = sbp('state/vuex/state').loggedIn
      const key = `proposals/${identityContractID}/${contractID}`
      await sbp('gi.db/archive/delete', key)
    },
    'gi.contracts/group/removeArchivedPayments': async function (contractID) {
      const { identityContractID } = sbp('state/vuex/state').loggedIn
      const archPaymentsByPeriodKey = `paymentsByPeriod/${identityContractID}/${contractID}`
      const periods = Object.keys(await sbp('gi.db/archive/load', archPaymentsByPeriodKey) || {})
      const archSentOrReceivedPaymentsKey = `sentOrReceivedPayments/${identityContractID}/${contractID}`
      for (const period of periods) {
        const archPaymentsKey = `payments/${identityContractID}/${period}/${contractID}`
        await sbp('gi.db/archive/delete', archPaymentsKey)
      }
      await sbp('gi.db/archive/delete', archPaymentsByPeriodKey)
      await sbp('gi.db/archive/delete', archSentOrReceivedPaymentsKey)
    },
    'gi.contracts/group/sendMincomeChangedNotification': async function (contractID, meta, data) {
      // NOTE: When group's mincome has changed, below actions should be taken.
      // - When mincome has increased, send 'MINCOME_CHANGED' notification to both receiving/pledging members.
      // - When mincome has decreased, and the changed mincome is below the monthly income of a receiving member, then
      //   1) automatically switch that user to a 'pledging' member with 0 contribution,
      //   2) pop out the prompt message notifying them of this automatic change,
      //   3) and send 'MINCOME_CHANGED' notification.
      const myProfile = sbp('state/vuex/getters').ourGroupProfile

      if (isActionYoungerThanUser(meta, myProfile) && myProfile.incomeDetailsType) {
        const memberType = myProfile.incomeDetailsType === 'pledgeAmount' ? 'pledging' : 'receiving'
        const mincomeIncreased = data.toAmount > data.fromAmount
        const actionNeeded = mincomeIncreased ||
          (memberType === 'receiving' &&
          !mincomeIncreased &&
          myProfile.incomeAmount < data.fromAmount &&
          myProfile.incomeAmount > data.toAmount)

        if (!actionNeeded) { return }

        if (memberType === 'receiving' && !mincomeIncreased) {
          await sbp('gi.actions/group/groupProfileUpdate', {
            contractID,
            data: {
              incomeDetailsType: 'pledgeAmount',
              pledgeAmount: 0
            }
          })

          await sbp('gi.actions/group/displayMincomeChangedPrompt', {
            contractID,
            data: {
              amount: data.toAmount,
              memberType,
              increased: mincomeIncreased
            }
          })
        }

        await sbp('gi.notifications/emit', 'MINCOME_CHANGED', {
          groupID: contractID,
          creator: meta.username,
          to: data.toAmount,
          memberType,
          increased: mincomeIncreased
        })
      }
    },
    'gi.contracts/group/joinGroupChatrooms': async function (contractID, chatRoomID, member, loggedInUsername) {
      const rootState = sbp('state/vuex/state')
      const state = rootState[contractID]
      const username = rootState.loggedIn.username

      if (loggedInUsername !== username || state?.profiles?.[username]?.status !== PROFILE_STATUS.ACTIVE || state?.chatRooms?.[chatRoomID]?.users[member]?.status !== PROFILE_STATUS.ACTIVE) {
        return
      }

      if (username === member) {
        await sbp('chelonia/contract/sync', chatRoomID)
      }

      if (!sbp('chelonia/contract/hasKeysToPerformOperation', chatRoomID, 'gi.contracts/chatroom/join')) {
        return
      }

      // Using the group's CEK allows for everyone to have an overview of the
      // membership (which is also part of the group contract). This way,
      // non-members can remove members when they leave the group
      const encryptionKeyId = sbp('chelonia/contract/currentKeyIdByName', state, 'cek', true)

      await sbp('gi.actions/chatroom/join', {
        contractID: chatRoomID,
        data: { username: member },
        encryptionKeyId,
        hooks: {
          preSendCheck: (_, state) => {
            // Avoid sending a duplicate action if the person is already a
            // chatroom member
            return !state?.users?.[member]
          }
        }
      }).catch(e => {
        console.error(`Unable to join ${member} to chatroom ${chatRoomID} for group ${contractID}`, e)
      })
    },
    // eslint-disable-next-line require-await
    'gi.contracts/group/leaveGroup': async ({ data, meta, contractID, getters }) => {
      const rootState = sbp('state/vuex/state')
      const rootGetters = sbp('state/vuex/getters')
      const state = rootState[contractID]
      const { username } = rootState.loggedIn

      if (!state) {
        console.info(`[gi.contracts/group/leaveGroup] for ${contractID}: contract has been removed`)
        return
      }

      if (state.profiles?.[data.member]?.status !== PROFILE_STATUS.REMOVED || (data.member === username && sbp('okTurtles.data/get', 'JOINING_GROUP-' + contractID))) {
        console.info(`[gi.contracts/group/leaveGroup] for ${contractID}: member has not left`, JSON.parse(JSON.stringify(state.profiles)))
        return
      }

      if (data.member === username) {
        // we can't await on this in here, because it will cause a deadlock, since Chelonia processes
        // this method on the eventqueue for this contractID, and /remove uses that same eventqueue
        sbp('chelonia/contract/remove', contractID).catch(e => {
          console.error(`sideEffect(removeMember): ${e.name} thrown by /remove ${contractID}:`, e)
        })
      } else {
        const myProfile = getters.groupProfile(username)

        if (isActionYoungerThanUser(meta, myProfile)) {
          const memberRemovedThemselves = data.member === meta.username

          sbp('gi.notifications/emit', // emit a notification for a member removal.
            memberRemovedThemselves ? 'MEMBER_LEFT' : 'MEMBER_REMOVED',
            {
              createdDate: meta.createdDate,
              groupID: contractID,
              username: memberRemovedThemselves ? meta.username : data.member
            })

          Promise.resolve()
            .then(() => sbp('gi.contracts/group/rotateKeys', contractID))
            .then(() => {
              return sbp('gi.contracts/group/revokeGroupKeyAndRotateOurPEK', contractID, false)
            }).catch((e) => {
              console.error(`[gi.contracts/group/leaveGroup] for ${contractID}: Error rotating group keys or our PEK`, e)
            })

          const userID = rootGetters.ourContactProfiles[data.member]?.contractID
          if (userID) {
            sbp('gi.contracts/group/removeForeignKeys', contractID, userID, state)
          }
        }
        // TODO - #828 remove the member contract if applicable.
        // problem is, if they're in another group we're also a part of, or if we
        // have a DM with them, we don't want to do this. may need to use manual reference counting
        // sbp('chelonia/contract/release', getters.groupProfile(data.member).contractID)
      }

      leaveAllChatRoomsUponLeaving(state, data.member, meta).catch((e) => {
        console.error('[gi.contracts/group/leaveGroup]: Error while leaving all chatrooms', e)
      })
      // TODO - #850 verify open proposals and see if they need some re-adjustment.
    },
    'gi.contracts/group/rotateKeys': (contractID) => {
      const rootState = sbp('state/vuex/state')
      const pendingKeyRevocations = rootState[contractID]?._volatile?.pendingKeyRevocations
      if (!pendingKeyRevocations || Object.keys(pendingKeyRevocations).length === 0) {
        // Don't rotate keys for removed contracts
        return
      }
      sbp('gi.actions/out/rotateKeys', contractID, 'gi.contracts/group', 'pending', 'gi.actions/group/shareNewKeys').catch(e => {
        console.warn(`rotateKeys: ${e.name} thrown:`, e)
      })
    },
    'gi.contracts/group/revokeGroupKeyAndRotateOurPEK': (groupContractID, disconnectGroup: ?boolean) => {
      const rootState = sbp('state/vuex/state')
      const { identityContractID } = rootState.loggedIn
      const state = rootState[identityContractID]

      if (!state._volatile) Vue.set(state, '_volatile', Object.create(null))
      if (!state._volatile.pendingKeyRevocations) Vue.set(state._volatile, 'pendingKeyRevocations', Object.create(null))

      const CSKid = findKeyIdByName(state, 'csk')
      const CEKid = findKeyIdByName(state, 'cek')
      const PEKid = findKeyIdByName(state, 'pek')

      Vue.set(state._volatile.pendingKeyRevocations, PEKid, true)

      if (disconnectGroup) {
        const groupCSKids = findForeignKeysByContractID(state, groupContractID)

        if (groupCSKids?.length) {
          if (!CEKid) {
            throw new Error('Identity CEK not found')
          }

          sbp('chelonia/queueInvocation', identityContractID, ['chelonia/out/keyDel', {
            contractID: identityContractID,
            contractName: 'gi.contracts/identity',
            data: groupCSKids,
            signingKeyId: CSKid
          }])
            .catch(e => {
              console.error(`revokeGroupKeyAndRotateOurPEK: ${e.name} thrown during keyDel to ${identityContractID}:`, e)
            })
        }

        sbp('chelonia/queueInvocation', identityContractID, ['chelonia/contract/disconnect', identityContractID, groupContractID]).catch(e => {
          console.error(`revokeGroupKeyAndRotateOurPEK: ${e.name} thrown during queueEvent to ${identityContractID}:`, e)
        })
      }

      sbp('chelonia/queueInvocation', identityContractID, ['gi.actions/out/rotateKeys', identityContractID, 'gi.contracts/identity', 'pending', 'gi.actions/identity/shareNewPEK']).catch(e => {
        console.error(`revokeGroupKeyAndRotateOurPEK: ${e.name} thrown during queueEvent to ${identityContractID}:`, e)
      })
    },
    'gi.contracts/group/removeForeignKeys': (contractID, userID, state) => {
      const keyIds = findForeignKeysByContractID(state, userID)

      if (!keyIds?.length) return

      const CSKid = findKeyIdByName(state, 'csk')

      sbp('chelonia/out/keyDel', {
        contractID,
        contractName: 'gi.contracts/group',
        data: keyIds,
        signingKeyId: CSKid
      }).catch(e => {
        console.warn(`removeForeignKeys: ${e.name} error thrown:`, e)
      })
    }
  }
})
