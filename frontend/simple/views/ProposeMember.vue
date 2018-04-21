<template>
  <section class="section full-screen">
    <div class="columns">
      <div class="column is-half is-offset-one-quarter" >
        <form class='add-form'>
          <div class="field has-addons">
              <p class="control" style="width: 100%;">
                <input
                  autofocus
                  class="input is-medium"
                  id="searchUser"
                  placeholder="Propose a new member by username"
                  type="text"
                  v-model="searchUser"
                >
              </p>
              <p class="control">
                <a id="ProposeButton" class="button is-info is-medium" @click="submit">
                  <i18n>Propose Member</i18n>
                </a>
              </p>
          </div>
          <i18n v-if="userErrorMsg" id="badUsername" class="help is-danger">{{userErrorMsg}}</i18n>
        </form>
      </div>
    </div>
    <div class="columns">
      <div class="column is-6 is-offset-3" >
        <p
                class="notification is-success has-text-centered"
                v-if="proposed"
        >
          <i class='notification-icon fa fa-check'></i>
          <i18n>Member proposed successfully!</i18n>
        </p>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
  .table-header {
    background-color: #fafafa;
  }

  .media {
    align-items: center;
  }

  .add-form {
    margin-bottom: 2rem;
  }

  .notification-icon {
    margin-right: 1rem;
  }
</style>

<script>
import * as Events from '../../../shared/events'
import backend from '../js/backend/'
import { latestContractState } from '../js/state'
import { namespace } from '../js/backend/hapi'
import L from '../js/translations'
import template from 'string-template'

export default {
  name: 'ProposeMember',
  data () {
    return {
      searchUser: null,
      userErrorMsg: '',
      proposed: false,
      self: false
    }
  },
  computed: {
    contract () { return this.$store.state[this.$store.state.currentGroupId] },
    candidateMembers () {
      return this.$store.getters[`${this.$store.state.currentGroupId}/candidateMembers`]
    }
  },
  methods: {
    async submit () {
      if (!this.searchUser) return

      if (this.searchUser === this.$store.state.loggedIn.name) {
        this.userErrorMsg = L('Invalid User: Cannot Invite One\'s self')
        return
      } else {
        this.self = ''
      }
      // Check if this user has been added already
      if (Object.keys(this.contract.profiles).find(member => member === this.searchUser) ||
        this.contract.invitees.find(invitee => invitee === this.searchUser) ||
        this.candidateMembers.find(username => username === this.searchUser)
      ) {
        this.error = L('Invalid Username')
        return
      }
      let member
      try {
        const contractId = await namespace.lookup(this.searchUser)
        const state = await latestContractState(contractId)
        member = { state, contractId }
        this.searchUser = null
        this.userErrorMsg = ''
        this.proposed = false
      } catch (err) {
        console.log(err)
        this.userErrorMsg = L('Invalid Username')
      }
      try {
        // We need to have the latest mailbox attribute for the user
        const mailbox = await backend.latestHash(member.state.attributes.mailbox)
        const sentDate = new Date().toString()

        // We need to post the invite to the users' mailbox contract
        const invite = new Events.HashableMailboxPostMessage(
          {
            from: this.$store.getters.currentGroupState.groupName,
            headers: [this.$store.state.currentGroupId],
            messageType: Events.HashableMailboxPostMessage.TypeInvite,
            sentDate
          },
          mailbox
        )
        // We need to determine if the invitation needs a vote
        const groupLatest = await backend.latestHash(this.$store.state.currentGroupId)

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
          percentage: this.contract.memberApprovalPercentage * 0.01,
          candidate: member.state.attributes.name,
          actions: [
            { contractId: member.state.attributes.mailbox, action: JSON.stringify(invite.toObject()) },
            { contractId: this.$store.state.currentGroupId, action: JSON.stringify(invited.toObject()) }
          ],
          initiator: this.$store.state.loggedIn.name,
          initiationDate: new Date().toString()
        }, groupLatest)
        await backend.publishLogEntry(this.$store.state.currentGroupId, proposal)
        this.proposed = true
      } catch (error) {
        console.error(error)
        // TODO: Create More descriptive errors
        this.userErrorMsg = L('Failed to Propose Users')
      }
    },
    remove (index) {
      this.members.splice(index, 1)
    }
  }
}
</script>
