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
import backend from '../js/backend/'
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

          let inviteToMailbox = await sbp('proposals/invite/mailRecord/create/v1', mailbox, groupName, groupId)
          let inviteToGroup = await sbp('proposals/invite/groupRecord/create/v1', inviteToMailbox.toHash(), memberName, groupId)

          if (this.isProposal) {
            let latest = await backend.latestHash(groupId)
            let proposal = new Events.HashableGroupProposal({
              proposal: template(
                L('This is a Vote for {name} to become a member of {group}'),
                { name: memberName, group: groupName }
              ),
              // calculate the voting threshold from the group data
              percentage: this.currentGroupState.memberApprovalPercentage * 0.01,
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
            await backend.publishLogEntry(mailbox, inviteToMailbox)
            await backend.publishLogEntry(groupId, inviteToGroup)
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
