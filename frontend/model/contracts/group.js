'use strict'

import sbp from '~/shared/sbp.js'
import Vue from 'vue'
import { merge } from '../../utils/giLodash.js'
import { DefineContract } from './Contract.js'
import { objectOf, optional, string, number, object, unionOf, literalOf } from '~/frontend/utils/flowTyper.js'
// TODO: use protocol versioning to load these (and other) files
//       https://github.com/okTurtles/group-income-simple/issues/603
import votingRules, { ruleType, VOTE_FOR, VOTE_AGAINST } from './voting/rules.js'
import proposals, { proposalType, proposalSettingsType, archiveProposal, PROPOSAL_INVITE_MEMBER, PROPOSAL_REMOVE_MEMBER, PROPOSAL_GROUP_SETTING_CHANGE, PROPOSAL_PROPOSAL_SETTING_CHANGE, PROPOSAL_GENERIC, STATUS_OPEN, STATUS_WITHDRAWN } from './voting/proposals.js'

// for gi.contracts/group/payment ... TODO: put these in some other file?
export const PAYMENT_PENDING = 'pending'
export const PAYMENT_CANCELLED = 'cancelled'
export const PAYMENT_ERROR = 'error'
export const PAYMENT_COMPLETED = 'completed'
export const paymentStatus = unionOf(...[PAYMENT_PENDING, PAYMENT_CANCELLED, PAYMENT_ERROR, PAYMENT_COMPLETED].map(k => literalOf(k)))
export const PAYMENT_TYPE_MANUAL = 'manual'
export const PAYMENT_TYPE_BITCOIN = 'bitcoin'
export const PAYMENT_TYPE_PAYPAL = 'paypal'
export const paymentType = unionOf(...[PAYMENT_TYPE_MANUAL, PAYMENT_TYPE_BITCOIN, PAYMENT_TYPE_PAYPAL].map(k => literalOf(k)))

export function generateInvites (numInvites: number) {
  return {
    inviteSecret: `${parseInt(Math.random() * 10000)}`, // TODO: this
    numInvites
    // expires: // TODO: this
  }
}

