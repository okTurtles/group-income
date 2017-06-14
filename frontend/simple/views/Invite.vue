<template>
  <section class="section full-screen">
    <div class="columns">
      <div class="column is-half is-offset-one-quarter" >
        <div class="columns">
          <div class="column">
            <table
                    class="table is-bordered is-striped is-narrow"
                    v-if="contract.members.length"
            >
              <thead>
              <tr>
                <th class="table-header"><i18n>Current Members</i18n></th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="(member, index) in contract.members" class="currentmember">
                <td>
                  <div class="media">
                    <div class="media-left">
                      <p class="image is-64x64">
                        <!-- TODO: use responsive figure:
                      http://bulma.io/documentation/elements/image/ -->
                        <!-- TODO: ideally these would be loaded from cache -->
                        <img src="http://bulma.io/images/placeholders/128x128.png">
                      </p>
                    </div>
                    <div class="media-content">
                      <strong>{{member}}</strong>
                    </div>
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
          <div class="column">
            <table
                    class="table is-bordered is-striped is-narrow"
                    v-if="contract.invitees.length"
            >
              <thead>
              <tr>
                <th class="table-header"><i18n>Currently Invited</i18n></th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="(invitee, index) in contract.invitees" class="invitee">
                <td>
                  <div class="media">
                    <div class="media-left">
                      <p class="image is-64x64">
                        <!-- TODO: use responsive figure:
                      http://bulma.io/documentation/elements/image/ -->
                        <!-- TODO: ideally these would be loaded from cache -->
                        <img src="http://bulma.io/images/placeholders/128x128.png">
                      </p>
                    </div>
                    <div class="media-content">
                      <strong>{{invitee}}</strong>
                    </div>
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    <div class="columns">
      <div class="column is-half is-offset-one-quarter" >
        <form class='add-form' @submit.prevent="add">
          <div class="field has-addons">
              <p class="control" style="width: 100%">
                <input
                  autofocus
                  class="input is-medium"
                  id="searchUser"
                  placeholder="Add a new member by username"
                  type="text"
                  v-model="searchUser"
                >
              </p>
              <p class="control">
                <a id="addButton" class="button is-info is-medium" @click="add">
                  <i18n>Add member</i18n>
                </a>
              </p>
          </div>
          <i18n v-if="error" id="badUsername" class="help is-danger">Invalid Username</i18n>
          <i18n v-if="self" class="help is-danger">Cannot Invite Yourself</i18n>
        </form>
      </div>
    </div>

    <div class="columns">
      <div class="column is-6 is-offset-3" >
        <table
                class="table is-bordered is-striped is-narrow"
                v-if="candidateMembers.length"
        >
          <thead>
          <tr>
            <th class="table-header"><i18n>Candidate Members</i18n></th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(candidate, index) in candidateMembers" class="vote">
            <td>
              <div class="media">
                <div class="media-left">
                  <p class="image is-64x64">
                    <!-- TODO: use responsive figure:
                  http://bulma.io/documentation/elements/image/ -->
                    <!-- TODO: ideally these would be loaded from cache -->
                    <img src="http://bulma.io/images/placeholders/128x128.png">
                  </p>
                </div>
                <div class="media-content">
                  <strong>{{candidate}}</strong>
                </div>
              </div>
            </td>
          </tr>
          </tbody>
        </table>
        <table
          class="table is-bordered is-striped is-narrow"
          v-if="members.length"
        >
          <thead>
          <tr>
            <th class="table-header"><i18n>Invitees</i18n></th>
          </tr>
          </thead>
          <tbody>
            <tr v-for="(member, index) in members" class="member">
              <td>
                <div class="media">
                  <div class="media-left">
                    <p class="image is-64x64">
                      <!-- TODO: use responsive figure:
                    http://bulma.io/documentation/elements/image/ -->
                      <!-- TODO: ideally these would be loaded from cache -->
                      <img :src="member.state.attributes.picture" width="64" height="64">
                    </p>
                  </div>
                  <div class="media-content">
                    <strong>{{member.state.attributes.name}}</strong>
                  </div>
                  <div class="media-right">
                    <button class="delete" @click="remove(index)"></button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <p
                class="notification is-success has-text-centered"
                v-if="invited"
        >
          <i class='notification-icon fa fa-check'></i>
          <i18n>Members invited successfully!</i18n>
        </p>

        <div class="has-text-centered">
          <button
            class="button is-success is-large"
            type="submit"
            v-if="members.length"
            @click="submit"
          >
            <i18n>Send Invites</i18n>
          </button>
        </div>

      </div>
    </div>
  </section>
</template>

<style lang="sass" scoped>
.table-header
  background-color: #fafafa
.media
  align-items: center
.add-form
  margin-bottom: 2rem
.notification-icon
  margin-right: 1rem
</style>

<script>
import * as Events from '../../../shared/events'
import backend from '../js/backend/'
import { latestContractState } from '../js/state'
import { namespace } from '../js/backend/hapi'
import L from '../js/translations'
import template from 'string-template'

