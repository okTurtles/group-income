'use strict'

import sbp from '~/shared/sbp.js'
import Vue from 'vue'
import { DefineContract } from './Contract.js'
import { mapOf, objectOf, objectMaybeOf, optional, string, number, object, unionOf } from '~/frontend/utils/flowTyper.js'
// TODO: use protocol versioning to load these (and other) files
//       https://github.com/okTurtles/group-income-simple/issues/603
import votingRules, { ruleType, VOTE_FOR, VOTE_AGAINST } from './voting/rules.js'
import proposals, { proposalType, proposalSettingsType, archiveProposal } from './voting/proposals.js'
import {
  PROPOSAL_INVITE_MEMBER, PROPOSAL_REMOVE_MEMBER, PROPOSAL_GROUP_SETTING_CHANGE, PROPOSAL_PROPOSAL_SETTING_CHANGE, PROPOSAL_GENERIC,
  STATUS_OPEN, STATUS_CANCELLED
} from './voting/constants.js'
import { paymentStatusType, paymentType, PAYMENT_COMPLETED } from './payments/index.js'
import * as Errors from '../errors.js'
import { merge, deepEqualJSONType, omit } from '~/frontend/utils/giLodash.js'
import { currentMonthstamp, ISOStringToMonthstamp } from '~/frontend/utils/time.js'
import { vueFetchInitKV } from '~/frontend/views/utils/misc.js'
import incomeDistribution from '~/frontend/utils/distribution/mincome-proportional.js'
import currencies, { saferFloat } from '~/frontend/views/utils/currencies.js'
import L from '~/frontend/views/utils/translations.js'

export const INVITE_INITIAL_CREATOR = 'INVITE_INITIAL_CREATOR'
export const INVITE_STATUS = {
  VALID: 'valid',
  USED: 'used'
}
export const PROFILE_STATUS = {
  ACTIVE: 'active',
  REMOVED: 'removed'
}

export const inviteType = objectOf({
  inviteSecret: string,
  quantity: number,
  creator: string,
  invitee: optional(string),
  status: string,
  responses: mapOf(string, string),
  expires: number
})

export function createInvite (
  {
    quantity = 1,
    creator,
    invitee
  }: { quantity: number, creator: string, invitee: string }
) {
  return {
    inviteSecret: `${parseInt(Math.random() * 10000)}`, // TODO: this
    quantity,
    creator,
    invitee,
    status: INVITE_STATUS.VALID,
    responses: {}, // { bob: true } list of usernames that accepted the invite.
    expires: 123456789 // TODO: this
  }
}

function initGroupProfile (contractID: string, joined: ?string) {
  return {
    globalUsername: 'TODO: this! e.g. groupincome:greg / namecoin:bob / ens:alice',
    contractID: contractID,
    nonMonetaryContributions: [],
    joinedDate: joined,
    status: PROFILE_STATUS.ACTIVE,
    departedDate: null
  }
}

function initPaymentMonth ({ getters }) {
  return {
    // this saved so that it can be used when creating a payment
    firstMonthsCurrency: getters.groupMincomeCurrency,
    // all payments during the month use this to set their exchangeRateToGroupCurrency
    // see notes and code in groupIncomeAdjustedDistribution for details.
    // TODO: for the currency change proposal, have it push to mincomeExchangeRates
    mincomeExchangeRates: [1], // modified by proposals to change mincome currency
    paymentsFrom: {}, // fromUser => toUser => Array<paymentHash>
    completedLatePayments: {},
    // lastMincomeAmount: getters.groupMincomeAmount,
    // activeUsernames: Object.keys(getters.groupProfiles),
    // snapshot of adjusted distribution after each completed payment
    // yes, it is possible a payment began in one month and completed in another.
    // in both that case, and in the case of a normal late payment (that starts
    // and completes in the current month), it is added to "completedLatePayments".
    // lastAdjustedDistribution is not updated for late payments. Instead, it is updated
    // for each completed payment in the current month.
    lastAdjustedDistribution: null
  }
}

