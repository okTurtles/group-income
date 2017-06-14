<template>
  <section class="section full-screen">
    <div class="columns">
      <div class="column"></div>
      <div class="column" style="text-align: center" >
        <div>
          <div class="subtitle is-3"><i18n>Your vote has been requested on a proposal for the group:</i18n></div>
          <div class="title is-1">{{contract.groupName}}</div>
        </div>
        <div class="panel">
          <div class="panel-block">
            <div style="display: inline;">
             {{proposal.proposal}}
            </div>
          </div>
          <div class="panel-block notification is-warning" style="text-align: center">
            <strong style="margin: 0 auto"><i18n>Your Decision?</i18n></strong>
          </div>
          <div class="panel-block center" style="display: block; text-align: center">
            <div id="errorMsg" v-if="errorMsg" class="help is-danger">{{errorMsg}}</div>
            <a id="ForLink" class="button is-success is-large" v-on:click="four" style="margin-left:auto; margin-right: 20px"><i18n>For</i18n></a><a id="AgainstLink" class="button is-danger is-large" v-on:click="against" style="margin-right:auto; margin-right: 20px"><i18n>Against</i18n></a>
          </div>
        </div>
      </div>
      <div class="column"></div>
    </div>
  </section>
</template>
<script>
import * as Events from '../../../shared/events'
import backend from '../js/backend/'
import template from 'string-template'
import L from '../js/translations'
import _ from 'lodash'
export default {
  name: 'Vote',
  computed: {
    contract () {
      return this.$store.state[this.$route.query.groupId] || {proposals: {}}
    },
    proposal () {
      return this.contract.proposals[this.$route.query.proposalHash] || {proposal: null}
    }
  },
  methods: {
    async four () { // for is a reserved word so Vue doesn't like it
      this.errorMsg = null
      try {
        // Create a vote for the proposal
        let latest = await backend.latestHash(this.$route.query.groupId)
        let vote = new Events.HashableGroupVoteForProposal({ username: this.$store.state.loggedIn.name, proposalHash: this.$route.query.proposalHash }, latest)
        let proposal = _.cloneDeep(this.proposal)
        let threshold = Math.ceil(proposal.percentage * 0.01 * this.contract.members.length)
        await backend.publishLogEntry(this.$route.query.groupId, vote)
        // If the vote passes fulfill the action
        if (proposal.for.length + 1 >= threshold) {
          let lastActionHash = null
          const actionDate = new Date().toString()
          for (let step of proposal.actions) {
            latest = await backend.latestHash(step.contractId)
            let actObj = JSON.parse(template(step.action, {lastActionHash, actionDate}))
            let entry = new Events[actObj.type](actObj.data, latest)
            lastActionHash = entry.toHash()
            await backend.publishLogEntry(step.contractId, entry)
          }
        }
        // remove proposal and return to mailbox
        this.$store.commit('deleteMessage', this.$route.query.messageHash)
        this.$router.push({path: '/mailbox'})
      } catch (ex) {
        console.log(ex)
        this.errorMsg = L('Failed to Cast Vote')
      }
    },
    async against () {
      this.errorMsg = null
      try {
        // Create a against the proposal
        let latest = await backend.latestHash(this.$route.query.groupId)
        let vote = new Events.HashableGroupVoteAgainstProposal({ username: this.$store.state.loggedIn.name, proposalHash: this.$route.query.proposalHash }, latest)
        await backend.publishLogEntry(this.$route.query.groupId, vote)
        // remove proposal and return to mailbox
        this.$store.commit('deleteMessage', this.$route.query.messageHash)
        this.$router.push({path: '/mailbox'})
      } catch (ex) {
        console.log(ex)
        this.errorMsg = L('Failed to Cast Vote')
      }
    }
  },
  data () {
    return {
      errorMsg: null
    }
  }
}
</script>
