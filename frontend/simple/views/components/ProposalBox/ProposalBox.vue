<template>
<transition name="gi-fade">
  <div class="is-flex gi-voting">
    <div class="gi-voting-body is-flex" data-test="proposal">
      <sign
        :doWhat="proposal.doWhat"
        :toWhat="proposal.toWhat"
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
            {{buttonText.against}}
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
            {{buttonText.for}}
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
import template from 'string-template'
import contracts from '../../../model/contracts.js'
const { DoInvitation, DoRemoval, DoIncome, DoChangeThreshold, DoApprovalThreshold, DoRemovalThreshold } = contracts.GroupProposal

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
    buttonText () {
      const { doWhat, toWhat, fromWhat } = this.proposal
      if (doWhat === DoInvitation) {
        return {
          for: template(L('Invite {toWhat}'), { toWhat }),
          against: L('Don\'t invite')
        }
      } else if (doWhat === DoRemoval) {
        return {
          for: template(L('Remove {toWhat}'), { toWhat }),
          against: template(L('Keep {toWhat}'), { toWhat })
        }
      } else {
        return {
          for: template(L('Change to {toWhat}'), { toWhat }),
          against: template(L('Keep {fromWhat}'), { fromWhat })
        }
      }
    },
    title () {
      const titleMap = {
        [DoInvitation]: L('Invite Member'),
        [DoRemoval]: L('Remove Member'),
        [DoIncome]: L('Change Mincome'),
        [DoChangeThreshold]: L('Update Rule: Change Threshold'),
        [DoApprovalThreshold]: L('Update Rule: Invite Threshold'),
        [DoRemovalThreshold]: L('Update Rule: Member Removal Threshold')
      }
      return titleMap[this.proposal.doWhat]
    },
    text () {
      const { whoProposed, doWhat, toWhat, fromWhat } = this.proposal
      const proposer = this.isOwnProposal ? L('You') : whoProposed
      const textMap = {
        [DoInvitation]: template(
          L('{proposer} proposed to <strong>invite {toWhat}</strong> to the group'), {
            proposer, toWhat }
        ),
        [DoRemoval]: template(
          L('{proposer} proposed to <strong>remove {toWhat}</strong> from the group'), {
            proposer, toWhat }
        ),
        [DoIncome]: template(
          L('{proposer} proposed to change the <strong>mincome from {fromWhat} to {toWhat}</strong>'), {
            proposer, toWhat, fromWhat }
        ),
        [DoChangeThreshold]: template(
          L('{proposer} proposed to change the <strong>rule changing threshold from {fromWhat} to {toWhat}</strong>'), {
            proposer, toWhat, fromWhat }
        ),
        [DoApprovalThreshold]: template(
          L('{proposer} proposed to change the <strong>member invite threshold from {fromWhat} to {toWhat}</strong>'), {
            proposer, toWhat, fromWhat }
        ),
        [DoRemovalThreshold]: template(
          L('{proposer} proposed to change the <strong>member removal threshold from {fromWhat} to {toWhat}</strong>'), {
            proposer, toWhat, fromWhat }
        )
      }
      return textMap[doWhat]
    },
    detailed () {
      const { doWhat, fromWhat, voterCount } = this.proposal
      if ([DoChangeThreshold, DoApprovalThreshold, DoRemovalThreshold].includes(doWhat)) {
        const originalVotesNeeded = Math.ceil(voterCount * fromWhat)
        const newVotesNeeded = Math.ceil(this.votes.total * this.toWhat)
        const actionMap = {
          [DoChangeThreshold]: L('change a rule'),
          [DoApprovalThreshold]: L('approve a new member'),
          [DoRemovalThreshold]: L('remove a member')
        }
        return template(
          L('Instead of {originalVotesNeeded}, at least {newVotesNeeded} of {voterCount} members will be needed to {action}.'), {
            originalVotesNeeded, newVotesNeeded, voterCount, action: actionMap[doWhat] }
        )
      } else {
        return ''
      }
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

      if (this.proposal.votes.length > 1) {
        return template(L('{youAnd} {votesCount} of {members} members voted'), {
          youAnd: this.hasVoted ? L('You and') : '',
          votesCount: this.hasVoted ? this.proposal.votes.length - 1 : this.proposal.votes.length,
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
