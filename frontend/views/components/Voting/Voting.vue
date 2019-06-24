<template lang="pug">
.is-flex.c-voting
  .c-voting-body.is-flex
    sign(
      :type='type'
      :value='proposal.value'
      :member='proposal.member'
    )
      // TODO: fix the i18n stuff here
      .c-voting-info
        h5.has-text-weight-bold.is-uppercase.c-voting-info-title {{proposal.title}}
        p(v-html='proposal.text')
        p.is-size-7.has-text-light(
          v-if='proposal.textDetails'
          v-html='proposal.textDetails'
        )

  .c-voting-ctas
    .buttons
      template(v-if='!proposal.ownProposal')
        button(
          :class="{\
          'is-outlined': !hasVotedAgainst,\
          'is-danger': !hasVotedFor\
          }"
          @click='handleVoteAgainst'
        ) {{proposal.ctas.against}}

        button(
          @click='handleVoteFor'
          :class="{\
          'is-outlined': !hasVotedFor,\
          'is-success': !hasVotedAgainst\
          }"
        ) {{proposal.ctas.for}}

      button-countdown(v-else-if='!isProposalClosed' :onstatechange='handleCloseProposalStateChange')
        | {{closeProposalBtnText}}
    p.has-text-light(:class="{ 'c-feedback has-text-weight-bold': isProposalClosed }")
      | {{helperText}}

</template>

<script>
import ButtonCountdown, { countdownStates } from '../ButtonCountdown/index.js'
import Sign from './Sign.vue'
import L from '@view-utils/translations.js'
import { votingType } from '@view-utils/validators.js'

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
      let text = ''
      switch (this.closeProposalState.state) {
        case countdownStates.COUNTING: {
          text = L('Proposal closed in {countdown}...', {
            countdown: this.closeProposalState.countdown
          })
          break
        }

        case countdownStates.CANCELLED: {
          text = L("Let's pretend that never happened")
          break
        }
        case countdownStates.SUCCESS: {
          text = L('Proposal cancelled')
          break
        }
        default:
          break
      }

      if (!this.proposal.votes) {
        text = this.proposal.ownProposal
          ? L('Nobody voted yet')
          : L('Be the first to vote!')
      }

      if (!this.proposal.ownProposal && this.proposal.votes === 1) {
        text = L('Your were the first to vote')
      }

      if (this.proposal.votes > 1) {
        text = L('{youAnd} {votesCount} of {members} members voted', {
          youAnd: this.hasVoted ? L('You and') : '',
          votesCount: this.hasVoted ? this.proposal.votes - 1 : this.proposal.votes,
          members: this.proposal.members
        })
      }
      return text
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

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

%avatarSize {
  width: 4.5rem;
  height: 4.5rem;
}

.c-voting {
  flex-wrap: wrap;
  justify-content: flex-end;
  margin: $spacer*3 0;

  &:last-child {
    margin-bottom: 0;
  }

  &-body {
    margin-bottom: $spacer;
    flex-grow: 1;
  }

  &-info {
    flex-grow: 1;
    padding-left: $spacer;

    &-title {
      margin-bottom: $spacer-xs;
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
      padding: 0 $spacer 0 $spacer-lg;
    }
  }
}

.c-feedback {
  margin-top: $spacer;
}

.buttons {
  flex-wrap: nowrap;
  justify-content: flex-end;
}
</style>
