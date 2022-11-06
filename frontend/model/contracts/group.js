'use strict'

import sbp from '@sbp/sbp'
import { Vue, Errors, L } from '@common/common.js'
import votingRules, { ruleType, VOTE_FOR, VOTE_AGAINST, RULE_PERCENTAGE, RULE_DISAGREEMENT } from './shared/voting/rules.js'
import proposals, { proposalType, proposalSettingsType, archiveProposal } from './shared/voting/proposals.js'
import {
  PROPOSAL_INVITE_MEMBER, PROPOSAL_REMOVE_MEMBER, PROPOSAL_GROUP_SETTING_CHANGE, PROPOSAL_PROPOSAL_SETTING_CHANGE, PROPOSAL_GENERIC,
  STATUS_OPEN, STATUS_CANCELLED, MAX_ARCHIVED_PROPOSALS, MAX_ARCHIVED_PERIODS, PROPOSAL_ARCHIVED, PAYMENTS_ARCHIVED, MAX_SAVED_PERIODS,
  INVITE_INITIAL_CREATOR, INVITE_STATUS, PROFILE_STATUS, INVITE_EXPIRES_IN_DAYS
} from './shared/constants.js'
import { paymentStatusType, paymentType, PAYMENT_COMPLETED } from './shared/payments/index.js'
import { createPaymentInfo, paymentHashesFromPaymentPeriod } from './shared/functions.js'
import { merge, deepEqualJSONType, omit, cloneDeep } from './shared/giLodash.js'
import { addTimeToDate, dateToPeriodStamp, compareISOTimestamps, dateFromPeriodStamp, isPeriodStamp, comparePeriodStamps, periodStampGivenDate, dateIsWithinPeriod, DAYS_MILLIS } from './shared/time.js'
import { unadjustedDistribution, adjustedDistribution } from './shared/distribution/distribution.js'
import currencies, { saferFloat } from './shared/currencies.js'
import { inviteType, chatRoomAttributesType } from './shared/types.js'
import { arrayOf, mapOf, objectOf, objectMaybeOf, optional, string, number, boolean, object, unionOf, tupleOf } from '~/frontend/model/contracts/misc/flowTyper.js'

function vueFetchInitKV (obj: Object, key: string, initialValue: any): any {
  let value = obj[key]
  if (!value) {
    Vue.set(obj, key, initialValue)
    value = obj[key]
  }
  return value
}

function initGroupProfile (contractID: string, joinedDate: string) {
  return {
    globalUsername: '', // TODO: this? e.g. groupincome:greg / namecoin:bob / ens:alice
    contractID,
    joinedDate,
    nonMonetaryContributions: [],
    status: PROFILE_STATUS.ACTIVE,
    departedDate: null
  }
}

