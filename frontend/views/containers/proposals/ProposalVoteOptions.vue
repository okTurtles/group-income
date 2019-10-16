<template lang='pug'>
.c-ctas
  .buttons(v-if='!hadVoted || ephemeral.changingVote')
    i18n.button.is-outlined.is-small.is-success(
      tag='button'
      @click='voteFor'
      data-test='voteFor'
    ) Vote yes

    i18n.button.is-outlined.is-small.is-danger(
      tag='button'
      @click='voteAgainst'
      data-test='voteAgainst'
    ) Vote no

  .c-cancel(v-else)
    i18n.button.is-outlined.is-small(
      tag='button'
      v-if='ownProposal'
      @click='cancelProposal'
      data-test='cancelProposal'
    ) Cancel Proposal
    p.has-text-1(v-else data-test='voted')
      | {{ L('You voted {voteStatus}', { voteStatus }) }}.
      | &nbsp;
      i18n.link(tag='button' @click='startChangingVote') Change vote.
  .help.has-text-danger.c-error(v-if='ephemeral.errorMsg') {{ ephemeral.errorMsg }}
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import sbp from '~/shared/sbp.js'
import L from '@view-utils/translations.js'
import { VOTE_FOR, VOTE_AGAINST } from '@model/contracts/voting/rules.js'
import { TYPE_MESSAGE } from '@model/contracts/mailbox.js'
import { oneVoteToPass, buildInvitationUrl } from '@model/contracts/voting/proposals.js'
import { generateInvites } from '@model/contracts/group.js'

export default {
  name: 'Vote',
  props: {
    proposalHash: String
  },
  data () {
    return {
      ephemeral: {
        changingVote: false
      },
      errorMsg: null
    }
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'currentGroupState',
      'groupSettings',
      'currentUserIdentityContract'
    ]),
    proposal () {
      return this.currentGroupState.proposals[this.proposalHash]
    },
    currentUsername () {
      return this.currentUserIdentityContract.attributes.name
    },
    voteStatus () {
      const humanStatus = {
        [VOTE_FOR]: L('yes'),
        [VOTE_AGAINST]: L('no')
      }
      return humanStatus[this.proposal.votes[this.currentUsername]]
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
    hadVoted () {
      return this.proposal.votes[this.currentUsername]
    },
    ownProposal () {
      return this.currentUsername === this.proposal.meta.username
    }
  },
  methods: {
    startChangingVote () {
      this.ephemeral.changingVote = true
    },
    async voteFor () {
      this.ephemeral.changingVote = false
      this.ephemeral.errorMsg = null
      // Avoid redundant vote from "Change vote" if already voted FOR before
      if (!confirm(L('Are you sure you want to vote yes?')) || this.proposal.votes[this.currentUsername] === VOTE_FOR) {
        return null
      }
      try {
        const proposalHash = this.proposalHash
        const payload = {}
        if (oneVoteToPass(proposalHash)) {
          payload.passPayload = generateInvites(this.currentUsername, 1)
        }
        const vote = await sbp('gi.contracts/group/proposalVote/create',
          {
            proposalHash,
            vote: VOTE_FOR,
            ...payload
          },
          this.currentGroupId
        )
        await sbp('backend/publishLogEntry', vote)

        if (payload.passPayload) {
          const groupName = this.groupSettings.groupName
          const username = this.data.member
          // TODO: delete this entire section, this is just
          //       here for debug and testing purposes until
          //       we get the links page working nicely.
          //       this.data.members will not contain usernames in the future.
          const contractID = await sbp('namespace/lookup', username)
          const identityContract = await sbp('state/latestContractState', contractID)
          console.debug('sending invite to:', contractID, identityContract)
          const inviteToMailbox = await sbp('gi.contracts/mailbox/postMessage/create',
            {
              messageType: TYPE_MESSAGE,
              from: groupName,
              subject: `You've been invited to join ${groupName}!`,
              message: `Hi ${username},
              
              ${groupName} has voted to invite you! Horray!
              Here's your special invite link:
              
              ${buildInvitationUrl(this.$store.state.currentGroupId, payload.passPayload.inviteSecret)}`
            },
            identityContract.attributes.mailbox
          )
          await sbp('backend/publishLogEntry', inviteToMailbox)
        }
      } catch (ex) {
        console.log(ex)
        this.ephemeral.errorMsg = L('Failed to Cast Vote. Try again.')
      }
    },
    async voteAgainst () {
      this.ephemeral.changingVote = false
      this.ephemeral.errorMsg = null
      // Avoid redundant vote from "Change vote" if already voted AGAINST before
      if (!confirm(L('Are you sure you want to vote no?')) || this.proposal.votes[this.currentUsername] === VOTE_AGAINST) {
        return null
      }
      try {
        const vote = await sbp('gi.contracts/group/proposalVote/create',
          {
            proposalHash: this.proposalHash,
            vote: VOTE_AGAINST
          },
          this.currentGroupId
        )
        await sbp('backend/publishLogEntry', vote)
      } catch (ex) {
        console.log(ex)
        this.ephemeral.errorMsg = L('Failed to Cast Vote. Try again.')
      }
    },
    async cancelProposal () {
      if (!confirm(L('Are you sure you want to cancel this proposal?'))) {
        return null
      }
      try {
        const vote = await sbp('gi.contracts/group/proposalCancel/create',
          {
            proposalHash: this.proposalHash
          },
          this.currentGroupId
        )
        await sbp('backend/publishLogEntry', vote)
      } catch (ex) {
        console.log(ex)
        this.ephemeral.errorMsg = L('Failed to Cancel Proposal. Try again.')
      }
    }
  }
}
</script>
<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.buttons {
  margin-top: 0;
}

.c-error {
  margin-top: $spacer-xs;
  text-align: right;
}
</style>
