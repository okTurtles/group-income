'use strict'

import sbp from '~/shared/sbp.js'
import Vue from 'vue'
import { merge } from '../../utils/giLodash.js'
import { DefineContract } from './Contract.js'
import { objectOf, optional, string, number, object, unionOf, literalOf } from '~/frontend/utils/flowTyper.js'
// TODO: use protocol versioning to load these (and other) files
//       https://github.com/okTurtles/group-income-simple/issues/603
import * as votingRules from './voting/rules.js'
import * as proposals from './voting/proposals.js'

// for gi.contracts/group/payment
export const PAYMENT_PENDING = 'pending'
export const PAYMENT_CANCELLED = 'cancelled'
export const PAYMENT_ERROR = 'error'
export const PAYMENT_COMPLETED = 'completed'
export const PAYMENT_TYPE_MANUAL = 'manual'
export const PAYMENT_TYPE_BITCOIN = 'bitcoin'
export const PAYMENT_TYPE_PAYPAL = 'paypal'
export const paymentType = unionOf(literalOf(PAYMENT_TYPE_MANUAL), literalOf(PAYMENT_TYPE_BITCOIN), literalOf(PAYMENT_TYPE_PAYPAL))
export const paymentStatus = unionOf(literalOf(PAYMENT_PENDING), literalOf(PAYMENT_CANCELLED), literalOf(PAYMENT_ERROR), literalOf(PAYMENT_COMPLETED))

