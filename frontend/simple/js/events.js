import Vue from 'vue'
import * as Events from '../../../shared/events'
import store from './state'
import backend from '../js/backend'
import {namespace} from '../js/backend/hapi'

export class GroupContract extends Events.HashableGroup {
  static vuex = GroupContract.Vuex({
    state: { proposals: {}, payments: [], members: [], invitees: [], profiles: {} },
    mutations: {
      HashableGroupPayment (state, {data}) { state.payments.push(data) },
      HashableGroupProposal (state, {data, hash}) { state.proposals[hash] = {...data, for: [], against: []} },
      HashableGroupVoteForProposal (state, {data}) {
        if (state.proposals[data.proposalHash]) {
          state.proposals[data.proposalHash].for.push(data.username)
          if (state.proposals[data.proposalHash].for.length >= state.proposals[data.proposalHash].threshold) { Vue.delete(state.proposals, data.proposalHash) }
        }
      },
      HashableGroupVoteAgainstProposal (state, {data}) {
        if (state.proposals[data.proposalHash]) {
          state.proposals[data.proposalHash].against.push(data.username)
          if (state.proposals[data.proposalHash].against.length > state.members.length - state.proposals[data.proposalHash].threshold) { Vue.delete(state.proposals, data.proposalHash) }
        }
      },
      HashableGroupRecordInvitation (state, {data}) { state.invitees.push(data.username) },
      HashableGroupDeclineInvitation (state, {data}) {
        let index = state.invitees.findIndex(username => username === data.username)
        if (index > -1) { state.invitees.splice(index, 1) }
      },
      HashableGroupAcceptInvitation (state, {data}) {
        let index = state.invitees.findIndex(username => username === data.username)
        if (index > -1) {
          state.invitees.splice(index, 1)
          state.members.push(data.username)
          state._async.push({type: 'HashableGroupAcceptInvitation', payload: data})
        }
      },
      // TODO: remove group profile when leave group is implemented
      HashableGroupSetGroupProfile (state, {data}) {
        let profile = state.profiles[data.username]
        if (!profile) { profile = state.profiles[data.username] = {} }
        if (!data.value) { return Vue.delete(state.profiles[data.username], data.name) }
        profile[data.name] = data.value
      }
    },
    actions: {
      async HashableGroupAcceptInvitation ({state}, data) {
        // TODO: per #257 this will have to be encompassed in a recoverable transaction
        if (state.founderUsername !== store.state.loggedIn) {
          let identityContractId = await namespace.lookup(state.founderUsername)
          await backend.subscribe(identityContractId)
          await store.dispatch('syncContractWithServer', identityContractId)
        }
        if (data.username !== store.state.loggedIn) {
          let identityContractId = await namespace.lookup(data.username)
          await backend.subscribe(identityContractId)
          await store.dispatch('syncContractWithServer', identityContractId)
        }
      }
    }
  })
}

export class IdentityContract extends Events.HashableIdentity {
  static vuex = IdentityContract.Vuex({
    mutations: {
      HashableIdentitySetAttribute (state, {data: {attribute: {name, value}}}) { Vue.set(state.attributes, name, value) },
      HashableIdentityDeleteAttribute (state, {data: {attribute: {name}}}) { Vue.delete(state.attributes, name) }
    }
  })
}

export class MailboxContract extends Events.HashableMailbox {
  static vuex = MailboxContract.Vuex({
    state: { messages: [] },
    mutations: {
      HashableMailboxPostMessage (state, {data, hash}) { state.messages.push({data, hash}) },
      HashableMailboxAuthorizeSender (state, {data}) { state.authorizations[Events.HashableMailboxAuthorizeSender.authorization.name].data = data.sender }
    }
  })
}
