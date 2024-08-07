<template lang='pug'>
.c-ctas(v-if='!isToRemoveMe')
  .buttons.c-options(v-if='!hadVoted || ephemeral.changingVote')
    button-submit.is-outlined.is-small.is-success(
      @click='voteFor'
      data-test='voteFor'
    ) {{ L('Vote yes') }}

    button-submit.is-outlined.is-small.is-danger(
      @click='voteAgainst'
      data-test='voteAgainst'
    ) {{ L('Vote no') }}
  .buttons(v-else)
    button-submit.is-outlined.is-small(
      v-if='ownProposal'
      @click='cancelProposal'
      data-test='cancelProposal'
    ) {{ L('Cancel proposal') }}
    p.has-text-1(v-else data-test='voted')
      | {{ L('You voted {voteStatus}', { voteStatus }) }}.
      | &nbsp;
      i18n.link(tag='button' @click='startChangingVote') Change vote.
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters, mapState } from 'vuex'
import { L } from '@common/common.js'
import { VOTE_FOR, VOTE_AGAINST } from '@model/contracts/shared/voting/rules.js'
import { PROPOSAL_REMOVE_MEMBER } from '@model/contracts/shared/constants.js'
import ButtonSubmit from '@components/ButtonSubmit.vue'

export default ({
  name: 'Vote',
  props: {
    proposalHash: String
  },
  components: {
    ButtonSubmit
  },
  data () {
    return {
      ephemeral: {
        changingVote: false
      }
    }
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'ourIdentityContractId',
      'currentGroupState',
      'groupSettings',
      'currentIdentityState'
    ]),
    proposal () {
      return this.currentGroupState.proposals[this.proposalHash]
    },
    voteStatus () {
      const humanStatus = {
        [VOTE_FOR]: L('yes'),
        [VOTE_AGAINST]: L('no')
      }
      return humanStatus[this.proposal.votes[this.ourIdentityContractId]]
    },
    meta () {
      return this.proposal.meta
    },
    type () {
      return this.proposal.data.proposalType
    },
    data () {
      return this.proposal.data.proposalData
    },
    isToRemoveMe () {
      return this.type === PROPOSAL_REMOVE_MEMBER && this.data.memberID === this.ourIdentityContractId
    },
    hadVoted () {
      return this.proposal.votes[this.ourIdentityContractId]
    },
    ownProposal () {
      return this.ourIdentityContractId === this.proposal.creatorID
    },
    refVoteMsg () {
      return this.$parent.$refs.voteMsg
    }
  },
  methods: {
    startChangingVote () {
      this.ephemeral.changingVote = true
    },
    async voteFor () {
      // Avoid redundant vote from "Change vote" if already voted FOR before
      if (!confirm(L('Are you sure you want to vote yes?')) || this.proposal.votes[this.ourIdentityContractId] === VOTE_FOR) {
        return null
      }
      this.ephemeral.changingVote = false
      try {
        this.refVoteMsg.clean()
        const proposalHash = this.proposalHash

        await sbp('gi.actions/group/proposalVote', {
          contractID: this.currentGroupId,
          data: { vote: VOTE_FOR, proposalHash }
        })
      } catch (e) {
        console.error('ProposalVoteOptions voteFor failed:', e)
        this.refVoteMsg.danger(e.message)
      }
    },
    async voteAgainst () {
      // Avoid redundant vote from "Change vote" if already voted AGAINST before
      if (!confirm(L('Are you sure you want to vote no?')) || this.proposal.votes[this.ourIdentityContractId] === VOTE_AGAINST) {
        return null
      }
      this.ephemeral.changingVote = false
      try {
        this.refVoteMsg.clean()
        await sbp('gi.actions/group/proposalVote', {
          contractID: this.currentGroupId,
          data: { vote: VOTE_AGAINST, proposalHash: this.proposalHash }
        })
      } catch (e) {
        console.error('ProposalVoteOptions voteAgainst failed:', e)
        this.refVoteMsg.danger(e.message)
      }
    },
    async cancelProposal () {
      if (!confirm(L('Are you sure you want to cancel this proposal?'))) {
        return null
      }
      try {
        this.refVoteMsg.clean()
        await sbp('gi.actions/group/proposalCancel', {
          contractID: this.currentGroupId, data: { proposalHash: this.proposalHash }
        })
      } catch (e) {
        console.error('ProposalVoteOptions cancelProposal failed:', e)
        this.refVoteMsg.danger(e.message)
      }
    }
  }
}: Object)
</script>
<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-ctas {
  grid-area: actions;
  @include phone {
    flex: auto;
    margin: 1rem 1rem 1rem 0;

    .buttons {
      justify-content: flex-end;
      gap: 1rem;
    }

    button {
      flex-grow: 1;
      margin-right: 0;
    }
  }
}

.buttons {
  margin-top: 0;
}

.c-options {
  @include tablet {
    flex-wrap: nowrap;
  }
}

.c-error {
  margin-top: 0.25rem;
  text-align: right;
}
</style>
