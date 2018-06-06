<template>
  <dashboard-section title="Active Proposals">

    <!--  Start Original Voting Banner to delete soon -->
    <voting-banner v-for="proposal in Object.values(proposals)"
      :proposal="proposal"
    />
    <!--  End Original Voting Banner to delete soon -->

    <h4 class="title is-size-5 notification is-warning gi-is-banner gi-notify"
      v-if="groupProposals.notVoted.length"
    >
      <i18n>These are waiting for your vote!</i18n>
    </h4>
    <voting
      v-for="proposal in groupProposals.notVoted"
      :proposal="proposal"
      :onVoteAgainst="handleVoteAgainst"
      :onVotedFor="handleVoteFor"
    />


    <h4 class="title is-size-5" v-if="groupProposals.own.length">
      <i18n>Your own proposals</i18n>
    </h4>
    <voting
      v-for="proposal in groupProposals.own"
      :proposal="proposal"
      :handleCloseProposal="onCloseProposal"
    />

    <i18n class="notification gi-is-banner gi-notify"
      v-if="!showOtherProposals && allVoted"
    >
      Cool, you already voted on all active proposals.
    </i18n>

    <a class="gi-showOther has-text-weight-bold"
      v-if="!showOtherProposals && groupProposals.alreadyVoted.length"
      @click.prevent="showOtherProposals = true"
    >
      <i18n>Show</i18n> {{groupProposals.alreadyVoted.length}} <i18n>voted proposals</i18n>
    </a>

    <h4 class="title is-size-5" v-if="showOtherProposals">
      <i18n>Voted proposals</i18n>
    </h4>
    <voting
      v-if="showOtherProposals"
      v-for="proposal in groupProposals.alreadyVoted"
      :proposal="proposal"
      :onVoteAgainst="handleVoteAgainst"
      :onVotedFor="handleVoteFor"
    />
  </dashboard-section>
</template>
<style lang="scss" scoped>
@import "../../assets/sass/theme/index";

.gi-notify {
  display: block;
  margin-top: $gi-spacer-lg;
}

</style>
<script>
import DashboardSection from '../components/DashboardSection.vue'
import Voting from '../components/Voting.vue'
import VotingBanner from './VotingBanner.vue'
// import ShowProposals from './ShowProposals.vue'

export default {
  name: 'Proposals',
  components: {
    DashboardSection,
    Voting,
    VotingBanner
    // ShowProposals
  },
  props: {
    proposals: Object
  },
  data () {
    return {
      showOtherProposals: false,
      mockProposals: [
        {
          type: 'member',
          member: {
            picture: 'assets/images/default-avatar.png',
            name: 'Gil'
          },
          title: 'Remove Member',
          text: 'Sam had proposed to <strong>remove Gil</strong> from the group.',
          ctas: {
            for: 'Remove Gil',
            against: 'Keep Gil'
          },
          members: 7,
          votes: 4,
          userVote: null
        },
        {
          type: 'rule',
          value: 0.6,
          title: 'Rule: Add Memmber',
          text: 'Karl had proposed to change <strong>Add Member Rule from 80% to 60% </strong>.',
          textDetails: 'Instead of 6, now at least 5 of 8 members need to approve a new member.',
          ctas: {
            for: 'Change to 60%',
            against: 'Keep 80%'
          },
          members: 7,
          votes: 0,
          userVote: null
        },
        {
          type: 'rule',
          value: 0.92,
          title: 'Rule: Change Mincome',
          text: 'Karl had proposed to change <strong>Mincome Rule from 87% to 92%</strong>.',
          textDetails: 'Instead of 6, now at least 5 of 7 members need to approve a new member.',
          ctas: {
            for: 'Change to 92%',
            against: 'Keep 87%'
          },
          members: 7,
          votes: 1,
          userVote: false
        },
        {
          type: 'member',
          member: {
            picture: 'assets/images/default-avatar.png',
            name: 'Kim'
          },
          title: 'Add Member',
          text: 'Rachel had proposed to <strong>add Kim</strong> to the group.',
          ctas: {
            for: 'Invite Kim',
            against: 'Don\'t invite'
          },
          members: 7,
          votes: 3,
          userVote: true
        },
        {
          type: 'mincome',
          value: '$150',
          title: 'Min Income',
          text: 'You had proposed to change <strong>mincome from $200 to $150</strong>',
          members: 7,
          votes: 0,
          ownProposal: true
        }
      ]
    }
  },
  computed: {
    groupProposals () {
      const notVoted = []
      const alreadyVoted = []
      const own = []

      for (var i = 0, l = this.mockProposals.length; i < l; i++) {
        const proposal = this.mockProposals[i]
        if (proposal.ownProposal) {
          own.push(proposal)
        } else if (proposal.userVote === null) {
          notVoted.push(proposal)
        } else if (proposal.userVote !== null) {
          alreadyVoted.push(proposal)
        }
      }

      return { notVoted, alreadyVoted, own }
    },
    allVoted () {
      const { notVoted, alreadyVoted } = this.groupProposals

      return alreadyVoted.length && notVoted.length === 0
    }
  },
  methods: {
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
