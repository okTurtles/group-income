'use strict'

import sbp from '../../../../shared/sbp.js'
import Vue from 'vue'
import {merge} from '../../utils/giLodash.js'
import {DefineContract} from '../utils.js'
import {NEW_PAYMENT, PAYMENT_UPDATE} from '../../utils/events.js'
import {
  objectOf,
  arrayOf,
  string,
  number,
  object,
  optional
} from 'flow-typer-js'

// NOTE: All mutations must be atomic in their edits of the contract state.
//       THEY ARE NOT to farm out any further mutations through the async actions!
export default DefineContract({
  'GroupContract': {
    isConstructor: true,
    validate: objectOf({
      // TODO: add 'groupPubkey'
      groupName: string,
      sharedValues: string,
      changeThreshold: number,
      memberApprovalThreshold: number,
      memberRemovalThreshold: number,
      incomeProvided: number,
      incomeCurrency: string,
      founderUsername: string,
      founderIdentityContractId: string
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
      mutation: (state, {data}) => {
        Object.assign(state, {
          profiles: {
            [data.founderUsername]: {
              contractID: data.founderIdentityContractId,
              groupProfile: {}
            }
          }
        }, data)
      },
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
  'GroupPayment': {
    validate: objectOf({
      fromUser: string,
      toUser: string,
      date: string,
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
      mutation: (state, {data, hash}) => {
        state.payments[hash] = {data, updates: []}
        Vue.nextTick(() => sbp('okTurtles.events/emit', NEW_PAYMENT, hash))
      }
    }
  },
  'GroupPaymentUpdate': {
    validate: objectOf({
      referencePaymentHash: string,
      txid: string,
      newStatus: string,
      date: string,
      details: optional(object)
    }),
    vuexModuleConfig: {
      mutation: (state, {data, hash}) => {
        const updateIdx = state.payments[hash].updates.length
        // TODO: we don't want to keep a history of all payments in memory all the time
        //       https://github.com/okTurtles/group-income-simple/issues/426
        state.payments[data.referencePaymentHash].updates.push({hash, data})
        Vue.nextTick(() => sbp('okTurtles.events/emit', PAYMENT_UPDATE, hash, updateIdx))
      }
    }
  },
  'GroupProposal': {
    constants: {
      // what the proposal does
      // if updating group field, this should be the field name to update
      DoInvitation: 'invitation',
      DoRemoval: 'removal',
      DoIncome: 'incomeProvided',
      DoChangeThreshold: 'changeThreshold',
      DoApprovalThreshold: 'memberApprovalThreshold',
      DoRemovalThreshold: 'memberRemovalThreshold',
      // how the proposal vote gets decided
      // TODO better place for these? + other types?
      RuleTypeThreshold: 'ruleTypeThreshold'
    },
    validate: objectOf({
      whoProposed: string,
      doWhat: string,
      toWhat: string,
      whenProposed: string,
      voteRule: objectOf({
        voteRuleType: string,
        threshold: number
      }),
      votes: arrayOf(objectOf({
        username: string,
        vote: number
      })),
      actions: arrayOf(objectOf({
        contractID: string,
        type: string,
        action: string
      }))
    }),
    vuexModuleConfig: {
      mutation: (state, {data, hash}) => {
        Vue.set(state.proposals, hash, data)
      }
    }
  },
  // TODO: rename this to just GroupProposalVote, and switch off of the type of vote
  'GroupProposalVote': {
    validate: objectOf({
      username: string,
      proposalHash: string,
      vote: number
    }),
    vuexModuleConfig: {
      mutation: (state, {data}) => {
        if (state.proposals[data.proposalHash]) {
          state.proposals[data.proposalHash].votes.push({
            username: data.username,
            vote: data.vote
          })
          // TODO: make decision mechanism more generic
          let memberCount = Object.keys(state.profiles).length
          let threshold = Math.ceil(state.proposals[data.proposalHash].voteRule.threshold * Object.keys(state.profiles).length)
          if (state.proposals[data.proposalHash].votes.filter(vote => vote.vote === 1).length >= threshold) {
            // TODO: flag instead of delete to make proposal history easier? #426
            Vue.delete(state.proposals, data.proposalHash)
          } else if (state.proposals[data.proposalHash].votes.filter(vote => vote.vote === -1).length > memberCount - threshold) {
            // TODO: flag instead of delete to make proposal history easier? #426
            Vue.delete(state.proposals, data.proposalHash)
          }
        }
      }
    }
  },
  // TODO: change & revoke votes
  'GroupCloseProposal': {
    validate: function (data) {
      // ['proposalHash', 'string']
    },
    vuexModuleConfig: {
      mutation: (state, {data}) => {
        if (state.proposals[data.proposalHash]) {
          // TODO: flag instead of delete to make proposal history easier?
          Vue.delete(state.proposals, data.proposalHash)
        }
      }
    }
  },
  'GroupRecordInvitation': {
    validate: objectOf({
      username: string,
      inviteHash: string,
      sentDate: string
    }),
    vuexModuleConfig: {
      mutation: (state, {data}) => { state.invitees.push(data.username) }
    }
  },
  'GroupDeclineInvitation': {
    validate: objectOf({
      username: string,
      inviteHash: string,
      declinedDate: string
    }),
    vuexModuleConfig: {
      mutation: (state, {data}) => {
        let index = state.invitees.findIndex(username => username === data.username)
        if (index > -1) { state.invitees.splice(index, 1) }
      }
    }
  },
  'GroupAcceptInvitation': {
    validate: objectOf({
      username: string,
      identityContractId: string,
      inviteHash: string,
      acceptanceDate: string
    }),
    vuexModuleConfig: {
      mutation: (state, {data}) => {
        let index = state.invitees.findIndex(username => username === data.username)
        if (index > -1) {
          state.invitees.splice(index, 1)
          Vue.set(state.profiles, data.username, {
            contractID: data.identityContractId,
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
      action: async ({commit, state, rootState}, {data}) => {
        // TODO: per #257 this will have to be encompassed in a recoverable transaction
        if (data.username === rootState.loggedIn.name) {
          // we're the person who just accepted the group invite
          // so subscribe to founder's IdentityContract & everyone else's
          for (const name of Object.keys(state.profiles)) {
            if (name === rootState.loggedIn.name) continue
            await sbp('state/vuex/dispatch', 'syncContractWithServer', state.profiles[name].contractID)
          }
        } else {
          // we're an existing member of the group getting notified that a
          // new member has joined, so subscribe to their identity contract
          await sbp('state/vuex/dispatch', 'syncContractWithServer', data.identityContractId)
        }
      }
    }
  },
  // TODO: remove group profile when leave group is implemented
  'GroupSetGroupProfile': {
    validate: objectOf({
      username: string,
      profile: object
    }),
    vuexModuleConfig: {
      mutation: (state, {data}) => {
        var {groupProfile} = state.profiles[data.username]
        state.profiles[data.username].groupProfile = merge(groupProfile, data.profile)
      }
    }
  }
})
