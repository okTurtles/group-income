<template>
  <div>

    <i18n class="notification gi-is-banner gi-notify" v-if="allVoted">Cool, you already voted on all proposals.</i18n>

    <voting
      v-for="proposal in proposalList.notVoted"
      v-bind="proposal"
      :onVoteAgainst="handleVoteAgainst"
      :onVoteFor="handleVoteFor"
    />

    <voting
      v-for="proposal in proposalList.own"
      v-bind="proposal"
      :onCloseProposal="handleCloseProposal"
    />

    <voting
      v-for="proposal in proposalList.alreadyVoted"
      v-bind="proposal"
      :onVoteAgainst="handleVoteAgainst"
      :onVoteFor="handleVoteFor"
    />
  </div>
</template>
<style lang="scss" scoped>
@import "../../assets/sass/theme/index";

.gi-notify {
  display: block;
  margin-top: $gi-spacer-lg;
}

.gi-showAll {
  margin-top: -$gi-spacer;
}
</style>
<script>
import { mapGetters } from 'vuex'
import sbp from '../../../../shared/sbp.js'
import Voting from '../components/Voting'

export default {
  name: 'Proposals',
  components: {
    Voting
  },
  computed: {
    ...mapGetters([
      'currentUserIdentityContract',
      'currentGroupState'
    ]),
    proposalList () {
      const notVoted = []
      const alreadyVoted = []
      const own = []

      const groupData = this.currentGroupState
      const proposals = groupData.proposals
      const userData = this.currentUserIdentityContract.attributes

      for (let hash in proposals) {
        const proposal = proposals[hash]
        const proposalData = {
          type: proposal.type, // 'invitation' or 'removal' for member, field name for rule/mincome
          votes: {
            total: Object.entries(groupData.profiles).length,
            received: proposal.for.length + proposal.against.length - 1 // initiator's for vote doesn't count here
          },
          value: proposal.value || proposal.candidate || null,
          originalValue: groupData[proposal.type] || null,
          ownVote: proposal.for.includes(userData.name) || proposal.against.includes(userData.name)
            ? proposal.for.includes(userData.name)
            : null,
          isOwnProposal: proposal.initiator === userData.name,
          initiator: proposal.initiator,
          hash: hash
        }

        if (proposalData.isOwnProposal) {
          own.push(proposalData)
        } else if (proposalData.ownVote === null) {
          notVoted.push(proposalData)
        } else {
          alreadyVoted.push(proposalData)
        }
      }

      return { notVoted, alreadyVoted, own }
    },
    allVoted () {
      const { notVoted, alreadyVoted } = this.proposalList

      return alreadyVoted.length && notVoted.length === 0
    }
  },
  methods: {
    async handleVoteAgainst (hash) {
      try {
        // Create a vote against the proposal
        const groupId = this.$store.state.currentGroupId
        const vote = await sbp('gi/contract/create-action', 'GroupVoteAgainstProposal', {
          username: this.currentUserIdentityContract.attributes.name,
          proposalHash: hash
        }, groupId)
        await sbp('backend/publishLogEntry', vote)
      } catch (ex) {
        // TODO: save to error log
        console.error(ex)
        throw new Error()
      }
    },
    async handleVoteFor (hash) {
      try {
        // Create a vote for the proposal
        const groupId = this.$store.state.currentGroupId
        const vote = await sbp('gi/contract/create-action', 'GroupVoteForProposal', {
          username: this.currentUserIdentityContract.attributes.name,
          proposalHash: hash
        }, groupId)
        await sbp('backend/publishLogEntry', vote)

        // If the vote passes fulfill the action
        const proposal = this.$store.getters.proposalData(hash)
        const memberCount = Object.entries(this.currentGroupState.profiles).length
        const threshold = Math.ceil(proposal.threshold * memberCount)
        if (proposal.for.length + 1 >= threshold) {
          await this.handleVotePassed(proposal)
        }
      } catch (ex) {
        // TODO: save to error log
        console.error(ex)
        throw new Error()
      }
    },
    async handleVotePassed (proposal) {
      try {
        // If the vote passes fulfill the action
        for (let step of proposal.actions) {
          await sbp('backend/publishLogEntry', step.action)
        }
      } catch (ex) {
        // TODO: save to error error
        console.error(ex)
        throw new Error()
      }
    },
    async handleCloseProposal (hash) {
      try {
        // Create proposal close event
        const groupId = this.$store.state.currentGroupId
        const close = await sbp('gi/contract/create-action', 'GroupCloseProposal', {
          username: this.currentUserIdentityContract.attributes.name,
          proposalHash: hash
        }, groupId)
        await sbp('backend/publishLogEntry', close)
      } catch (ex) {
        // TODO: save to error log
        console.error(ex)
        throw new Error()
      }
    }
  }
}
</script>
