<template>
  <div class="is-flex gi-voting">
    <div class="gi-voting-body is-flex">
      <sign
        :type="type"
        :value="value"
        :member="member"
      />

      <!-- TODO: fix the i18n stuff here -->
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
import { votingType, votesObj, memberObj } from '../../utils/validators'

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
      // TODO return { L for, against }
      return {
        for: 'for placeholder',
        against: 'against placeholder'
      }
    },
    title () {
      // TODO return L string
      return 'title placeholder'
    },
    text () {
      // TODO return L string
      return 'text placeholder'
    },
    detailed () {
      // TODO return L string
      return 'detailed description placeholder'
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

      if (!this.votes.received) {
        return this.isOwnProposal
          ? L('Nobody voted yet')
          : L('Be the first to vote!')
      }

      if (!this.isOwnProposal && this.votes.received === 1) {
        return L('Your were the first to vote')
      }

      if (this.votes.received > 1) {
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
