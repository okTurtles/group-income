<template lang='pug'>
  li.c-li(data-test='proposalItem')
    .c-item
      .c-main
        i(:class='iconClass')
        .c-main-content
          p.has-text-bold(data-test='typeDescription')
            | {{typeDescription}}
            tooltip.c-tip(
              v-if='isToRemoveMe && proposal.status === statuses.STATUS_OPEN'
              direction='top'
              :text='L("You cannot vote.")'
            )
              .button.is-icon-smaller.is-primary
                i.icon-question
          p.has-text-1(
            :class='{ "has-text-danger": proposal.status === statuses.STATUS_FAILED, "has-text-success": proposal.status === statuses.STATUS_PASSED }'
            data-test='statusDescription'
            ) {{statusDescription}}
      proposal-vote-options(
        v-if='proposal.status === statuses.STATUS_OPEN'
        :proposalHash='proposalHash'
      )
    p.c-sendLink(v-if='invitationLink' data-test='sendLink')
      i18n(
        :args='{ user: proposal.data.proposalData.member}'
      ) Please send the following link to {user} so they can join the group:
      | &nbsp;
      link-to-copy.c-invite-link(
        :link='invitationLink'
        tag='p'
      )
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import L from '@view-utils/translations.js'
import currencies from '~/frontend/views/utils/currencies.js'
import { buildInvitationUrl } from '@model/contracts/voting/proposals.js'
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
  STATUS_CANCELLED
} from '@model/contracts/voting/constants.js'
import ProposalVoteOptions from '@containers/proposals/ProposalVoteOptions.vue'
import LinkToCopy from '@components/LinkToCopy.vue'
import Tooltip from '@components/Tooltip.vue'
import { INVITE_STATUS } from '@model/contracts/group.js'

export default {
  name: 'ProposalItem',
  props: {
    proposalHash: String
  },
  components: {
    ProposalVoteOptions,
    LinkToCopy,
    Tooltip
  },
  computed: {
    ...mapGetters([
      'currentGroupState',
      'groupMembersCount',
      'userDisplayName',
      'ourUsername'
    ]),
    ...mapState(['currentGroupId']),
    statuses () {
      return { STATUS_OPEN, STATUS_PASSED, STATUS_FAILED, STATUS_EXPIRED, STATUS_CANCELLED }
    },
    proposal () {
      return this.currentGroupState.proposals[this.proposalHash]
    },
    proposalType () {
      return this.proposal.data.proposalType
    },
    isOurProposal () {
      return this.proposal.meta.username === this.ourUsername
    },
    isToRemoveMe () {
      return this.proposalType === PROPOSAL_REMOVE_MEMBER && this.proposal.data.proposalData.member === this.ourUsername
    },
    typeDescription () {
      return {
        [PROPOSAL_INVITE_MEMBER]: () => L('Add {user} to group.', {
          user: this.proposal.data.proposalData.member
        }),
        [PROPOSAL_REMOVE_MEMBER]: () => {
          const user = this.userDisplayName(this.proposal.data.proposalData.member)
          return this.isToRemoveMe
            ? L('Remove {user} (you) from the group.', { user })
            : L('Remove {user} from the group.', { user })
        },
        [PROPOSAL_GROUP_SETTING_CHANGE]: () => {
          const { setting } = this.proposal.data.proposalData

          const variablesMap = {
            'mincomeAmount': () => {
              const { mincomeCurrency, currentValue, proposedValue } = this.proposal.data.proposalData

              return {
                setting: L('mincome'),
                currentValue: currencies[mincomeCurrency].displayWithCurrency(currentValue),
                proposedValue: currencies[mincomeCurrency].displayWithCurrency(proposedValue)
              }
            }
          }[setting]()

          return L('Change {setting} from {currentValue} to {proposedValue}', variablesMap)
        },
        [PROPOSAL_PROPOSAL_SETTING_CHANGE]: () => L('TODO: Change [rule setting] from [current] to [new-value]', {}),
        [PROPOSAL_GENERIC]: () => L('TODO: Change [generic] from [current] to [new-value]', {})
      }[this.proposalType]()
    },
    statusDescription () {
      switch (this.proposal.status) {
        case STATUS_OPEN: {
          const excludeVotes = this.proposalType === PROPOSAL_REMOVE_MEMBER ? 1 : 0

          return L('{count} out of {total} members voted.', {
            count: Object.keys(this.proposal.votes).length,
            total: this.groupMembersCount - excludeVotes
          })
        }
        case STATUS_FAILED: {
          return L('Proposal refused.')
        }
        case STATUS_CANCELLED: {
          return L('Proposal cancelled.')
        }
        case STATUS_PASSED: {
          return L('Proposal accepted!')
        }
        default:
          return `TODO status: ${this.proposal.status}`
      }
    },
    iconClass () {
      const type = {
        [PROPOSAL_INVITE_MEMBER]: 'icon-user-plus',
        [PROPOSAL_REMOVE_MEMBER]: 'icon-user-minus',
        [PROPOSAL_GROUP_SETTING_CHANGE]: 'icon-coins',
        [PROPOSAL_PROPOSAL_SETTING_CHANGE]: 'icon-chart-pie',
        [PROPOSAL_GENERIC]: 'icon-poll'
      }

      const status = {
        [STATUS_OPEN]: 'has-background-primary has-text-primary',
        [STATUS_PASSED]: 'icon-check has-background-success has-text-success',
        [STATUS_FAILED]: 'icon-times has-background-danger has-text-danger',
        [STATUS_CANCELLED]: 'has-background-general has-text-1'
      }

      if ([STATUS_PASSED, STATUS_FAILED].includes(this.proposal.status)) {
        // Show the status icon, no matter the proposal type
        return `${status[this.proposal.status]} icon-round`
      }

      return `${type[this.proposalType]} ${status[this.proposal.status]} icon-round`
    },
    invitationLink () {
      if (this.proposalType === PROPOSAL_INVITE_MEMBER &&
        this.proposal.status === STATUS_PASSED &&
        this.isOurProposal
      ) {
        const secret = this.proposal.payload.inviteSecret
        if (this.currentGroupState.invites[secret].status === INVITE_STATUS.VALID) {
          return buildInvitationUrl(this.currentGroupId, this.proposal.payload.inviteSecret)
        }
      }
      return false
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-li {
  &:not(:first-child) {
    margin-top: 1.5rem;
  }
}

.c-item {
  display: flex;
  align-items: flex-start;

  @include phone {
    flex-wrap: wrap;
  }
}

.c-main {
  display: flex;
  flex-grow: 1;

  &-content {
    flex-grow: 1;
  }
}

.c-tip {
  margin-left: $spacer-xs;
}

.c-sendLink {
  border-radius: $spacer-xs;
  background-color: $general_2;
  padding: 1.1875rem $spacer;
  margin-top: $spacer;

  @include tablet {
    padding: $spacer;
  }

  .c-invite-link {
    ::v-deep .c-copy-button {
      background: $white;
    }
  }
}

.icon-round {
  @include phone {
    margin-left: $spacer-sm;
  }
}
</style>
