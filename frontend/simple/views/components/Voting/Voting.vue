<template>
  <div class="is-flex gi-voting">
    <div class="gi-voting-body is-flex">
      <sign
        :type="type"
        :value="value"
        :member="member"
      />

      <div class="gi-voting-info">
        <h5 class="has-text-weight-bold is-uppercase gi-voting-info-title">{{title}}</h5>
        <p v-html="text"></p>
        <p class="is-size-7 has-text-grey" v-if="details" v-html="details"></p>
      </div>
    </div>

    <div class="gi-voting-ctas">
      <div class="buttons">
        <template v-if="!isOwnProposal">
          <button class="button"
            :class="{
              'is-outlined': !hasVotedAgainst,
              'is-danger': !hasVotedFor
            }"
            @click="handleVoteAgainst"
          >
            {{ctas.against}}
          </button>

          <button class="button"
            :class="{
              'is-outlined': !hasVotedFor,
              'is-success': !hasVotedAgainst
            }"
            @click="handleVoteFor"
          >
            {{ctas.for}}
          </button>
        </template>

        <button-countdown
          v-else-if="!isProposalClosed"
          :onStateChange="handleProposalStateChange"
        >
          {{closeProposalBtnText}}
        </button-countdown>
      </div>

      <p class="has-text-grey has-text-right"
        :class="{ 'gi-feedback has-text-weight-bold': isProposalClosed }"
      >
        {{helperText}}
      </p>
    </div>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

%avatarSize {
  width: 4.5rem;
  height: 4.5rem;
}

.gi-voting {
  flex-wrap: wrap;
  justify-content: flex-end;
  margin: $gi-spacer*3 0;

  &:last-child {
    margin-bottom: 0;
  }

  &-body {
    margin-bottom: $gi-spacer;
    flex-grow: 1;
  }

  &-info {
    flex-grow: 1;
    padding-left: $gi-spacer;

    &-title {
      margin-bottom: $gi-spacer-xs;
      line-height: 1;
    }
  }

  @include tablet {
    flex-wrap: nowrap;
    justify-content: space-between;

    &-body {
      margin-bottom: 0;
    }

    &-info {
      padding: 0 $gi-spacer 0 $gi-spacer-lg;
    }
  }
}

.gi-feedback {
  margin-top: $gi-spacer;
}

.buttons {
  flex-wrap: nowrap;
  justify-content: flex-end;
}
</style>
<script>
import ButtonCountdown, { countdownStates } from '../ButtonCountdown'
import Sign from './Sign.vue'
import L from '../../utils/translations'
import { votingType, votesObj } from '../../utils/validators'
import template from 'string-template'
import { HashableGroupProposal } from '../../../../../shared/events'

