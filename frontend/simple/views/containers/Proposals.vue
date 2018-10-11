<template>
  <div>
    <!--  Start Original Voting Banner to delete soon -->
    <voting-banner v-for="proposal in Object.values(proposals)"
      :proposal="proposal"
    />
    <!--  End Original Voting Banner to delete soon -->

    <!-- REVIEW: Not sure about these banners. -->

    <!--
    <h4 class="title is-size-5 notification is-warning gi-is-banner c-notify"
      v-if="groupProposals.notVoted.length"
    >
      <i18n>These are waiting for your vote!</i18n>
    </h4>
    -->

    <i18n class="notification gi-is-banner c-notify" v-if="allVoted">Cool, you already voted on all proposals.</i18n>

    <voting
      v-for="proposal in groupProposals.notVoted"
      :type="proposal.type"
      :proposal="proposal.data"
      :onVoteAgainst="handleVoteAgainst"
      :onVoteFor="handleVoteFor"
    />

    <voting
      v-for="proposal in groupProposals.own"
      :type="proposal.type"
      :proposal="proposal.data"
      :handleCloseProposal="onCloseProposal"
    />

    <voting
      v-for="proposal in groupProposals.alreadyVoted"
      :type="proposal.type"
      :proposal="proposal.data"
      :onVoteAgainst="handleVoteAgainst"
      :onVoteFor="handleVoteFor"
    />
  </div>
</template>
<style lang="scss" scoped>
@import "../../assets/sass/theme/index";

.c-notify {
  display: block;
  margin-top: $gi-spacer-lg;
}
</style>
<script>
import Voting from '../components/Voting'
import VotingBanner from './VotingBanner.vue'

export default {
  name: 'Proposals',
  components: {
    Voting,
    VotingBanner
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
          data: {
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
          }
        },
        {
          type: 'rule',
          data: {
            value: 0.6,
            title: 'Rule: Add Member',
            text: 'Karl had proposed to change <strong>Add Member Rule from 80% to 60% </strong>.',
            textDetails: 'Instead of 6, now at least 5 of 8 members need to approve a new member.',
            ctas: {
              for: 'Change to 60%',
              against: 'Keep 80%'
            },
            members: 7,
            votes: 0,
            userVote: null
          }
        },
        {
          type: 'rule',
          data: {
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
          }
        },
        {
          type: 'member',
          data: {
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
          }
        },
        {
          type: 'mincome',
          data: {
            value: '$150',
            title: 'Min Income',
            text: 'You had proposed to change <strong>mincome from $200 to $150</strong>',
            members: 7,
            votes: 0,
            ownProposal: true
          }
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
        if (proposal.data.ownProposal) {
          own.push(proposal)
        } else if (proposal.data.userVote === null) {
          notVoted.push(proposal)
        } else if (proposal.data.userVote !== null) {
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
