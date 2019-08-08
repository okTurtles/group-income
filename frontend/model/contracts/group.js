'use strict'

import sbp from '~/shared/sbp.js'
import Vue from 'vue'
import { merge } from '../../utils/giLodash.js'
import { DefineContract } from './Contract.js'
import {
  objectOf,
  // arrayOf,
  optional,
  string,
  number,
  object
} from '~/frontend/utils/flowTyper.js'
import * as votingRules from './voting/rules.js'

export default DefineContract({
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
    },
    // TODO: remove these and move it to state.js
    getters: {
      candidateMembers (state) {
        return Object.keys(state.proposals).filter(key => state.proposals[key].candidate).map(key => state.proposals[key].candidate)
      },
      memberUsernames (state) {
        return Object.keys(state.profiles)
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
        status: string,
        paymentType: string,
        details: optional(object),
        memo: optional(string)
      }),
      // TODO: place these someplace else? or implement it?
      constants: {
        StatusPending: 'pending',
        StatusCancelled: 'cancelled',
        StatusError: 'error',
        StatusCompleted: 'completed',
        TypeManual: 'manual',
        TypeBitcoin: 'bitcoin',
        TypePayPal: 'paypal'
      },
      process (state, { data, hash }) {
        state.payments[hash] = { data, updates: [] }
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
      constants: {
        // TODO: delete these and replace all usages with values from model/voting/proposals.js
        TypeInvitation: 'invitationProposal',
        TypeRemoval: 'removalProposal',
        TypeChange: 'changeProposal'
      },
      validate: objectOf({
        proposalType: string, // constant from frontend/model/voting/proposals.js
        proposalData: object,
        votingRule: votingRules.ruleType,
        expires: string // calculate by grabbing proposal expiry from group properties and add to `meta.date`
      }),
      process (state, { data, meta, hash }) {
        Vue.set(state.proposals, hash, { data, meta })
      }
    },
    'gi.contracts/group/proposalVote': {
      validate: objectOf({
        proposalHash: string,
        vote: votingRules.voteType
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
        Vue.nextTick(() => sbp('okTurtles.events/emit', 'gi.contracts/group/invite-accept', state, { data }))
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
sbp('okTurtles.events/on', 'gi.contracts/group/invite-accept', async (state, { data }) => {
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

/*
export default DefineContract({
  'GroupContract': {
    isConstructor: true,
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
    vuexModuleConfig: {
      // defining an initialState makes writing getters easier because
      // you don't have to write, e.g. `state.proposals || {}` all the time
      initialState: { // may be specified in the constructor only
        payments: {},
        invitees: [],
        profiles: {}, // usernames => {contractId: string, groupProfile: Object}
        proposals: {} // hashes => {} TODO: this, see related TODOs in GroupProposal
      },
      mutation: (state, { data, meta }) => {
        Object.assign(state, {
          profiles: {
            [meta.username]: {
              contractID: meta.identityContractID,
              groupProfile: {}
            }
          }
        }, data)
      },
      // TODO: remove these and move it to state.js
      getters: {
        candidateMembers (state) {
          return Object.keys(state.proposals).filter(key => state.proposals[key].candidate).map(key => state.proposals[key].candidate)
        },
        memberUsernames (state) {
          return Object.keys(state.profiles)
        }
      }
    }
  },
  'GroupPaymentCreate': {
    validate: objectOf({
      toUser: string,
      amount: number,
      currency: string,
      txid: string,
      status: string,
      paymentType: string,
      details: optional(object),
      memo: optional(string)
    }),
    constants: {
      StatusPending: 'pending',
      StatusCancelled: 'cancelled',
      StatusError: 'error',
      StatusCompleted: 'completed',
      TypeManual: 'manual',
      TypeBitcoin: 'bitcoin',
      TypePayPal: 'paypal'
    },
    vuexModuleConfig: {
      mutation: (state, { data, hash }) => {
        state.payments[hash] = { data, updates: [] }
      }
    }
  },
  'GroupPaymentUpdate': {
    validate: objectOf({
      referencePaymentHash: string,
      txid: string,
      newStatus: string,
      details: optional(object)
    }),
    vuexModuleConfig: {
      mutation: (state, { data, hash }) => {
        const updateIdx = state.payments[hash].updates.length
        // TODO: we don't want to keep a history of all payments in memory all the time
        //       https://github.com/okTurtles/group-income-simple/issues/426
        state.payments[data.referencePaymentHash].updates.push({ hash, data })
      }
    }
  },
  'GroupProposalCreate': {
    constants: {
      // TODO: delete these and replace all usages with values from model/voting/proposals.js
      TypeInvitation: 'invitationProposal',
      TypeRemoval: 'removalProposal',
      TypeChange: 'changeProposal'
    },
    validate: objectOf({
      proposalType: string, // constant from frontend/model/voting/proposals.js
      proposalData: object,
      votingRule: votingRules.ruleType,
      expires: string // calculate by grabbing proposal expiry from group properties and add to `meta.date`
    }),
    vuexModuleConfig: {
      mutation: (state, { data, meta, hash }) => {
        Vue.set(state.proposals, hash, { data, meta })
      }
    }
  },
  'GroupProposalVote': {
    validate: objectOf({
      proposalHash: string,
      vote: votingRules.voteType
    }),
    vuexModuleConfig: {
      mutation: (state, { data, meta }) => {
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
    }
  },
  'GroupProposalWithdraw': {
    validate: objectOf({
      proposalHash: string
    }),
    vuexModuleConfig: {
      mutation: (state, { data, meta }) => {
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
    }
  },
  // NOTE: there is no way to withdraw a vote on a proposal. User can however change their vote, including changing it to be indifferent.
  'GroupInviteCreate': {
    validate: objectOf({
      username: string,
      inviteHash: string
      // sentDate: string // TODO: use meta.date
    }),
    vuexModuleConfig: {
      mutation: (state, { data }) => {
        state.invitees.push(data.username)
      }
    }
  },
  'GroupInviteDecline': {
    validate: objectOf({
      username: string,
      inviteHash: string
      // declinedDate: string // TODO: use meta.date
    }),
    vuexModuleConfig: {
      mutation: (state, { data }) => {
        const index = state.invitees.findIndex(username => username === data.username)
        if (index > -1) { state.invitees.splice(index, 1) }
      }
    }
  },
  'GroupInviteAccept': {
    validate: objectOf({
      username: string,
      identityContractID: string, // TODO: use meta.identityContract
      inviteHash: string
      // acceptanceDate: string
    }),
    vuexModuleConfig: {
      mutation: (state, { data }) => {
        const index = state.invitees.findIndex(username => username === data.username)
        if (index > -1) {
          state.invitees.splice(index, 1)
          Vue.set(state.profiles, data.username, {
            contractID: data.identityContractID,
            groupProfile: {}
          })
        }
      },
      // !! IMPORANT!!
      // Actions here MUST NOT modify contract state!
      // They MUST NOT call 'commit'!
      // This is critical to the function of that latest contract hash.
      // They should only coordinate the actions of outside contracts.
      // Otherwise `latestContractState` and `handleEvent` will not produce same state!
      action: async ({ state }, { data }) => {
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
      }
    }
  },
  // TODO: remove group profile when leave group is implemented
  // TODO: rename to GroupProfileCreate / GroupProfileUpdate
  'GroupSetGroupProfile': {
    validate: objectOf({
      username: string, // TODO: use meta.username
      profile: object
    }),
    vuexModuleConfig: {
      mutation: (state, { data }) => {
        var { groupProfile } = state.profiles[data.username]
        state.profiles[data.username].groupProfile = merge(groupProfile, data.profile)
      }
    }
  }
})
*/