DefineContract({
  name: 'gi.contracts/group',
  contract: {
    validate: objectOf({
      // TODO: add 'groupPubkey'
      groupName: string,
      groupPicture: string,
      sharedValues: string,
      incomeProvided: number,
      incomeCurrency: string,
      proposals: objectOf({
        [PROPOSAL_INVITE_MEMBER]: proposalSettingsType,
        [PROPOSAL_REMOVE_MEMBER]: proposalSettingsType,
        [PROPOSAL_GROUP_SETTING_CHANGE]: proposalSettingsType,
        [PROPOSAL_PROPOSAL_SETTING_CHANGE]: proposalSettingsType,
        [PROPOSAL_GENERIC]: proposalSettingsType
      })
    }),
    process (state, { data, meta }) {
      // TODO: checkpointing: https://github.com/okTurtles/group-income-simple/issues/354
      const initialState = {
        payments: {},
        invites: {},
        proposals: {}, // hashes => {} TODO: this, see related TODOs in GroupProposal
        settings: data,
        profiles: {
          [meta.username]: {
            contractID: meta.identityContractID,
            groupProfile: {}
          }
        }
      }
      for (const key in initialState) {
        Vue.set(state, key, initialState[key])
      }
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
        proposalType: proposalType,
        proposalData: object, // data for Vue widgets
        votingRule: ruleType,
        expires_date_ms: number // calculate by grabbing proposal expiry from group properties and add to `meta.createdDate`
      }),
      process (state, { data, meta, hash }) {
        Vue.set(state.proposals, hash, {
          data,
          meta,
          votes: { [meta.username]: VOTE_FOR },
          status: STATUS_OPEN,
          payload: null
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
      process (state, { data, meta }) {
        const proposal = state.proposals[data.proposalHash]
        if (!proposal) {
          // TODO: better handle this and similar errors
          //       https://github.com/okTurtles/group-income-simple/issues/602
          console.error(`proposalVote: no proposal for ${data.proposalHash}!`, data)
          return // TODO: or throw exception?
        }
        Vue.set(proposal.votes, meta.username, data.vote)
        // TODO: handle vote pass/fail
        // check if proposal is expired, if so, ignore (but log vote)
        if (Date.now() > proposal.data.expires_date_ms) {
          console.warn(`proposalVote: vote on expired proposal!`, { proposal, data, meta })
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
    // NOTE: there is no way to withdraw a vote on a proposal. User can however change their vote, including changing it to be indifferent.
    'gi.contracts/group/proposalWithdraw': {
      validate: objectOf({
        proposalHash: string
      }),
      process (state, { data, meta }) {
        const proposal = state.proposals[data.proposalHash]
        if (!proposal) {
          console.error(`proposalWithdraw: no proposal for ${data.proposalHash}!`, data)
        } else if (proposal.meta.username !== meta.username) {
          // TODO: properly handle these error conditions!
          console.error(`proposalWithdraw: proposal ${data.proposalHash} belongs to ${proposal.meta.username} not ${meta.username}!`)
        } else {
          // TODO: make sure this is a synchronous function, and if not handle it appropriately
          proposal.status = STATUS_WITHDRAWN
          archiveProposal(state, data.proposalHash)
        }
      }
    },
    'gi.contracts/group/invite': {
      validate: objectOf({
        inviteSecret: string, // NOTE: simulate the OP_KEY_* stuff for now
        numInvites: number
      }),
      process (state, { data }) {
        Vue.set(state.invites, data.inviteSecret, {
          generated: data.numInvites,
          responses: {},
          status: 'valid'
        })
      }
    },
    'gi.contracts/group/inviteDecline': {
      validate: objectOf({
        inviteSecret: string // NOTE: simulate the OP_KEY_* stuff for now
      }),
      process (state, { data, meta }) {
        const invite = state.invites[data.inviteSecret]
        if (invite.status !== 'valid') {
          // throw an exception so that the event handler doesn't get triggered
          // TODO: handle this kind of error (e.g. an invite being used twice)
          throw new Error(`inviteDecline: invite for ${meta.username} is: ${invite.status}`)
        }
        Vue.set(invite.responses, meta.username, false)
        if (Object.keys(invite.responses).length === invite.generated) {
          invite.status = 'used'
        }
        // TODO: archiving of expired/used/cancelled invites
      }
    },
    'gi.contracts/group/inviteAccept': {
      validate: objectOf({
        inviteSecret: string // NOTE: simulate the OP_KEY_* stuff for now
      }),
      process (state, { data, meta }) {
        console.debug(`inviteAccept:`, data, state.invites)
        const invite = state.invites[data.inviteSecret]
        if (invite.status !== 'valid') {
          // throw an exception so that the event handler doesn't get triggered
          throw new Error(`inviteAccept: invite for ${meta.username} is: ${invite.status}`)
        }
        Vue.set(invite.responses, meta.username, true)
        if (Object.keys(invite.responses).length === invite.generated) {
          invite.status = 'used'
        }
        Vue.set(state.profiles, meta.username, {
          contractID: meta.identityContractID,
          groupProfile: {}
        })
        // NOTE: after this, the asynchronous sbp event listener below for
        //       'gi.contracts/group/inviteAccept/process' will be called
        //       and we will subscribe to this new user's identity contract
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
sbp('okTurtles.events/on', 'gi.contracts/group/inviteAccept/process',
  async function (contractID, message) {
    const rootState = sbp('state/vuex/state')
    const groupState = rootState[contractID]
    const data = message.data()
    const meta = message.meta()
    // TODO: per #257 this will have to be encompassed in a recoverable transaction
    if (data.username === rootState.loggedIn.username) {
      // we're the person who just accepted the group invite
      // so subscribe to founder's IdentityContract & everyone else's
      for (const name of Object.keys(groupState.profiles)) {
        if (name === rootState.loggedIn.username) continue
        await sbp('state/vuex/dispatch', 'syncContractWithServer', groupState.profiles[name].contractID)
      }
    } else {
      // we're an existing member of the group getting notified that a
      // new member has joined, so subscribe to their identity contract
      await sbp('state/vuex/dispatch', 'syncContractWithServer', meta.identityContractID)
    }
  }
)
