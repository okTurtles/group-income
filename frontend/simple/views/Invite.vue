<template>
  <section class="section full-screen">
    <div class="columns is-centered">
      <div class="column is-half">

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
    </div>
  </section>
</template>
<style lang="scss" scoped>
.notification-icon {
  margin-right: 1rem;
}
</style>
<script>
import * as Events from '../../../shared/events'
import backend from '../controller/backend/'
import L from '../js/translations'
import template from 'string-template'
import { GroupInvitees } from '../components/Group'
import { mapState, mapGetters } from 'vuex'
import sbp from '../../../shared/sbp'

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
            this.form.errorMsg = template(L('Failed to invite users: member {name} is already invited'),
              { name: memberName })
            return
          }

          let inviteToMailbox = await sbp('groupIncome.contracts/mailContract/createPostMessage', mailbox, groupName, groupId, 'TypeInvite')
          let inviteToGroup = await sbp('groupIncome.contracts/groupContract/createInvitation', inviteToMailbox.toHash(), memberName, groupId)

          if (this.isProposal) {
            let latest = await backend.latestHash(groupId)
            let proposal = new Events.HashableGroupProposal({
              // for proposal template selection in Vote.vue
              type: Events.HashableGroupProposal.TypeInvitation,
              // calculate the voting threshold from the group data
              threshold: this.currentGroupState.memberApprovalThreshold,
              candidate: memberName,
              actions: [
                { contractId: mailbox, action: JSON.stringify(inviteToMailbox.toObject()) },
                { contractId: groupId, action: JSON.stringify(inviteToGroup.toObject()) }
              ],
              initiator: this.loggedIn.name,
              initiationDate: new Date().toString()
            }, latest)
            await backend.publishLogEntry(groupId, proposal)
          } else {
            // TODO: place these in SBP calls, consider using ArchivedTransactionQueue
            // NOTE: avoiding use of ArchivedTransactionQueue is better than using it. Here for example,
            //       we could make it so that a user can be invited to a group multiple times, and the system
            //       just accepts/cares about the most recent invite only and forgets the previous one
            await backend.publishLogEntry(groupId, inviteToGroup)
            await backend.publishLogEntry(mailbox, inviteToMailbox)
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
