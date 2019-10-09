<template lang='pug'>
li.c-wrapper
  user-image.c-avatar(:username='proposal.meta.username')
  .c-header
    h4.has-text-bold {{title}}:
    span(v-if='displayDate') {{humanDate}}
  .c-main
    p.has-text-1 "{{proposal.data.proposalData.reason}}"
    // TODO - loop for grouped proposals
    template
      .c-proposal(data-test='proposal')
        i(:class='proposalIconClass')
        .c-proposal-main
          p.has-text-bold {{typeDescription}}
          p.has-text-1(
            :class='{ "has-text-danger": proposal.status === statuses.STATUS_FAILED, "has-text-success": proposal.status === statuses.STATUS_PASSED }'
            data-test="statusDescription"
            ) {{statusDescription}}
        .ctas
          proposal-vote-options(
            v-if='proposal.status === statuses.STATUS_OPEN'
            :proposalHash='proposalHash'
          )
      p.c-sendLink(v-if='invitationLink' data-test="sendLink")
        i18n(
          :args='{ user: proposal.data.proposalData.member}'
        ) Please send the following link to {user} so they can join the group:
        | &nbsp;
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
import { convertDateToLocale } from '~shared/dateSync.js'

export default {
  // TODO rename containers/proposals/ProposalVote
  name: 'ProposalBox',
  props: {
    proposalHash: String,
    displayDate: Boolean
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
    title () {
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
    humanDate () {
      const date = convertDateToLocale(this.proposal.meta.createdDate)

      // TODO: Display date format based on locale
      return date.toLocaleDateString('en-EN', {
        year: 'numeric', month: 'long', day: 'numeric'
      })
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
    proposalIconClass () {
      const type = {
        [PROPOSAL_INVITE_MEMBER]: 'icon-user-plus',
        [PROPOSAL_REMOVE_MEMBER]: 'icon-user-times',
        [PROPOSAL_GROUP_SETTING_CHANGE]: 'icon-users-cog',
        [PROPOSAL_PROPOSAL_SETTING_CHANGE]: 'icon-chart-pie',
        [PROPOSAL_GENERIC]: 'icon-poll'
      }

      const status = {
        [STATUS_OPEN]: 'has-background-primary has-text-primary',
        [STATUS_PASSED]: 'icon-check has-background-success has-text-success',
        [STATUS_FAILED]: 'icon-times has-background-danger has-text-danger',
        [STATUS_CANCELLED]: 'has-background-general has-text-1'
      }

      // So the icon is the correct one, no matter the proposal type
      if ([STATUS_PASSED, STATUS_FAILED].includes(this.proposal.status)) {
        return `${status[this.proposal.status]} c-proposal-icon`
      }

      return `${type[this.proposalType]} ${status[this.proposal.status]} c-proposal-icon`
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

// [1] - so text breaks when it contains long hashes,
//      without breaking the layout.

$spaceVertical: $spacer-sm*3;

.c-wrapper {
  margin-top: $spaceVertical;
  padding-bottom: $spaceVertical;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-areas:
    "avatar header"
    "main main";

  @include tablet {
    grid-template-areas:
      "avatar header"
      "avatar main";
  }

  &:not(:last-child) {
    border-bottom: 1px solid $general_1;
  }
}

.c-avatar {
  grid-area: avatar;
  width: 2.5rem;
  height: 2.5rem;
}

.c-header {
  grid-area: header;
  align-self: center;

  @include tablet {
    display: flex;
    justify-content: space-between;
  }
}

.c-main {
  grid-area: main;
  margin-top: $spacer-xs;
  word-break: break-word; // [1]
}

.c-avatar,
.c-proposal-icon {
  margin-right: $spaceVertical;
  margin-bottom: $spacer-xs;
  margin-top: $spacer-xs; // visually better aligned
  flex-shrink: 0
}

.c-proposal {
  display: flex;
  align-items: flex-start;
  margin-top: $spaceVertical;

  &-main {
    flex-grow: 1;
  }

  &-icon {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    text-align: center;
    line-height: 2rem;

    @include phone {
      margin-left: $spacer-sm; // TODO: Suggest to @mmbotelho
    }
  }
}

.c-sendLink {
  border-radius: 0.25rem;
  background-color: $general_1;
  padding: $spacer;
  margin-top: $spacer;

  .link {
    word-break: break-all; // [1]
    display: inline; // so the border goes through multiple lines
  }
}
</style>
