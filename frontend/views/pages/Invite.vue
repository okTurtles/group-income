<template lang="pug">
page(pageTestName='invite' pageTestHeaderName='invite')
  template(#title='') Invite

  .card
    p(
      v-if='form.success'
      data-test='notifyInvitedSuccess'
    )
      i.icon-check
      i18n(v-if='isProposal') Members proposed successfully!
      i18n(v-else='') Members invited successfully!

    group-invitees(
      v-else=''
      :group='form'
      @input='(payload) => updateInvitees(payload)'
    )

    .buttons
      button.is-success(
        type='submit'
        :disabled='!form.invitees.length'
        v-if='!form.success'
        @click='submit' data-test='submit'
      )
        i18n(v-if='isProposal') Propose Invites
        i18n(v-else='') Send Invites
</template>
<script>
// TODO: delete or rewrite this entire file and all related components
//       https://github.com/okTurtles/group-income-simple/issues/609

import sbp from '~/shared/sbp.js'
import { PROPOSAL_INVITE_MEMBER } from '@model/contracts/voting/proposals.js'
import { generateInvites } from '@model/contracts/group.js'
import { TYPE_MESSAGE } from '@model/contracts/mailbox.js'
import L from '@view-utils/translations.js'
import Page from './Page.vue'
import { GroupInvitees } from '@components/CreateGroupSteps/index.js'
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'Invite',
  components: {
    Page,
    GroupInvitees
  },
  data () {
    return {
      form: {
        invitees: [],
        success: false,
        errorMsg: null
      }
    }
  },
  computed: {
    isProposal () {
      return this.groupMembersCount >= 3
    },
    ...mapState([
      'currentGroupId',
      'loggedIn'
    ]),
    ...mapGetters([
      'groupSettings',
      'groupMembersCount'
    ])
  },
  methods: {
    updateInvitees (payload) {
      this.form.errorMsg = null
      Object.assign(this.form, payload.data)
    },
    async submit () {
      try {
        this.form.errorMsg = null
        const groupId = this.currentGroupId
        const groupName = this.groupSettings.groupName

        for (const member of this.form.invitees) {
          const mailbox = member.state.attributes.mailbox
          const memberName = member.state.attributes.name

          if (this.isProposal) {
            const proposal = await sbp('gi.contracts/group/proposal/create',
              {
                proposalType: PROPOSAL_INVITE_MEMBER,
                proposalData: {
                  members: [memberName], // TODO: create a single proposal?
                  reason: L("Because they're great") // TODO: this?
                },
                votingRule: this.groupSettings.proposals[PROPOSAL_INVITE_MEMBER].rule,
                expires_date_ms: Date.now() + this.groupSettings.proposals[PROPOSAL_INVITE_MEMBER].expires_ms
              },
              groupId
            )
            await sbp('backend/publishLogEntry', proposal)
          } else {
            const invite = generateInvites(1)
            const inviteToMailbox = await sbp('gi.contracts/mailbox/postMessage/create',
              {
                messageType: TYPE_MESSAGE,
                from: groupName,
                subject: `You've been invited to join ${groupName}!`,
                message: `Hi ${memberName},

                Here's your special invite link:

                ${process.env.FRONTEND_URL}/app/join?groupId=${this.$store.state.currentGroupId}&secret=${invite.inviteSecret}`
              },
              mailbox
            )
            const inviteToGroup = await sbp('gi.contracts/group/invite/create',
              invite, // or, if this is a bulk invite, the number of members invited
              groupId
            )
            // TODO: place these in SBP calls, consider using ArchivedTransactionQueue
            // NOTE: avoiding use of ArchivedTransactionQueue is better than using it. Here for example,
            //       we could make it so that a user can be invited to a group multiple times, and the system
            //       just accepts/cares about the most recent invite only and forgets the previous one
            await sbp('backend/publishLogEntry', inviteToGroup)
            await sbp('backend/publishLogEntry', inviteToMailbox)
          }
        }
        // TODO: global success message (see #175) and redirect to previous page instead?
        this.form.success = true
      } catch (error) {
        console.error(error)
        // TODO: Create More descriptive errors
        this.form.errorMsg = L('Failed to Invite Users')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.icon-check,
.notification-icon {
  margin-right: 1rem;
}
</style>
