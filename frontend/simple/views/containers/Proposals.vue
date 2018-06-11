<template>
  <div>

    <i18n class="notification gi-is-banner gi-notify" v-if="allVoted">Cool, you already voted on all proposals.</i18n>

    <voting
      v-for="proposal in proposalList.notVoted"
      :type="proposal.type"
      :votes="proposal.votes"
      :value="proposal.value"
      :member="proposal.member"
      :originalValue="proposal.originalValue"
      :ownVote="proposal.ownVote"
      :isOwnProposal="proposal.isOwnProposal"
      :initiator="proposal.initiator"
      :onVoteAgainst="handleVoteAgainst"
      :onVoteFor="handleVoteFor"
    />

    <voting
      v-for="proposal in proposalList.own"
      :type="proposal.type"
      :votes="proposal.votes"
      :value="proposal.value"
      :member="proposal.member"
      :originalValue="proposal.originalValue"
      :ownVote="proposal.ownVote"
      :isOwnProposal="proposal.isOwnProposal"
      :initiator="proposal.initiator"
      :handleCloseProposal="onCloseProposal"
    />

    <voting
      v-for="proposal in proposalList.alreadyVoted"
      :type="proposal.type"
      :votes="proposal.votes"
      :value="proposal.value"
      :member="proposal.member"
      :originalValue="proposal.originalValue"
      :ownVote="proposal.ownVote"
      :isOwnProposal="proposal.isOwnProposal"
      :initiator="proposal.initiator"
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

      for (let proposal of Object.values(proposals)) {
        const proposalData = {
          type: proposal.type, // 'invitation' or 'removal' for member, field name for rule/mincome
          votes: {
            total: Object.entries(groupData.profiles).length,
            received: proposal.for.length + proposal.against.length,
            threshold: proposal.threshold
          },
          value: proposal.value || proposal.candidate || null,
          originalValue: groupData[proposal.type] || null,
          ownVote: proposal.for.includes(userData.name) || proposal.against.includes(userData.name)
            ? proposal.for.includes(userData.name)
            : null,
          isOwnProposal: proposal.initiator === userData.name,
          initiator: proposal.initiator
        }

        if (proposalData.isOwnProposal) {
          own.push(proposalData)
        } else if (proposalData.ownVote === null) {
          notVoted.push(proposalData)
        } else if (proposalData.ownVote !== null) {
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
    // TODO: voteFor, voteAgainst functions to be called by voting comp
    // for actual vote casting
    handleVoteAgainst () {
      console.log('TODO Logic - The user voted against')
    },
    handleVoteFor () {
      console.log('TODO Logic - The user voted for')
    },
    handleCloseProposal () {
      console.log('TODO Logic - The proposal was closed')
    }
  }
}
</script>
