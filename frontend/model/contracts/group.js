'use strict'

import sbp from '~/shared/sbp.js'
import Vue from 'vue'
import { DefineContract } from './Contract.js'
import { arrayOf, mapOf, objectOf, objectMaybeOf, optional, string, number, object, unionOf, tupleOf } from '~/frontend/utils/flowTyper.js'
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
import { currentMonthstamp, ISOStringToMonthstamp, compareMonthstamps } from '~/frontend/utils/time.js'
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

function initPaymentMonth ({ getters }) {
  return {
    // this saved so that it can be used when creating a new payment
    firstMonthsCurrency: getters.groupMincomeCurrency,
    // TODO: should we also save the first month's currency exchange rate..?
    // all payments during the month use this to set their exchangeRate
    // see notes and code in groupIncomeAdjustedDistribution for details.
    // TODO: for the currency change proposal, have it update the mincomeExchangeRate
    //       using .mincomeExchangeRate *= proposal.exchangeRate
    mincomeExchangeRate: 1, // modified by proposals to change mincome currency
    paymentsFrom: {}, // fromUser => toUser => Array<paymentHash>
    // snapshot of adjusted distribution after each completed payment
    // yes, it is possible a payment began in one month and completed in another,
    // in which case it is added to both month's 'paymentsFrom'
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

function initFetchMonthlyPayments ({ meta, state, getters }) {
  const monthstamp = ISOStringToMonthstamp(meta.createdDate)
  const monthlyPayments = vueFetchInitKV(state.paymentsByMonth, monthstamp, initPaymentMonth({ getters }))
  clearOldPayments({ state })
  return monthlyPayments
}

function groupIncomeDistribution ({ state, getters, monthstamp, adjusted }) {
  // the monthstamp will always be for the current month. the alternative
  // is to allow the re-generation of the distribution for previous months,
  // but that approach requires also storing the historical mincomeAmount
  // and historical groupProfiles. Since together these change across multiple
  // locations in the code, it involves less 'code smell' to do it this way.
  // see historical/group.js for the ugly way of doing it.
  const mincomeAmount = getters.groupMincomeAmount
  const groupProfiles = getters.groupProfiles
  const currentIncomeDistribution = []
  for (const username in groupProfiles) {
    const profile = groupProfiles[username]
    const incomeDetailsType = profile && profile.incomeDetailsType
    if (incomeDetailsType) {
      const adjustment = incomeDetailsType === 'incomeAmount' ? 0 : mincomeAmount
      const amount = adjustment + profile[incomeDetailsType]
      currentIncomeDistribution.push({
        name: username,
        amount: saferFloat(amount)
      })
    }
  }
  var dist = incomeDistribution(currentIncomeDistribution, mincomeAmount)
  if (adjusted) {
    // if this user has already made some payments to other users this
    // month, we need to take that into account and adjust the distribution.
    // this will be used by the Payments page to tell how much still
    // needs to be paid (if it was a partial payment).
    for (const p of dist) {
      const alreadyPaid = getters.paymentTotalFromUserToUser(p.from, p.to, monthstamp)
      // if we "overpaid" because we sent late payments, remove us from consideration
      p.amount = saferFloat(Math.max(0, p.amount - alreadyPaid))
    }
    dist = dist.filter(p => p.amount > 0)
  }
  return dist
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
    paymentTotalFromUserToUser (state, getters) {
      return (fromUser, toUser, paymentMonthstamp) => {
        const payments = getters.currentGroupState.payments
        const monthlyPayments = getters.groupMonthlyPayments
        const { paymentsFrom, mincomeExchangeRate } = monthlyPayments[paymentMonthstamp] || {}
        // NOTE: @babel/plugin-proposal-optional-chaining would come in super-handy
        //       here, but I couldn't get it to work with our linter. :(
        //       https://github.com/babel/babel-eslint/issues/511
        const total = (((paymentsFrom || {})[fromUser] || {})[toUser] || []).reduce((a, hash) => {
          const payment = payments[hash]
          var { amount, exchangeRate, status } = payment.data
          if (status !== PAYMENT_COMPLETED) {
            return a
          }
          const paymentCreatedMonthstamp = ISOStringToMonthstamp(payment.meta.createdDate)
          // if this payment is from a previous month, then make sure to take into account
          // any proposals that passed in between the payment creation and the payment
          // completion that modified the group currency by multiplying both month's
          // exchange rates
          if (paymentMonthstamp !== paymentCreatedMonthstamp) {
            exchangeRate *= monthlyPayments[paymentCreatedMonthstamp].mincomeExchangeRate
          }
          return a + (amount * exchangeRate * mincomeExchangeRate)
        }, 0)
        return saferFloat(total)
      }
    },
    // used with graphs like those in the dashboard and in the income details modal
    groupIncomeDistribution (state, getters) {
      return groupIncomeDistribution({ state, getters, monthstamp: currentMonthstamp() })
    },
    // adjusted version of groupIncomeDistribution, used by the payments system
    groupIncomeAdjustedDistribution (state, getters) {
      return getters.groupIncomeAdjustedDistributionForMonth(currentMonthstamp())
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
    groupMembersSorted (state, getters) {
      const weJoinedMs = new Date(getters.currentGroupState.profiles[getters.ourUsername].joinedDate).getTime()
      const isNewMember = (username) => {
        if (username === getters.ourUsername) { return false }
        const memberProfile = getters.currentGroupState.profiles[username]
        if (!memberProfile) return false
        const memberJoinedMs = new Date(memberProfile.joinedDate).getTime()
        const joinedAfterUs = weJoinedMs < memberJoinedMs
        return joinedAfterUs && Date.now() - memberJoinedMs < 604800000 // joined less than 1w (168h) ago.
      }

      return Object.keys({ ...getters.groupMembersPending, ...getters.groupProfiles })
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
    groupShouldPropose (state, getters) {
      return getters.groupMembersCount >= 3
    },
    groupVotingRule (state, getters) {
      // It's okay to use "PROPOSAL_GENERIC" as an example because all the settings are the same.
      return getters.groupSettings.proposals[PROPOSAL_GENERIC]
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
    },
    withGroupCurrency (state, getters) {
      return currencies[getters.groupSettings.mincomeCurrency].displayWithCurrency
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
        initFetchMonthlyPayments({ meta, state, getters })
      }
    },
    'gi.contracts/group/payment': {
      validate: objectMaybeOf({
        // TODO: how to handle donations to okTurtles?
        // TODO: how to handle payments to groups or users outside of this group?
        toUser: string,
        amount: number,
        currencyFromTo: tupleOf(string, string), // must be one of the keys in currencies.js (e.g. USD, EUR, etc.) TODO: handle old clients not having one of these keys, see OP_PROTOCOL_UPGRADE https://github.com/okTurtles/group-income-simple/issues/603
        // multiply 'amount' by 'exchangeRate', which must always be
        // based on the firstMonthsCurrency of the month in which this payment was created.
        // it is then further multiplied by the month's 'mincomeExchangeRate', which
        // is modified if any proposals pass to change the mincomeCurrency
        exchangeRate: number,
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
        Vue.set(state.payments, hash, {
          data,
          meta,
          history: [[meta.createdDate, hash]]
        })
        const { paymentsFrom } = initFetchMonthlyPayments({ meta, state, getters })
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
        // if the payment is being modified by someone other than the person who sent or received it, throw an exception
        if (meta.username !== payment.meta.username && meta.username !== payment.data.toUser) {
          console.error(`paymentUpdate: bad username ${meta.username} != ${payment.meta.username} != ${payment.data.username}`, { data, meta, hash })
          throw new Errors.GIErrorIgnoreAndBanIfGroup('paymentUpdate from bad user!')
        }
        payment.history.push([meta.createdDate, hash])
        merge(payment.data, data.updatedProperties)
        // we update "this month"'s snapshot 'lastAdjustedDistribution' on each completed payment
        if (data.updatedProperties.status === PAYMENT_COMPLETED) {
          payment.data.completedDate = meta.createdDate
          // in case we receive a paymentUpdate in a new month (where the original payment
          // was initiated in the previous month), we make sure that month
          // exists by retrieving it through initFetchMonthlyPayments
          const paymentMonth = initFetchMonthlyPayments({ meta, state, getters })
          const updateMonthstamp = ISOStringToMonthstamp(meta.createdDate)
          const paymentMonthstamp = ISOStringToMonthstamp(payment.meta.createdDate)
          // if this update is for a payment from the previous month, we need to
          // add it to this month's paymentFrom, and do so before we create an updated
          // lastAdjustedDistribution snapshot.
          if (compareMonthstamps(updateMonthstamp, paymentMonthstamp) > 0) {
            const fromUser = vueFetchInitKV(paymentMonth.paymentsFrom, meta.username, {})
            const toUser = vueFetchInitKV(fromUser, data.toUser, [])
            toUser.push(data.paymentHash)
          }
          paymentMonth.lastAdjustedDistribution = groupIncomeDistribution({
            state, getters, updateMonthstamp, adjusted: true
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
      process (message, { state }) {
        const { data, hash, meta } = message
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
          proposals[proposal.data.proposalType][result](state, message)
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
          member: string, // username to remove
          reason: optional(string),
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
        // TODO: verify votingRules thresholdAdjusted
      },
      async sideEffect ({ data, contractID }, { state }) {
        const rootState = sbp('state/vuex/state')
        const contracts = rootState.contracts || {}

        if (data.member === rootState.loggedIn.username) {
          // If this member is re-joining the group, ignore the rest
          // so the member doesn't remove themself again.
          if (sbp('okTurtles.data/get', 'JOINING_GROUP')) {
            return
          }

          const groupIdToSwitch = Object.keys(contracts)
            .find(cID => contracts[cID].type === 'group' &&
                  cID !== contractID &&
                  rootState[cID].settings) || null

          sbp('state/vuex/commit', 'setCurrentGroupId', groupIdToSwitch)
          sbp('state/vuex/commit', 'removeContract', contractID)
          sbp('controller/router').push({ path: groupIdToSwitch ? '/dashboard' : '/' })
          // TODO - #828 remove other group members contracts if applicable
        } else {
          // TODO - #828 remove the member contract if applicable.
          // sbp('state/vuex/commit', 'removeContract', getters.groupProfile(data.member).contractID)
        }
        // TODO - #850 verify open proposals and see if they need some re-adjustment.
      }
    },
    'gi.contracts/group/removeOurselves': {
      validate: objectMaybeOf({
        reason: string
      }),
      process ({ data, meta, contractID }, { state, getters }) {
        state.profiles[meta.username].status = PROFILE_STATUS.REMOVED
        state.profiles[meta.username].departedDate = meta.createdDate
        sbp('gi.contracts/group/pushSideEffect', contractID,
          ['gi.contracts/group/removeMember/process/sideEffect', {
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
        // If we're triggered by handleEvent in state.js (and not latestContractState)
        // then the asynchronous sideEffect function will get called next
        // and we will subscribe to this new user's identity contract

        // TODO: verify votingRules thresholdAdjusted
      },
      // !! IMPORANT!!
      // Actions here MUST NOT modify contract state!
      // They MUST NOT call 'commit'!
      // They should only coordinate the actions of outside contracts.
      // Otherwise `latestContractState` and `handleEvent` will not produce same state!
      async sideEffect ({ meta, contractID }, { state }) {
        const rootState = sbp('state/vuex/state')
        // TODO: per #257 this will have to be encompassed in a recoverable transaction
        // however per #610 that might be handled in handleEvent (?), or per #356 might not be needed
        if (meta.username === rootState.loggedIn.username) {
          // we're the person who just accepted the group invite
          // so subscribe to founder's IdentityContract & everyone else's
          for (const name in state.profiles) {
            if (name !== rootState.loggedIn.username) {
              await sbp('state/enqueueContractSync', state.profiles[name].contractID)
            }
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
