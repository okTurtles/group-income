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
import { paymentStatusType, paymentType } from './payments/index.js'
import * as Errors from '../errors.js'
import { merge, deepEqualJSONType, omit } from '~/frontend/utils/giLodash.js'
import { currentMonthTimestamp } from '~/frontend/utils/time.js'
import { vueFetchInitKV } from '~/frontend/views/utils/misc.js'
import incomeDistribution from '~/frontend/utils/distribution/mincome-proportional.js'
import currencies from '~/frontend/views/utils/currencies.js'
import L from '~/frontend/views/utils/translations.js'
export const INVITE_INITIAL_CREATOR = 'INVITE_INITIAL_CREATOR'
export const INVITE_STATUS = {
  VALID: 'valid',
  USED: 'used'
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

function initMonthlyPayments () {
  return {
    payments: {},
    frozenDistribution: null,
    frozenMincome: null
  }
}

function initGroupProfile (contractID: string) {
  return {
    contractID: contractID,
    nonMonetaryContributions: []
  }
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
      return Object.keys(getters.currentGroupState.profiles || {}).reduce(
        (result, username) => {
          result[username] = getters.groupProfile(username)
          return result
        },
        {}
      )
    },
    groupMincomeAmount (state, getters) {
      return getters.groupSettings.mincomeAmount
    },
    groupIncomeDistribution (state, getters) {
      const groupProfiles = getters.groupProfiles
      const mincomeAmount = getters.groupMincomeAmount
      const currentIncomeDistribution = []
      for (const username in groupProfiles) {
        const profile = groupProfiles[username]
        const incomeDetailsType = profile && profile.incomeDetailsType
        if (incomeDetailsType) {
          const adjustment = incomeDetailsType === 'incomeAmount' ? 0 : mincomeAmount
          const adjustedAmount = adjustment + profile[incomeDetailsType]
          currentIncomeDistribution.push({ name: username, amount: adjustedAmount })
        }
      }
      return incomeDistribution(currentIncomeDistribution, mincomeAmount)
    },
    groupMembersByUsername (state, getters) {
      return Object.keys(getters.currentGroupState.profiles || {})
    },
    groupMembersCount (state, getters) {
      return getters.groupMembersByUsername.length
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
    thisMonthsPayments (state, getters) {
      const payments = getters.currentGroupState.userPaymentsByMonth
      return (payments && payments[currentMonthTimestamp()]) || {}
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
      process ({ data, meta }, { state }) {
        // TODO: checkpointing: https://github.com/okTurtles/group-income-simple/issues/354
        const initialState = merge({
          payments: {},
          invites: {},
          proposals: {}, // hashes => {} TODO: this, see related TODOs in GroupProposal
          settings: {
            groupCreator: meta.username
          },
          profiles: {
            [meta.username]: initGroupProfile(meta.identityContractID)
          },
          userPaymentsByMonth: {
            [currentMonthTimestamp()]: initMonthlyPayments()
          }
        }, data)
        for (const key in initialState) {
          Vue.set(state, key, initialState[key])
        }
      }
    },
    'gi.contracts/group/payment': {
      validate: objectOf({
        toUser: string,
        amount: number,
        currency: string,
        txid: string,
        status: paymentStatusType,
        paymentType: paymentType,
        details: optional(object),
        memo: optional(string)
      }),
      process ({ data, meta, hash }, { state, getters }) {
        const monthstamp = currentMonthTimestamp()
        const thisMonth = vueFetchInitKV(state.userPaymentsByMonth, monthstamp, initMonthlyPayments())
        const paymentsFromUser = vueFetchInitKV(thisMonth.payments, meta.username, {})
        Vue.set(state.payments, hash, { data, meta, history: [data] })
        if (paymentsFromUser[data.toUser]) {
          throw new Errors.GIErrorIgnoreAndBanIfGroup(`payment: ${meta.username} already paying ${data.toUser}! payment hash: ${hash}`)
        }
        Vue.set(paymentsFromUser, data.toUser, hash)
        // if this is the first payment, freeze the monthy's distribution
        if (!thisMonth.frozenDistribution) {
          // const getters = sbp('state/groupContractSafeGetters', state)
          thisMonth.frozenDistribution = getters.groupIncomeDistribution
          thisMonth.frozenMincome = getters.groupMincomeAmount
        }
      }
    },
    'gi.contracts/group/paymentUpdate': {
      validate: objectOf({
        paymentHash: string,
        updatedProperties: objectMaybeOf({
          status: paymentStatusType,
          details: object,
          memo: string
        })
      }),
      process ({ data, meta, hash }, { state }) {
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
          proposals[proposal.data.proposalType][result](state, data)
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
          if (meta.username !== state.settings.groupCreator) {
            throw new TypeError(L('Only the group creator can remove members.'))
          }
        } else {
          // In a big group a removal can only happen through a proposal
          const { payload } = state.proposals[data.proposalHash] || {}
          if (!payload || payload.secret !== data.proposalPayload.secret) {
            throw new TypeError(L('Invalid associated proposal.'))
          }
        }
      },
      process ({ data, meta }, { state }) {
        Vue.delete(state.profiles, data.member)
      },
      async sideEffect ({ data }) {
        const rootState = sbp('state/vuex/state')
        const contracts = rootState.contracts || {}

        if (data.member === rootState.loggedIn.username) {
          // If this member is re-joining the group, ignore the rest
          // so the member doesn't remove themself again.
          if (sbp('okTurtles.data/get', 'JOINING_GROUP')) {
            return
          }

          const groupIdToSwitch = Object.keys(contracts)
            .find(contractID => contracts[contractID].type === 'group' &&
              contractID !== data.groupId &&
              rootState[contractID].settings) || null

          sbp('state/vuex/commit', 'setCurrentGroupId', groupIdToSwitch)
          sbp('state/vuex/commit', 'removeContract', data.groupId)
          sbp('controller/router').push({ path: groupIdToSwitch ? '/dashboard' : '/' })
          // TODO - #828 remove other group members contracts if applicable
        } else {
          // TODO - #828 remove the member contract if applicable.
          // sbp('state/vuex/commit', 'removeContract', data.memberID)
        }
        // TODO - #850 verify open proposals and see if they need some re-adjustment.
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
        Vue.set(state.profiles, meta.username, initGroupProfile(meta.identityContractID))
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
      process ({ data }, { state }) {
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
