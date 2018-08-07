<template>
  <div>
    <proposal-box
      v-for="proposal in proposalList.notVoted"
      :proposal="proposal"
      :onVoteAgainst="handleVoteAgainst"
      :onVoteFor="handleVoteFor"
      data-test="proposalsNotVoted"
    />
    <proposal-box
      v-for="proposal in proposalList.own"
      :proposal="proposal"
      :onCloseProposal="handleCloseProposal"
    />
    <proposal-box
      v-for="proposal in proposalList.alreadyVoted"
      :proposal="proposal"
      data-test="proposalsAlreadyVoted"
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
import ProposalBox from '../components/ProposalBox/ProposalBox.vue'

export default {
  name: 'Proposals',
  components: {
    ProposalBox
  },
  computed: {
    ...mapGetters([
      'proposalData',
      'currentUserIdentityContract',
      'currentGroupState'
    ]),
    proposalList () {
      const notVoted = []
      const alreadyVoted = []
      const own = []
      const groupData = this.currentGroupState
      const proposals = groupData.proposals
      for (let hash in proposals) {
        const proposal = this.proposalData(hash)
        if (proposal.isMyProposal) {
          own.push(proposal)
        } else if (proposal.myVote) {
          alreadyVoted.push(proposal)
        } else {
          notVoted.push(proposal)
        }
      }
      return { notVoted, alreadyVoted, own }
    }
  },
  methods: {
    async handleVote (hash, vote) {
      try {
        // Create a vote against the proposal
        const groupId = this.$store.state.currentGroupId
        const voteAction = await sbp('gi/contract/create-action', 'GroupProposalVote', {
          username: this.currentUserIdentityContract.attributes.name,
          proposalHash: hash,
          vote
        }, groupId)
        await sbp('backend/publishLogEntry', voteAction)
      } catch (ex) {
        // TODO: save to error log
        console.error(ex)
        throw new Error()
      }
    },
    handleVoteAgainst (hash) {
      this.handleVote(hash, -1)
    },
    async handleVoteFor (hash) {
      this.handleVote(hash, 1)
      // If the vote passes fulfill the action
      // TODO better place for this?
      const proposal = this.$store.getters.proposalData(hash)
      const memberCount = Object.entries(this.currentGroupState.profiles).length
      const threshold = Math.ceil(proposal.threshold * memberCount)
      if (Object.values(proposal.votes).filter(vote => vote.vote === 1).length + 1 >= threshold) {
        await this.handleVotePassed(proposal)
      }
    },
    async handleVotePassed (proposal) {
      try {
        // If the vote passes fulfill the action
        // TODO: this is poorly implementated. do not create poposals in this manner.
        for (let step of proposal.actions) {
          let actData = JSON.parse(step.action)
          let entry = await sbp('gi/contract/create-action', step.type, actData, step.contractID)
          await sbp('backend/publishLogEntry', entry)
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
