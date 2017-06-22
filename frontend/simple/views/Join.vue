<template>
    <section class="section full-screen">
      <div class="mx-auto" >
        <div class="columns">
          <div class="column is-one-half">
            <div class="center ">
              <div class="subtitle is-3"><i18n>You have been Invited to join</i18n></div>
              <div class="title is-1">{{contract.groupName}}</div>
            </div>
            <div class="panel">
              <div class="panel-block">
                <div class="display-inline">
                  <strong>Shared Values: </strong> {{contract.sharedValues}}
                </div>
              </div>
              <table class="panel-block notification is-warning">
                <strong>${{contract.incomeProvided}} <i18n>Monthly Income</i18n></strong>
              </table>
              <div class="panel-block center has-text-centered">
                <div id="errorMsg" v-if="errorMsg" class="help is-danger">{{errorMsg}}</div>
                <a class="button is-success is-large ml-auto mr-lg" @click="accept"><i18n>Accept</i18n></a>
                <a class="button is-danger is-large mr-lg" @click="decline"><i18n>Decline</i18n></a>
              </div>
            </div>
          </div>
          <div class="column id-one-quarter">
            <div class="panel">
              <div class="panel-block">
                <strong><i18n>Founder</i18n></strong>
              </div>
              <div class="panel-block">
                {{contract.founderUsername}}
              </div>
              <div class="panel-block">
                <div><strong><i18n>Group Info</i18n></strong></div>
              </div>
              <div class="panel-block">
                <span>{{contract.groupName}} <i18n>is a group that was founded</i18n> {{formatDate(contract.creationDate)}}. <i18n>The Group currently has</i18n> {{contract.members.length}} <i18n>active members with</i18n> # <i18n>financial contributors</i18n>.</span>
              </div>
              <div class="panel-block">
                <div><strong><i18n>Percentage of members are required to change the rules</i18n></strong></div>
              </div>
              <div class="panel-block">
                {{contract.changePercentage}}
              </div>
              <div class="panel-block">
                <strong><i18n>Open to New Members?</i18n></strong>
              </div>
              <div class="panel-block" v-show="openMembership"><i18n>Yes</i18n></div>
              <div class="panel-block" v-show="!openMembership"><i18n>No</i18n></div>
              <div class="panel-block">
                <strong><i18n>Percentage of members are required to approve a new members</i18n></strong>
              </div>
              <div class="panel-block">
                {{contract.memberApprovalPercentage}}
              </div>
              <div class="panel-block">
                <strong><i18n>Percentage of members are required to remove a member</i18n></strong>
              </div>
              <div class="panel-block">
                {{contract.memberRemovalPercentage}}
              </div>
              <div class="panel-block">
                <strong><i18n>Contribution Transparency</i18n></strong>
              </div>
              <div class="panel-block">
                {{contract.contributionPrivacy}}
              </div>
            </div>
          </div>
          <div class="column is-one-quarter">
            <table class="table is-bordered is-striped is-narrow">
            <thead>
            <tr>
              <th><i18n>Group Members</i18n></th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="member in contract.members" class="member">
              <td>
                <div class="media">
                  <div class="media-left">
                    <p class="image is-64x64">
                      <img :src="member.attributes.picture">
                    </p>
                  </div>
                  <div class="media-content">
                    <strong>{{member.attributes.name}}</strong>
                  </div>
                </div>
              </td>
            </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </section>
</template>
<script>
import {namespace} from '../js/backend/hapi'
import * as Events from '../../../shared/events'
import backend from '../js/backend/'
import { latestContractState } from '../js/state'
import L from '../js/translations'

export default {
  name: 'Join',
  async mounted () {
    try {
      let state = await latestContractState(this.$route.query.groupId)
      if (!state.invitees.find(invitee => invitee === this.$store.state.loggedIn.name)) {
        // TODO: proper user-facing error
        console.log(new Error('Invalid Invitation'))
        this.$router.push({path: '/mailbox'})
      }
      for (var i = 0; i < state.members.length; i++) {
        const contractId = await namespace.lookup(state.members[i])
        state.members[i] = await latestContractState(contractId)
      }
      this.contract = state
    } catch (ex) {
      // TODO Add ui facing error notification
      console.log(ex)
      this.$router.push({path: '/mailbox'})
    }
  },
  methods: {
    accept: async function () {
      try {
        // post acceptance event to the group contract
        this.errorMsg = null
        let latest = await backend.latestHash(this.$route.query.groupId)
        let acceptance = new Events.HashableGroupAcceptInvitation({ username: this.$store.state.loggedIn.name, inviteHash: this.$route.query.inviteHash, acceptanceDate: new Date() }, latest)
        this.$store.commit('setCurrentGroupId', this.$route.query.groupId)
        await backend.subscribe(this.$route.query.groupId)
        await this.$store.dispatch('syncContractWithServer', this.$route.query.groupId)
        await backend.publishLogEntry(this.$route.query.groupId, acceptance)

        // subscribe to the identity contract of the founder
        let identityContractId = await namespace.lookup(this.contract.founderUsername)
        await backend.subscribe(identityContractId)
        await this.$store.dispatch('syncContractWithServer', identityContractId)

        // remove invite and return to mailbox
        this.$store.commit('deleteMessage', this.$route.query.inviteHash)
        this.$router.push({path: '/mailbox'})
      } catch (ex) {
        console.log(ex)
        this.errorMsg = L('Failed to Accept Invite')
      }
    },
    decline: async function () {
      try {
        // post decline event
        this.errorMsg = null
        let latest = await backend.latestHash(this.$route.query.groupId)
        let declination = new Events.HashableGroupDeclineInvitation({ username: this.$store.state.loggedIn.name, inviteHash: this.$route.query.inviteHash, declinedDate: new Date() }, latest)
        await backend.publishLogEntry(this.$route.query.groupId, declination)

        // remove invite and return to mailbox
        this.$store.commit('deleteMail', this.$route.query.inviteHash)
        this.$router.push({path: '/mailbox'})
      } catch (ex) {
        console.log(ex)
        this.errorMsg = L('Failed to Decline Invite')
      }
    },
    formatDate: function (date) {
      if (date) {
        let formatString = new Date(date)
        return formatString.toDateString()
      }
    }
  },
  data () {
    return {
      errorMsg: null,
      contract: { members: [] }
    }
  }
}
</script>
