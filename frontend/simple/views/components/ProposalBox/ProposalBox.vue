<template>
<transition name="gi-fade">
  <div class="is-flex gi-voting">
    <div class="gi-voting-body is-flex" data-test="proposal">
      <sign
        :proposalType="proposal.proposalType"
        :proposalData="proposal.proposalData"
      />

      <div class="gi-voting-info">
        <h5 class="has-text-weight-bold is-uppercase gi-voting-info-title">{{title}}</h5>
        <p v-html="text" data-test="voteText"></p>
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
            :disabled="hasVoted"
            @click="handleVoteAgainst"
          >
            {{buttonAgainst}}
          </button>

          <button class="button"
            :class="{
              'is-outlined': !hasVotedFor,
              'is-success': !hasVotedAgainst
            }"
            :disabled="hasVoted"
            @click="handleVoteFor"
            data-test="forButton"
          >
            {{buttonFor}}
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
</transition>
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
import proposalText from './proposalText.js'

export default {
  name: 'ProposalBox',
  props: {
    proposal: {
      type: [Object],
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
        errorState: null,
        closeCountdown: {
          state: null,
          countdown: null
        }
      }
    }
  },
  computed: {
    buttonFor () {
      const { proposalType, proposalData, originalData } = this.proposal
      return proposalText[proposalType].button.for({ proposalData, originalData })
    },
    buttonAgainst () {
      const { proposalType, proposalData, originalData } = this.proposal
      return proposalText[proposalType].button.against({ proposalData, originalData })
    },
    title () {
      return proposalText[this.proposal.proposalType].title()
    },
    text () {
      const { proposalCreator, proposalType, proposalData, originalData } = this.proposal
      const proposer = this.isOwnProposal ? L('You') : proposalCreator
      return proposalText[proposalType].text({ proposer, proposalData, originalData })
    },
    detailed () {
      const { proposalType, originalData, voterCount } = this.proposal
      const originalVotesNeeded = Math.ceil(voterCount * originalData)
      const newVotesNeeded = Math.ceil(voterCount * this.proposalData)
      const action = proposalText[proposalType].action
      return action ? L('Instead of {originalVotesNeeded}, at least {newVotesNeeded} of {voterCount} members will be needed to {action}.', {
        originalVotesNeeded, newVotesNeeded, voterCount, action: action() }) : ''
    },
    hasVoted () {
      return !!this.proposal.myVote
    },
    hasVotedFor () {
      return this.proposal.myVote === 1
    },
    hasVotedAgainst () {
      return this.proposal.myVote === -1
    },
    isProposalClosed () {
      return this.ephemeral.closeCountdown.state === countdownStates.SUCCESS
    },
    closeProposalBtnText () {
      return this.ephemeral.closeCountdown.state === countdownStates.COUNTING
        ? L('No, wait')
        : L('Close Proposal')
    },
    helperText () {
      if (this.ephemeral.errorState) {
        return this.ephemeral.errorState
      }

      switch (this.ephemeral.closeCountdown.state) {
        case countdownStates.COUNTING:
          return L('Proposal closed in {countdown}...', {
            countdown: this.ephemeral.closeCountdown.countdown
          })
        case countdownStates.CANCELLED:
          return L("Let's pretend that never happened")
        case countdownStates.SUCCESS:
          return L('Proposal cancelled')
        default:
          break
      }

      if (Object.values(this.proposal.votes).length > 1) {
        return L('{youAnd} {votesCount} of {members} members voted', {
          youAnd: this.hasVoted ? L('You and') : '',
          votesCount: this.hasVoted ? Object.values(this.proposal.votes).length - 1 : this.proposal.votes.length,
          members: this.proposal.voterCount
        })
      }
    }
  },
  methods: {
    handleProposalStateChange (state, opts = {}) {
      this.ephemeral.errorState = null
      this.ephemeral.closeCountdown = { state, ...opts }

      state === countdownStates.SUCCESS && this.closeProposal()
    },
    async checkErrors (method) {
      this.ephemeral.errorState = null
      try {
        await method()
      } catch (e) {
        this.ephemeral.closeCountdown.state = null
        this.ephemeral.errorState = L('Something went wrong!')
      }
    },
    handleVoteAgainst () {
      if (this.hasVotedAgainst) return false
      this.onVoteAgainst && this.checkErrors(() => this.onVoteAgainst(this.proposal.hash))
    },
    handleVoteFor () {
      if (this.hasVotedFor) return false
      this.onVoteFor && this.checkErrors(() => this.onVoteFor(this.proposal.hash))
    },
    closeProposal () {
      this.onCloseProposal && this.checkErrors(() => this.onCloseProposal(this.proposal.hash))
    }
  }
}
</script>
