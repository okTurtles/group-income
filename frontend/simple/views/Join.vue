<template>
    <section class="section full-screen">
      <div class="centered" >
        <div class="columns" v-if="contract">
          <div class="column is-one-half">
            <div class="center ">
              <div class="subtitle is-3"><i18n>You have been Invited to join</i18n></div>
              <div class="title is-1">{{contract.groupName}}</div>
            </div>
            <div class="panel">
              <div class="panel-block">
                <div style="display: inline;">
                  <strong>Shared Values: </strong> {{contract.sharedValues}}
                </div>
              </div>
              <table class="panel-block notification is-warning">
                <strong>${{contract.incomeProvided}} <i18n>Monthly Income</i18n></strong>
              </table>
              <div class="panel-block center" style="display: block; text-align: center">
                <div id="errorMsg" v-if="errorMsg" class="help is-danger">{{errorMsg}}</div>
                <a class="button is-success is-large" v-on:click="accept" style="margin-left:auto; margin-right: 20px"><i18n>Accept</i18n></a><a class="button is-danger is-large" v-on:click="decline" style="margin-right:auto; margin-right: 20px"><i18n>Decline</i18n></a>
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
        </div>
      </div>
    </section>
</template>
<script>
import * as Events from '../../../shared/events'
import backend from '../js/backend/'
import * as db from '../js/database'
import L from '../js/translations'
export default {
  name: 'Join',
  async created () {
    if (!this.$store.state[this.$route.query.groupId]) {
      await backend.subscribeAndSync(this.$route.query.groupId, true)
    }
  },
  methods: {
    accept: async function () {
      try {
        this.errorMsg = null
        await backend.subscribeAndSync(this.$route.query.groupId)
        let latest = await db.recentHash(this.$route.query.groupId)
        let acceptance = new Events.AcceptInvitation({ username: this.$store.state.loggedIn, acceptanceDate: new Date() }, latest)
        this.$store.commit('setCurrentGroupId', this.$route.query.groupId)
        await backend.publishLogEntry(this.$route.query.groupId, acceptance)
        this.$store.dispatch('deleteMessage', this.$route.query.inviteId)
        this.$router.push({path: '/mailbox'})
      } catch (ex) {
        console.log(ex)
        this.errorMsg = L('Failed to Accept Invite')
      }
    },
    decline: async function () {
      try {
        this.errorMsg = null
        await backend.unsubscribe(this.$route.query.groupId)
        let latest = await backend.latestHash(this.$route.query.groupId)
        let declination = new Events.DeclineInvitation({ username: this.$store.state.loggedIn, declinedDate: new Date() }, latest)
        await backend.publishLogEntry(this.$route.query.groupId, declination)
        this.$store.dispatch('deleteMail', this.$route.query.inviteHash)
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
  computed: {
    contract () {
      return this.$store.state[this.$route.query.groupId]
    }
  },
  data () {
    return {
      errorMsg: null
    }
  }
}
</script>
