'use strict'

import sbp from '../../../../shared/sbp.js'
import Vue from 'vue'
import _ from 'lodash'
import {DefineContract} from '../utils.js'

// NOTE: All mutations must be atomic in their edits of the contract state.
//       THEY ARE NOT to farm out any further mutations through the async actions!
export default DefineContract({
  // 'gi_contracts_group_create': {
  // 'gi/contracts/group': {
  'GroupContract': {
    constructor: true,
    validate: function (data) {
      // // TODO: add 'groupPubkey'
      // ['creationDate', 'string'],
      // ['groupName', 'string'],
      // ['sharedValues', 'string'],
      // ['changeThreshold', 'float'],
      // ['openMembership', 'bool'],
      // ['memberApprovalThreshold', 'float'],
      // ['memberRemovalThreshold', 'float'],
      // ['incomeProvided', 'float'],
      // ['incomeCurrency', 'string'],
      // ['contributionPrivacy', 'string'],
      // ['founderUsername', 'string'],
      // ['founderIdentityContractId', 'string']
    },
    vuex: {
      initialState: { // may be specified in the constructor only
        payments: [],
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
    validate: function (data) {
      // ['payment', 'string'] // TODO: change to 'double' and add other fields
    },
    vuex: {
      mutation: (state, {data}) => { state.payments.push(data) }
    }
  },
  'GroupProposal': {
    constants: {
      TypeInvitation: 'invitationProposal',
      TypeRemoval: 'removalProposal',
      TypeChange: 'changeProposal'
    },
    validate: function (data) {
      // ['type', 'string'],
      // ['threshold', 'float'],
      // ['actions', 'Action', 'repeated'],
      //   // array of objects of type:
      //   ['contractID', 'string'],
      //   ['action', 'string']
      // ['candidate', 'string'],
      // ['initiator', 'string'],
      // ['initiationDate', 'string'],
      // ['expirationDate', 'string']
    },
    vuex: {
      mutation: (state, {data, hash}) => {
        // TODO: this should be data instead of ...data to avoid conflict with neighboring properties
        // TODO: convert to votes instead of for/against for future-proofing
        state.proposals[hash] = {...data, for: [data.initiator], against: []}
      }
    }
  },
  // TODO: rename this to just GroupProposalVote, and switch off of the type of vote
  'GroupVoteForProposal': {
    validate: function (data) {
      // ['username', 'string'],
      // ['proposalHash', 'string']
    },
    vuex: {
      mutation: (state, {data}) => {
        if (state.proposals[data.proposalHash]) {
          state.proposals[data.proposalHash].for.push(data.username)
          let threshold = Math.ceil(state.proposals[data.proposalHash].threshold * Object.keys(state.profiles).length)
          if (state.proposals[data.proposalHash].for.length >= threshold) {
            Vue.delete(state.proposals, data.proposalHash)
          }
        }
      }
    }
  },
  'GroupVoteAgainstProposal': {
    validate: function (data) {
      // ['username', 'string'],
      // ['proposalHash', 'string']
    },
    vuex: {
      mutation: (state, {data}) => {
        if (state.proposals[data.proposalHash]) {
          state.proposals[data.proposalHash].against.push(data.username)
          let memberCount = Object.keys(state.profiles).length
          let threshold = Math.ceil(state.proposals[data.proposalHash].threshold * memberCount)
          if (state.proposals[data.proposalHash].against.length > memberCount - threshold) {
            Vue.delete(state.proposals, data.proposalHash)
          }
        }
      }
    }
  },
  'GroupRecordInvitation': {
    validate: function (data) {
      // ['username', 'string'],
      // ['inviteHash', 'string'],
      // ['sentDate', 'string']
    },
    vuex: {
      mutation: (state, {data}) => { state.invitees.push(data.username) }
    }
  },
  'GroupDeclineInvitation': {
    validate: function (data) {
      // ['username', 'string'],
      // ['inviteHash', 'string'],
      // ['declinedDate', 'string']
    },
    vuex: {
      mutation: (state, {data}) => {
        let index = state.invitees.findIndex(username => username === data.username)
        if (index > -1) { state.invitees.splice(index, 1) }
      }
    }
  },
  'GroupAcceptInvitation': {
    validate: function (data) {
      // ['username', 'string'],
      // ['identityContractId', 'string'],
      // ['inviteHash', 'string'],
      // ['acceptanceDate', 'string']
    },
    vuex: {
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
            // NOTE: technically we don't need to call 'GroupSetGroupProfile'
            //       here because Join.vue already synced the contract.
            //       verify that this is really true and that there's no conflict
            //       with group private key changes
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
    validate: function (data) {
      // ['username', 'string'],
      // // NOTE: now this 'json' is 'profile' and is an object
      // ['json', 'string']
    },
    vuex: {
      mutation: (state, {data}) => {
        var {groupProfile} = state.profiles[data.username]
        state.profiles[data.username].groupProfile = _.merge(groupProfile, data.profile)
      }
    }
  }
})
