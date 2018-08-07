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
const { TypeInvitation, TypeRemoval, TypeIncome, TypeChangeThreshold, TypeApprovalThreshold, TypeRemovalThreshold } = contracts.GroupProposal

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
      const { proposalType, proposalData, originalData } = this.proposal
      if (proposalType === TypeInvitation) {
        return {
          for: template(L('Invite {proposalData}'), { proposalData }),
          against: L('Don\'t invite')
        }
      } else if (proposalType === TypeRemoval) {
        return {
          for: template(L('Remove {proposalData}'), { proposalData }),
          against: template(L('Keep {proposalData}'), { proposalData })
        }
      } else {
        return {
          for: template(L('Change to {proposalData}'), { proposalData }),
          against: template(L('Keep {originalData}'), { originalData })
        }
      }
    },
    title () {
      const titleMap = {
        [TypeInvitation]: L('Invite Member'),
        [TypeRemoval]: L('Remove Member'),
        [TypeIncome]: L('Change Mincome'),
        [TypeChangeThreshold]: L('Update Rule: Change Threshold'),
        [TypeApprovalThreshold]: L('Update Rule: Invite Threshold'),
        [TypeRemovalThreshold]: L('Update Rule: Member Removal Threshold')
      }
      return titleMap[this.proposal.proposalType]
    },
    text () {
      const { proposalCreator, proposalType, proposalData, originalData } = this.proposal
      const proposer = this.isOwnProposal ? L('You') : proposalCreator
      const textMap = {
        [TypeInvitation]: template(
          L('{proposer} proposed to <strong>invite {proposalData}</strong> to the group'), {
            proposer, proposalData }
        ),
        [TypeRemoval]: template(
          L('{proposer} proposed to <strong>remove {proposalData}</strong> from the group'), {
            proposer, proposalData }
        ),
        [TypeIncome]: template(
          L('{proposer} proposed to change the <strong>mincome from {originalData} to {proposalData}</strong>'), {
            proposer, proposalData, originalData }
        ),
        [TypeChangeThreshold]: template(
          L('{proposer} proposed to change the <strong>rule changing threshold from {originalData} to {proposalData}</strong>'), {
            proposer, proposalData, originalData }
        ),
        [TypeApprovalThreshold]: template(
          L('{proposer} proposed to change the <strong>member invite threshold from {originalData} to {proposalData}</strong>'), {
            proposer, proposalData, originalData }
        ),
        [TypeRemovalThreshold]: template(
          L('{proposer} proposed to change the <strong>member removal threshold from {originalData} to {proposalData}</strong>'), {
            proposer, proposalData, originalData }
        )
      }
      return textMap[proposalType]
    },
    detailed () {
      const { proposalType, originalData, voterCount } = this.proposal
      if ([TypeChangeThreshold, TypeApprovalThreshold, TypeRemovalThreshold].includes(proposalType)) {
        const originalVotesNeeded = Math.ceil(voterCount * originalData)
        const newVotesNeeded = Math.ceil(voterCount * this.proposalData)
        const actionMap = {
          [TypeChangeThreshold]: L('change a rule'),
          [TypeApprovalThreshold]: L('approve a new member'),
          [TypeRemovalThreshold]: L('remove a member')
        }
        return template(
          L('Instead of {originalVotesNeeded}, at least {newVotesNeeded} of {voterCount} members will be needed to {action}.'), {
            originalVotesNeeded, newVotesNeeded, voterCount, action: actionMap[proposalType] }
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

      if (Object.values(this.proposal.votes).length > 1) {
        return template(L('{youAnd} {votesCount} of {members} members voted'), {
          youAnd: this.hasVoted ? L('You and') : '',
          votesCount: this.hasVoted ? Object.values(this.proposal.votes).length - 1 : Object.values(this.proposal.votes).length,
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
