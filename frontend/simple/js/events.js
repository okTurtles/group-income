import Vue from 'vue'
import * as Events from '../../../shared/events'
import store from './state'
import backend from '../js/backend'
import {namespace} from '../js/backend/hapi'
import _ from 'lodash'

export class GroupContract extends Events.HashableGroup {
  static vuex = GroupContract.Vuex({
    state: { votes: [], payments: [], invitees: [], profiles: {} },
    mutations: {
      GroupContract (state, {data}) {
        Vue.set(state.profiles, data.founderUsername, {
          contractId: store.state.loggedIn.identityContractId
        })
      },
      HashableGroupPayment (state, {data}) { state.payments.push(data) },
      HashableGroupVote (state, {data}) { state.votes.push(data) },
      HashableGroupRecordInvitation (state, {data}) { state.invitees.push(data.username) },
      HashableGroupDeclineInvitation (state, {data}) {
        let index = state.invitees.findIndex(username => username === data.username)
        if (index > -1) { state.invitees.splice(index, 1) }
      },
      HashableGroupAcceptInvitation (state, {data}) {
        let index = state.invitees.findIndex(username => username === data.username)
        if (index > -1) {
          state.invitees.splice(index, 1)
          state._async.push({type: 'HashableGroupAcceptInvitation', data})
        }
      },
      // TODO: remove group profile when leave group is implemented
      HashableGroupSetGroupProfile (state, {data}) {
        state.profiles[data.username] = _.merge(state.profiles[data.username], JSON.parse(data.json))
      }
    },
    actions: {
      async HashableGroupAcceptInvitation ({commit, state, rootState}, {data}) {
        // TODO: per #257 this will have to be encompassed in a recoverable transaction
        if (data.username === rootState.loggedIn.name) {
          // we're the person who just accepted the group invite
          // so subscribe to founder's IdentityContract & everyone else's
          for (const name of [state.founderUsername, ...Object.keys(state.profiles)]) {
            let identityContractId = await namespace.lookup(name)
            await store.dispatch('syncContractWithServer', identityContractId)
            await backend.subscribe(identityContractId)
            // NOTE: technically we don't need to call 'HashableGroupSetGroupProfile'
            //       here because Join.vue already synced the contract.
            //       verify that this is really true and that there's no conflict
            //       with group private key changes
          }
        } else {
          // we're an existing member of the group getting notified that a
          // new member has joined, so subscribe to their identity contract
          let identityContractId = await namespace.lookup(data.username)
          await store.dispatch('syncContractWithServer', identityContractId)
          await backend.subscribe(identityContractId)
          commit('HashableGroupSetGroupProfile', {
            data: {
              username: data.username,
              json: JSON.stringify({contractId: identityContractId})
            }
          })
        }
      }
    }
  })
}

export class IdentityContract extends Events.HashableIdentity {
  static vuex = IdentityContract.Vuex({
    mutations: {
      HashableIdentitySetAttribute (state, {data: {attribute: {name, value}}}) {
        Vue.set(state.attributes, name, value)
      },
      HashableIdentityDeleteAttribute (state, {data: {attribute: {name}}}) {
        Vue.delete(state.attributes, name)
      }
    }
  })
}

export class MailboxContract extends Events.HashableMailbox {
  static vuex = MailboxContract.Vuex({
    state: { messages: [] },
    mutations: {
      HashableMailboxPostMessage (state, {data, hash}) { state.messages.push({data, hash}) },
      HashableMailboxAuthorizeSender (state, {data}) { state.authorizations[Events.HashableMailboxAuthorizeSender.authorization].data = data.sender }
    }
  })
}