DefineContract({
  name: 'gi.contracts/group',
  contract: {
    validate: objectOf({
      // TODO: add 'groupPubkey'
      groupName: string,
      groupPicture: string,
      sharedValues: string,
      changeThreshold: number,
      memberApprovalThreshold: number,
      memberRemovalThreshold: number,
      incomeProvided: number,
      incomeCurrency: string
    }),
    process (state, { data, meta }) {
      Object.assign(state, {
        payments: {},
        invitees: [],
        proposals: {}, // hashes => {} TODO: this, see related TODOs in GroupProposal
        profiles: {
          [meta.username]: {
            contractID: meta.identityContractID,
            groupProfile: {}
          }
        }
      }, data)
    }
  },
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
  // NOTE: All mutations must be atomic in their edits of the contract state.
  //       THEY ARE NOT to farm out any further mutations through the async actions!
  actions: {
    'gi.contracts/group/payment': {
      validate: objectOf({
        toUser: string,
        amount: number,
        currency: string,
        txid: string,
        status: paymentStatus,
        paymentType: paymentType,
        details: optional(object),
        memo: optional(string)
      }),
      process (state, { data, hash }) {
        Vue.set(state.payments, hash, { data, updates: [] })
      }
    },
    'gi.contracts/group/paymentUpdate': {
      validate: objectOf({
        referencePaymentHash: string,
        txid: string,
        newStatus: string,
        details: optional(object)
      }),
      process (state, { data, hash }) {
        // TODO: we don't want to keep a history of all payments in memory all the time
        //       https://github.com/okTurtles/group-income-simple/issues/426
        state.payments[data.referencePaymentHash].updates.push({ hash, data })
      }
    },
    'gi.contracts/group/proposal': {
      validate: objectOf({
        proposalType: proposals.proposalType,
        proposalData: object,
        votingRule: votingRules.ruleType,
        expires: string // calculate by grabbing proposal expiry from group properties and add to `meta.date`
      }),
      process (state, { data, meta, hash }) {
        // TODO: save all proposals disk so that we only keep open proposals in memory
        Vue.set(state.proposals, hash, { data, meta })
      }
    },
    'gi.contracts/group/proposalVote': {
      validate: objectOf({
        proposalHash: string,
        vote: votingRules.voteType,
        proposalPassPayload: optional(unionOf(object, string)) // TODO: this, somehow we need to send an OP_KEY_ADD GIMessage to add a generated once-only writeonly message public key to the contract, and (encrypted) include the corresponding invite link, also, we need all clients to verify that this message/operation was valid to prevent a hacked client from adding arbitrary OP_KEY_ADD messages, and automatically ban anyone generating such messages
      }),
      process (state, { data, meta }) {
        // TODO: rewrite all this
        const proposal = state.proposals[data.proposalHash]
        if (!proposal) {
          console.error(`GroupProposalVote: no proposal for ${data.proposalHash}!`, data)
        } else {
          Vue.set(proposal.votes, meta.username, data.vote)
          // TODO: handle vote pass/fail
          // check if proposal is expired, if so, ignore (but log vote)
          // see if this is a deciding vote
          if (votingRules.rules[proposal.data.votingRule]() !== votingRules.VOTE_INDIFFERENT) {

          }
          // state.proposals[data.proposalHash].for.push(data.username)
          // const threshold = Math.ceil(state.proposals[data.proposalHash].threshold * Object.keys(state.profiles).length)
          // if (state.proposals[data.proposalHash].for.length >= threshold) {
          //   Vue.delete(state.proposals, data.proposalHash)
          // }
        }
      }
    },
    'gi.contracts/group/proposalWithdraw': {
      validate: objectOf({
        proposalHash: string
      }),
      process (state, { data, meta }) {
        // TODO: implement this properly
        const proposal = state.proposals[data.proposalHash]
        if (!proposal) {
          console.error(`GroupProposalWithdraw: no proposal for ${data.proposalHash}!`, data)
        } else if (proposal.creator !== meta.username) {
          // TODO: properly handle this
          console.error(`GroupProposalWithdraw: proposal ${data.proposalHash} belongs to ${proposal.creator} not ${meta.username}!`)
        } else {
          Vue.delete(state.proposals, data.proposalHash)
        }
      }
    },
    // NOTE: there is no way to withdraw a vote on a proposal. User can however change their vote, including changing it to be indifferent.
    'gi.contracts/group/invite': {
      validate: objectOf({
        username: string,
        inviteHash: string
        // sentDate: string // TODO: use meta.date
      }),
      process (state, { data }) {
        state.invitees.push(data.username)
      }
    },
    'gi.contracts/group/inviteDecline': {
      validate: objectOf({
        username: string,
        inviteHash: string
        // declinedDate: string // TODO: use meta.date
      }),
      process (state, { data }) {
        const index = state.invitees.findIndex(username => username === data.username)
        if (index > -1) { state.invitees.splice(index, 1) }
      }
    },
    'gi.contracts/group/inviteAccept': {
      validate: objectOf({
        username: string,
        identityContractID: string, // TODO: use meta.identityContract
        inviteHash: string
        // acceptanceDate: string
      }),
      process (state, { data }) {
        const index = state.invitees.findIndex(username => username === data.username)
        if (index > -1) {
          state.invitees.splice(index, 1)
          Vue.set(state.profiles, data.username, {
            contractID: data.identityContractID,
            groupProfile: {}
          })
        }
        // NOTE: handleEvent already emits 'gi.contracts/group/inviteAccept/process' for us
        //       but it doesn't pass in the state object for this contract...
        Vue.nextTick(() => sbp('okTurtles.events/emit', 'gi.contracts/group/inviteAccept', state, { data }))
      }
    },
    // TODO: remove group profile when leave group is implemented
    // TODO: rename to GroupProfileCreate / GroupProfileUpdate
    'gi.contracts/group/setGroupProfile': {
      validate: objectOf({
        username: string, // TODO: use meta.username
        profile: object
      }),
      process (state, { data }) {
        var { groupProfile } = state.profiles[data.username]
        state.profiles[data.username].groupProfile = merge(groupProfile, data.profile)
      }
    }
  }
})

// !! IMPORANT!!
// Actions here MUST NOT modify contract state!
// They MUST NOT call 'commit'!
// This is critical to the function of that latest contract hash.
// They should only coordinate the actions of outside contracts.
// Otherwise `latestContractState` and `handleEvent` will not produce same state!
sbp('okTurtles.events/on', 'gi.contracts/group/inviteAccept', async (state, { data }) => {
  const rootState = sbp('state/vuex/state')
  // TODO: per #257 this will have to be encompassed in a recoverable transaction
  if (data.username === rootState.loggedIn.username) {
    // we're the person who just accepted the group invite
    // so subscribe to founder's IdentityContract & everyone else's
    for (const name of Object.keys(state.profiles)) {
      if (name === rootState.loggedIn.username) continue
      await sbp('state/vuex/dispatch', 'syncContractWithServer', state.profiles[name].contractID)
    }
  } else {
    // we're an existing member of the group getting notified that a
    // new member has joined, so subscribe to their identity contract
    await sbp('state/vuex/dispatch', 'syncContractWithServer', data.identityContractID)
  }
})
