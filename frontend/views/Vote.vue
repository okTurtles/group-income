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
              v-on:click="voteFor"
              style="margin-left:auto; margin-right: 20px;"
            >
              <i18n>For</i18n>
            </a>
            <a class="button is-danger is-large"
              id="AgainstLink"
              v-on:click="voteAgainst"
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
import sbp from '../../shared/sbp.js'
import L from './utils/translations.js'
import * as _ from '../utils/giLodash.js'
export default {
  name: 'Vote',
  computed: {
    contract () {
      return this.$store.state[this.$route.query.groupId] || { proposals: {} }
    },
    proposal () {
      return this.contract.proposals[this.$route.query.proposalHash] || { proposal: null }
    },
    memberCount () {
      return this.$store.getters[`${this.$route.query.groupId}/memberUsernames`].length
    }
  },
  methods: {
    async voteFor () {
      this.errorMsg = null
      try {
        // TODO: this section is unclear and it's not clear what's going on at all.
        //       rewrite and make it nicer.
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
          // TODO: this is poorly implementated. do not create poposals in this manner.
          console.error('proposal actions:', proposal.actions)
          for (let step of proposal.actions) {
            let actData = JSON.parse(step.action)
            let entry = await sbp('gi/contract/create-action', step.type, actData, step.contractID)
            await sbp('backend/publishLogEntry', entry)
          }
        }
        // return to mailbox
        this.$router.push({ path: '/mailbox' })
      } catch (ex) {
        console.log(ex)
        this.errorMsg = L('Failed to Cast Vote')
      }
    },
    async voteAgainst () {
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
        this.$router.push({ path: '/mailbox' })
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
