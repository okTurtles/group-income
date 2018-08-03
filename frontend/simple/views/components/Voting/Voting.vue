<template>
  <div class="is-flex gi-voting">
    <div class="gi-voting-body is-flex">
      <sign
        :type="type"
        :value="proposal.value"
        :member="proposal.member"
      />

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
          <button class="button"
            :class="{
              'is-outlined': !hasVotedAgainst,
              'is-danger': !hasVotedFor
            }"
            @click="handleVoteAgainst"
          >
            {{proposal.ctas.against}}
          </button>

          <button class="button"
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
          v-else-if="!isProposalClosed"
          :onStateChange="handleCloseProposalStateChange"
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
  margin: $gi-spacer+$gi-spacer-lg 0;

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
import { votingType } from '../../utils/validators'
import template from 'string-template'

export default {
  name: 'Voting',
  props: {
    type: {
      validator: votingType
    },
    proposal: Object,
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
      closeProposalState: {
        state: null,
        countdown: null
      }
    }
  },
  computed: {
    hasVoted () {
      return this.proposal.userVote !== null
    },
    hasVotedFor () {
      return this.proposal.userVote
    },
    hasVotedAgainst () {
      return this.proposal.userVote === false
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

      this.onVoteFor && this.onVoteFor()
    },
    closeProposal () {
      this.onCloseProposal && this.onCloseProposal()
    }
  }
}
</script>
