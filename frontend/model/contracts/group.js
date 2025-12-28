/* globals fetchServerTime */

'use strict'

import { Errors, L } from '@common/common.js'
import sbp from '@sbp/sbp'
import { ERROR_GROUP_GENERAL_CHATROOM_DOES_NOT_EXIST, ERROR_JOINING_CHATROOM, DELETED_CHATROOM, JOINED_GROUP, LEFT_CHATROOM } from '@utils/events.js'
import { actionRequireInnerSignature, arrayOf, boolean, number, numberRange, object, objectMaybeOf, objectOf, optional, string, stringMax, tupleOf, validatorFrom, unionOf } from '~/frontend/model/contracts/misc/flowTyper.js'
import { ChelErrorGenerator } from '@chelonia/lib/errors'
import {
  MAX_HASH_LEN,
  MAX_MEMO_LEN,
  CHATROOM_GENERAL_NAME, CHATROOM_PRIVACY_LEVEL, CHATROOM_TYPES,
  GROUP_CURRENCY_MAX_CHAR,
  GROUP_PAYMENT_METHOD_MAX_CHAR,
  GROUP_DESCRIPTION_MAX_CHAR,
  GROUP_NAME_MAX_CHAR,
  GROUP_MAX_PLEDGE_AMOUNT,
  GROUP_NON_MONETARY_CONTRIBUTION_MAX_CHAR,
  GROUP_MINCOME_MAX,
  GROUP_DISTRIBUTION_PERIOD_MAX_DAYS,
  CHATROOM_NAME_LIMITS_IN_CHARS,
  CHATROOM_DESCRIPTION_LIMITS_IN_CHARS,
  INVITE_EXPIRES_IN_DAYS,
  MAX_ARCHIVED_PERIODS,
  MAX_ARCHIVED_PROPOSALS,
  MAX_SAVED_PERIODS,
  PAYMENTS_ARCHIVED,
  PROFILE_STATUS,
  PROPOSAL_ARCHIVED,
  PROPOSAL_GENERIC,
  PROPOSAL_GROUP_SETTING_CHANGE,
  PROPOSAL_INVITE_MEMBER,
  PROPOSAL_NAME_MAX_CHAR,
  PROPOSAL_REASON_MAX_CHAR,
  PROPOSAL_PROPOSAL_SETTING_CHANGE,
  PROPOSAL_REMOVE_MEMBER,
  STATUS_CANCELLED, STATUS_EXPIRED, STATUS_OPEN
} from './shared/constants.js'
import { adjustedDistribution, unadjustedDistribution } from './shared/distribution/distribution.js'
import { paymentHashesFromPaymentPeriod, referenceTally } from './shared/functions.js'
import groupGetters from './shared/getters/group.js'
import { cloneDeep, deepEqualJSONType, merge, omit } from 'turtledash'
import { PAYMENT_COMPLETED, paymentStatusType, paymentType } from './shared/payments/index.js'
import { DAYS_MILLIS, comparePeriodStamps, dateToPeriodStamp, isPeriodStamp, plusOnePeriodLength } from './shared/time.js'
import { chatRoomAttributesType, inviteType } from './shared/types.js'
import proposals, { notifyAndArchiveProposal, proposalSettingsType, proposalType } from './shared/voting/proposals.js'
import votingRules, { RULE_DISAGREEMENT, RULE_PERCENTAGE, VOTE_AGAINST, VOTE_FOR, ruleType, voteType } from './shared/voting/rules.js'

function fetchInitKV (obj: Object, key: string, initialValue: any): any {
  let value = obj[key]
  if (!value) {
    obj[key] = initialValue
    value = obj[key]
  }
  return value
}

function initGroupProfile (joinedDate: string, joinedHeight: number, reference: string) {
  return {
    globalUsername: '', // TODO: this? e.g. groupincome:greg / namecoin:bob / ens:alice
    joinedDate,
    joinedHeight,
    reference,
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
    paymentsFrom: {}, // fromMemberID => toMemberID => Array<paymentHash>
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
      delete state.payments[paymentHash]
    }
    delete state.paymentsByPeriod[period]
  }
  // remove the waiting period from the archivingPayments to prevent it from appearing in Support History UI
  delete archivingPayments.paymentsByPeriod[state.waitingPeriod]
  sbp('gi.contracts/group/pushSideEffect', contractID,
    ['gi.contracts/group/archivePayments', contractID, archivingPayments]
  )
}

function initFetchPeriodPayments ({ contractID, meta, state, getters }) {
  const period = getters.periodStampGivenDate(meta.createdDate)
  const periodPayments = fetchInitKV(state.paymentsByPeriod, period, initPaymentPeriod({ meta, getters }))
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
    onTimePayments: {}, // { memberID: number, ... }
    missedPayments: {}, // { memberID: number, ... }
    noVotes: {} // { memberID: number, ... }
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
      return getters.groupProfile(todo.toMemberID).status === PROFILE_STATUS.ACTIVE
    })
  }
}

function memberLeaves ({ memberID, dateLeft, heightLeft, ourselvesLeaving }, { contractID, meta, state, getters }) {
  if (!state.profiles[memberID] || state.profiles[memberID].status !== PROFILE_STATUS.ACTIVE) {
    throw new Error(`[gi.contracts/group memberLeaves] Can't remove non-exisiting member ${memberID}`)
  }

  state.profiles[memberID].status = PROFILE_STATUS.REMOVED
  state.profiles[memberID].departedDate = dateLeft
  state.profiles[memberID].departedHeight = heightLeft
  // remove any todos for this member from the adjusted distribution
  updateCurrentDistribution({ contractID, meta, state, getters })

  Object.keys(state.chatRooms).forEach((chatroomID) => {
    removeGroupChatroomProfile(state, chatroomID, memberID, ourselvesLeaving)
  })
}

function isActionNewerThanUserJoinedDate (height: number, userProfile: ?Object): boolean {
  // A util function that checks if an action (or event) in a group occurred after a particular user joined a group.
  // This is used mostly for checking if a notification should be sent for that user or not.
  // e.g.) user-2 who joined a group later than user-1 (who is the creator of the group) doesn't need to receive
  // 'MEMBER_ADDED' notification for user-1.
  // In some situations, userProfile is undefined, for example, when inviteAccept is called in
  // certain situations. So we need to check for that here.
  if (!userProfile) {
    return false
  }
  return userProfile.status === PROFILE_STATUS.ACTIVE && userProfile.joinedHeight < height
}

function updateGroupStreaks ({ state, getters }) {
  const streaks = fetchInitKV(state, 'streaks', initGroupStreaks())
  const cPeriod = getters.groupSettings.distributionDate
  const thisPeriodPayments = getters.groupPeriodPayments[cPeriod]
  const noPaymentsAtAll = !thisPeriodPayments

  if (streaks.lastStreakPeriod === cPeriod) return
  else {
    streaks['lastStreakPeriod'] = cPeriod
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
    return getters.groupProfile(todo.toMemberID).status === PROFILE_STATUS.ACTIVE
  })

  // --- update 'fullMonthlyPledgesCount' streak ---
  // if the group has made 100% pledges in this period, +1 the streak value.
  // or else, reset the value to '0'
  streaks['fullMonthlyPledges'] =
    noPaymentsAtAll
      ? 0
      : thisPeriodDistribution.length === 0
        ? streaks.fullMonthlyPledges + 1
        : 0

  const thisPeriodPaymentDetails = getters.paymentsForPeriod(cPeriod)
  const thisPeriodHaveNeeds = thisPeriodPayments?.haveNeedsSnapshot || getters.haveNeedsForThisPeriod(cPeriod)
  const filterMyItems = (array, member) => array.filter(item => item.fromMemberID === member)
  const isPledgingMember = member => thisPeriodHaveNeeds.some(entry => entry.memberID === member && entry.haveNeed > 0)

  // --- update 'fullMonthlySupport' streak. ---
  const totalContributionGoal = thisPeriodHaveNeeds.reduce(
    (total, item) => item.haveNeed < 0 ? total + (-1 * item.haveNeed) : total, 0
  )
  const totalPledgesDone = thisPeriodPaymentDetails.reduce(
    (total, paymentItem) => paymentItem.amount + total, 0
  )
  const fullMonthlySupportCurrent = fetchInitKV(streaks, 'fullMonthlySupport', 0)

  streaks['fullMonthlySupport'] =
    totalPledgesDone > 0 && totalPledgesDone >= totalContributionGoal ? fullMonthlySupportCurrent + 1 : 0

  // --- update 'onTimePayments' & 'missedPayments' streaks for 'pledging' members of the group ---
  for (const memberID in getters.groupProfiles) {
    if (!isPledgingMember(memberID)) continue

    // 1) update 'onTimePayments'
    const myMissedPaymentsInThisPeriod = filterMyItems(thisPeriodDistribution, memberID)
    const userCurrentStreak = fetchInitKV(streaks.onTimePayments, memberID, 0)

    streaks.onTimePayments[memberID] =
      noPaymentsAtAll
        ? 0
        : myMissedPaymentsInThisPeriod.length === 0 &&
          filterMyItems(thisPeriodPaymentDetails, memberID).every(p => p.isLate === false)
          // check-1. if the user made all the pledgeds assigned to them in this period.
          // check-2. all those payments by the user were done on time.
          ? userCurrentStreak + 1
          : 0

    // 2) update 'missedPayments'
    const myMissedPaymentsStreak = fetchInitKV(streaks.missedPayments, memberID, 0)
    streaks.missedPayments[memberID] =
      noPaymentsAtAll
        ? myMissedPaymentsStreak + 1
        : myMissedPaymentsInThisPeriod.length >= 1
          ? myMissedPaymentsStreak + 1
          : 0
  }
}

