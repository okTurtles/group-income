<template lang='pug'>
.c-wrapper
  user-image.c-avatarProposing(:username='proposal.meta.username')
  .c-content
    h4.has-text-bold {{userProposing.name}} is proposing:
    p.has-text-1 {{proposal.data.proposalData.reason}}
    .c-proposal
      user-image.c-proposal-icon(:username='proposal.meta.username')
      .c-content
        p.has-text-bold {{this.typeDescription}}
        p.has-text-1 {{this.statusDescription}}
      .ctas
        proposal-vote-options(:proposalHash='proposalHash')

  //
    i18n(tag='strong' :args='{ type, user: meta.username, desc: description }') Proposal to {type} {desc} from {user}
    | &nbsp;&nbsp;
    i18n(:args='{ for: vYes, against: vNo, indifferent: vIndif }') [{for} for, {against} against, {indifferent} indifferent]
    | &nbsp;&nbsp;
    i18n(:args='{ status }' html='Status: <strong>{status}</strong>')
    | &nbsp;&nbsp;
    router-link.button(
      v-if='!ourVote && status === statuses.STATUS_OPEN'
      :to='{ path: "/vote", query: { groupId: currentGroupId, proposalHash } }'
    )
      i18n Vote here!
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import { VOTE_FOR, VOTE_AGAINST, VOTE_INDIFFERENT } from '@model/contracts/voting/rules.js'
import {
  PROPOSAL_INVITE_MEMBER,
  PROPOSAL_REMOVE_MEMBER,
  PROPOSAL_GROUP_SETTING_CHANGE,
  PROPOSAL_PROPOSAL_SETTING_CHANGE,
  PROPOSAL_GENERIC,
  STATUS_OPEN,
  STATUS_PASSED,
  STATUS_FAILED,
  STATUS_EXPIRED,
  STATUS_WITHDRAWN
} from '@model/contracts/voting/proposals.js'
import UserImage from '@containers/UserImage.vue'
import ProposalVoteOptions from '@containers/proposals/ProposalVoteOptions.vue'

export default {
  // TODO rename containers/proposals/ProposalVote
  name: 'ProposalBox',
  props: {
    proposalHash: String
  },
  components: {
    ProposalVoteOptions,
    UserImage
  },
  mounted () {
  },
  data () {
    return {
      ephemeral: {
      }
    }
  },
  computed: {
    proposal () {
      console.log('proposal list', this.currentGroupState.proposals[this.proposalHash])
      return this.currentGroupState.proposals[this.proposalHash]
    },
    userProposing () {
      const { identityContractID } = this.proposal.meta
      console.log('proposal user', this.$store.state[identityContractID])
      return this.$store.state[identityContractID].attributes
    },
    meta () {
      return this.proposal.meta
    },
    type () {
      return this.proposal.data.proposalType
    },
    data () {
      return this.proposal.data.proposalData
    },
    status () {
      return this.proposal.status
    },
    statuses () {
      return { STATUS_OPEN, STATUS_PASSED, STATUS_FAILED, STATUS_EXPIRED, STATUS_WITHDRAWN }
    },
    // boxClass () {
    //   return {
    //     [STATUS_OPEN]: 'has-background-primary-light',
    //     [STATUS_PASSED]: 'has-background-success',
    //     [STATUS_FAILED]: 'has-background-danger',
    //     [STATUS_EXPIRED]: 'has-background-warning',
    //     [STATUS_WITHDRAWN]: 'has-background-tertiary'
    //   }[this.status]
    // },
    typeDescription () {
      return {
        [PROPOSAL_INVITE_MEMBER]: () => this.L('Add {user} to group.', {
          user: this.proposal.data.proposalData.member
        }),
        [PROPOSAL_REMOVE_MEMBER]: () => this.L('Remove {user} from group.', {
          user: this.proposal.data.proposalData.member
        }),
        [PROPOSAL_GROUP_SETTING_CHANGE]: () => this.L('WIP: Change [setting] from [current] to [new-value]', {}),
        [PROPOSAL_PROPOSAL_SETTING_CHANGE]: () => this.L('WIP: Change [rule setting] from [current] to [new-value]', {}),
        [PROPOSAL_GENERIC]: () => this.L('WIP: Change [generic] from [current] to [new-value]', {})
      }[this.type]()
    },
    statusDescription () {
      if (this.status === STATUS_OPEN) {
        const votesCount = Object.keys(this.proposal.votes).length

        return this.L('{count} out of {total} members voted.', {
          count: votesCount,
          total: this.groupMembersCount
        })
      }
      // | 1 out of 6...
      // | refused or accepted
      // | send this link
      return 'Status wip...'
    },
    ourVote () {
      return this.proposal.votes[this.$store.state.loggedIn.username]
    },
    vYes () {
      return Object.values(this.proposal.votes).filter(x => x === VOTE_FOR).length
    },
    vNo () {
      return Object.values(this.proposal.votes).filter(x => x === VOTE_AGAINST).length
    },
    vIndif () {
      return Object.values(this.proposal.votes).filter(x => x === VOTE_INDIFFERENT).length
    },
    ...mapGetters(['currentGroupState', 'groupMembersCount']),
    ...mapState(['currentGroupId'])
  },
  methods: {
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.c-wrapper,
.c-proposal {
  display: flex;
  align-items: flex-start;
  margin-top: $spacer-sm*3;
}

.c-content {
  flex-grow: 1;
}

.c-wrapper-content {
  flex-grow: 1;
}

.c-avatarProposing,
.c-proposal-icon {
  margin-right: $spacer-sm*3;
  margin-top: $spacer-xs; // visually better aligned
}
</style>
