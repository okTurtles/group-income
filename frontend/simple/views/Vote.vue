<template>
  <section class="section full-screen">
    <div class="columns">
      <div class="column"></div>
      <div class="column" style="text-align: center;" >
        <div>
          <div class="subtitle is-3"><i18n>Your vote has been requested on a proposal for the group:</i18n></div>
          <div class="title is-1">{{contract.groupName}}</div>
        </div>
        <div class="panel">
          <div class="panel-block">
            <p>
              <!-- TODO different templates for different invitation types -->
              <i18n>This is an invitation proposal. The user to be invited: </i18n>
              <strong data-test="candidateName">{{proposal.candidate}}</strong>
            </p>
          </div>
          <div class="panel-block notification is-warning" style="text-align: center;">
            <strong style="margin: 0 auto;"><i18n>Your Decision?</i18n></strong>
          </div>
          <div class="panel-block center" style="display: block; text-align: center;">
            <div id="errorMsg" v-if="errorMsg" class="help is-danger">{{errorMsg}}</div>
            <a class="button is-success is-large"
              data-test="forLink"
              v-on:click="four"
              style="margin-left:auto; margin-right: 20px;"
            >
              <i18n>For</i18n>
            </a>
            <a class="button is-danger is-large"
              id="AgainstLink"
              v-on:click="against"
              style="margin-right:auto; margin-right: 20px;"
            >
              <i18n>Against</i18n>
            </a>
          </div>
        </div>
      </div>
      <div class="column"></div>
    </div>
  </section>
</template>
<script>
import sbp from '../../../shared/sbp.js'
import backend from '../controller/backend/'
import template from 'string-template'
import L from './utils/translations'
import _ from 'lodash'
export default {
  name: 'Vote',
  computed: {
    contract () {
      return this.$store.state[this.$route.query.groupId] || {proposals: {}}
    },
    proposal () {
      return this.contract.proposals[this.$route.query.proposalHash] || {proposal: null}
    },
    memberCount () {
      return this.$store.getters[`${this.$route.query.groupId}/memberUsernames`].length
    }
  },
  methods: {
    async four () { // for is a reserved word so Vue doesn't like it
      this.errorMsg = null
      try {
        // Create a vote for the proposal
        let vote = await sbp('gi/contract/create-action', 'GroupVoteForProposal',
          {
            username: this.$store.state.loggedIn.name,
            proposalHash: this.$route.query.proposalHash
          },
          this.$route.query.groupId
        )
        let proposal = _.cloneDeep(this.proposal)
        let threshold = Math.ceil(proposal.threshold * this.memberCount)

        await sbp('backend/publishLogEntry', vote)
        // If the vote passes fulfill the action
        if (proposal.for.length + 1 >= threshold) {
          let lastActionHash = null
          const actionDate = new Date().toString()
          for (let step of proposal.actions) {
            let latest = await sbp('backend/latestHash', step.contractID)
            let actObj = JSON.parse(template(step.action, {lastActionHash, actionDate}))
            let entry = new Events[actObj.type](actObj.data, latest)
            lastActionHash = entry.hash()
            await sbp('backend/publishLogEntry', entry)
          }
        }
        // return to mailbox
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
        let vote = await sbp('gi/contract/create-action', 'GroupVoteAgainstProposal',
          {
            username: this.$store.state.loggedIn.name,
            proposalHash: this.$route.query.proposalHash
          },
          this.$route.query.groupId
        )
        await sbp('backend/publishLogEntry', vote)
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
