<template lang="pug">
page(pageTestName='invite' pageTestHeaderName='invite')
  template(#title='') Invite

  .p-section
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
        @click='submit' data-test='submit'
      )
        i18n(v-if='isProposal') Propose Invites
        i18n(v-else='') Send Invites
</template>

<script>
import sbp from '~/shared/sbp.js'
import contracts from '@model/contracts.js'
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
      return this.memberCount() >= 3
    },
    ...mapState([
      'currentGroupId',
      'loggedIn'
    ]),
    ...mapGetters([
      'currentGroupState',
      'memberCount'
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
        const groupName = this.currentGroupState.groupName

        for (const member of this.form.invitees) {
          const mailbox = member.state.attributes.mailbox
          const memberName = member.state.attributes.name

          if (this.isAlreadyInvited(member)) {
            this.form.errorMsg = L('Failed to invite users: member {name} is already invited',
              { name: memberName })
            return
          }

          const inviteToMailbox = await sbp('gi.contracts/mailbox/postMessage/create',
            {
              from: groupName,
              headers: [groupId],
              messageType: contracts.MailboxPostMessage.TypeInvite
            },
            mailbox
          )
          const inviteToGroup = await sbp('gi.contracts/group/invite/create',
            {
              username: memberName,
              inviteHash: inviteToMailbox.hash()
            },
            groupId
          )

          if (this.isProposal) {
            const proposal = await sbp('gi.contracts/group/proposal/create',
              {
                // for proposal template selection in Vote.vue
                type: contracts.GroupProposal.TypeInvitation,
                // calculate the voting threshold from the group data
                threshold: this.currentGroupState.memberApprovalThreshold,
                candidate: memberName,
                // TODO: this is bad, do not turn the messages into actions like this.
                //       put only the minimal data necessary.
                actions: [
                  { contractID: mailbox, type: inviteToMailbox.type(), action: JSON.stringify(inviteToMailbox.data()) },
                  { contractID: groupId, type: inviteToGroup.type(), action: JSON.stringify(inviteToGroup.data()) }
                ],
                initiator: this.loggedIn.username
              },
              groupId
            )
            await sbp('backend/publishLogEntry', proposal)
          } else {
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
    },
    isAlreadyInvited (member) {
      const candidateMembers = this.$store.getters[`${this.$store.state.currentGroupId}/candidateMembers`]
      return Object.keys(this.currentGroupState.profiles).find(profile => profile === member) ||
        this.currentGroupState.invitees.find(invitee => invitee === member) ||
        candidateMembers.find(username => username === member)
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
