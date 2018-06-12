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
      :hash="proposal.hash"
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
      :hash="proposal.hash"
      :onCloseProposal="handleCloseProposal"
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
      :hash="proposal.hash"
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
import template from 'string-template'
import Voting from '../components/Voting'
import * as Events from '../../../../shared/events'
import backend from '../../controller/backend/'

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
        const proposalData = {
          type: proposals[hash].type, // 'invitation' or 'removal' for member, field name for rule/mincome
          votes: {
            total: Object.entries(groupData.profiles).length,
            received: proposals[hash].for.length + proposals[hash].against.length,
            threshold: proposals[hash].threshold
          },
          value: proposals[hash].value || proposals[hash].candidate || null,
          originalValue: groupData[proposals[hash].type] || null,
          ownVote: proposals[hash].for.includes(userData.name) || proposals[hash].against.includes(userData.name)
            ? proposals[hash].for.includes(userData.name)
            : null,
          isOwnProposal: proposals[hash].initiator === userData.name,
          initiator: proposals[hash].initiator,
          hash: hash
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
    async handleVoteAgainst (hash) {
      try {
        // Create a vote against the proposal
        const groupId = this.$store.state.currentGroupId
        const latest = await backend.latestHash(groupId)
        const vote = new Events.HashableGroupVoteAgainstProposal({
          username: this.currentUserIdentityContract.attributes.name,
          proposalHash: hash
        }, latest)
        await backend.publishLogEntry(groupId, vote)
      } catch (ex) {
        // TODO: diplay error to user
        console.error('Failed to cast vote:')
        console.log(ex)
      }
    },
    async handleVoteFor (hash) {
      try {
        // Create a vote for the proposal
        const groupId = this.$store.state.currentGroupId
        let latest = await backend.latestHash(groupId)
        const vote = new Events.HashableGroupVoteForProposal({
          username: this.currentUserIdentityContract.attributes.name,
          proposalHash: hash
        }, latest)
        await backend.publishLogEntry(groupId, vote)

        // If the vote passes fulfill the action
        const proposal = this.$store.getters.proposalData(hash)
        const memberCount = Object.entries(this.currentGroupState.profiles).length
        const threshold = Math.ceil(proposal.threshold * memberCount)
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
      } catch (ex) {
        // TODO: diplay error to user
        console.error('Failed to cast vote:')
        console.log(ex)
      }
    },
    async handleCloseProposal (hash) {
      try {
        // Create proposal close event
        const groupId = this.$store.state.currentGroupId
        const latest = await backend.latestHash(groupId)
        const close = new Events.HashableGroupCloseProposal({
          username: this.currentUserIdentityContract.attributes.name,
          proposalHash: hash
        }, latest)
        await backend.publishLogEntry(groupId, close)
      } catch (ex) {
        // TODO: diplay error to user
        console.error('Failed to close proposal:')
        console.log(ex)
      }
    }
  }
}
</script>
