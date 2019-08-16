<template lang="pug">
//- TODO: consider deleting this entire file if no longer necessary
//-       it's currently used for debug/testing purposes only and should
//-       be either deleted or rewritten.
section.section.full-screen
  .columns
    .column
    .column(style='text-align: center;')
      div
        .subtitle
          i18n Your vote has been requested on a proposal for the group:

        h1 {{ groupSettings.groupName }}

      .panel
        .panel-block
          p
            // TODO different templates for different invitation types
            i18n This is an invitation proposal. The user to be invited:
            strong(data-test='candidateName') {{ JSON.stringify(data) }}

        .panel-block.notification.is-warning(style='text-align: center;')
          strong(style='margin: 0 auto;')
            i18n Your Decision?

        .panel-block.center(style='display: block; text-align: center;')
          .help.is-danger(v-if='errorMsg') {{ errorMsg }}

          i18n.button.is-success(
            tag='a'
            style='margin-left:auto; margin-right: 20px;'
            @click='voteFor'
            data-test='forLink'
          ) For

          i18n.button.is-danger(
            tag='a'
            @click='voteAgainst'
            style='margin-right:auto; margin-right: 20px;'
          ) Against
    .column
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
  computed: {
    proposal () {
      return this.currentGroupState.proposals[this.$route.query.proposalHash]
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
    // TODO: either delete this or use it and delete 'contract' computed property
    ...mapGetters([
      'currentGroupState',
      'groupSettings'
    ])
  },
  methods: {
    async voteFor () {
      this.errorMsg = null
      try {
        const proposalHash = this.$route.query.proposalHash
        var payload
        if (oneVoteToPass(proposalHash)) {
          // pass in the data for 'gi.contracts/group/invite/process'
          payload = {
            passPayload: generateInvites(this.data.members.length)
          }
        }
        const vote = await sbp('gi.contracts/group/proposalVote/create',
          {
            proposalHash,
            vote: VOTE_FOR,
            ...(payload || {})
          },
          this.$route.query.groupId
        )
        await sbp('backend/publishLogEntry', vote)

        if (payload) {
          const groupName = this.groupSettings.groupName
          // TODO: delete this entire section, this is just
          //       here for debug and testing purposes until
          //       we get the links page working nicely.
          //       this.data.members will not contain usernames in the future.
          for (const username of this.data.members) {
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
        this.$router.push({ path: '/' })
      } catch (ex) {
        console.log(ex)
        this.errorMsg = L('Failed to Cast Vote')
      }
    },
    async voteAgainst () {
      this.errorMsg = null
      try {
        const vote = await sbp('gi.contracts/group/proposalVote/create',
          {
            proposalHash: this.$route.query.proposalHash,
            vote: VOTE_AGAINST
          },
          this.$route.query.groupId
        )
        await sbp('backend/publishLogEntry', vote)
        this.$router.push({ path: '/' })
      } catch (ex) {
        console.log(ex)
        this.errorMsg = L('Failed to Cast Vote')
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
