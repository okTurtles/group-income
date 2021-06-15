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
import { mapGetters, mapState } from 'vuex'
import sbp from '~/shared/sbp.js'
import L, { LError } from '@view-utils/translations.js'
import { VOTE_FOR, VOTE_AGAINST } from '@model/contracts/voting/rules.js'
import { oneVoteToPass } from '@model/contracts/voting/proposals.js'
import { PROPOSAL_INVITE_MEMBER, PROPOSAL_REMOVE_MEMBER } from '@model/contracts/voting/constants.js'
import { createInvite } from '@model/contracts/group.js'
import ButtonSubmit from '@components/ButtonSubmit.vue'

export default {
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
      'ourUsername',
      'currentGroupState',
      'groupSettings',
      'ourUserIdentityContract'
    ]),
    proposal () {
      return this.currentGroupState.proposals[this.proposalHash]
    },
    voteStatus () {
      const humanStatus = {
        [VOTE_FOR]: L('yes'),
        [VOTE_AGAINST]: L('no')
      }
      return humanStatus[this.proposal.votes[this.ourUsername]]
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
      return this.type === PROPOSAL_REMOVE_MEMBER && this.data.member === this.ourUsername
    },
    hadVoted () {
      return this.proposal.votes[this.ourUsername]
    },
    ownProposal () {
      return this.ourUsername === this.proposal.meta.username
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
      if (!confirm(L('Are you sure you want to vote yes?')) || this.proposal.votes[this.ourUsername] === VOTE_FOR) {
        return null
      }
      this.ephemeral.changingVote = false
      try {
        this.refVoteMsg.clean()
        const proposalHash = this.proposalHash
        let passPayload = {}

        if (oneVoteToPass(proposalHash)) {
          if (this.type === PROPOSAL_INVITE_MEMBER) {
            passPayload = createInvite({
              invitee: this.proposal.data.proposalData.member,
              creator: this.proposal.meta.username
            })
          } else if (this.type === PROPOSAL_REMOVE_MEMBER) {
            passPayload = {
              secret: `${parseInt(Math.random() * 10000)}` // TODO: this
            }
          }
        }
        await sbp('gi.actions/group/proposalVote',
          {
            vote: VOTE_FOR,
            proposalHash,
            passPayload
          },
          this.currentGroupId
        )
      } catch (e) {
        console.error('ProposalVoteOptions voteFor failed:', e)
        this.refVoteMsg.danger(e.message)
      }
    },
    async voteAgainst () {
      // Avoid redundant vote from "Change vote" if already voted AGAINST before
      if (!confirm(L('Are you sure you want to vote no?')) || this.proposal.votes[this.ourUsername] === VOTE_AGAINST) {
        return null
      }
      this.ephemeral.changingVote = false
      try {
        this.refVoteMsg.clean()
        await sbp('gi.actions/group/proposalVote',
          {
            vote: VOTE_AGAINST,
            proposalHash: this.proposalHash
          },
          this.currentGroupId
        )
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
        await sbp('gi.actions/group/proposalCancel',
          { proposalHash: this.proposalHash }, this.currentGroupId)
      } catch (e) {
        console.error('ProposalVoteOptions cancelProposal failed:', e)
        this.refVoteMsg.danger(e.message)
      }
    }
  }
}
</script>
<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-ctas {
  @include phone {
    width: 100%;
    margin-top: 1rem;
    margin-bottom: 0.5rem;

    .button {
      flex-grow: 1;

      &:not(:last-child) {
        margin-right: 1rem;
      }
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
