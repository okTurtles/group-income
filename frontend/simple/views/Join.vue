<template>
    <section class="section full-screen">
      <div class="columns">
        <div class="column is-1"></div>
          <div class="column is-10" >
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
                    <strong>${{contract.incomeProvided}} Monthly Income</strong>
                  </table>
                  <div class="panel-block button-box center">
                    <a class="button is-success is-large" v-on:click="accept" style="margin:auto"><i18n>Accept</i18n></a><a class="button is-danger is-large" v-on:click="decline" style="margin:auto"><i18n>Decline</i18n></a>
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
                    <span>{{contract.groupName}} <i18n>is a group that was founded</i18n> {{formatDate(contract.creationDate)}}. <i18n>The Group currently has</i18n> {{state.members.length}} <i18n>active members with</i18n> # <i18n>financial contributors</i18n>.</span>
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
                <tr v-for="member in state.members" class="member">
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
        <div class="column is-1"></div>
      </div>
    </section>
</template>
<script>
import * as Events from '../../../shared/events'
import backend from '../js/backend/'
import * as db from '../js/database'
export default {
  name: 'Join',
  mounted () {
    this.fetchData()
  },
  methods: {
    fetchData: async function () {
      let events = await backend.eventsSince(this.$route.query.groupId, this.$route.query.groupId)
      let [contract, ...actions] = events.map(e => {
        return Events[e.entry.type].fromObject(e.entry, e.hash)
      })
      let state = contract.toVuexState()
      actions.forEach(action => {
        let type = action.constructor.name
        contract.constructor.vuex.mutations[type](state, action.data)
      })
      this.contract = contract.data
      this.state = state
    },
    accept: async function () {
      await backend.subscribe(this.$route.query.groupId)
      await this.$store.dispatch('synchronize', this.$route.query.groupId)
      let latest = await db.recentHash(this.$route.query.groupId)
      let acceptance = new Events.AcceptInvitation({ username: this.$store.state.loggedIn, inviteHash: this.$route.query.inviteHash, acceptanceDate: new Date() }, latest)
      this.$store.commit('setCurrentGroupId', this.$route.query.groupId)
      await backend.publishLogEntry(this.$route.query.groupId, acceptance)
      this.$store.dispatch('deleteMail', this.$route.query.inviteHash)
      this.$router.push({path: '/mailbox'})
    },
    decline: async function () {
      let latest = await backend.latestHash(this.$route.query.groupId)
      let declination = new Events.DeclineInvitation({ username: this.$store.state.loggedIn, inviteHash: this.$route.query.inviteHash, declinedDate: new Date() }, latest)
      await backend.publishLogEntry(this.$route.query.groupId, declination)
      this.$store.dispatch('deleteMail', this.$route.query.inviteHash)
      this.$router.push({path: '/mailbox'})
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
      members: [],
      contract: {},
      state: { members: [] }
    }
  }
}
</script>