function initPaymentPeriod ({ getters }) {
  return {
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
    archivingPayments.paymentsByPeriod[period] = state.paymentsByPeriod[period]
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
  const periodPayments = vueFetchInitKV(state.paymentsByPeriod, period, initPaymentPeriod({ getters }))
  clearOldPayments({ contractID, state, getters })
  return periodPayments
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
  const {
    groupIncomeAdjustedDistribution,
    thisPeriodPaymentInfo
  } = sbp('state/vuex/getters')
  const streaks = state.streaks

  // --- update 'fullMonthlyPledgesCount' streak ---
  // if the group has made 100% pledges in this period, +1 the streak value.
  // or else, reset the value to '0'
  Vue.set(
    streaks,
    'fullMonthlyPledges',
    groupIncomeAdjustedDistribution.length === 0 ? streaks.fullMonthlyPledges + 1 : 0
  )

  // --- update 'onTimePayments' streaks for 'pledging' members of the group ---
  for (const username in getters.groupProfiles) {
    if (getters.groupProfiles[username].incomeDetailsType !== 'pledgeAmount') continue

    const myCurrentStreak = vueFetchInitKV(streaks.onTimePayments, username, 0)
    const myPaymentsDoneInThisPeriod = thisPeriodPaymentInfo && thisPeriodPaymentInfo.paymentsFrom[username]
    const myPaymentHashes = []

    if (myPaymentsDoneInThisPeriod) {
      Object.values(myPaymentsDoneInThisPeriod).forEach(pHashes => myPaymentHashes.concat(pHashes))
    }
    Vue.set(
      streaks.onTimePayments,
      username,
      // check-1. the pledger has completed all payments assigned to them for current distribution period.
      // check-2. all those payments in check-1 were done on time.
      groupIncomeAdjustedDistribution.every(entry => entry.from !== username) &&
      myPaymentHashes.every(hash => state.payments[hash] && state.payments[hash].data.isLate === false)
        ? myCurrentStreak + 1
        : 0
    )
  }
}

sbp('chelonia/defineContract', {
  name: 'gi.contracts/group',
  metadata: {
    validate: objectOf({
      createdDate: string,
      username: string,
      identityContractID: string
    }),
    create () {
      const { username, identityContractID } = sbp('state/vuex/state').loggedIn
      return {
        // TODO: We may want to get the time from the server instead of relying on
        // the client in case the client's clock isn't set correctly.
        // the only issue here is that it involves an async function...
        // See: https://github.com/okTurtles/group-income/issues/531
        createdDate: new Date().toISOString(),
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
    groupMincomeAmount (state, getters) {
      return getters.groupSettings.mincomeAmount
    },
    groupMincomeCurrency (state, getters) {
      return getters.groupSettings.mincomeCurrency
    },
    periodStampGivenDate (state, getters) {
      return (recentDate: string | Date) => {
        if (typeof recentDate !== 'string') {
          recentDate = recentDate.toISOString()
        }
        const { distributionDate, distributionPeriodLength } = getters.groupSettings
        return periodStampGivenDate({
          recentDate,
          periodStart: distributionDate,
          periodLength: distributionPeriodLength
        })
      }
    },
    periodBeforePeriod (state, getters) {
      return (periodStamp: string) => {
        const len = getters.groupSettings.distributionPeriodLength
        return dateToPeriodStamp(addTimeToDate(dateFromPeriodStamp(periodStamp), -len))
      }
    },
    periodAfterPeriod (state, getters) {
      return (periodStamp: string) => {
        const len = getters.groupSettings.distributionPeriodLength
        return dateToPeriodStamp(addTimeToDate(dateFromPeriodStamp(periodStamp), len))
      }
    },
    dueDateForPeriod (state, getters) {
      return (periodStamp: string) => {
        return dateToPeriodStamp(
          addTimeToDate(
            dateFromPeriodStamp(getters.periodAfterPeriod(periodStamp)),
            -DAYS_MILLIS
          )
        )
      }
    },
    paymentTotalFromUserToUser (state, getters) {
      return (fromUser, toUser, periodStamp) => {
        const payments = getters.currentGroupState.payments
        const periodPayments = getters.groupPeriodPayments
        const { paymentsFrom, mincomeExchangeRate } = periodPayments[periodStamp] || {}
        // NOTE: @babel/plugin-proposal-optional-chaining would come in super-handy
        //       here, but I couldn't get it to work with our linter. :(
        //       https://github.com/babel/babel-eslint/issues/511
        const total = (((paymentsFrom || {})[fromUser] || {})[toUser] || []).reduce((a, hash) => {
          const payment = payments[hash]
          let { amount, exchangeRate, status } = payment.data
          if (status !== PAYMENT_COMPLETED) {
            return a
          }
          const paymentCreatedPeriodStamp = getters.periodStampGivenDate(payment.meta.createdDate)
          // if this payment is from a previous period, then make sure to take into account
          // any proposals that passed in between the payment creation and the payment
          // completion that modified the group currency by multiplying both period's
          // exchange rates
          if (periodStamp !== paymentCreatedPeriodStamp) {
            if (paymentCreatedPeriodStamp !== getters.periodBeforePeriod(periodStamp)) {
              console.warn(`paymentTotalFromUserToUser: super old payment shouldn't exist, ignoring! (curPeriod=${periodStamp})`, JSON.stringify(payment))
              return a
            }
            exchangeRate *= periodPayments[paymentCreatedPeriodStamp].mincomeExchangeRate
          }
          return a + (amount * exchangeRate * mincomeExchangeRate)
        }, 0)
        return saferFloat(total)
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
      const pendingMembers = {}
      for (const inviteId in invites) {
        const invite = invites[inviteId]
        if (
          invite.status === INVITE_STATUS.VALID &&
          invite.creator !== INVITE_INITIAL_CREATOR
        ) {
          pendingMembers[invites[inviteId].invitee] = {
            invitedBy: invites[inviteId].creator,
            expires: invite.expires
          }
        }
      }
      return pendingMembers
    },
    groupShouldPropose (state, getters) {
      return getters.groupMembersCount >= 3
    },
    groupProposalSettings (state, getters) {
      return (proposalType = PROPOSAL_GENERIC) => {
        return getters.groupSettings.proposals[proposalType]
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
    withGroupCurrency (state, getters) {
      // TODO: If this group has no defined mincome currency, not even a default one like
      //       USD, then calling this function is probably an error which should be reported.
      //       Just make sure the UI doesn't break if an exception is thrown, since this is
      //       bound to the UI in some location.
      return getters.groupCurrency?.displayWithCurrency
    },
    getChatRooms (state, getters) {
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
        invites: mapOf(string, inviteType),
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
            inviteExpiryProposal: INVITE_EXPIRES_IN_DAYS.PROPOSAL
          },
          streaks: {
            fullMonthlyPledges: 0,
            onTimePayments: {} // { username: number ... }
          },
          profiles: {
            [meta.username]: initGroupProfile(meta.identityContractID, meta.createdDate)
          },
          chatRooms: {}
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
        }
      },
      sideEffect ({ meta, contractID, data }, { state, getters }) {
        if (data.updatedProperties.status === PAYMENT_COMPLETED) {
          const { loggedIn } = sbp('state/vuex/state')
          const payment = state.payments[data.paymentHash]

          if (loggedIn.username === payment.data.toUser) {
            sbp('gi.notifications/emit', 'PAYMENT_RECEIVED', {
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
          [PROPOSAL_GROUP_SETTING_CHANGE]: 'CHANGE_MINCOME',
          [PROPOSAL_PROPOSAL_SETTING_CHANGE]: 'CHANGE_VOTING_RULE',
          [PROPOSAL_GENERIC]: 'GENERIC'
        }

        const myProfile = getters.groupProfile(loggedIn.username)

        if (isActionYoungerThanUser(meta, myProfile)) {
          sbp('gi.notifications/emit', 'NEW_PROPOSAL', {
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
      process (message, { state }) {
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
        }
      },
      sideEffect ({ contractID, data, meta }, { state, getters }) {
        const proposal = state.proposals[data.proposalHash]
        const { loggedIn } = sbp('state/vuex/state')
        const myProfile = getters.groupProfile(loggedIn.username)

        if (proposal?.dateClosed &&
          isActionYoungerThanUser(meta, myProfile)) {
          sbp('gi.notifications/emit', 'PROPOSAL_CLOSED', {
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
        archiveProposal({ state, proposalHash: data.proposalHash, proposal, contractID })
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
          proposalPayload: optional(objectOf({
            secret: string // NOTE: simulate the OP_KEY_* stuff for now
          }))
        })(data)

        const memberToRemove = data.member
        const membersCount = getters.groupMembersCount

        if (!state.profiles[memberToRemove]) {
          throw new TypeError(L('Not part of the group.'))
        }
        if (membersCount === 1 || memberToRemove === meta.username) {
          throw new TypeError(L('Cannot remove yourself.'))
        }

        if (membersCount < 3) {
          // In a small group only the creator can remove someone
          // TODO: check whether meta.username has required admin permissions
          if (meta.username !== state.settings.groupCreator) {
            throw new TypeError(L('Only the group creator can remove members.'))
          }
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
        const rootState = sbp('state/vuex/state')
        const contracts = rootState.contracts || {}
        const { username } = rootState.loggedIn

        if (data.member === username) {
          // If this member is re-joining the group, ignore the rest
          // so the member doesn't remove themself again.
          if (sbp('okTurtles.data/get', 'JOINING_GROUP')) {
            return
          }

          const groupIdToSwitch = Object.keys(contracts)
            .find(cID => contracts[cID].type === 'gi.contracts/group' &&
              cID !== contractID && rootState[cID].settings) || null
          sbp('state/vuex/commit', 'setCurrentChatRoomId', {})
          sbp('state/vuex/commit', 'setCurrentGroupId', groupIdToSwitch)
          // we can't await on this in here, because it will cause a deadlock, since Chelonia processes
          // this sideEffect on the eventqueue for this contractID, and /remove uses that same eventqueue
          sbp('chelonia/contract/remove', contractID).catch(e => {
            console.error(`sideEffect(removeMember): ${e.name} thrown by /remove ${contractID}:`, e)
          })
          // this looks crazy, but doing this was necessary to fix a race condition in the
          // group-member-removal Cypress tests where due to the ordering of asynchronous events
          // we were getting the same latestHash upon re-logging in for test "user2 rejoins groupA".
          // We add it to the same queue as '/remove' above gets run on so that it is run after
          // contractID is removed. See also comments in 'gi.actions/identity/login'.
          sbp('chelonia/queueInvocation', contractID, ['gi.actions/identity/saveOurLoginState'])
            .then(function () {
              const router = sbp('controller/router')
              const switchFrom = router.currentRoute.path
              const switchTo = groupIdToSwitch ? '/dashboard' : '/'
              if (switchFrom !== '/join' && switchFrom !== switchTo) {
                router.push({ path: switchTo }).catch(console.warn)
              }
            }).catch(e => {
              console.error(`sideEffect(removeMember): ${e.name} thrown during queueEvent to ${contractID} by saveOurLoginState:`, e)
            })
          // TODO - #828 remove other group members contracts if applicable
        } else {
          const myProfile = getters.groupProfile(username)

          if (isActionYoungerThanUser(meta, myProfile)) {
            const memberRemovedThemselves = data.member === meta.username

            sbp('gi.notifications/emit', // emit a notification for a member removal.
              memberRemovedThemselves ? 'MEMBER_LEFT' : 'MEMBER_REMOVED',
              {
                groupID: contractID,
                username: memberRemovedThemselves ? meta.username : data.member
              })
          }
          // TODO - #828 remove the member contract if applicable.
          // problem is, if they're in another group we're also a part of, or if we
          // have a DM with them, we don't want to do this. may need to use manual reference counting
          // sbp('chelonia/contract/release', getters.groupProfile(data.member).contractID)
        }
        // TODO - #850 verify open proposals and see if they need some re-adjustment.
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
        Vue.set(state.invites, data.inviteSecret, data)
      }
    },
    'gi.contracts/group/inviteAccept': {
      validate: objectOf({
        inviteSecret: string // NOTE: simulate the OP_KEY_* stuff for now
      }),
      process ({ data, meta }, { state }) {
        console.debug('inviteAccept:', data, state.invites)
        const invite = state.invites[data.inviteSecret]
        if (invite.status !== INVITE_STATUS.VALID) {
          console.error(`inviteAccept: invite for ${meta.username} is: ${invite.status}`)
          return
        }
        Vue.set(invite.responses, meta.username, true)
        if (Object.keys(invite.responses).length === invite.quantity) {
          invite.status = INVITE_STATUS.USED
        }
        // TODO: ensure `meta.username` is unique for the lifetime of the username
        //       since we are making it possible for the same username to leave and
        //       rejoin the group. All of their past posts will be re-associated with
        //       them upon re-joining.
        Vue.set(state.profiles, meta.username, initGroupProfile(meta.identityContractID, meta.createdDate))
        // If we're triggered by handleEvent in state.js (and not latestContractState)
        // then the asynchronous sideEffect function will get called next
        // and we will subscribe to this new user's identity contract
      },
      // !! IMPORANT!!
      // Actions here MUST NOT modify contract state!
      // They MUST NOT call 'commit'!
      // They should only coordinate the actions of outside contracts.
      // Otherwise `latestContractState` and `handleEvent` will not produce same state!
      async sideEffect ({ meta, contractID }, { state }) {
        const { loggedIn } = sbp('state/vuex/state')
        const { profiles = {} } = state

        // TODO: per #257 this will ,have to be encompassed in a recoverable transaction
        // however per #610 that might be handled in handleEvent (?), or per #356 might not be needed
        if (meta.username === loggedIn.username) {
          // we're the person who just accepted the group invite
          // so subscribe to founder's IdentityContract & everyone else's
          for (const name in profiles) {
            if (name !== loggedIn.username) {
              await sbp('chelonia/contract/sync', profiles[name].contractID)
            }
          }
        } else {
          const myProfile = profiles[loggedIn.username]
          // we're an existing member of the group getting notified that a
          // new member has joined, so subscribe to their identity contract
          await sbp('chelonia/contract/sync', meta.identityContractID)

          if (isActionYoungerThanUser(meta, myProfile)) {
            sbp('gi.notifications/emit', 'MEMBER_ADDED', { // emit a notification for a member addition.
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
          inviteSecret: string // NOTE: simulate the OP_KEY_* stuff for now
        })(data)

        if (!state.invites[data.inviteSecret]) {
          throw new TypeError(L('The link does not exist.'))
        }
      },
      process ({ data, meta }, { state }) {
        const invite = state.invites[data.inviteSecret]
        Vue.set(invite, 'status', INVITE_STATUS.REVOKED)
      }
    },
    'gi.contracts/group/updateSettings': {
      // OPTIMIZE: Make this custom validation function
      // reusable accross other future validators
      validate: objectMaybeOf({
        groupName: x => typeof x === 'string',
        groupPicture: x => typeof x === 'string',
        sharedValues: x => typeof x === 'string',
        mincomeAmount: x => typeof x === 'number' && x > 0,
        mincomeCurrency: x => typeof x === 'string'
      }),
      process ({ meta, data }, { state }) {
        for (const key in data) {
          Vue.set(state.settings, key, data[key])
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
        const { name, type, privacyLevel } = data.attributes
        Vue.set(state.chatRooms, data.chatRoomID, {
          creator: meta.username,
          name,
          type,
          privacyLevel,
          deletedDate: null,
          users: []
        })
        if (!state.generalChatRoomId) {
          Vue.set(state, 'generalChatRoomId', data.chatRoomID)
        }
      }
    },
    'gi.contracts/group/deleteChatRoom': {
      validate: (data, { getters, meta }) => {
        objectOf({ chatRoomID: string })(data)

        if (getters.getChatRooms[data.chatRoomID].creator !== meta.username) {
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
        member: string,
        leavingGroup: boolean // if kicker is exists, it means group leaving
      }),
      process ({ data, meta }, { state }) {
        Vue.set(state.chatRooms[data.chatRoomID], 'users',
          state.chatRooms[data.chatRoomID].users.filter(u => u !== data.member))
      },
      async sideEffect ({ meta, data }, { state }) {
        const rootState = sbp('state/vuex/state')
        if (meta.username === rootState.loggedIn.username && !sbp('okTurtles.data/get', 'JOINING_GROUP')) {
          const sendingData = data.leavingGroup
            ? { member: data.member }
            : { member: data.member, username: meta.username }
          await sbp('gi.actions/chatroom/leave', { contractID: data.chatRoomID, data: sendingData })
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
        state.chatRooms[data.chatRoomID].users.push(username)
      },
      async sideEffect ({ meta, data }, { state }) {
        const rootState = sbp('state/vuex/state')
        const username = data.username || meta.username
        if (username === rootState.loggedIn.username) {
          if (!sbp('okTurtles.data/get', 'JOINING_GROUP') || sbp('okTurtles.data/get', 'READY_TO_JOIN_CHATROOM')) {
            // while users are joining chatroom, they don't need to leave chatrooms
            // this is similar to setting 'JOINING_GROUP' before joining group
            sbp('okTurtles.data/set', 'JOINING_CHATROOM_ID', data.chatRoomID)
            await sbp('chelonia/contract/sync', data.chatRoomID)
            sbp('okTurtles.data/set', 'JOINING_CHATROOM_ID', undefined)
            sbp('okTurtles.data/set', 'READY_TO_JOIN_CHATROOM', false)
          }
        }
      }
    },
    'gi.contracts/group/renameChatRoom': {
      validate: objectOf({
        chatRoomID: string,
        name: string
      }),
      process ({ data, meta }, { state, getters }) {
        Vue.set(state.chatRooms, data.chatRoomID, {
          ...getters.getChatRooms[data.chatRoomID],
          name: data.name
        })
      }
    },
    ...((process.env.NODE_ENV === 'development' || process.env.CI) && {
      'gi.contracts/group/forceDistributionDate': {
        validate: optional,
        process ({ meta }, { state, getters }) {
          updateGroupStreaks({ state, getters })
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
    'gi.contracts/group/archiveProposal': async function (contractID, proposalHash, proposal) {
      const { username } = sbp('state/vuex/state').loggedIn
      const key = `proposals/${username}/${contractID}`
      const proposals = await sbp('gi.db/archive/load', key) || []
      // newest at the front of the array, oldest at the back
      proposals.unshift([proposalHash, proposal])
      while (proposals.length > MAX_ARCHIVED_PROPOSALS) {
        proposals.pop()
      }
      await sbp('gi.db/archive/save', key, proposals)
      sbp('okTurtles.events/emit', PROPOSAL_ARCHIVED, [proposalHash, proposal])
    },
    'gi.contracts/group/archivePayments': async function (contractID, archivingPayments) {
      const { paymentsByPeriod, payments } = archivingPayments
      const { username } = sbp('state/vuex/state').loggedIn

      for (const period of Object.keys(paymentsByPeriod).sort()) {
        const archPaymentsByPeriodKey = `paymentsByPeriod/${username}/${contractID}`
        const archPaymentsByPeriod = await sbp('gi.db/archive/load', archPaymentsByPeriodKey) || {}
        const archPaymentsKey = `payments/${username}/${contractID}`
        let archPayments = await sbp('gi.db/archive/load', archPaymentsKey) || {}

        archPaymentsByPeriod[period] = paymentsByPeriod[period]
        archPayments = merge(archPayments, payments)

        while (Object.keys(archPaymentsByPeriod).length > MAX_ARCHIVED_PERIODS) {
          const shouldBeDeletedPeriod = Object.keys(archPaymentsByPeriod).sort().shift()
          const paymentHashes = paymentHashesFromPaymentPeriod(archPaymentsByPeriod[shouldBeDeletedPeriod])

          for (const hash of paymentHashes) {
            delete archPayments[hash]
          }
          delete archPaymentsByPeriod[shouldBeDeletedPeriod]
        }

        await sbp('gi.db/archive/save', archPaymentsByPeriodKey, archPaymentsByPeriod)
        await sbp('gi.db/archive/save', archPaymentsKey, archPayments)
      }
      sbp('okTurtles.events/emit', PAYMENTS_ARCHIVED, { paymentsByPeriod, payments })
    }
  }
})
