'use strict'

import sbp from '~/shared/sbp.js'
import Vue from 'vue'
import { DefineContract } from './Contract.js'
import { objectOf, objectMaybeOf, optional, string, number, object, unionOf, literalOf } from '~/frontend/utils/flowTyper.js'
// TODO: use protocol versioning to load these (and other) files
//       https://github.com/okTurtles/group-income-simple/issues/603
import votingRules, { ruleType, VOTE_FOR, VOTE_AGAINST } from './voting/rules.js'
import proposals, { proposalType, proposalSettingsType, archiveProposal, PROPOSAL_INVITE_MEMBER, PROPOSAL_REMOVE_MEMBER, PROPOSAL_GROUP_SETTING_CHANGE, PROPOSAL_PROPOSAL_SETTING_CHANGE, PROPOSAL_GENERIC, STATUS_OPEN, STATUS_CANCELLED } from './voting/proposals.js'
import * as Errors from '../errors.js'
import { merge, deepEqualJSONType } from '~/frontend/utils/giLodash.js'
import { currentMonthTimestamp } from '~/frontend/utils/time.js'

// for gi.contracts/group/payment ... TODO: put these in some other file?
export const PAYMENT_PENDING = 'pending'
export const PAYMENT_CANCELLED = 'cancelled'
export const PAYMENT_ERROR = 'error'
export const PAYMENT_COMPLETED = 'completed'
export const paymentStatusType = unionOf(...[PAYMENT_PENDING, PAYMENT_CANCELLED, PAYMENT_ERROR, PAYMENT_COMPLETED].map(k => literalOf(k)))
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
      mincomeAmount: number,
      mincomeCurrency: string,
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
        },
        paymentsByMonth: {
          [currentMonthTimestamp()]: {}
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
        status: paymentStatusType,
        paymentType: paymentType,
        details: optional(object),
        memo: optional(string)
      }),
      process (state, { data, meta, hash }) {
        Vue.set(state.payments, hash, { data, meta, history: [data] })
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
      process (state, { data, meta, hash }) {
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
      validate: data => {
        objectOf({
          proposalType: proposalType,
          proposalData: object, // data for Vue widgets
          votingRule: ruleType,
          expires_date_ms: number // calculate by grabbing proposal expiry from group properties and add to `meta.createdDate`
        })
        // make sure this isn't a duplicate proposal
        const ourUsername = sbp('state/vuex/getters').ourUsername
        const groupID = sbp('state/vuex/state').currentGroupId
        const groupState = sbp('state/vuex/state')[groupID]
        for (const hash in groupState.proposals) {
          const prop = groupState.proposals[hash]
          if (prop.status === STATUS_OPEN &&
            prop.data.proposalType === data.proposalType &&
            prop.meta.username === ourUsername &&
            deepEqualJSONType(prop.data.proposalData, data.proposalData)
          ) {
            throw new TypeError(`proposal: is identical to proposal ${hash}`)
          }
        }
        // TODO/BUG: Avoid proposal to add existing member.
        return data
      },
      process (state, { data, meta, hash }) {
        Vue.set(state.proposals, hash, {
          data,
          meta,
          votes: { [meta.username]: VOTE_FOR },
          status: STATUS_OPEN,
          payload: null // set later by proposalVote
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
      process (state, { data, hash, meta }) {
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
      process (state, { data, meta }) {
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
    'gi.contracts/group/invite': {
      validate: objectOf({
        inviteSecret: string, // NOTE: simulate the OP_KEY_* stuff for now
        numInvites: number
      }),
      process (state, { data, meta }) {
        Vue.set(state.invites, data.inviteSecret, {
          generated: data.numInvites,
          creator: meta.username,
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
          console.error(`inviteDecline: invite for ${meta.username} is: ${invite.status}`)
          return
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
        console.debug('inviteAccept:', data, state.invites)
        const invite = state.invites[data.inviteSecret]
        if (invite.status !== 'valid') {
          console.error(`inviteAccept: invite for ${meta.username} is: ${invite.status}`)
          return
        }
        Vue.set(invite.responses, meta.username, true)
        if (Object.keys(invite.responses).length === invite.generated) {
          invite.status = 'used'
        }
        Vue.set(state.profiles, meta.username, {
          contractID: meta.identityContractID,
          groupProfile: {
            nonMonetaryContributions: []
          }
        })
        // If we're triggered by handleEvent in state.js (and not latestContractState)
        // then the asynchronous sideEffect function will get called next
        // and we will subscribe to this new user's identity contract
      },
      // !! IMPORANT!!
      // Actions here MUST NOT modify contract state!
      // They MUST NOT call 'commit'!
      // They should only coordinate the actions of outside contracts.
      // Otherwise `latestContractState` and `handleEvent` will not produce same state!
      async sideEffect (message) {
        const rootState = sbp('state/vuex/state')
        const groupState = rootState[message.contractID()]
        const meta = message.meta()
        // TODO: per #257 this will have to be encompassed in a recoverable transaction
        // however per #610 that might be handled in handleEvent (?), or per #356 might not be needed
        if (meta.username === rootState.loggedIn.username) {
          // we're the person who just accepted the group invite
          // so subscribe to founder's IdentityContract & everyone else's
          for (const name of Object.keys(groupState.profiles)) {
            if (name === rootState.loggedIn.username) continue
            await sbp('state/enqueueContractSync', groupState.profiles[name].contractID)
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
        mincomeAmount: x => typeof x === 'number' && x > 0,
        mincomeCurrency: x => typeof x === 'string'
      }),
      process (state, { data }) {
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
      process (state, { data, meta }) {
        var { groupProfile } = state.profiles[meta.username]
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
        process (state, { data }) {
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
