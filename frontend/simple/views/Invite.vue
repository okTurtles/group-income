<template>
  <section class="section full-screen">
    <div class="columns is-centered">
      <div class="column is-half">

        <p
          class="notification is-success has-text-centered"
          data-test="notifyInvitedSuccess"
          v-if="form.invited"
        >
          <i class='notification-icon fa fa-check'></i>
          <i18n>Members invited successfully!</i18n>
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
            <i18n>Send Invites</i18n>
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
import L from '../js/translations'
import { GroupInvitees } from '../components/Group'
import { mapGetters } from 'vuex'
import {
  createInviteMail,
  publishInviteMail,
  createInviteToGroup,
  publishInviteToGroup
} from '../js/invites'

export default {
  name: 'Invite',
  components: {
    GroupInvitees
  },
  data () {
    return {
      form: {
        invitees: [],
        invited: false,
        errorMsg: null
      }
    }
  },
  computed: {
    ...mapGetters(['currentGroupState'])
  },
  methods: {
    updateInvitees (payload) {
      this.form.errorMsg = null
      Object.assign(this.form, payload.data)
    },
    async submit () {
      try {
        this.form.errorMsg = null
        const groupId = this.$store.state.currentGroupId
        const groupName = this.currentGroupState.groupName

        for (let member of this.form.invitees) {
          let mailbox = member.state.attributes.mailbox
          let memberName = member.state.attributes.name

          let inviteToMailbox = await createInviteMail(mailbox, groupName, groupId)
          await publishInviteMail(mailbox, inviteToMailbox)

          let inviteToGroup = await createInviteToGroup(inviteToMailbox.toHash(), memberName, groupId)
          await publishInviteToGroup(groupId, inviteToGroup)
        }
        // TODO: global success message (see #175) and redirect to previous page instead?
        this.form.invited = true
      } catch (error) {
        console.error(error)
        // TODO: Create More descriptive errors
        this.form.errorMsg = L('Failed to Invite Users')
      }
    }
  }
}
</script>
