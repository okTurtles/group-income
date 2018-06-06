<template>
  <div class="is-flex gi-voting">
    <div class="gi-voting-body is-flex">
      <div class="gi-voting-sign">
        <svg class="gi-voting-sign-svg"
          v-if="isTypeRule"
        >
          <circle cx="36" cy="36" r="35"
            class="gi-voting-sign-svg-circle"
            :style="svgCircle.style"
            :class="svgCircle.class"
          />
        </svg>

        <p class="gi-voting-sign-value title is-size-4 has-text-centered"
          :class="{
            'gi-is-mincome': isTypeMincome,
            'gi-is-rule': isTypeRule
          }"
          v-if="isTypeRuleOrMincome"
        >
          {{proposalValue}}
        </p>

        <img class="gi-voting-sign-avatar"
          :src="proposal.member.picture"
          :alt="`${proposal.member.name}'s avatar`"
          v-if="isTypeMember"
        />
      </div>

      <!-- TODO: fix the i18n stuff here -->
      <div class="gi-voting-info">
        <h5 class="has-text-weight-bold is-uppercase gi-voting-info-title">{{proposal.title}}</h5>
        <p v-html="proposal.text"></p>
        <p class="is-size-7 has-text-grey" v-if="proposal.textDetails" v-html="proposal.textDetails"></p>
      </div>
    </div>

    <div class="gi-voting-ctas">
      <div class="buttons">
        <template v-if="!proposal.ownProposal">
          <button class="button gi-btn-against"
            :class="{
              'is-outlined': !hasVotedAgainst,
              'is-danger': !hasVotedFor
            }"
            @click="handleVoteAgainst"
          >
            {{proposal.ctas.against}}
          </button>

          <button class="button gi-btn-for"
            :class="{
              'is-outlined': !hasVotedFor,
              'is-success': !hasVotedAgainst
            }"
            @click="handleVoteFor"
          >
            {{proposal.ctas.for}}
          </button>
        </template>

        <button-countdown
          :onStateChange="handleCloseProposalStateChange"
          v-if="proposal.ownProposal && !isProposalClosed"
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
@import "../../assets/sass/theme/index";

%avatarSize {
  width: 4.5rem;
  height: 4.5rem;
}

.gi-voting {
  flex-wrap: wrap;
  justify-content: flex-end;
  margin: $gi-spacer+$gi-spacer-lg 0;

  &-body {
    margin-bottom: $gi-spacer;
    flex-grow: 1;
  }

  &-sign {
    position: relative;
    flex-shrink: 0;

    &-avatar,
    &-value {
      @extend %avatarSize;
      border-radius: 50%;
      line-height: 4.5rem;
      white-space: nowrap;

      &.gi-is-mincome {
        line-height: 2;
      }

      &.gi-is-rule {
        border: 1px solid $grey-lighter;
      }
    }

    &-svg {
      @extend %avatarSize;
      position: absolute;
      top: 0;
      left: 0;

      &-circle {
        stroke: $success;
        stroke-width: 2px;
        stroke-linecap: round;
        fill: transparent;
        transform-origin: 50%;
        transform: rotate(-90deg);

        &.has-stroke-warning {
          stroke: $tertiary;
        }
      }
    }
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
import ButtonCountdown, { countdownStates } from './ButtonCountdown'
import L from '../utils/translations'
import template from 'string-template'
import { toPercent } from '../utils/filters'

export default {
  name: 'Voting',
  props: {
    proposal: Object,
    onVoteAgainst: Function,
    onVotedFor: Function,
    onCloseProposal: Function
  },
  components: {
    ButtonCountdown
  },
  data () {
    return {
      closeProposalState: {
        // opts from ButtonCountdown
      }
    }
  },
  computed: {
    svgCircle () {
      const svgCircleP = 220 // 35*2 * 3.14
      const ruleVal = this.proposal.value
      const ruleWarning = 0.7

      return {
        style: {
          strokeDasharray: `${svgCircleP * ruleVal} ${svgCircleP}`
        },
        class: ruleVal < ruleWarning && 'has-stroke-warning'
      }
    },
    isTypeMember () {
      return this.proposal.type === 'member'
    },
    isTypeRule () {
      return this.proposal.type === 'rule'
    },
    isTypeMincome () {
      return this.proposal.type === 'mincome'
    },
    isTypeRuleOrMincome () {
      return ['rule', 'mincome'].includes(this.proposal.type)
    },
    hasVoted () {
      return this.proposal.userVote !== null
    },
    hasVotedFor () {
      return this.proposal.userVote
    },
    hasVotedAgainst () {
      return this.proposal.userVote === false
    },
    proposalValue () {
      return this.isTypeRule ? toPercent(this.proposal.value) : this.proposal.value
    },
    isProposalClosed () {
      return this.closeProposalState.state === countdownStates.SUCCESS
    },
    closeProposalBtnText () {
      return this.closeProposalState.state === countdownStates.COUNTING
        ? L('No, wait')
        : L('Close Proposal')
    },
    helperText () {
      switch (this.closeProposalState.state) {
        case countdownStates.COUNTING:
          return template(
            L('Proposal closed in {countdown}...'), {
              countdown: this.closeProposalState.countdown
            })
        case countdownStates.CANCELLED:
          return L("Let's pretend that never happened")
        case countdownStates.SUCCESS:
          return L('Proposal cancelled')
        default:
          break
      }

      if (!this.proposal.votes) {
        return this.proposal.ownProposal
          ? L('Nobody voted yet')
          : L('Be the first to vote!')
      }

      if (!this.proposal.ownProposal && this.proposal.votes === 1) {
        return L('Your were the first to vote')
      }

      if (this.proposal.votes > 1) {
        return template(L('{youAnd} {votesCount} of {members} members voted'), {
          youAnd: this.hasVoted ? L('You and') : '',
          votesCount: this.hasVoted ? this.proposal.votes - 1 : this.proposal.votes,
          members: this.proposal.members
        })
      }
    }
  },
  methods: {
    handleCloseProposalStateChange (state, opts = {}) {
      this.closeProposalState = { state, ...opts }

      state === 'success' && this.closeProposal()
    },
    handleVoteAgainst () {
      if (this.hasVotedAgainst) {
        return false
      }

      this.onVoteAgainst && this.onVoteAgainst()
    },
    handleVoteFor () {
      if (this.hasVotedFor) {
        return false
      }

      this.onVotedFor && this.onVotedFor()
    },
    closeProposal () {
      this.onCloseProposal && this.onCloseProposal()
    }
  }
}
</script>
