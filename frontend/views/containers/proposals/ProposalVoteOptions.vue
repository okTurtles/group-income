<template lang='pug'>
.c-ctas
  .c-cancel(v-if='hadVoted')
    i18n.button.is-danger(
      v-if='ownProposal'
      tag='button'
      @click='voteAgainst'
      data-test='voteFor'
    ) Cancel Proposal
    p(v-else) You voted {{voteStatus}}.
      a.link Change vote.
    p.help.is-danger(v-if='errorMsg') {{ errorMsg }}
  .buttons(v-else)
    i18n.button.is-outlined.is-small.is-success(
      tag='button'
      @click='voteFor'
      data-test='voteFor'
    ) Vote yes

    i18n.button.is-outlined.is-small.is-danger(
      tag='button'
      @click='voteAgainst'
      data-test='voteFor'
    ) Vote no
  .help.has-text-danger.c-error(v-if='errorMsg') {{ errorMsg }}
</template>

<script>
import sbp from '~/shared/sbp.js'
import L from '@view-utils/translations.js'
import { VOTE_FOR, VOTE_AGAINST } from '@model/contracts/voting/rules.js'
import { TYPE_MESSAGE } from '@model/contracts/mailbox.js'
import { oneVoteToPass } from '@model/contracts/voting/proposals.js'
import { generateInvites } from '@model/contracts/group.js'
import { mapGetters } from 'vuex'

export default {
  name: 'Vote',
  props: {
    proposalHash: String
  },
  computed: {
    proposal () {
      return this.currentGroupState.proposals[this.proposalHash]
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
      return false
    },
    ownProposal () {
      return false
    },
    ...mapGetters([
      'currentGroupId'
      'currentGroupState',
      'groupSettings'
    ])
  },
  methods: {
    async voteFor () {
      this.errorMsg = null
      try {
        const proposalHash = this.proposalHash
        var payload
        if (oneVoteToPass(proposalHash)) {
          // pass in the data for 'gi.contracts/group/invite/process'
          payload = {
            passPayload: generateInvites(1)
          }
        }
        const vote = await sbp('gi.contracts/group/proposalVote/create',
          {
            proposalHash,
            vote: VOTE_FOR,
            ...(payload || {})
          },
          this.currentGroupId
        )
        await sbp('backend/publishLogEntry', vote)

        if (payload) {
          const groupName = this.groupSettings.groupName
          // TODO: delete this entire section, this is just
          //       here for debug and testing purposes until
          //       we get the links page working nicely.
          //       this.data.members will not contain usernames in the future.
          for (const username of this.data.member) {
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

                ${process.env.FRONTEND_URL}/app/join?groupId=${this.$store.state.currentGroupId}&secret=${payload.passPayload.inviteSecret}`
              },
              identityContract.attributes.mailbox
            )
            await sbp('backend/publishLogEntry', inviteToMailbox)
          }
        }
      } catch (ex) {
        console.log(ex)
        this.errorMsg = L('Failed to Cast Vote. Try again.')
      }
    },
    async voteAgainst () {
      this.errorMsg = null
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
        this.errorMsg = L('Failed to Cast Vote. Try again.')
      }
    }
  },
  data () {
    return {
      errorMsg: null
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
