<template lang="pug">
section.section.full-screen
  .columns
    .column
    .column(style='text-align: center;')
      div
        .subtitle
          i18n Your vote has been requested on a proposal for the group:

        h1 {{contract.groupName}}

      .panel
        .panel-block
          p
            // TODO different templates for different invitation types
            i18n This is an invitation proposal. The user to be invited:
            strong(data-test='candidateName') {{proposal.candidate}}

        .panel-block.notification.is-warning(style='text-align: center;')
          strong(style='margin: 0 auto;')
            i18n Your Decision?

        .panel-block.center(style='display: block; text-align: center;')
          .help.is-danger(v-if='errorMsg') {{errorMsg}}

          a.button.is-success(
            style='margin-left:auto; margin-right: 20px;'
            @click='voteFor'
            data-test='forLink'
          )
            i18n For

          a.button.is-danger(
            @click='voteAgainst'
            style='margin-right:auto; margin-right: 20px;'
          )
            i18n Against
    .column
</template>

<script>
import sbp from '~/shared/sbp.js'
import L from '@view-utils/translations.js'
import * as _ from '@utils/giLodash.js'
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
        const vote = await sbp('gi/contract/create-action', 'GroupVoteForProposal',
          {
            username: this.$store.state.loggedIn.name,
            proposalHash: this.$route.query.proposalHash
          },
          this.$route.query.groupId
        )
        const proposal = _.cloneDeep(this.proposal)
        const threshold = Math.ceil(proposal.threshold * this.memberCount)

        await sbp('backend/publishLogEntry', vote)
        // If the vote passes fulfill the action
        if (proposal.for.length + 1 >= threshold) {
          // TODO: this is poorly implementated. do not create poposals in this manner.
          console.error('proposal actions:', proposal.actions)
          for (const step of proposal.actions) {
            const actData = JSON.parse(step.action)
            const entry = await sbp('gi/contract/create-action', step.type, actData, step.contractID)
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
        const vote = await sbp('gi/contract/create-action', 'GroupVoteAgainstProposal',
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