function clearOldPayments ({ state }) {
  const sortedMonthKeys = Object.keys(state.paymentsByMonth).sort()
  // save two months payments, max
  while (sortedMonthKeys.length > 2) {
    // TODO: archive the old payments and clear them from state.payments!
    Vue.delete(state.paymentsByMonth, sortedMonthKeys.shift())
  }
}

function ensureLatestMonthlyPaymentValues ({ meta, state, getters }) {
  const monthstamp = ISOStringToMonthstamp(meta.createdDate)
  const monthlyPayments = vueFetchInitKV(state.paymentsByMonth, monthstamp, initPaymentMonth({ getters }))
  const months = Object.keys(state.paymentsByMonth).sort()
  const mostRecentMonth = months[months.length - 1]
  if (monthstamp === mostRecentMonth) {
    // TODO: adjust this value only when the mincome changes
    monthlyPayments.lastMincomeAmount = getters.groupMincomeAmount
    // TODO: another possibility is to just freeze the distribution as it is
    //       in 'group/payment'. then for figuring out late payments, any completed
    //       payments that occur in a month for which the opening payment exists
    //       in the previous month, save it to a special dictionary in the monthly
    //       payments called "latePayments", and use that to adjust late TODO
    //       value displayed in the UI.
    monthlyPayments.activeUsernames = Object.keys(getters.groupProfiles)
    // TODO: do we need to store lastAdjustedDistribution or can we calculate that
    //       from the values in monthlyPayments?
    // TODO: delete this if it's not needed (as it seems not to be)
    // monthlyPayments.lastAdjustedDistribution = groupIncomeDistribution({
    //   state, getters, monthstamp, adjusted: true
    // })
  } else {
    console.warn(`ensureLatestMonthlyPaymentValues: ${monthstamp} != ${mostRecentMonth}`)
  }
  clearOldPayments({ state })
  return monthlyPayments
}

function groupIncomeDistribution ({ state, getters, monthstamp, adjusted }) {
  const paymentsInfo = getters.groupMonthlyPayments[monthstamp]
  const { paymentsFrom, mincomeExchangeRates, lastMincomeAmount, activeUsernames } = paymentsInfo
  // mincomeExchangeRateMultiplier comes from reducing mincomeExchangeRates,
  // a list of mincome currency conversions from any proposals that converted the mincome
  // to a different currency.
  // For this to work exchangeRateToGroupCurrency must be based on the very FIRST
  // mincome currency of the month and it must remain that way for all future
  // month's payments!
  // so in other words, we convert from whatever original payment currency to the
  // first mincome currency of the month, and then to any subsequent mincome currencies
  // that we switched to via proposals during the month. Any proposal that suggests
  // switching to a new mincome currency will include this conversion rate in
  // the proposal data, and it will be added to the mincomeExchangeRates list.
  const mincomeExchangeRate = mincomeExchangeRates.reduce((a, c) => a * c)
  const currentIncomeDistribution = []
  // TODO: figure out how to handle mincome currency changing via proposal
  for (const username of activeUsernames) {
    const profile = getters.groupProfile(username)
    const incomeDetailsType = profile && profile.incomeDetailsType
    if (incomeDetailsType) {
      var paymentsMade = 0
      // if this user has already made some payments to other users this
      // month, we need to take that into account and adjust the distribution.
      // this will be used by the Payments page to tell how much still
      // needs to be paid (if it was a partial payment).
      if (adjusted) {
        const paymentsFromUser = paymentsFrom[username]
        for (const toUser in paymentsFromUser) {
          for (const paymentHash of paymentsFromUser[toUser]) {
            const paymentData = state.payments[paymentHash].data
            if (paymentData.status === PAYMENT_COMPLETED) {
              const { amount, exchangeRateToGroupCurrency } = paymentData
              paymentsMade += amount * exchangeRateToGroupCurrency * mincomeExchangeRate
            }
          }
        }
      }
      var amount = profile[incomeDetailsType]
      if (incomeDetailsType === 'pledgeAmount') {
        // take into account any payments we've already made. since we're supporting
        // the ability to calculate distributions for previous months, for past
        // payments, and in the face of income detail changes, we make sure that
        // if we "overpaid" due to any weirdness, the algorithm simply removes
        // us from consideration in the distribution for this month
        amount = Math.max(lastMincomeAmount, lastMincomeAmount + amount - paymentsMade)
      }
      currentIncomeDistribution.push({
        name: username,
        amount: saferFloat(amount)
      })
    }
  }
  return incomeDistribution(currentIncomeDistribution, lastMincomeAmount)
}

