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
          <i18n v-if="userErrorMsg" id="badUsername" class="help is-danger">{{userErrorMsg}}</i18n>
        </form>
      </div>
    </div>

    <div class="columns">
      <div class="column is-6 is-offset-3" >

        <p
                class="notification is-success has-text-centered"
                v-if="invited"
        >
          <i class='notification-icon fa fa-check'></i>
          <i18n>Members invited successfully!</i18n>
        </p>

        <table
                class="table is-bordered is-striped is-narrow"
                v-if="members.length"
        >
          <thead>
          <tr>
            <th class="table-header"><i18n>Initial Invitees</i18n></th>
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
import {transactionQueue, createExternalStateTransaction} from '../js/transactions'
import * as invariants from '../js/invariants'

export default {
  name: 'Invite',
  data () {
    return {
      searchUser: null,
      members: [],
      userErrorMsg: '',
      invited: false,
      errorMsg: null
    }
  },
  methods: {
    async add () {
      if (!this.searchUser) return

      if (this.searchUser === this.$store.state.loggedIn.name) {
        this.userErrorMsg = L('Invalid User: Cannot Invite One\'s self')
        return
      } else {
        this.userErrorMsg = ''
      }

      try {
        const contractId = await namespace.lookup(this.searchUser)
        const state = await latestContractState(contractId)
        if (!this.members.find(member => member.state.attributes.name === this.searchUser)) {
          this.members.push({ state, contractId })
        }
        this.searchUser = null
        this.userErrorMsg = ''
      } catch (err) {
        console.log(err)
        this.userErrorMsg = L('Invalid User')
      }
    },
    remove (index) {
      this.members.splice(index, 1)
    },
    async submit () {
      this.errorMsg = null
      // TODO: as members are successfully invited display in a
      // seperate invitees grid and add them to some validation for duplicate invites

      let externalTransaction = createExternalStateTransaction('Invite New Members')
      externalTransaction.setInScope(`groupName`, this.$store.getters.currentGroup.groupName)
      externalTransaction.setInScope(`groupId`, this.$store.state.currentGroupId)
      const sentDate = new Date().toString()
      externalTransaction.setInScope(`sentDate`, sentDate)
      for (let member of this.members) {
        // We need to have the latest mailbox attribute for the user
        externalTransaction.setInScope(`${member.state.attributes.name}Mailbox`, member.state.attributes.mailbox)
        externalTransaction.setInScope(member.state.attributes.name, member.state.attributes.name)
        externalTransaction.addStep({
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
        externalTransaction.addStep({
          execute: invariants.recordInvite,
          description: `Record Invite Sent to ${member.state.attributes.name}`,
          args: {
            Events: 'Events',
            backend: 'backend',
            inviteHash: `lastInviteHash`,
            sentDate: 'sentDate',
            username: member.state.attributes.name,
            groupId: 'groupId'
          }
        })
      }
      externalTransaction.once('error', (ex) => {
        externalTransaction.removeAllListeners('complete')
        console.error(ex)
        // TODO: Create More descriptive errors
        this.errorMsg = L('Failed to Invite Users')
      })
      externalTransaction.once('complete', () => {
        this.invited = true
      })
      transactionQueue.run(externalTransaction)
    }
  }
}
</script>
