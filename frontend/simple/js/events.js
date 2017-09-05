import Vue from 'vue'
import * as Events from '../../../shared/events'
import _ from 'lodash'
import sbp from '../../../shared/sbp'

export class GroupContract extends Events.HashableGroup {
  static vuex = GroupContract.Vuex({
    state: {
      payments: [],
      invitees: [],
      profiles: {}, // usernames => {contractId: string, groupProfile: Object}
      proposals: {} // hashes => {} TODO: this, see related TODOs in HashableGroupProposal
    },
    // NOTICE: All mutations are to be atomic in their edits of the contract state. THEY ARE NOT to farm out
    // any further mutations through the async actions
    mutations: {
      GroupContract (state, {data}) {
        Vue.set(state.profiles, data.founderUsername, {
          contractId: data.founderIdentityContractId,
          groupProfile: {}
        })
      },
      HashableGroupPayment (state, {data}) { state.payments.push(data) },
      HashableGroupProposal (state, {data, hash}) {
        // TODO: this should be data instead of ...data to avoid conflict with neighboring properties
        // TODO: convert to votes instead of for/against for future-proofing
        state.proposals[hash] = {...data, for: [data.initiator], against: []}
        let threshold = Math.ceil(state.proposals[hash].percentage * Object.keys(state.profiles).length)
        if (state.proposals[hash].for.length >= threshold) {
          Vue.delete(state.proposals, hash)
        }
      },
      // TODO: rename this to just HashableGroupProposalVote, and switch off of the type of vote
      HashableGroupVoteForProposal (state, {data}) {
        if (state.proposals[data.proposalHash]) {
          state.proposals[data.proposalHash].for.push(data.username)
          let threshold = Math.ceil(state.proposals[data.proposalHash].percentage * Object.keys(state.profiles).length)
          if (state.proposals[data.proposalHash].for.length >= threshold) {
            Vue.delete(state.proposals, data.proposalHash)
          }
        }
      },
      HashableGroupVoteAgainstProposal (state, {data}) {
        if (state.proposals[data.proposalHash]) {
          state.proposals[data.proposalHash].against.push(data.username)
          let memberCount = Object.keys(state.profiles).length
          let threshold = Math.ceil(state.proposals[data.proposalHash].percentage * memberCount)
          if (state.proposals[data.proposalHash].against.length > memberCount - threshold) {
            Vue.delete(state.proposals, data.proposalHash)
          }
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
          Vue.set(state.profiles, data.username, {
            contractId: data.identityContractId,
            groupProfile: {}
          })
          state._async.push('HashableGroupAcceptInvitation')
        }
      },
      // TODO: remove group profile when leave group is implemented
      HashableGroupSetGroupProfile (state, {data}) {
        let attributes = JSON.parse(data.json) // TODO: data.json? why not just data? what else is in there?
        var {groupProfile} = state.profiles[data.username]
        state.profiles[data.username].groupProfile = _.merge(groupProfile, attributes)
      }
    },
    // !! IMPORANT!!
    // Actions here MUST NOT modify contract state!
    // They MUST NOT call 'commit'!
    // This is critical to the function of that latest contract hash.
    // They should only coordinate the actions of outside contracts.
    // Otherwise `latestContractState` and `handleEvent` will not produce same state!
    actions: {
      async HashableGroupAcceptInvitation ({state, rootState}, {data, store}) {
        // TODO: per #257 this will have to be encompassed in a recoverable transaction
        if (data.username === rootState.loggedIn.name) {
          // we're the person who just accepted the group invite
          // so subscribe to founder's IdentityContract & everyone else's
          for (const name of Object.keys(state.profiles)) {
            if (name === rootState.loggedIn.name) continue
            await store.dispatch('syncContractWithServer', state.profiles[name].contractId)
            // NOTE: technically we don't need to call 'HashableGroupSetGroupProfile'
            //       here because Join.vue already synced the contract.
            //       verify that this is really true and that there's no conflict
            //       with group private key changes
          }
        } else {
          // we're an existing member of the group getting notified that a
          // new member has joined, so subscribe to their identity contract
          await store.dispatch('syncContractWithServer', data.identityContractId)
        }
      }
    },
    getters: {
      candidateMembers (state) {
        return _.keysIn(state.proposals).filter(key => state.proposals[key].candidate).map(key => state.proposals[key].candidate)
      },
      memberUsernames (state) {
        return Object.keys(state.profiles)
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

const api = {
  // TODO: add ability to unregister listeners
  '/v1/identity/setAttribute': async function ({contractId, name, value}) {
    let latestHash = await sbp('backend/v1/latestHash', {contractId})
    let attribute = new Events.HashableIdentitySetAttribute({attribute: {name, value}}, latestHash)
    await sbp('backend/v1/publishLogEntry', {contractId, entry: attribute})
  },
  '/v1/group/saveGroupProfile': async function ({contractId, username, profile}) {
    let latestHash = await sbp('backend/v1/latestHash', {contractId})
    let profileEntry = new Events.HashableGroupSetGroupProfile(
      {
        username: username,
        json: JSON.stringify(profile)
      },
      latestHash
    )
    await sbp('backend/v1/publishLogEntry', {contractId, entry: profileEntry})
  },
  '/v1/group/acceptInvite': async function ({contractId, identityContractId, inviteHash, username, acceptanceDate}) {
    let latestHash = await sbp('backend/v1/latestHash', {contractId})
    let acceptance = new Events.HashableGroupAcceptInvitation(
      {
        username,
        identityContractId,
        inviteHash,
        acceptanceDate
      },
      latestHash
    )
    await sbp('backend/v1/publishLogEntry', {contractId, entry: acceptance})
  },
  '/v1/group/declineInvite': async function ({contractId, username, inviteHash, declinedDate}) {
    let latestHash = await sbp('backend/v1/latestHash', {contractId})
    let declination = new Events.HashableGroupDeclineInvitation(
      {
        username,
        inviteHash,
        declinedDate
      },
      latestHash
    )
    await sbp('backend/v1/publishLogEntry', {contractId, entry: declination})
  },
  '/v1/group/recordInvite': async function ({groupId, username, inviteHash, sentDate}) {
    let latestHash = await sbp('backend/v1/latestHash', {contractId: groupId})
    const invited = new Events.HashableGroupRecordInvitation(
      {
        username,
        inviteHash,
        sentDate
      },
      latestHash
    )
    await sbp('backend/v1/publishLogEntry', {contractId: groupId, entry: invited})
  },
  '/v1/group/sendGroupProposal': async function ({proposal, percentage, candidate, transaction,
    initiator, initiationDate, groupId}) {
    let latestHash = await sbp('backend/v1/latestHash', {contractId: groupId})

    const proposition = new Events.HashableGroupProposal({
      proposal,
      percentage,
      candidate,
      transaction,
      initiator,
      initiationDate
    }, latestHash)
    await sbp('backend/v1/publishLogEntry', {contractId: groupId, entry: proposition})
  },
  '/v1/group/voteForProposal': async function ({username, proposalHash, groupId}) {
    let latestHash = await sbp('backend/v1/latestHash', {contractId: groupId})

    let vote = new Events.HashableGroupVoteForProposal({ username, proposalHash }, latestHash)
    await sbp('backend/v1/publishLogEntry', {contractId: groupId, entry: vote})
  },
  '/v1/group/voteAgainstProposal': async function ({username, proposalHash, groupId}) {
    let latestHash = await sbp('backend/v1/latestHash', {contractId: groupId})

    let vote = new Events.HashableGroupVoteAgainstProposal({ username, proposalHash }, latestHash)
    await sbp('backend/v1/publishLogEntry', {contractId: groupId, entry: vote})
  },
  '/v1/mailbox/sendMail': async function ({contractId, date, from, message}) {
    let latestHash = await sbp('backend/v1/latestHash', {contractId})
    let mail = new Events.HashableMailboxPostMessage({
      sentDate: date,
      messageType: Events.HashableMailboxPostMessage.TypeMessage,
      from: from,
      message: message
    }, latestHash)
    await sbp('backend/v1/publishLogEntry', {contractId, entry: mail})
  },
  '/v1/mailbox/postInvite': async function ({mailboxId, sentDate, groupName, groupId, setInScope}) {
    let latestHash = await sbp('backend/v1/latestHash', {contractId: mailboxId})
    const invite = new Events.HashableMailboxPostMessage(
      {
        from: groupName,
        headers: [groupId],
        messageType: Events.HashableMailboxPostMessage.TypeInvite,
        sentDate
      },
      latestHash
    )
    setInScope('lastInviteHash', invite.toHash())
    await sbp('backend/v1/publishLogEntry', {contractId: mailboxId, entry: invite})
  }
}

sbp.registerDomain('contracts', api)