DefineContract({
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
        createdDate: new Date().toISOString(),
        username,
        identityContractID
      }
    }
  },
  // This function defines how the contract locates the state of a specific contractID.
  // It is required. We can do cool things, like overriding 'state/vuex/state' in
  // 'test/backend.test.js' to simplify and speed up testing by bypassing Vuex.
  state (contractID) {
    return sbp('state/vuex/state')[contractID]
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
    // used with graphs like those in the dashboard and in the income details modal
    groupIncomeDistribution (state, getters) {
      const monthstamp = currentMonthstamp()
      return groupIncomeDistribution({ state, getters, monthstamp })
    },
    // groupIncomeDistribution (state, getters) {
    //   const groupProfiles = getters.groupProfiles
    //   const mincomeAmount = getters.groupMincomeAmount
    //   const currentIncomeDistribution = []
    //   for (const username in groupProfiles) {
    //     const profile = groupProfiles[username]
    //     const incomeDetailsType = profile && profile.incomeDetailsType
    //     if (incomeDetailsType) {
    //       const adjustment = incomeDetailsType === 'incomeAmount' ? 0 : mincomeAmount
    //       const adjustedAmount = adjustment + profile[incomeDetailsType]
    //       currentIncomeDistribution.push({
    //         name: username,
    //         amount: saferFloat(adjustedAmount)
    //       })
    //     }
    //   }
    //   return incomeDistribution(currentIncomeDistribution, mincomeAmount)
    // },
    // adjusted version of groupIncomeDistribution, used by the payments system
    groupIncomeAdjustedDistribution (state, getters) {
      const monthstamp = currentMonthstamp()
      return groupIncomeDistribution({ state, getters, monthstamp, adjusted: true })
    },
    groupIncomeAdjustedDistributionForMonth (state, getters) {
      return monthstamp => groupIncomeDistribution({ state, getters, monthstamp, adjusted: true })
    },
    groupMembersByUsername (state, getters) {
      return Object.keys(getters.currentGroupState.profiles || {})
    },
    groupMembersCount (state, getters) {
      return getters.groupMembersByUsername.length
    },
    groupMembersPending (state, getters) {
      const invites = getters.currentGroupState.invites
      const pendingMembers = {}
      for (const inviteId in invites) {
        const invite = invites[inviteId]
        if (invite.status === INVITE_STATUS.VALID && invite.creator !== INVITE_INITIAL_CREATOR) {
          pendingMembers[invites[inviteId].invitee] = {
            invitedBy: invites[inviteId].creator
          }
        }
      }
      return pendingMembers
    },
    groupShouldPropose (state, getters) {
      return getters.groupMembersCount >= 3
    },
    groupMincomeFormatted (state, getters) {
      const settings = getters.groupSettings
      const currency = currencies[settings.mincomeCurrency]
      return currency && currency.displayWithCurrency(settings.mincomeAmount)
    },
    groupMincomeSymbolWithCode (state, getters) {
      const currency = currencies[getters.groupSettings.mincomeCurrency]
      return currency && currency.symbolWithCode
    },
    groupMonthlyPayments (state, getters) {
      return getters.currentGroupState.paymentsByMonth
    },
    thisMonthsPaymentInfo (state, getters) {
      return getters.groupMonthlyPayments[currentMonthstamp()] || {}
    }
  },
  // NOTE: All mutations must be atomic in their edits of the contract state.
  //       THEY ARE NOT to farm out any further mutations through the async actions!
  actions: {
    // this is the constructor
    'gi.contracts/group': {
      validate: objectMaybeOf({
        invites: mapOf(string, inviteType),
        settings: objectOf({
          // TODO: add 'groupPubkey'
          groupName: string,
          groupPicture: string,
          sharedValues: string,
          mincomeAmount: number,
          mincomeCurrency: string,
          proposals: objectOf({
            [PROPOSAL_INVITE_MEMBER]: proposalSettingsType,
            [PROPOSAL_REMOVE_MEMBER]: proposalSettingsType,
            [PROPOSAL_GROUP_SETTING_CHANGE]: proposalSettingsType,
            [PROPOSAL_PROPOSAL_SETTING_CHANGE]: proposalSettingsType,
            [PROPOSAL_GENERIC]: proposalSettingsType
          })
        })
      }),
      process ({ data, meta }, { state, getters }) {
        // TODO: checkpointing: https://github.com/okTurtles/group-income-simple/issues/354
        const initialState = merge({
          payments: {},
          paymentsByMonth: {},
          invites: {},
          proposals: {}, // hashes => {} TODO: this, see related TODOs in GroupProposal
          settings: {
            groupCreator: meta.username
          },
          profiles: {
            [meta.username]: initGroupProfile(meta.identityContractID, meta.createdDate)
          }
        }, data)
        for (const key in initialState) {
          Vue.set(state, key, initialState[key])
        }
        ensureLatestMonthlyPaymentValues({ meta, state, getters })
      }
    },
    'gi.contracts/group/payment': {
      validate: objectMaybeOf({
        toUser: string,
        amount: number,
        currency: string, // must be one of the keys in currencies.js (e.g. USD, EUR, etc.)
        exchangeRateToGroupCurrency: number, // multiply 'amount' by this
        txid: string,
        status: paymentStatusType,
        paymentType: paymentType,
        details: optional(object),
        memo: optional(string)
      }),
      process ({ data, meta, hash }, { state, getters }) {
        if (data.status === PAYMENT_COMPLETED) {
          console.error(`payment: payment ${hash} cannot have status = 'completed'!`, { data, meta, hash })
          throw new Errors.GIErrorIgnoreAndBanIfGroup('payments cannot be instsantly completed!')
        }
        Vue.set(state.payments, hash, { data, meta, history: [data] })
        const { paymentsFrom } = ensureLatestMonthlyPaymentValues({ meta, state, getters })
        const fromUser = vueFetchInitKV(paymentsFrom, meta.username, {})
        const toUser = vueFetchInitKV(fromUser, data.toUser, [])
        toUser.push(hash)
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
      process ({ data, meta, hash }, { state, getters }) {
        // TODO: we don't want to keep a history of all payments in memory all the time
        //       https://github.com/okTurtles/group-income-simple/issues/426
        const payment = state.payments[data.paymentHash]
        // TODO: move these types of validation errors into the validate function so
        //       that they can be done before sending as well as upon receiving
        if (!payment) {
          console.error(`paymentUpdate: no payment ${data.paymentHash}`, { data, meta, hash })
          throw new Errors.GIErrorIgnoreAndBanIfGroup('paymentUpdate without existing payment')
        }
        if (meta.username !== payment.meta.username) {
          console.error(`paymentUpdate: bad username ${meta.username} != ${payment.meta.username}`, { data, meta, hash })
          throw new Errors.GIErrorIgnoreAndBanIfGroup('paymentUpdate from wrong user!')
        }
        payment.history.push(data.updatedProperties)
        merge(payment.data, data.updatedProperties)
        // TODO: delete this if it's not needed (as it seems not to be)
        // // create a snapshot of the distribution upon each completed payment
        // if (data.updatedProperties.status === PAYMENT_COMPLETED) {
        //   // we want to adjust the distribution for the month when this payment was *created*
        //   const monthstamp = ISOStringToMonthstamp(payment.meta.createdDate)
        //   const paymentMonth = state.paymentsByMonth[monthstamp]
        //   if (paymentMonth) {
        //     const adjustedDistribution = groupIncomeDistribution({
        //       state, getters, monthstamp, adjusted: true
        //     })
        //     paymentMonth.lastAdjustedDistribution = adjustedDistribution
        //   } else {
        //     // this month was cleared by clearOldPayments()
        //     console.warn(`paymentUpdate: ignoring completed payment for old month: ${monthstamp}`,
        //       { data, meta, hash }
        //     )
        //   }
        // }
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

        const dataToCompare = omit(data.proposalData, 'reason')

        // Validate this isn't a duplicate proposal
        for (const hash in state.proposals) {
          const prop = state.proposals[hash]
          if (prop.status !== STATUS_OPEN || prop.data.proposalType !== data.proposalType) {
            continue
          }

          if (deepEqualJSONType(omit(prop.data.proposalData, 'reason'), dataToCompare)) {
            throw new TypeError(L('There is an identical open proposal.'))
          }
        }
      },
      process ({ data, meta, hash }, { state }) {
        Vue.set(state.proposals, hash, {
          data,
          meta,
          votes: { [meta.username]: VOTE_FOR },
          status: STATUS_OPEN,
          payload: null // set later by group/proposalVote
        })
        // TODO: save all proposals disk so that we only keep open proposals in memory
        // TODO: create a global timer to auto-pass/archive expired votes
        //       make sure to set that proposal's status as STATUS_EXPIRED if it's expired
      }
    },
    'gi.contracts/group/proposalVote': {
      validate: objectOf({
        proposalHash: string,
        vote: string,
        passPayload: optional(unionOf(object, string)) // TODO: this, somehow we need to send an OP_KEY_ADD GIMessage to add a generated once-only writeonly message public key to the contract, and (encrypted) include the corresponding invite link, also, we need all clients to verify that this message/operation was valid to prevent a hacked client from adding arbitrary OP_KEY_ADD messages, and automatically ban anyone generating such messages
      }),
      process ({ data, hash, meta }, { state }) {
        const proposal = state.proposals[data.proposalHash]
        if (!proposal) {
          // https://github.com/okTurtles/group-income-simple/issues/602
          console.error(`proposalVote: no proposal for ${data.proposalHash}!`, { data, meta, hash })
          throw new Errors.GIErrorIgnoreAndBanIfGroup('proposalVote without existing proposal')
        }
        Vue.set(proposal.votes, meta.username, data.vote)
        // TODO: handle vote pass/fail
        // check if proposal is expired, if so, ignore (but log vote)
        if (Date.now() > proposal.data.expires_date_ms) {
          console.warn('proposalVote: vote on expired proposal!', { proposal, data, meta })
          // TODO: display warning or something
          return
        }
        // see if this is a deciding vote
        const result = votingRules[proposal.data.votingRule](state, proposal.data.proposalType, proposal.votes)
        if (result === VOTE_FOR || result === VOTE_AGAINST) {
          // handles proposal pass or fail, will update proposal.status accordingly
          proposals[proposal.data.proposalType][result](state, { meta, data })
        }
      }
    },
    'gi.contracts/group/proposalCancel': {
      validate: objectOf({
        proposalHash: string
      }),
      process ({ data, meta }, { state }) {
        const proposal = state.proposals[data.proposalHash]
        if (!proposal) {
          // https://github.com/okTurtles/group-income-simple/issues/602
          console.error(`proposalCancel: no proposal for ${data.proposalHash}!`, { data, meta })
          throw new Errors.GIErrorIgnoreAndBanIfGroup('proposalVote without existing proposal')
        } else if (proposal.meta.username !== meta.username) {
          console.error(`proposalCancel: proposal ${data.proposalHash} belongs to ${proposal.meta.username} not ${meta.username}!`, { data, meta })
          throw new Errors.GIErrorIgnoreAndBanIfGroup('proposalWithdraw for wrong user!')
        }
        Vue.set(proposal, 'status', STATUS_CANCELLED)
        archiveProposal(state, data.proposalHash)
      }
    },
    'gi.contracts/group/removeMember': {
      validate: (data, { state, getters, meta }) => {
        objectOf({
          member: string,
          memberId: string,
          groupId: string,
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
        if (membersCount === 1) {
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
      process ({ data, meta }, { state, getters }) {
        state.profiles[data.member].status = PROFILE_STATUS.REMOVED
        state.profiles[data.member].departedDate = meta.createdDate
        // TODO: this is code smell having to remember to put this everywhere
        //       
        //       figure out a way to not have to do this.
        ensureLatestMonthlyPaymentValues({ meta, state, getters })
      },
      async sideEffect ({ data }) {
        await sbp('gi.sideEffects/group/removeMember', {
          username: data.member,
          groupId: data.groupId
        })
      }
    },
    'gi.contracts/group/removeOurselves': {
      validate: objectOf({
        groupId: string
      }),
      process ({ data, meta }, { state, getters }) {
        state.profiles[meta.username].status = PROFILE_STATUS.REMOVED
        state.profiles[meta.username].departedDate = meta.createdDate
        ensureLatestMonthlyPaymentValues({ meta, state, getters })
      },
      async sideEffect ({ data, meta }) {
        await sbp('gi.sideEffects/group/removeMember', {
          username: meta.username,
          groupId: data.groupId
        })
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
      process ({ data, meta }, { state, getters }) {
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
        // make sure to update activeUsernames!
        ensureLatestMonthlyPaymentValues({ meta, state, getters })
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
        const vuexState = sbp('state/vuex/state')
        // TODO: per #257 this will have to be encompassed in a recoverable transaction
        // however per #610 that might be handled in handleEvent (?), or per #356 might not be needed
        if (meta.username === vuexState.loggedIn.username) {
          // we're the person who just accepted the group invite
          // so subscribe to founder's IdentityContract & everyone else's
          for (const name of Object.keys(state.profiles)) {
            if (name === vuexState.loggedIn.username) continue
            await sbp('state/enqueueContractSync', state.profiles[name].contractID)
          }
        } else {
          // we're an existing member of the group getting notified that a
          // new member has joined, so subscribe to their identity contract
          await sbp('state/enqueueContractSync', meta.identityContractID)
        }
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
      process ({ meta, data }, { state, getters }) {
        for (var key in data) {
          Vue.set(state.settings, key, data[key])
        }
        // if we updated the mincome amount/currency, update income distribution
        ensureLatestMonthlyPaymentValues({ meta, state, getters })
      }
    },
    'gi.contracts/group/groupProfileUpdate': {
      validate: objectMaybeOf({
        incomeDetailsType: x => ['incomeAmount', 'pledgeAmount'].includes(x),
        incomeAmount: x => typeof x === 'number' && x >= 0,
        pledgeAmount: x => typeof x === 'number' && x >= 0,
        nonMonetaryAdd: string,
        paymentMethods: objectMaybeOf({
          bitcoin: objectMaybeOf({ value: string }),
          paypal: objectMaybeOf({ value: string }),
          venmo: objectMaybeOf({ value: string }),
          other: objectMaybeOf({ value: string })
        }),
        nonMonetaryEdit: objectOf({
          replace: string,
          with: string
        }),
        nonMonetaryRemove: string
      }),
      process ({ data, meta }, { state }) {
        var groupProfile = state.profiles[meta.username]
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
      }
    },
    ...(process.env.NODE_ENV === 'development' ? {
      'gi.contracts/group/malformedMutation': {
        validate: objectOf({ errorType: string }),
        process ({ data }, { state }) {
          const ErrorType = Errors[data.errorType]
          if (ErrorType) {
            throw new ErrorType('malformedMutation!')
          } else {
            throw new Error(`unknown error type: ${data.errorType}`)
          }
        }
      }
    } : {})
    // TODO: remove group profile when leave group is implemented
  }
})
