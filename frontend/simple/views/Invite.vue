<template>
  <section class="section full-screen">
      <div class="centered" >
        <div class="field has-addons">
          <p class="control" style="width: 100%">
            <input id="searchUser" class="input" type="text" v-model="searchUser" placeholder="Add a new member by username">
          </p>
          <p class="control">
            <a id="addButton" class="button is-info" v-on:click="add">
              <i18n>Add new member</i18n>
            </a>
          </p>
        </div>
        <i18n v-if="error" id="badUsername" class="help is-danger">Invalid Username</i18n>
        <i18n v-if="self" class="help is-danger">Cannot Invite Yourself</i18n>
        <table class="table is-bordered is-striped is-narrow">
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
                    <img src="http://bulma.io/images/placeholders/128x128.png">
                  </p>
                </div>
                <div class="media-content">
                  <strong>{{member.name}}</strong>
                </div>
                <div class="media-right">
                  <button class="delete" v-on:click="remove(index)"></button>
                </div>
              </div>
            </td>
          </tr>
          </tbody>
        </table>
        <div class="has-text-centered button-box">
          <div id="errorMsg" v-if="errorMsg" class="help is-danger">{{errorMsg}}</div>
          <div id="successMsg" v-if="invited" class="created"><i18n>Success</i18n></div>
          <button class="button is-success is-large" v-if="!invited" :disabled="!members.length" v-on:click="submit" type="submit"><i18n>Invite Members</i18n></button>
          <a class="button is-warning is-large" v-if="invited"><i18n>Next: ?</i18n></a>
        </div>
      </div>
  </section>
</template>

<style lang="sass" scoped>
.table-header
  background-color: #fafafa
.media
  align-items: center
</style>

<script>
import * as Events from '../../../shared/events'
import backend from '../js/backend/'
import {HapiNamespace} from '../js/backend/hapi'
import {latestContractState} from '../js/state'
import L from '../js/translations'
var namespace = new HapiNamespace()

export default {
  name: 'InviteView',
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
  methods: {
    add: async function () {
      if (this.searchUser) {
        if (this.searchUser === this.$store.state.loggedIn) {
          this.self = true
          return
        } else {
          this.self = false
        }
        try {
          let contractId = await namespace.lookup(this.searchUser)
          if (!this.members.find(member => member.name === this.searchUser)) {
            this.members.push({name: this.searchUser, contractId: contractId})
          }
          this.searchUser = null
          this.error = false
        } catch (ex) {
          this.error = true
        }
      }
    },
    remove: function (index) {
      this.members.splice(index, 1)
    },
    submit: async function () {
      try {
        this.errorMsg = null
        // TODO: as members are successfully invited display in a seperate invitees grid and add them to some validation for duplicate invites
        for (let i = 0; i < this.members.length; i++) {
          let member = this.members[i]
          // We need to have the latest mailbox attribute for the user
          let state = await latestContractState(member.contractId)
          let mailbox = await backend.latestHash(state.attributes.mailbox)
          let date = new Date()
          // We need to post the invite to the users' mailbox contract
          let invite = new Events.PostMessage({message: this.$store.state.currentGroupId, messageType: Events.PostMessage.TypeInvite, sentDate: date.toString()}, mailbox)
          await backend.publishLogEntry(state.attributes.mailbox, invite)
          // We need to make a record of the invitation in the group's contract
          let latest = await backend.latestHash(this.$store.state.currentGroupId)
          let invited = new Events.RecordInvitation({ username: member.name, inviteHash: invite.toHash(), sentDate: date.toString() }, latest)
          await backend.publishLogEntry(this.$store.state.currentGroupId, invited)
        }
        this.invited = true
      } catch (ex) {
        console.log(ex)
        // TODO: Create More descriptive errors
        this.errorMsg = L('Failed to Invite Users')
      }
    }
  }
}
</script>