const removeGroupChatroomProfile = (state, chatRoomID, memberID, ourselvesLeaving) => {
  if (!state.chatRooms[chatRoomID].members[memberID]) return

  state.chatRooms[chatRoomID].members[memberID].status = PROFILE_STATUS.REMOVED
}

const leaveChatRoomAction = async (groupID, state, chatRoomID, memberID, actorID, leavingGroup) => {
  const sendingData = leavingGroup || actorID !== memberID
    ? { memberID }
    : {}

  if (state?.chatRooms?.[chatRoomID]?.members?.[memberID]?.status !== PROFILE_STATUS.REMOVED) {
    return
  }

  const extraParams = {}

  // When a group is being left, we want to also leave chatrooms,
  // including private chatrooms. Since the user issuing the action
  // may not be a member of the chatroom, we use the group's CSK
  // unconditionally in this situation, which should be a key in the
  // chatroom (either the CSK or the groupKey)
  if (leavingGroup) {
    const encryptionKeyId = await sbp('chelonia/contract/currentKeyIdByName', state, 'cek', true)
    const signingKeyId = await sbp('chelonia/contract/currentKeyIdByName', state, 'csk', true)

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

  sbp('gi.actions/chatroom/leave', {
    contractID: chatRoomID,
    data: sendingData,
    ...extraParams
  }).catch((e) => {
    if (
      leavingGroup &&
      (e?.name === 'ChelErrorSignatureKeyNotFound' || (
        e?.name === 'GIErrorUIRuntimeError' &&
        (
          ['ChelErrorSignatureKeyNotFound', 'GIErrorMissingSigningKeyError'].includes(e?.cause?.name) ||
          e?.cause?.name === 'GIChatroomNotMemberError'
        )
      ))
    ) {
      // This is fine; it just means we were removed by someone else
      return
    }
    console.warn('[gi.contracts/group] Error sending chatroom leave action', e)
  })
}

const leaveAllChatRoomsUponLeaving = (groupID, state, memberID, actorID) => {
  const chatRooms = state.chatRooms

  return Promise.all(Object.keys(chatRooms)
    .filter(cID => chatRooms[cID].members?.[memberID]?.status === PROFILE_STATUS.REMOVED)
    .map((chatRoomID) => leaveChatRoomAction(
      groupID,
      state,
      chatRoomID,
      memberID,
      actorID,
      true
    ))
  )
}

export const actionRequireActiveMember = (next: Function): Function => (data, props) => {
  const innerSigningContractID = props.message.innerSigningContractID
  if (!innerSigningContractID || innerSigningContractID === props.contractID) {
    throw new Error('Missing inner signature')
  }
  return next(data, props)
}

export const GIGroupAlreadyJoinedError: typeof Error = ChelErrorGenerator('GIGroupAlreadyJoinedError')
export const GIGroupNotJoinedError: typeof Error = ChelErrorGenerator('GIGroupNotJoinedError')

sbp('chelonia/defineContract', {
  name: 'gi.contracts/group',
  metadata: {
    validate: objectOf({
      createdDate: string
    }),
    async create () {
      return {
        createdDate: await fetchServerTime()
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
    currentGroupLastLoggedIn () {
      return {}
    },
    ...groupGetters
  },
  // NOTE: All mutations must be atomic in their edits of the contract state.
  //       THEY ARE NOT to farm out any further mutations through the async actions!
  actions: {
    // this is the constructor
    'gi.contracts/group': {
      validate: objectMaybeOf({
        settings: objectMaybeOf({
          // TODO: add 'groupPubkey'
          groupName: stringMax(GROUP_NAME_MAX_CHAR, 'groupName'),
          groupPicture: unionOf(string, objectOf({
            manifestCid: stringMax(MAX_HASH_LEN, 'manifestCid'),
            downloadParams: optional(object)
          })),
          sharedValues: stringMax(GROUP_DESCRIPTION_MAX_CHAR, 'sharedValues'),
          mincomeAmount: numberRange(1, GROUP_MINCOME_MAX),
          mincomeCurrency: stringMax(GROUP_CURRENCY_MAX_CHAR, 'mincomeCurrency'),
          distributionDate: validatorFrom(isPeriodStamp),
          distributionPeriodLength: numberRange(1 * DAYS_MILLIS, GROUP_DISTRIBUTION_PERIOD_MAX_DAYS * DAYS_MILLIS),
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
          thankYousFrom: {}, // { fromMember1: { toMember1: msg1, toMember2: msg2, ... }, fromMember2: {}, ...  }
          invites: {},
          proposals: {}, // hashes => {} TODO: this, see related TODOs in GroupProposal
          settings: {
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
          state[key] = initialState[key]
        }
        initFetchPeriodPayments({ contractID, meta, state, getters })
        // remember the waiting period so tha we can skip archiving it (hack for hiding it in the Support History)
        state.waitingPeriod = getters.periodStampGivenDate(meta.createdDate)
      },
      sideEffect ({ contractID }, { state }) {
        if (!state.generalChatRoomId) {
          // create a 'General' chatroom contract
          sbp('chelonia/queueInvocation', contractID, async () => {
            const state = await sbp('chelonia/contract/state', contractID)
            if (!state || state.generalChatRoomId) return

            const CSKid = await sbp('chelonia/contract/currentKeyIdByName', state, 'csk', true)
            const CEKid = await sbp('chelonia/contract/currentKeyIdByName', state, 'cek')

            // create a 'General' chatroom contract
            sbp('gi.actions/group/addChatRoom', {
              contractID,
              data: {
                attributes: {
                  name: CHATROOM_GENERAL_NAME,
                  type: CHATROOM_TYPES.GROUP,
                  description: '',
                  privacyLevel: CHATROOM_PRIVACY_LEVEL.GROUP
                }
              },
              signingKeyId: CSKid,
              encryptionKeyId: CEKid,
              // The #General chatroom does not have an inner signature as it's part
              // of the group creation process
              innerSigningContractID: null
            }).catch((e) => {
              console.error(`[gi.contracts/group/sideEffect] Error creating #General chatroom for ${contractID} (unable to send action)`, e)
            })
          }).catch((e) => {
            console.error(`[gi.contracts/group/sideEffect] Error creating #General chatroom for ${contractID}`, e)
          })
        }
      }
    },
    'gi.contracts/group/payment': {
      validate: actionRequireActiveMember(objectMaybeOf({
        // TODO: how to handle donations to okTurtles?
        // TODO: how to handle payments to groups or users outside of this group?
        toMemberID: stringMax(MAX_HASH_LEN, 'toMemberID'),
        amount: numberRange(0, GROUP_MINCOME_MAX),
        currencyFromTo: tupleOf(string, string), // must be one of the keys in currencies.js (e.g. USD, EUR, etc.) TODO: handle old clients not having one of these keys, see OP_PROTOCOL_UPGRADE https://github.com/okTurtles/group-income/issues/603
        // multiply 'amount' by 'exchangeRate', which must always be
        // based on the initialCurrency of the period in which this payment was created.
        // it is then further multiplied by the period's 'mincomeExchangeRate', which
        // is modified if any proposals pass to change the mincomeCurrency
        exchangeRate: numberRange(0, GROUP_MINCOME_MAX),
        txid: stringMax(MAX_HASH_LEN, 'txid'),
        status: paymentStatusType,
        paymentType: paymentType,
        details: optional(object),
        memo: optional(stringMax(MAX_MEMO_LEN, 'memo'))
      })),
      process ({ data, meta, hash, contractID, height, innerSigningContractID }, { state, getters }) {
        if (data.status === PAYMENT_COMPLETED) {
          console.error(`payment: payment ${hash} cannot have status = 'completed'!`, { data, meta, hash })
          throw new Errors.GIErrorIgnoreAndBan('payments cannot be instantly completed!')
        }
        state.payments[hash] = {
          data: {
            ...data,
            fromMemberID: innerSigningContractID,
            groupMincome: getters.groupMincomeAmount
          },
          height,
          meta,
          history: [[meta.createdDate, hash]]
        }
        const { paymentsFrom } = initFetchPeriodPayments({ contractID, meta, state, getters })
        const fromMemberID = fetchInitKV(paymentsFrom, innerSigningContractID, {})
        const toMemberID = fetchInitKV(fromMemberID, data.toMemberID, [])
        toMemberID.push(hash)
        // TODO: handle completed payments here too! (for manual payment support)
      }
    },
    'gi.contracts/group/paymentUpdate': {
      validate: actionRequireActiveMember(objectMaybeOf({
        paymentHash: stringMax(MAX_HASH_LEN, 'paymentHash'),
        updatedProperties: objectMaybeOf({
          status: paymentStatusType,
          details: object,
          memo: stringMax(MAX_MEMO_LEN, 'memo')
        })
      })),
      process ({ data, meta, hash, contractID, innerSigningContractID }, { state, getters }) {
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
        if (innerSigningContractID !== payment.data.fromMemberID && innerSigningContractID !== payment.data.toMemberID) {
          console.error(`paymentUpdate: bad member ${innerSigningContractID} != ${payment.data.fromMemberID} != ${payment.data.toMemberID}`, { data, meta, hash })
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
          const currentTotalPledgeAmount = fetchInitKV(state, 'totalPledgeAmount', 0)
          state.totalPledgeAmount = currentTotalPledgeAmount + payment.data.amount
        }
      },
      sideEffect ({ meta, contractID, height, data, innerSigningContractID }, { state, getters }) {
        if (data.updatedProperties.status === PAYMENT_COMPLETED) {
          const { loggedIn } = sbp('state/vuex/state')
          const payment = state.payments[data.paymentHash]

          if (loggedIn.identityContractID === payment.data.toMemberID) {
            const myProfile = getters.groupProfile(loggedIn.identityContractID)
            if (isActionNewerThanUserJoinedDate(height, myProfile)) {
              sbp('gi.notifications/emit', 'PAYMENT_RECEIVED', {
                createdDate: meta.createdDate,
                groupID: contractID,
                creatorID: innerSigningContractID,
                paymentHash: data.paymentHash,
                amount: payment.data.amount,
                currency: getters.groupSettings.mincomeCurrency
              })
            }
          }
        }
      }
    },
    'gi.contracts/group/sendPaymentThankYou': {
      validate: actionRequireActiveMember(objectOf({
        toMemberID: stringMax(MAX_HASH_LEN, 'toMemberID'),
        memo: stringMax(MAX_MEMO_LEN, 'memo')
      })),
      process ({ data, innerSigningContractID }, { state }) {
        const fromMemberID = fetchInitKV(state.thankYousFrom, innerSigningContractID, {})
        fromMemberID[data.toMemberID] = data.memo
      },
      sideEffect ({ contractID, meta, height, data, innerSigningContractID }, { getters }) {
        const { loggedIn } = sbp('state/vuex/state')

        if (data.toMemberID === loggedIn.identityContractID) {
          const myProfile = getters.groupProfile(loggedIn.identityContractID)
          if (isActionNewerThanUserJoinedDate(height, myProfile)) {
            sbp('gi.notifications/emit', 'PAYMENT_THANKYOU_SENT', {
              createdDate: meta.createdDate,
              groupID: contractID,
              fromMemberID: innerSigningContractID,
              toMemberID: data.toMemberID
            })
          }
        }
      }
    },
    'gi.contracts/group/proposal': {
      validate: actionRequireActiveMember((data, { state }) => {
        objectOf({
          proposalType: proposalType,
          proposalData: objectMaybeOf({
            name: stringMax(PROPOSAL_NAME_MAX_CHAR),
            reason: stringMax(PROPOSAL_REASON_MAX_CHAR)
          }), // data for Vue widgets
          votingRule: ruleType,
          expires_date_ms: numberRange(0, Number.MAX_SAFE_INTEGER) // calculate by grabbing proposal expiry from group properties and add to `meta.createdDate`
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
      }),
      process ({ data, meta, hash, height, innerSigningContractID }, { state }) {
        state.proposals[hash] = {
          data,
          meta,
          height,
          creatorID: innerSigningContractID,
          votes: { [innerSigningContractID]: VOTE_FOR },
          status: STATUS_OPEN,
          notifiedBeforeExpire: false,
          payload: null // set later by group/proposalVote
        }
        // TODO: save all proposals disk so that we only keep open proposals in memory
        // TODO: create a global timer to auto-pass/archive expired votes
        //       make sure to set that proposal's status as STATUS_EXPIRED if it's expired
      },
      sideEffect ({ contractID, meta, hash, data, height, innerSigningContractID }, { getters }) {
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

        const myProfile = getters.groupProfile(loggedIn.identityContractID)

        if (isActionNewerThanUserJoinedDate(height, myProfile)) {
          sbp('gi.notifications/emit', 'NEW_PROPOSAL', {
            createdDate: meta.createdDate,
            groupID: contractID,
            creatorID: innerSigningContractID,
            proposalHash: hash,
            subtype: typeToSubTypeMap[data.proposalType]
          })
        }
      }
    },
    'gi.contracts/group/proposalVote': {
      validate: actionRequireActiveMember(objectOf({
        proposalHash: stringMax(MAX_HASH_LEN, 'proposalHash'),
        vote: voteType,
        passPayload: optional(unionOf(object, string)) // TODO: this, somehow we need to send an OP_KEY_ADD SPMessage to add a generated once-only writeonly message public key to the contract, and (encrypted) include the corresponding invite link, also, we need all clients to verify that this message/operation was valid to prevent a hacked client from adding arbitrary OP_KEY_ADD messages, and automatically ban anyone generating such messages
      })),
      async process (message, { state, getters }) {
        const { data, hash, meta, innerSigningContractID } = message
        const proposal = state.proposals[data.proposalHash]
        if (!proposal) {
          // https://github.com/okTurtles/group-income/issues/602
          console.error(`proposalVote: no proposal for ${data.proposalHash}!`, { data, meta, hash })
          throw new Errors.GIErrorIgnoreAndBan('proposalVote without existing proposal')
        }
        proposal.votes[innerSigningContractID] = data.vote
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
          proposal['dateClosed'] = meta.createdDate
          await proposals[proposal.data.proposalType][result](state, message)

          // update 'streaks.noVotes' which records the number of proposals that each member did NOT vote for
          const votedMemberIDs = Object.keys(proposal.votes)
          for (const memberID of getters.groupMembersByContractID) {
            const memberCurrentStreak = fetchInitKV(getters.groupStreaks.noVotes, memberID, 0)
            const memberHasVoted = votedMemberIDs.includes(memberID)

            getters.groupStreaks.noVotes[memberID] = memberHasVoted ? 0 : memberCurrentStreak + 1
          }
        }
      }
    },
    'gi.contracts/group/proposalCancel': {
      validate: actionRequireActiveMember(objectOf({
        proposalHash: stringMax(MAX_HASH_LEN, 'proposalHash')
      })),
      process ({ data, meta, contractID, innerSigningContractID, height }, { state }) {
        const proposal = state.proposals[data.proposalHash]
        if (!proposal) {
          // https://github.com/okTurtles/group-income/issues/602
          console.error(`proposalCancel: no proposal for ${data.proposalHash}!`, { data, meta })
          throw new Errors.GIErrorIgnoreAndBan('proposalVote without existing proposal')
        } else if (proposal.creatorID !== innerSigningContractID) {
          console.error(`proposalCancel: proposal ${data.proposalHash} belongs to ${proposal.creatorID} not ${innerSigningContractID}!`, { data, meta })
          throw new Errors.GIErrorIgnoreAndBan('proposalWithdraw for wrong user!')
        }
        proposal['status'] = STATUS_CANCELLED
        proposal['dateClosed'] = meta.createdDate
        notifyAndArchiveProposal({ state, proposalHash: data.proposalHash, proposal, contractID, meta, height })
      }
    },
    'gi.contracts/group/markProposalsExpired': {
      validate: actionRequireActiveMember(objectOf({
        proposalIds: arrayOf(stringMax(MAX_HASH_LEN))
      })),
      process ({ data, meta, contractID, height }, { state }) {
        if (data.proposalIds.length) {
          for (const proposalId of data.proposalIds) {
            const proposal = state.proposals[proposalId]

            if (proposal) {
              proposal['status'] = STATUS_EXPIRED
              proposal['dateClosed'] = meta.createdDate
              notifyAndArchiveProposal({ state, proposalHash: proposalId, proposal, contractID, meta, height })
            }
          }
        }
      }
    },
    'gi.contracts/group/notifyExpiringProposals': {
      validate: actionRequireActiveMember(objectOf({
        proposalIds: arrayOf(string)
      })),
      process ({ data }, { state }) {
        for (const proposalId of data.proposalIds) {
          state.proposals[proposalId]['notifiedBeforeExpire'] = true
        }
      },
      sideEffect ({ data, height, contractID }, { state, getters }) {
        const { loggedIn } = sbp('state/vuex/state')
        const myProfile = getters.groupProfile(loggedIn.identityContractID)
        if (isActionNewerThanUserJoinedDate(height, myProfile)) {
          for (const proposalId of data.proposalIds) {
            const proposal = state.proposals[proposalId]
            sbp('gi.notifications/emit', 'PROPOSAL_EXPIRING', {
              groupID: contractID, proposal, proposalId
            })
          }
        }
      }
    },
    'gi.contracts/group/removeMember': {
      validate: actionRequireActiveMember((data, { state, getters, message: { innerSigningContractID, proposalHash } }) => {
        objectOf({
          memberID: optional(stringMax(MAX_HASH_LEN)), // member to remove
          reason: optional(stringMax(GROUP_DESCRIPTION_MAX_CHAR)),
          automated: optional(boolean)
        })(data)

        const memberToRemove = data.memberID || innerSigningContractID
        const membersCount = getters.groupMembersCount
        const isGroupCreator = innerSigningContractID === getters.currentGroupOwnerID

        if (!state.profiles[memberToRemove]) {
          throw new GIGroupNotJoinedError(L('Not part of the group.'))
        }
        if (membersCount === 1) {
          throw new TypeError(L('Cannot remove the last member.'))
        }

        if (memberToRemove === innerSigningContractID) {
          return true
        }

        if (isGroupCreator) {
          return true
        } else if (membersCount < 3) {
          // In a small group only the creator can remove someone
          // TODO: check whetherinnerSigningContractID has required admin permissions
          throw new TypeError(L('Only the group creator can remove members.'))
        } else {
          // In a big group a removal can only happen through a proposal
          // We don't need to do much validation as this attribute is only
          // provided through a secure context. It's presence indicates that
          // a proposal passed.
          const proposal = state.proposals[proposalHash]
          if (!proposal) {
            // TODO this
            throw new TypeError(L('Admin credentials needed and not implemented yet.'))
          }
        }
      }),
      process ({ data, meta, contractID, height, innerSigningContractID }, { state, getters }) {
        const memberID = data.memberID || innerSigningContractID
        const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
        if (memberID === identityContractID) {
          const ourChatrooms = Object.entries(state?.chatRooms || {}).filter(([, state]: [string, Object]) => state.members[identityContractID]?.status === PROFILE_STATUS.ACTIVE).map(([cID]) => cID)
          if (ourChatrooms.length) {
            sbp('gi.contracts/group/pushSideEffect', contractID,
              ['gi.contracts/group/referenceTally', contractID, ourChatrooms, 'release'])
          }
        }
        memberLeaves(
          { memberID, dateLeft: meta.createdDate, heightLeft: height, ourselvesLeaving: memberID === identityContractID },
          { contractID, meta, state, getters }
        )
      },
      sideEffect ({ data, meta, contractID, height, innerSigningContractID, proposalHash }, { state, getters }) {
        const memberID = data.memberID || innerSigningContractID
        // When a member is leaving, we need to mark the CSK and the CEK as needing
        // to be rotated. Later, this will be used by 'gi.contracts/group/rotateKeys'
        // (to actually perform the rotation) and Chelonia (to unset the flag if
        // they are rotated by somebody else)
        sbp('chelonia/queueInvocation', contractID, () => sbp('chelonia/contract/setPendingKeyRevocation', contractID, ['cek', 'csk']))

        sbp('gi.contracts/group/referenceTally', contractID, memberID, 'release')
        // Put this invocation at the end of a sync to ensure that leaving and re-joining works
        sbp('chelonia/queueInvocation', contractID, () => sbp('gi.contracts/group/leaveGroup', {
          data, meta, contractID, getters, height, innerSigningContractID, proposalHash
        })).catch(e => {
          console.warn(`[gi.contracts/group/removeMember/sideEffect] Error ${e.name} during queueInvocation for ${contractID}`, e)
        })
      }
    },
    'gi.contracts/group/invite': {
      validate: actionRequireActiveMember(inviteType),
      process ({ data }, { state }) {
        state.invites[data.inviteKeyId] = data
      }
    },
    'gi.contracts/group/inviteAccept': {
      validate: actionRequireInnerSignature(objectOf({ reference: string })),
      process ({ data, meta, height, innerSigningContractID }, { state }) {
        if (state.profiles[innerSigningContractID]?.status === PROFILE_STATUS.ACTIVE) {
          throw new Error(`[gi.contracts/group/inviteAccept] Existing members can't accept invites: ${innerSigningContractID}`)
        }
        state.profiles[innerSigningContractID] = initGroupProfile(meta.createdDate, height, data.reference)
        // If we're triggered by handleEvent in state.js (and not latestContractState)
        // then the asynchronous sideEffect function will get called next
        // and we will subscribe to this new user's identity contract
      },
      // !! IMPORANT!!
      // Actions here MUST NOT modify contract state!
      // They MUST NOT call 'commit'!
      // They should only coordinate the actions of outside contracts.
      // Otherwise `latestContractState` and `handleEvent` will not produce same state!
      sideEffect ({ meta, contractID, height, innerSigningContractID }) {
        const { loggedIn } = sbp('state/vuex/state')

        // subscribe to the contract of the new member
        sbp('gi.contracts/group/referenceTally', contractID, innerSigningContractID, 'retain')
        sbp('chelonia/queueInvocation', contractID, async () => {
          const state = await sbp('chelonia/contract/state', contractID)

          if (!state) {
            console.info(`[gi.contracts/group/inviteAccept] Contract ${contractID} has been removed`)
            return
          }

          const { profiles = {} } = state

          if (profiles[innerSigningContractID]?.status !== PROFILE_STATUS.ACTIVE) {
            return
          }

          const userID = loggedIn.identityContractID

          // TODO: per #257 this will ,have to be encompassed in a recoverable transaction
          // however per #610 that might be handled in handleEvent (?), or per #356 might not be needed
          if (innerSigningContractID === userID) {
            // we're the person who just accepted the group invite
            const generalChatRoomId = state.generalChatRoomId
            if (generalChatRoomId) {
              // Join the general chatroom
              if (state.chatRooms[generalChatRoomId]?.members?.[userID]?.status !== PROFILE_STATUS.ACTIVE) {
                sbp('gi.actions/group/joinChatRoom', {
                  contractID,
                  data: { chatRoomID: generalChatRoomId }
                }).catch((e) => {
                  // If already joined, ignore this error
                  if (e?.name === 'GIErrorUIRuntimeError' && e.cause?.name === 'GIGroupAlreadyJoinedError') return
                  console.error('Error while joining the #General chatroom', e)

                  sbp('okTurtles.events/emit', ERROR_JOINING_CHATROOM, { identityContractID: userID, groupContractID: contractID, chatRoomID: generalChatRoomId })
                })
              }
            } else {
              console.error("Couldn't join the chatroom in the group. Doesn't exist.", { chatroomName: CHATROOM_GENERAL_NAME })

              sbp('okTurtles.events/emit', ERROR_GROUP_GENERAL_CHATROOM_DOES_NOT_EXIST, { identityContractID: userID, groupContractID: contractID })
            }

            sbp('okTurtles.events/emit', JOINED_GROUP, { identityContractID: userID, groupContractID: contractID })
          } else if (isActionNewerThanUserJoinedDate(height, state?.profiles?.[userID])) {
            sbp('gi.notifications/emit', 'MEMBER_ADDED', {
              createdDate: meta.createdDate,
              groupID: contractID,
              memberID: innerSigningContractID
            })
          }
        }).catch(e => {
          console.error('[gi.contracts/group/inviteAccept/sideEffect]: An error occurred', e)
        })
      }
    },
    'gi.contracts/group/inviteRevoke': {
      validate: actionRequireActiveMember((data, { state }) => {
        objectOf({
          inviteKeyId: stringMax(MAX_HASH_LEN, 'inviteKeyId')
        })(data)

        if (!state._vm.invites[data.inviteKeyId]) {
          throw new TypeError(L('The link does not exist.'))
        }
      }),
      process () {
        // Handled by Chelonia
      }
    },
    'gi.contracts/group/updateSettings': {
      // OPTIMIZE: Make this custom validation function
      // reusable accross other future validators
      validate: actionRequireActiveMember((data, { getters, meta, message: { innerSigningContractID } }) => {
        objectMaybeOf({
          groupName: stringMax(GROUP_NAME_MAX_CHAR, 'groupName'),
          groupPicture: unionOf(string, objectOf({
            manifestCid: stringMax(MAX_HASH_LEN, 'manifestCid'),
            downloadParams: optional(object)
          })),
          sharedValues: stringMax(GROUP_DESCRIPTION_MAX_CHAR, 'sharedValues'),
          mincomeAmount: numberRange(Number.EPSILON, Number.MAX_VALUE),
          mincomeCurrency: stringMax(GROUP_CURRENCY_MAX_CHAR, 'mincomeCurrency'),
          distributionDate: string,
          allowPublicChannels: boolean
        })(data)

        const isGroupCreator = innerSigningContractID === getters.currentGroupOwnerID
        if ('allowPublicChannels' in data && !isGroupCreator) {
          throw new TypeError(L('Only group creator can allow public channels.'))
        } else if ('distributionDate' in data && !isGroupCreator) {
          throw new TypeError(L('Only group creator can update distribution date.'))
        } else if ('distributionDate' in data &&
          (getters.groupDistributionStarted(meta.createdDate) || Object.keys(getters.groupPeriodPayments).length > 1)) {
          throw new TypeError(L('Can\'t change distribution date because distribution period has already started.'))
        }
      }),
      process ({ contractID, meta, data, height, innerSigningContractID, proposalHash }, { state, getters }) {
        // If mincome has been updated, cache the old value and use it later to determine if the user should get a 'MINCOME_CHANGED' notification.
        const mincomeCache = 'mincomeAmount' in data ? state.settings.mincomeAmount : null

        for (const key in data) {
          state.settings[key] = data[key]
        }

        if ('distributionDate' in data) {
          state['paymentsByPeriod'] = {}
          initFetchPeriodPayments({ contractID, meta, state, getters })
        }

        if (mincomeCache !== null && !proposalHash) {
          // NOTE: Do not make notification when the mincome is changed by proposal
          sbp('gi.contracts/group/pushSideEffect', contractID,
            ['gi.contracts/group/sendMincomeChangedNotification',
              contractID,
              meta,
              {
                toAmount: data.mincomeAmount,
                fromAmount: mincomeCache
              },
              height,
              innerSigningContractID
            ]
          )
        }
      }
    },
    'gi.contracts/group/groupProfileUpdate': {
      validate: actionRequireActiveMember(objectMaybeOf({
        incomeDetailsType: validatorFrom(x => ['incomeAmount', 'pledgeAmount'].includes(x)),
        incomeAmount: numberRange(0, Number.MAX_VALUE),
        pledgeAmount: numberRange(0, GROUP_MAX_PLEDGE_AMOUNT, 'pledgeAmount'),
        nonMonetaryAdd: stringMax(GROUP_NON_MONETARY_CONTRIBUTION_MAX_CHAR, 'nonMonetaryAdd'),
        nonMonetaryEdit: objectOf({
          replace: stringMax(GROUP_NON_MONETARY_CONTRIBUTION_MAX_CHAR, 'replace'),
          with: stringMax(GROUP_NON_MONETARY_CONTRIBUTION_MAX_CHAR, 'with')
        }),
        nonMonetaryRemove: stringMax(GROUP_NON_MONETARY_CONTRIBUTION_MAX_CHAR, 'nonMonetaryRemove'),
        nonMonetaryReplace: arrayOf(stringMax(GROUP_NON_MONETARY_CONTRIBUTION_MAX_CHAR)),
        paymentMethods: arrayOf(
          objectOf({
            name: stringMax(GROUP_NAME_MAX_CHAR),
            value: stringMax(GROUP_PAYMENT_METHOD_MAX_CHAR, 'paymentMethods.value')
          })
        )
      })),
      process ({ data, meta, contractID, height, innerSigningContractID }, { state, getters }) {
        const groupProfile = state.profiles[innerSigningContractID]
        const nonMonetary = groupProfile.nonMonetaryContributions
        const isUpdatingNonMonetary = Object.keys(data).some(
          key => ['nonMonetaryAdd', 'nonMonetaryRemove', 'nonMonetaryEdit', 'nonMonetaryReplace'].includes(key)
        )

        const isChangingIncomeDetailsType = data.incomeDetailsType && groupProfile.incomeDetailsType !== data.incomeDetailsType
        const prevNonMonetary = nonMonetary.slice() // Capturing the previous non-monetary list. (To be used for in-app notification for non-monetary updates)

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
            case 'nonMonetaryReplace':
              groupProfile.nonMonetaryContributions = cloneDeep(value)
              break
            default:
              groupProfile[key] = value
          }
        }

        if (isUpdatingNonMonetary && (prevNonMonetary.length || groupProfile.nonMonetaryContributions.length)) {
          sbp('gi.contracts/group/pushSideEffect', contractID,
            ['gi.contracts/group/sendNonMonetaryUpdateNotification', {
              contractID, // group contractID
              innerSigningContractID, // identity contract ID of the group-member being updated
              meta,
              height,
              getters,
              updateData: {
                prev: prevNonMonetary,
                after: groupProfile.nonMonetaryContributions.slice()
              }
            }]
          )
        }

        if (data.incomeDetailsType) {
          // someone updated their income details, create a snapshot of the haveNeeds
          groupProfile['incomeDetailsLastUpdatedDate'] = meta.createdDate
          updateCurrentDistribution({ contractID, meta, state, getters })

          const shouldResetPaymentStreaks =
            // 1. When the user switches from 'pledger' to receiver.
            (isChangingIncomeDetailsType && data.incomeDetailsType === 'incomeAmount') ||
            // 2. The user is a 'pledger' but updates the pledge amount to 0.
            (!isChangingIncomeDetailsType && data.incomeDetailsType === 'pledgeAmount' && data.pledgeAmount === 0)

          if (shouldResetPaymentStreaks) {
            state.streaks.onTimePayments[innerSigningContractID] = 0
            state.streaks.missedPayments[innerSigningContractID] = 0
          }
        }
      }
    },
    'gi.contracts/group/updateAllVotingRules': {
      validate: actionRequireActiveMember(objectMaybeOf({
        ruleName: x => [RULE_PERCENTAGE, RULE_DISAGREEMENT].includes(x),
        ruleThreshold: number,
        expires_ms: number
      })),
      process ({ data }, { state }) {
        // Update all types of proposal settings for simplicity
        if (data.ruleName && data.ruleThreshold) {
          for (const proposalSettings in state.settings.proposals) {
            state.settings.proposals[proposalSettings]['rule'] = data.ruleName
            state.settings.proposals[proposalSettings].ruleSettings[data.ruleName]['threshold'] = data.ruleThreshold
          }
        }

        // TODO later - support update expires_ms
        // if (data.ruleName && data.expires_ms) {
        //   for (const proposalSetting in state.settings.proposals) {
        //     state.settings.proposals[proposalSetting].ruleSettings[data.ruleName]['expires_ms'] = data.expires_ms
        //   }
        // }
      }
    },
    'gi.contracts/group/addChatRoom': {
      // The #General chatroom is added without an inner signature
      validate: (data) => {
        objectOf({
          chatRoomID: stringMax(MAX_HASH_LEN, 'chatRoomID'),
          attributes: chatRoomAttributesType
        })(data)

        // Validation on the chatroom name (reference: https://github.com/okTurtles/group-income/issues/1987)
        const chatroomName = data.attributes.name
        const nameValidationMap: {[string]: Function} = {
          [L('Chatroom name cannot contain white-space')]: (v: string): boolean => /\s/g.test(v),
          [L('Chatroom name must be lower-case only')]: (v: string): boolean => /[A-Z]/g.test(v)
        }

        for (const key in nameValidationMap) {
          const check = nameValidationMap[key]
          if (check(chatroomName)) {
            throw new TypeError(key)
          }
        }
      },
      process ({ data, contractID, innerSigningContractID }, { state }) {
        const { name, type, privacyLevel, description } = data.attributes
        // XOR: has(innerSigningContractID) XOR #General
        if (!!innerSigningContractID === (data.attributes.name === CHATROOM_GENERAL_NAME)) {
          throw new Error('All chatrooms other than #General must have an inner signature and the #General chatroom must have no inner signature')
        }
        state.chatRooms[data.chatRoomID] = {
          creatorID: innerSigningContractID || contractID,
          name,
          description,
          type,
          privacyLevel,
          deletedDate: null,
          members: {}
        }
        if (!state.generalChatRoomId) {
          state['generalChatRoomId'] = data.chatRoomID
        }
      },
      sideEffect ({ contractID, data }, { state }) {
        // The app is responsible for calling setCurrentChatRoomId
        // (this happens on the JOINED_CHATROOM event)
        // If it's the #General chatroom being added, add ourselves to it
        if (data.chatRoomID === state.generalChatRoomId) {
          sbp('chelonia/queueInvocation', contractID, () => {
            const { identityContractID } = sbp('state/vuex/state').loggedIn
            if (
              state.profiles?.[identityContractID]?.status === PROFILE_STATUS.ACTIVE &&
              state.chatRooms?.[contractID]?.members[identityContractID]?.status !== PROFILE_STATUS.ACTIVE
            ) {
              sbp('gi.actions/group/joinChatRoom', {
                contractID,
                data: {
                  chatRoomID: data.chatRoomID
                }
              }).catch(e => {
                console.error('Unable to add ourselves to the #General chatroom', e)
              })
            }
          })
        }
      }
    },
    'gi.contracts/group/deleteChatRoom': {
      validate: actionRequireActiveMember((data, { getters, message: { innerSigningContractID } }) => {
        objectOf({ chatRoomID: stringMax(MAX_HASH_LEN, 'chatRoomID') })(data)

        if (getters.groupChatRooms[data.chatRoomID].creatorID !== innerSigningContractID) {
          throw new TypeError(L('Only the channel creator can delete channel.'))
        }
      }),
      process ({ contractID, data }, { state }) {
        const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
        if (identityContractID && state?.chatRooms[data.chatRoomID]?.members[identityContractID]?.status === PROFILE_STATUS.ACTIVE) {
          sbp('gi.contracts/group/pushSideEffect', contractID,
            ['gi.contracts/group/referenceTally', contractID, data.chatRoomID, 'release']
          )
        }
        delete state.chatRooms[data.chatRoomID]
      },
      sideEffect ({ data, contractID, innerSigningContractID }) {
        // identityContractID intentionally left out because deleted chatrooms
        // affect all users. If it's set, it should be set to
        // sbp('state/vuex/state').loggedIn, _not_ innerSigningContractID, for
        // the same reason. If innerSigningContractID doesn't match the current
        // session, the handler for this event will be skipped
        sbp('okTurtles.events/emit', DELETED_CHATROOM, { groupContractID: contractID, chatRoomID: data.chatRoomID })
        const { identityContractID } = sbp('state/vuex/state').loggedIn
        if (identityContractID === innerSigningContractID) {
          sbp('gi.actions/chatroom/delete', { contractID: data.chatRoomID, data: {} }).catch(e => {
            console.log(`Error sending chatroom removal action for ${data.chatRoomID}`, e)
          })
        }
      }
    },
    'gi.contracts/group/leaveChatRoom': {
      validate: actionRequireActiveMember(objectOf({
        chatRoomID: stringMax(MAX_HASH_LEN, 'chatRoomID'),
        memberID: optional(stringMax(MAX_HASH_LEN), 'memberID'),
        // `joinedHeight` is the height used in the corresponding join action
        joinedHeight: numberRange(1, Number.MAX_SAFE_INTEGER)
      })),
      process ({ data, innerSigningContractID }, { state }) {
        if (!state.chatRooms[data.chatRoomID]) {
          throw new Error('Cannot leave a chatroom which isn\'t part of the group')
        }
        const memberID = data.memberID || innerSigningContractID
        if (
          state.chatRooms[data.chatRoomID].members[memberID]?.status !== PROFILE_STATUS.ACTIVE ||
          state.chatRooms[data.chatRoomID].members[memberID].joinedHeight !== data.joinedHeight
        ) {
          throw new Error('Cannot leave a chatroom that you\'re not part of')
        }
        removeGroupChatroomProfile(state, data.chatRoomID, memberID)
      },
      sideEffect ({ data, contractID, innerSigningContractID }, { state }) {
        const memberID = data.memberID || innerSigningContractID
        // NOTE: using 'state/vuex/state' instead of 'chelonia/rootState' to fetch
        //       the identityContractID because although both 'chelonia/rootState' and
        //       'state/vuex/state' both have the same logged in information
        //       all calls to 'state/vuex/state' will need to be replaced in the future
        //       with something else. Using 'state/vuex/state' here now makes it easier
        //       to find these calls in the future.
        //       `chelonia/rootState` contains that same information but it's a bad
        //       choice because:
        //          1. Once sandboxing is implemented, it may need to be an async call
        //          2. Generally, contracts should _not_ access the root state because
        //             it makes it difficult or impossible to contain them (meaning there
        //             would be no point in sandboxing)
        //       Instead, in the future contracts will have an 'environment', provided
        //       by Chelonia, which will include global / environment / ambient
        //       information they need.
        const { identityContractID } = sbp('state/vuex/state').loggedIn
        if (innerSigningContractID === identityContractID) {
          sbp('chelonia/queueInvocation', contractID, async () => {
            const state = await sbp('chelonia/contract/state', contractID)
            // In order to send the leaveChatRoom action, we need to be an active
            // group member that's a chatroom member.
            // In addition, we skip sending an action if there there have been
            // other join or leave events by checking the `joinedHeight` value.
            if (
              state?.profiles?.[innerSigningContractID]?.status === PROFILE_STATUS.ACTIVE &&
              state.chatRooms?.[data.chatRoomID]?.members[memberID]?.status === PROFILE_STATUS.REMOVED &&
              state.chatRooms[data.chatRoomID].members[memberID].joinedHeight === data.joinedHeight
            ) {
              await leaveChatRoomAction(contractID, state, data.chatRoomID, memberID, innerSigningContractID)
            }
          }).catch((e) => {
            console.error(`[gi.contracts/group/leaveChatRoom/sideEffect] Error for ${contractID}`, { contractID, data, error: e })
          })
        }

        if (memberID === identityContractID) {
          sbp('gi.contracts/group/referenceTally', contractID, data.chatRoomID, 'release')
          sbp('okTurtles.events/emit', LEFT_CHATROOM, {
            identityContractID,
            groupContractID: contractID,
            chatRoomID: data.chatRoomID
          })
        }
      }
    },
    'gi.contracts/group/joinChatRoom': {
      validate: actionRequireActiveMember(objectMaybeOf({
        memberID: optional(stringMax(MAX_HASH_LEN, 'memberID')),
        chatRoomID: stringMax(MAX_HASH_LEN, 'chatRoomID')
      })),
      process ({ data, height, innerSigningContractID }, { state }) {
        const memberID = data.memberID || innerSigningContractID
        const { chatRoomID } = data

        if (state.profiles[memberID]?.status !== PROFILE_STATUS.ACTIVE) {
          throw new Error('Cannot join a chatroom for a group you\'re not a member of')
        }
        if (!state.chatRooms[chatRoomID]) {
          throw new Error('Cannot join a chatroom which isn\'t part of the group')
        }
        if (state.chatRooms[chatRoomID].members[memberID]?.status === PROFILE_STATUS.ACTIVE) {
          throw new GIGroupAlreadyJoinedError('Cannot join a chatroom that you\'re already part of')
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
        state.chatRooms[chatRoomID].members[memberID] = { status: PROFILE_STATUS.ACTIVE, joinedHeight: height }
      },
      sideEffect ({ data, contractID, height, innerSigningContractID }) {
        const memberID = data.memberID || innerSigningContractID
        const { identityContractID } = sbp('state/vuex/state').loggedIn

        if (memberID === identityContractID) {
          sbp('gi.contracts/group/referenceTally', contractID, data.chatRoomID, 'retain')
        }

        // If we added someone to the chatroom (including ourselves), we issue
        // the relevant action to the chatroom contract
        if (innerSigningContractID === identityContractID) {
          sbp('chelonia/queueInvocation', contractID, () => sbp('gi.contracts/group/joinGroupChatrooms', contractID, data.chatRoomID, identityContractID, memberID, height)).catch((e) => {
            console.warn(`[gi.contracts/group/joinChatRoom/sideEffect] Error adding member to group chatroom for ${contractID}`, { e, data })
          })
        }
      }
    },
    'gi.contracts/group/renameChatRoom': {
      validate: actionRequireActiveMember(objectOf({
        chatRoomID: stringMax(MAX_HASH_LEN, 'chatRoomID'),
        name: stringMax(CHATROOM_NAME_LIMITS_IN_CHARS, 'name')
      })),
      process ({ data }, { state }) {
        state.chatRooms[data.chatRoomID]['name'] = data.name
      }
    },
    'gi.contracts/group/changeChatRoomDescription': {
      validate: actionRequireActiveMember(objectOf({
        chatRoomID: stringMax(MAX_HASH_LEN, 'chatRoomID'),
        description: stringMax(CHATROOM_DESCRIPTION_LIMITS_IN_CHARS, 'description')
      })),
      process ({ data }, { state }) {
        state.chatRooms[data.chatRoomID]['description'] = data.description
      }
    },
    'gi.contracts/group/updateDistributionDate': {
      validate: actionRequireActiveMember(optional),
      process ({ meta }, { state, getters }) {
        const period = getters.periodStampGivenDate(meta.createdDate)
        const current = state.settings?.distributionDate
        if (current !== period) {
          // right before updating to the new distribution period, make sure to update various payment-related group streaks.
          updateGroupStreaks({ state, getters })
          state.settings.distributionDate = period
        }
      }
    },
    ...((process.env.NODE_ENV === 'development' || process.env.CI) && {
      'gi.contracts/group/forceDistributionDate': {
        validate: optional,
        process ({ meta }, { state }) {
          state.settings.distributionDate = dateToPeriodStamp(meta.createdDate)
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
    'gi.contracts/group/_cleanup': ({ contractID, state }) => {
      // unsubscribe from other group members identity contract
      const { identityContractID } = sbp('state/vuex/state').loggedIn
      const dependentContractIDs = [
        ...Object.entries(state?.profiles || {}).filter(([, state]: [string, Object]) => state.status === PROFILE_STATUS.ACTIVE).map(([cID]) => cID),
        ...Object.entries(state?.chatRooms || {}).filter(([, state]: [string, Object]) => state.members[identityContractID]?.status === PROFILE_STATUS.ACTIVE).map(([cID]) => cID)
      ]
      if (dependentContractIDs.length) {
        sbp('chelonia/contract/release', dependentContractIDs).catch(e => {
          console.error('[gi.contracts/group/_cleanup] Error calling release', contractID, e)
        })
      }

      // NOTE: should remove archived data from IndexedStorage regarding the current group (proposals, payments)
      Promise.all([
        () => sbp('gi.contracts/group/removeArchivedProposals', contractID),
        () => sbp('gi.contracts/group/removeArchivedPayments', contractID)]
      ).catch(e => {
        console.error(`[gi.contracts/group/_cleanup] Error removing entries for archive for ${contractID}`, e)
      })
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
      const { identityContractID } = sbp('state/vuex/state').loggedIn

      // NOTE: we save payments by period and also in types of 'Sent' and 'Received' as well
      // because it's not efficient to find all sent/received payments from the payments list
      const archPaymentsByPeriodKey = `paymentsByPeriod/${identityContractID}/${contractID}`
      const archPaymentsByPeriod = await sbp('gi.db/archive/load', archPaymentsByPeriodKey) || {}
      const archSentOrReceivedPaymentsKey = `sentOrReceivedPayments/${identityContractID}/${contractID}`
      const archSentOrReceivedPayments = await sbp('gi.db/archive/load', archSentOrReceivedPaymentsKey) || { sent: [], received: [] }

      // sort payments in order to keep the same sorting format as the recent data in vuex
      const sortPayments = payments => payments.sort((f, l) => l.height - f.height)

      // prepare to archive by the period
      for (const period of Object.keys(paymentsByPeriod).sort()) {
        archPaymentsByPeriod[period] = paymentsByPeriod[period]

        // filter sent/received payments from the current period
        const newSentOrReceivedPayments = { sent: [], received: [] }
        const { paymentsFrom } = paymentsByPeriod[period]
        for (const fromMemberID of Object.keys(paymentsFrom)) {
          for (const toMemberID of Object.keys(paymentsFrom[fromMemberID])) {
            if (toMemberID === identityContractID || fromMemberID === identityContractID) {
              const receivedOrSent = toMemberID === identityContractID ? 'received' : 'sent'
              for (const hash of paymentsFrom[fromMemberID][toMemberID]) {
                const { data, meta, height } = payments[hash]
                newSentOrReceivedPayments[receivedOrSent].push({ hash, period, height, data, meta, amount: data.amount })
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
    'gi.contracts/group/makeNotificationWhenProposalClosed': function (state, contractID, meta, height, proposalHash, proposal) {
      const { loggedIn } = sbp('state/vuex/state')
      if (isActionNewerThanUserJoinedDate(height, state.profiles[loggedIn.identityContractID])) {
        sbp('gi.notifications/emit', 'PROPOSAL_CLOSED', { createdDate: meta.createdDate, groupID: contractID, proposalHash, proposal })
      }
    },
    'gi.contracts/group/sendMincomeChangedNotification': async function (contractID, meta, data, height, innerSigningContractID) {
      // NOTE: When group's mincome has changed, below actions should be taken.
      // - When mincome has increased, send 'MINCOME_CHANGED' notification to both receiving/pledging members.
      // - When mincome has decreased, and the changed mincome is below the monthly income of a receiving member, then
      //   1) automatically switch that user to a 'pledging' member with 0 contribution,
      //   2) pop out the prompt message notifying them of this automatic change,
      //   3) and send 'MINCOME_CHANGED' notification.
      const { identityContractID } = sbp('state/vuex/state').loggedIn
      const myProfile = (await sbp('chelonia/contract/state', contractID)).profiles[identityContractID]
      const { fromAmount, toAmount } = data

      if (isActionNewerThanUserJoinedDate(height, myProfile) && myProfile.incomeDetailsType) {
        const memberType = myProfile.incomeDetailsType === 'pledgeAmount' ? 'pledging' : 'receiving'
        const mincomeIncreased = toAmount > fromAmount
        const actionNeeded = mincomeIncreased ||
          (memberType === 'receiving' &&
          !mincomeIncreased &&
          myProfile.incomeAmount < fromAmount &&
          myProfile.incomeAmount > toAmount)

        if (!actionNeeded) { return }

        if (memberType === 'receiving' && !mincomeIncreased) {
          await sbp('gi.actions/group/groupProfileUpdate', {
            contractID,
            data: {
              incomeDetailsType: 'pledgeAmount',
              pledgeAmount: 0
            }
          })
        }

        sbp('gi.notifications/emit', 'MINCOME_CHANGED', {
          createdDate: meta.createdDate,
          groupID: contractID,
          creatorID: innerSigningContractID,
          to: toAmount,
          memberType,
          increased: mincomeIncreased
        })
      }
    },
    'gi.contracts/group/joinGroupChatrooms': async function (contractID, chatRoomID, originalActorID, memberID, height) {
      const state = await sbp('chelonia/contract/state', contractID)
      const actorID = sbp('state/vuex/state').loggedIn.identityContractID

      // Session has changed
      if (actorID !== originalActorID) {
        console.info('[gi.contracts/group/joinGroupChatrooms] Session changed', {
          actorID, contractID, chatRoomID, originalActorID, memberID, height
        })
        return
      }

      if (state?.profiles?.[actorID]?.status !== PROFILE_STATUS.ACTIVE ||
        state?.profiles?.[memberID]?.status !== PROFILE_STATUS.ACTIVE ||
        state?.chatRooms?.[chatRoomID]?.members[memberID]?.status !== PROFILE_STATUS.ACTIVE ||
        state?.chatRooms?.[chatRoomID]?.members[memberID]?.joinedHeight !== height
      ) {
        console.info('[gi.contracts/group/joinGroupChatrooms] Skipping outdated action', {
          actorID,
          contractID,
          chatRoomID,
          originalActorID,
          memberID,
          height,
          groupStatusActor: state?.profiles?.[actorID]?.status,
          groupSatusMember: state?.profiles?.[memberID]?.status,
          chatRoomStatus: state?.chatRooms?.[chatRoomID]?.members[memberID]?.status,
          chatRoomHeight: state?.chatRooms?.[chatRoomID]?.members[memberID]?.joinedHeight
        })
        return
      }

      {
        // We need to be subscribed to the chatroom before writing to it, and
        // also because of the following check (hasKeysToPerformOperation),
        // which requires state.
        // If we're joining the chatroom ourselves (actorID === memberID),
        // ensure we _remain_ subscribed to the chatroom by not using an
        // ephemeral call to retain.
        // If we're _not_ joining the chatroom ourselves (but instead we've
        // added someone else), we use 'ephemeral: true' because we don't want
        // to remain subscribed to the chatroom if we're not a member(*).
        // This used to be done in four steps: unconditional ephemeral retain
        // here, ended with an ephemeral release in the finally block, and two
        // conditional persistent retains on postpublish (for the current
        // device) and the error handler (for other devices). This was too
        // complex.
        // (*) Yes, usually we'd be a member of the chatroom in this case, but
        // we could have left afterwards.
        await sbp('chelonia/contract/retain', chatRoomID, { ephemeral: true })

        if (!await sbp('chelonia/contract/hasKeysToPerformOperation', chatRoomID, 'gi.contracts/chatroom/join')) {
          throw new Error(`Missing keys to join chatroom ${chatRoomID}`)
        }

        // Using the group's CEK allows for everyone to have an overview of the
        // membership (which is also part of the group contract). This way,
        // non-members can remove members when they leave the group
        const encryptionKeyId = sbp('chelonia/contract/currentKeyIdByName', state, 'cek', true)

        sbp('gi.actions/chatroom/join', {
          contractID: chatRoomID,
          data: actorID === memberID ? {} : { memberID },
          encryptionKeyId
        }).catch(e => {
          if (e.name === 'GIErrorUIRuntimeError' && e.cause?.name === 'GIChatroomAlreadyMemberError') {
            return
          }

          console.warn(`[gi.contracts/group/joinGroupChatrooms] Unable to join ${memberID} to chatroom ${chatRoomID} for group ${contractID}`, e)
        }).finally(() => {
          sbp('chelonia/contract/release', chatRoomID, { ephemeral: true }).catch(e => console.error('[gi.contracts/group/joinGroupChatrooms] Error during release', e))
        })
      }
    },
    // eslint-disable-next-line require-await
    'gi.contracts/group/leaveGroup': async ({ data, meta, contractID, height, getters, innerSigningContractID, proposalHash }) => {
      const { identityContractID } = sbp('state/vuex/state').loggedIn
      const memberID = data.memberID || innerSigningContractID
      const state = await sbp('chelonia/contract/state', contractID)

      if (!state) {
        console.info(`[gi.contracts/group/leaveGroup] for ${contractID}: contract has been removed`)
        return
      }

      if (state.profiles?.[memberID]?.status !== PROFILE_STATUS.REMOVED) {
        console.info(`[gi.contracts/group/leaveGroup] for ${contractID}: member has not left`, { contractID, memberID, status: state.profiles?.[memberID]?.status })
        return
      }

      if (memberID === identityContractID) {
        // NOTE: removing all notifications whose scope is in this group
        // is handled by the LEFT_GROUP event, which is emitted by the
        // identity contract.

        // The following detects whether we're in the process of joining, and if
        // we are, it doesn't remove the contract and calls /join to complete
        // the joining process.
        // This is meant to handle sessions that have an old state and are
        // syncing the group contract. If the last action concerning ourselves
        // was leaving the group but it looks like we're joining again because
        // we requested new keys (that may or may not have been answered),
        // then we call `/join`, which will set up the appropriate listeners
        // or will send `inviteAccept`, depending on whether we received
        // the new keys or not.

        // First, we check if there are no pending key requests for us
        const areWeRejoining = async () => {
          const pendingKeyShares = await sbp('chelonia/contract/waitingForKeyShareTo', state, identityContractID)
          if (pendingKeyShares) {
            console.info('[gi.contracts/group/leaveGroup] Not removing group contract because it has a pending key share for ourselves', contractID)
            return true
          }
          // Now, let's see if we had a key request that's been answered
          const sentKeyShares = await sbp('chelonia/contract/successfulKeySharesByContractID', state, identityContractID)
          // We received a key share after the last time we left
          if (sentKeyShares?.[identityContractID]?.[0].height > state.profiles[memberID].departedHeight) {
            console.info('[gi.contracts/group/leaveGroup] Not removing group contract because it has shared keys with ourselves after we left', contractID)
            return true
          }
          return false
        }

        if (await areWeRejoining()) {
          console.info('[gi.contracts/group/leaveGroup] aborting as we\'re rejoining', contractID)
          // Previously we called `gi.actions/group/join` here, but it doesn't
          // seem necessary
          return
        }
      }

      leaveAllChatRoomsUponLeaving(contractID, state, memberID, innerSigningContractID).catch((e) => {
        console.warn('[gi.contracts/group/leaveGroup]: Error while leaving all chatrooms', e)
      })

      if (memberID === identityContractID) {
        sbp('gi.actions/identity/leaveGroup', {
          contractID: identityContractID,
          data: {
            groupContractID: contractID,
            reference: state.profiles[identityContractID].reference
          }
        }).catch(e => {
          console.warn(`[gi.contracts/group/leaveGroup] ${e.name} thrown by gi.contracts/identity/leaveGroup ${identityContractID} for ${contractID}:`, e)
        })
      } else {
        const myProfile = getters.groupProfile(identityContractID)

        if (isActionNewerThanUserJoinedDate(height, myProfile)) {
          if (!proposalHash) {
            // NOTE: Do not make notification when the member is removed by proposal
            const memberRemovedThemselves = memberID === innerSigningContractID
            sbp('gi.notifications/emit', memberRemovedThemselves ? 'MEMBER_LEFT' : 'MEMBER_REMOVED', {
              createdDate: meta.createdDate, groupID: contractID, memberID
            })
          }

          Promise.resolve()
            .then(() => sbp('gi.contracts/group/rotateKeys', contractID))
            .then(() => sbp('gi.contracts/group/revokeGroupKeyAndRotateOurPEK', contractID))
            .catch((e) => {
              console.warn(`[gi.contracts/group/leaveGroup] for ${contractID}: Error rotating group keys or our PEK`, e)
            })

          await sbp('gi.contracts/group/removeForeignKeys', contractID, memberID, state)
        }
      }

      // TODO - #850 verify open proposals and see if they need some re-adjustment.
    },
    'gi.contracts/group/rotateKeys': async (contractID) => {
      const state = await sbp('chelonia/contract/state', contractID)
      const pendingKeyRevocations = state?._volatile?.pendingKeyRevocations
      if (!pendingKeyRevocations || Object.keys(pendingKeyRevocations).length === 0) {
        // Don't rotate keys for removed contracts
        return
      }
      sbp('gi.actions/out/rotateKeys', contractID, 'gi.contracts/group', 'pending', 'gi.actions/group/shareNewKeys').catch(e => {
        console.warn(`rotateKeys: ${e.name} thrown:`, e)
      })
    },
    'gi.contracts/group/revokeGroupKeyAndRotateOurPEK': (groupContractID) => {
      const rootState = sbp('state/vuex/state')
      const { identityContractID } = rootState.loggedIn

      sbp('chelonia/queueInvocation', identityContractID, async () => {
        await sbp('chelonia/contract/setPendingKeyRevocation', identityContractID, ['pek'])
        await sbp('gi.actions/out/rotateKeys', identityContractID, 'gi.contracts/identity', 'pending', 'gi.actions/identity/shareNewPEK')
      }).catch(e => {
        console.warn(`revokeGroupKeyAndRotateOurPEK: ${e.name} thrown during queueEvent to ${identityContractID}:`, e)
      })
    },
    'gi.contracts/group/removeForeignKeys': async (contractID, userID, state) => {
      const keyIds = await sbp('chelonia/contract/foreignKeysByContractID', state, userID)

      if (!keyIds?.length) return

      const CSKid = await sbp('chelonia/contract/currentKeyIdByName', state, 'csk', true)

      sbp('chelonia/out/keyDel', {
        contractID,
        contractName: 'gi.contracts/group',
        data: keyIds,
        signingKeyId: CSKid
      }).catch(e => {
        console.warn(`removeForeignKeys: ${e.name} error thrown:`, e)
      })
    },
    'gi.contracts/group/sendNonMonetaryUpdateNotification': ({
      contractID, // group contractID
      innerSigningContractID, // identity contractID of the group-member being updated
      meta,
      height,
      updateData,
      getters
    }) => {
      const { loggedIn } = sbp('state/vuex/state')
      const isUpdatingMyself = loggedIn.identityContractID === innerSigningContractID

      if (!isUpdatingMyself) {
        const myProfile = getters.groupProfile(loggedIn.identityContractID)

        if (isActionNewerThanUserJoinedDate(height, myProfile)) {
          sbp('gi.notifications/emit', 'NONMONETARY_CONTRIBUTION_UPDATE', {
            createdDate: meta.createdDate,
            groupID: contractID,
            creatorID: innerSigningContractID,
            updateData
          })
        }
      }
    },
    ...referenceTally('gi.contracts/group/referenceTally')
  }
})
