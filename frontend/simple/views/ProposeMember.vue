<template>
  <section class="section full-screen">
    <div class="columns">
      <div class="column is-half is-offset-one-quarter" >
        <form class='add-form'>
          <div class="field has-addons">
              <p class="control" style="width: 100%">
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
import { latestContractState } from '../js/state'
import { namespace } from '../js/backend/hapi'
import L from '../js/translations'
import template from 'string-template'
import {createExternalStateTransaction, transactionQueue} from '../js/transactions'
import * as invariants from '../js/invariants'

export default {
  name: 'ProposeMember',
  data () {
    return {
      searchUser: null,
      userErrorMsg: '',
      proposed: false
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
        let externalInviteTransaction = createExternalStateTransaction('Invite New Member')
        externalInviteTransaction.setInScope(`groupName`, this.$store.getters.currentGroupState.groupName)
        externalInviteTransaction.setInScope(`groupId`, this.$store.state.currentGroupId)
        externalInviteTransaction.setInScope(`${member.state.attributes.name}Mailbox`, member.state.attributes.mailbox)
        externalInviteTransaction.setInScope(member.state.attributes.name, member.state.attributes.name)
        externalInviteTransaction.addStep({
          execute: invariants.postInvite,
          description: `Send Invite to Mailbox for ${member.state.attributes.name}`,
          args: {
            Events: 'Events',
            backend: 'backend',
            mailboxId: `${member.state.attributes.name}Mailbox`,
            sentDate: 'sentDate',
            groupName: 'groupName',
            groupId: 'groupId'
          }
        })
        externalInviteTransaction.addStep({
          execute: invariants.recordInvite,
          description: `Record Invite Sent to ${member.state.attributes.name}`,
          args: {
            Events: 'Events',
            backend: 'backend',
            inviteHash: `lastInviteHash`,
            sentDate: 'voteDate',
            username: member.state.attributes.name,
            groupId: 'groupId'
          }
        })

        let externalTransaction = createExternalStateTransaction('Propose New Member')
        externalTransaction.setInScope('proposal', template(L('This is a Vote for {name} to become a member of {group}'),
              {name: member.state.attributes.displayName || member.state.attributes.name, group: this.contract.groupName}))
        externalTransaction.setInScope('percentage', this.contract.memberApprovalPercentage * 0.01)
        externalTransaction.setInScope('candidate', member.state.attributes.name)
        externalTransaction.setInScope('transaction', JSON.stringify(externalInviteTransaction.toJSON()))
        externalTransaction.setInScope('initiator', this.$store.state.loggedIn.name)
        externalTransaction.setInScope('initiationDate', new Date().toString())
        externalTransaction.setInScope(`groupId`, this.$store.state.currentGroupId)
        externalTransaction.addStep({
          execute: invariants.sendGroupProposal,
          description: `Propose Membership for ${member.state.attributes.name}`,
          args: {
            Events: 'Events',
            backend: 'backend',
            percentage: 'percentage',
            candidate: 'candidate',
            transaction: 'transaction',
            groupId: 'groupId',
            initiator: 'initiator',
            initiationDate: 'initiationDate'
          }
        })
        transactionQueue.run(externalTransaction)
        await externalTransaction.wait()
        this.proposed = true
      } catch (ex) {
        console.error(ex)
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
