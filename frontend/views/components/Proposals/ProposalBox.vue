<template lang='pug'>
li.c-wrapper
  user-image.c-avatarProposing(:username='proposal.meta.username')
  .c-content
    h4.has-text-bold {{proposalTitle}}:
    p.has-text-1 {{proposal.data.proposalData.reason}}
    template
      .c-proposal
        user-image.c-proposal-icon(:username='proposal.meta.username')
        .c-content
          p.has-text-bold {{typeDescription}}
          p.has-text-1(
            :class='{ "has-text-danger": proposal.status === statuses.STATUS_FAILED, "has-text-success": proposal.status === statuses.STATUS_PASSED }'
            ) {{statusDescription}}
        .ctas
          proposal-vote-options(
            v-if='proposal.status === statuses.STATUS_OPEN'
            :proposalHash='proposalHash'
          )
      p.c-sendLink(v-if='invitationLink')
        i18n(
          :args='{ user: proposal.data.proposalData.member}'
        ) Please send the following link to {user} so they can join the group:
        a.link(:href='invitationLink') {{invitationLink}}
</template>

<script>
import { mapGetters, mapState } from 'vuex'
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
  STATUS_WITHDRAWN,
  STATUS_CANCELLED,
  buildInvitationUrl
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
  computed: {
    ...mapGetters([
      'currentGroupState',
      'groupMembersCount',
      'currentUserIdentityContract'
    ]),
    ...mapState(['currentGroupId']),
    proposal () {
      return this.currentGroupState.proposals[this.proposalHash]
    },
    proposalType () {
      return this.proposal.data.proposalType
    },
    statuses () {
      return { STATUS_OPEN, STATUS_PASSED, STATUS_FAILED, STATUS_EXPIRED, STATUS_WITHDRAWN, STATUS_CANCELLED }
    },
    proposalTitle () {
      const { identityContractID } = this.proposal.meta
      const username = this.$store.state[identityContractID].attributes.name
      const currentUsername = this.currentUserIdentityContract.attributes.name
      const who = username === currentUsername ? 'You' : username
      const isOpen = this.proposal.status === STATUS_OPEN

      if (!isOpen) {
        return this.L('{who} proposed', { who })
      }
      return username === currentUsername
        ? this.L('You are proposing')
        : this.L('{who} is proposing', { who })
    },
    typeDescription () {
      return {
        [PROPOSAL_INVITE_MEMBER]: () => this.L('Add {user} to group.', {
          user: this.proposal.data.proposalData.member
        }),
        [PROPOSAL_REMOVE_MEMBER]: () => this.L('Remove {user} from group.', {
          user: this.proposal.data.proposalData.member
        }),
        [PROPOSAL_GROUP_SETTING_CHANGE]: () => this.L('TODO: Change [setting] from [current] to [new-value]', {}),
        [PROPOSAL_PROPOSAL_SETTING_CHANGE]: () => this.L('TODO: Change [rule setting] from [current] to [new-value]', {}),
        [PROPOSAL_GENERIC]: () => this.L('TODO: Change [generic] from [current] to [new-value]', {})
      }[this.proposalType]()
    },
    statusDescription () {
      switch (this.proposal.status) {
        case STATUS_OPEN: {
          const votesCount = Object.keys(this.proposal.votes).length

          return this.L('{count} out of {total} members voted.', {
            count: votesCount,
            total: this.groupMembersCount
          })
        }
        case STATUS_FAILED: {
          return this.L('Proposal refused.')
        }
        case STATUS_CANCELLED: {
          return this.L('Proposal cancelled.')
        }
        case STATUS_PASSED: {
          return this.L('Proposal accepted!')
        }
        default:
          return `TODO status: ${this.proposal.status}`
      }
    },
    invitationLink () {
      if (this.proposalType === PROPOSAL_INVITE_MEMBER && this.proposal.status === STATUS_PASSED) {
        const secret = this.proposal.payload.inviteSecret
        if (this.currentGroupState.invites[secret].status === 'valid') {
          return buildInvitationUrl(this.currentGroupId, this.proposal.payload.inviteSecret)
        }
        return false
      }
      return false
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

$spaceVertical: $spacer-sm*3;

.c-wrapper {
  padding-bottom: $spaceVertical;

  &:not(:last-child) {
    border-bottom: 1px solid $general_1;
  }
}

.c-wrapper,
.c-proposal {
  display: flex;
  align-items: flex-start;
  margin-top: $spaceVertical;
}

.c-content {
  flex-grow: 1;
}

.c-wrapper-content {
  flex-grow: 1;
}

.c-avatarProposing,
.c-proposal-icon {
  margin-right: $spaceVertical;
  margin-top: $spacer-xs; // visually better aligned
}

.c-sendLink {
  border-radius: 0.25rem;
  background-color: $general_2;
  padding: $spacer;
  margin-top: $spacer;

  .link {
    word-break: break-all;
  }
}
</style>
