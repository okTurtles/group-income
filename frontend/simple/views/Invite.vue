<template>
  <main>
    <section class="section columns is-centered">
      <div class="column is-two-thirds">
        <p
          class="notification is-success has-text-centered"
          data-test="notifyInvitedSuccess"
          v-if="form.success"
        >
          <i class="notification-icon fa fa-check"></i>
          <i18n v-if="isProposal">Members proposed successfully!</i18n>
          <i18n v-else>Members invited successfully!</i18n>
        </p>

        <group-invitees
          :group="form"
          @input="(payload) => updateInvitees(payload)"
          v-else
        >
        </group-invitees>

        <div class="has-text-centered">
          <button
            class="button is-success is-large"
            type="submit"
            :disabled="!form.invitees.length"
            @click="submit"
            data-test="submit"
          >
            <i18n v-if="isProposal">Propose Invites</i18n>
            <i18n v-else>Send Invites</i18n>
          </button>
        </div>

      </div>
    </section>
  </main>
</template>
<style lang="scss" scoped>
.notification-icon {
  margin-right: 1rem;
}
</style>
<script>
import sbp from '../../../shared/sbp.js'
import contracts from '../model/contracts.js'
import L from './utils/translations.js'
import { GroupInvitees } from './components/CreateGroupSteps/index.js'
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'Invite',
  components: {
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

        for (let member of this.form.invitees) {
          let mailbox = member.state.attributes.mailbox
          let memberName = member.state.attributes.name

          if (this.isAlreadyInvited(member)) {
            this.form.errorMsg = L('Failed to invite users: member {name} is already invited',
              { name: memberName })
            return
          }

          let inviteToMailbox = await sbp('gi/contract/create-action', 'MailboxPostMessage',
            {
              from: groupName,
              headers: [groupId],
              messageType: contracts.MailboxPostMessage.TypeInvite,
              sentDate: new Date().toISOString()
            },
            mailbox
          )
          let inviteToGroup = await sbp('gi/contract/create-action', 'GroupRecordInvitation',
            {
              username: memberName,
              inviteHash: inviteToMailbox.hash(),
              sentDate: new Date().toISOString()
            },
            groupId
          )

          if (this.isProposal) {
            let proposal = await sbp('gi/contract/create-action', 'GroupProposal',
              {
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
                initiator: this.loggedIn.name,
                initiationDate: new Date().toISOString()
              },
              groupId
            )
            await sbp('backend/publishLogEntry', proposal)
          } else {
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