export default {
  name: 'Invite',
  data () {
    return {
      searchUser: null,
      members: [],
      error: false,
      invited: false,
      self: false,
      errorMsg: null
    }
  },
  computed: {
    contract () { return this.$store.state[this.$store.state.currentGroupId] },
    candidateMembers () {
      return this.$store.getters[`${this.$store.state.currentGroupId}/candidateMembers`]
    }
  },
  methods: {
    async add () {
      if (!this.searchUser) return

      if (this.searchUser === this.$store.state.loggedIn.name) {
        this.self = true
        return
      } else {
        this.self = false
      }
      // Check if this user has been added already
      if (this.contract.members.find(member => member === this.searchUser) ||
        this.contract.invitees.find(invitee => invitee === this.searchUser) ||
        this.candidateMembers.find(username => username === this.searchUser)) {
        this.error = true
        return
      }

      try {
        const contractId = await namespace.lookup(this.searchUser)
        const state = await latestContractState(contractId)
        if (!this.members.find(member => member.state.attributes.name === this.searchUser)) {
          this.members.push({ state, contractId })
        }
        this.searchUser = null
        this.error = false
        this.invited = false
      } catch (err) {
        console.log(err)
        this.error = true
      }
    },
    remove (index) {
      this.members.splice(index, 1)
    },
    async submit () {
      try {
        this.errorMsg = null
        // TODO: as members are successfully invited display in a
        // seperate invitees grid and add them to some validation for duplicate invites
        for (let member of this.members) {
          // We need to have the latest mailbox attribute for the user
          const mailbox = await backend.latestHash(member.state.attributes.mailbox)
          const sentDate = new Date().toString()

          // We need to post the invite to the users' mailbox contract
          const invite = new Events.HashableMailboxPostMessage(
            {
              message: this.$store.state.currentGroupId,
              messageType: Events.HashableMailboxPostMessage.TypeInvite,
              sentDate
            },
            mailbox
          )
          // We need to determine if the invitation needs a vote
          const groupLatest = await backend.latestHash(this.$store.state.currentGroupId)
          if (this.contract.members.length >= 3) {
            // Create the Record for the group
            const invited = new Events.HashableGroupRecordInvitation(
              {
                username: member.state.attributes.name,
                inviteHash: '{lastActionHash}', // these are place holders to be added later
                sentDate: '{actionDate}'
              },
              null
            )
            // Create the Proposal and add to it the record and invite actions
            const proposal = new Events.HashableGroupProposal({
              proposal: template(L('This is a Vote for {name} to become a member of {group}'),
                {name: member.state.attributes.displayName || member.state.attributes.name, group: this.contract.groupName}
              ),
              // calculate the voting threshold from the group data
              percentage: this.contract.memberApprovalPercentage,
              candidate: member.state.attributes.name,
              actions: [
               { contractId: member.state.attributes.mailbox, action: JSON.stringify(invite.toObject()) },
               { contractId: this.$store.state.currentGroupId, action: JSON.stringify(invited.toObject()) }
              ]
            }, groupLatest)
            await backend.publishLogEntry(this.$store.state.currentGroupId, proposal)
            // send a vote to all members
            for (let groupMember of this.contract.members) {
              // cast vote for the loggedIn user automatically
              if (groupMember === this.$store.state.loggedIn.name) {
                let latest = await backend.latestHash(this.$store.state.currentGroupId)
                let vote = new Events.HashableGroupVoteForProposal({ username: this.$store.state.loggedIn.name, proposalHash: proposal.toHash() }, latest)
                await backend.publishLogEntry(this.$store.state.currentGroupId, vote)
              } else {
                const identityContractId = await namespace.lookup(groupMember)
                const identityContractState = await latestContractState(identityContractId)
                const latestMailbox = await backend.latestHash(identityContractState.attributes.mailbox)
                const notice = new Events.HashableMailboxPostMessage(
                  {
                    message: this.$store.state.currentGroupId,
                    messageType: Events.HashableMailboxPostMessage.TypeProposal,
                    headers: [this.$store.state.currentGroupId, proposal.toHash()],
                    sentDate
                  },
                  latestMailbox
                )
                await backend.publishLogEntry(identityContractState.attributes.mailbox, notice)
              }
            }
          } else {
            await backend.publishLogEntry(member.state.attributes.mailbox, invite)
            // We need to make a record of the invitation in the group's contract
            const latest = await backend.latestHash(this.$store.state.currentGroupId)
            const invited = new Events.HashableGroupRecordInvitation(
              {
                username: member.state.attributes.name,
                inviteHash: invite.toHash(),
                sentDate
              },
              latest
            )
            await backend.publishLogEntry(this.$store.state.currentGroupId, invited)
          }
        }
        this.invited = true
        this.members = []
      } catch (error) {
        console.error(error)
        // TODO: Create More descriptive errors
        this.errorMsg = L('Failed to Invite Users')
      }
    }
  }
}
</script>