export default {
  name: 'Voting',
  props: {
    type: {
      validator: votingType,
      required: true
    },
    votes: {
      validator: votesObj,
      required: true
    },
    value: {
      type: [String, Number], // string for add member, remove member, number for rule, mincome
      required: true
    },
    originalValue: Number, // for rule, mincome proposals
    ownVote: Boolean,
    isOwnProposal: {
      type: Boolean,
      required: true
    },
    initiator: {
      type: String,
      required: true
    },
    hash: {
      type: String,
      required: true
    },
    // Actions:
    onVoteAgainst: Function,
    onVoteFor: Function,
    onCloseProposal: Function
  },
  components: {
    ButtonCountdown,
    Sign
  },
  data () {
    return {
      ephemeral: {
        state: null,
        countdown: null
      }
    }
  },
  computed: {
    ctas () {
      const { value, originalValue } = this
      const { TypeInvitation, TypeRemoval } = HashableGroupProposal
      if (this.type === TypeInvitation) {
        return {
          for: template(
            L('Invite {value}'), { value }
          ),
          against: template(
            L('Don\'t invite'), { value }
          )
        }
      } else if (this.type === TypeRemoval) {
        return {
          for: template(
            L('Remove {value}'), { value }
          ),
          against: template(
            L('Keep {value}'), { value }
          )
        }
      } else {
        return {
          for: template(
            L('Change to {value}'), { value }
          ),
          against: template(
            L('Keep {originalValue}'), { originalValue }
          )
        }
      }
    },
    title () {
      const { TypeInvitation, TypeRemoval, TypeIncome, TypeChangeThreshold, TypeApprovalThreshold, TypeRemovalThreshold } = HashableGroupProposal
      const titleMap = {
        [TypeInvitation]: L('Invite Member'),
        [TypeRemoval]: L('Remove Member'),
        [TypeIncome]: L('Change Mincome'),
        [TypeChangeThreshold]: L('Update Rule: Change Threshold'),
        [TypeApprovalThreshold]: L('Update Rule: Invite Threshold'),
        [TypeRemovalThreshold]: L('Update Rule: Member Removal Threshold')
      }
      return titleMap[this.type]
    },
    text () {
      const { initiator, value, originalValue } = this
      const { TypeInvitation, TypeRemoval, TypeIncome, TypeChangeThreshold, TypeApprovalThreshold, TypeRemovalThreshold } = HashableGroupProposal
      const textMap = {
        [TypeInvitation]: template(
          L('{initiator} proposed to <strong>invite {value}</strong> to the group'), {
            initiator, value }
        ),
        [TypeRemoval]: template(
          L('{initiator} proposed to <strong>remove {value}</strong> from the group'), {
            initiator, value }
        ),
        [TypeIncome]: template(
          L('{initiator} proposed to change the <strong>mincome from {originalValue} to {value}</strong>'), {
            initiator, value, originalValue }
        ),
        [TypeChangeThreshold]: template(
          L('{initiator} proposed to change the <strong>rule changing threshold from {originalValue} to {value}</strong>'), {
            initiator, value, originalValue }
        ),
        [TypeApprovalThreshold]: template(
          L('{initiator} proposed to change the <strong>member invite threshold from {originalValue} to {value}</strong>'), {
            initiator, value, originalValue }
        ),
        [TypeRemovalThreshold]: template(
          L('{initiator} proposed to change the <strong>member removal threshold from {originalValue} to {value}</strong>'), {
            initiator, value, originalValue }
        )
      }
      return textMap[this.type]
    },
    detailed () {
      const { TypeChangeThreshold, TypeApprovalThreshold, TypeRemovalThreshold } = HashableGroupProposal
      if ([TypeChangeThreshold, TypeApprovalThreshold, TypeRemovalThreshold].includes(this.type)) {
        const originalCount = Math.ceil(this.votes.total * this.votes.originalValue)
        const newCount = Math.ceil(this.votes.total * this.value)
        const groupCount = this.votes.total
        const actionMap = {
          TypeChangeThreshold: L('change a rule'),
          TypeApprovalThreshold: L('approve a new member'),
          TypeRemovalThreshold: L('remove a member')
        }
        return template(
          L('Instead of {originalCount}, at least {newCount} of {groupCount} members will be needed to {action}.'), {
            originalCount, newCount, groupCount, action: actionMap[this.type] }
        )
      } else {
        return ''
      }
    },
    hasVoted () {
      return this.ownVote !== null
    },
    hasVotedFor () {
      return this.ownVote
    },
    hasVotedAgainst () {
      return this.ownVote === false
    },
    isProposalClosed () {
      return this.ephemeral.state === countdownStates.SUCCESS
    },
    closeProposalBtnText () {
      return this.ephemeral.state === countdownStates.COUNTING
        ? L('No, wait')
        : L('Close Proposal')
    },
    helperText () {
      switch (this.ephemeral.state) {
        case countdownStates.COUNTING:
          return L('Proposal closed in {countdown}...', {
            countdown: this.ephemeral.countdown
          })
        case countdownStates.CANCELLED:
          return L("Let's pretend that never happened")
        case countdownStates.SUCCESS:
          return L('Proposal cancelled')
        default:
          break
      }

      if (this.votes.received < 2) {
        return this.isOwnProposal
          ? L('Nobody voted yet')
          : L('Be the first to vote!')
      }

      if (!this.isOwnProposal && this.votes.received === 2) {
        return L('Your were the first to vote')
      }

      if (this.votes.received > 2) {
        return L('{youAnd} {votesCount} of {members} members voted', {
          youAnd: this.hasVoted ? L('You and') : '',
          votesCount: this.hasVoted ? this.votes.received - 1 : this.votes.received,
          members: this.votes.total
        })
      }
    }
  },
  methods: {
    handleProposalStateChange (state, opts = {}) {
      this.ephemeral = { state, ...opts }

      state === 'success' && this.closeProposal()
    },
    handleVoteAgainst () {
      if (this.hasVotedAgainst) {
        return false
      }

      this.onVoteAgainst && this.onVoteAgainst(this.hash)
    },
    handleVoteFor () {
      if (this.hasVotedFor) {
        return false
      }

      this.onVoteFor && this.onVoteFor(this.hash)
    },
    closeProposal () {
      this.onCloseProposal && this.onCloseProposal(this.hash)
    }
  }
}
</script>
