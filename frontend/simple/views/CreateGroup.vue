<template>
  <section id="create-group-page" class="section">
    <!-- TODO: use Bulma's .field -->
    <!-- TODO: center using .centered like SignUp.vue -->
    <div class="columns">
      <div class="column is-1"></div>
      <div class="column is-10" >
        <form
          ref="form"
          name="CreateGroupForm"
          @submit.prevent
        >
          <vue-assistant :views="views" @done="submit">
          </vue-assistant>
        </form>
      </div>
      <div class="column is-1"></div>
    </div>
  </section>
</template>
<script>
/* @flow */
import Vue from 'vue'
import backend from '../js/backend'
import * as Events from '../../../shared/events'
import * as contracts from '../js/events'
import L from '../js/translations'
import VueAssistant from '../components/VueAssistant.vue'
import {
  CreateGroupName,
  CreateGroupPurpose,
  CreateGroupMincome,
  CreateGroupRules,
  CreateGroupInvitees,
  CreateGroupSummary
} from '../components/CreateGroup'
import { connect } from '../js/utils'

export default {
  name: 'CreateGroupView',
  components: {
    VueAssistant
  },
  methods: {
    submit: async function () {
      try {
        await this.$validator.validateAll()
      } catch (ex) {
        const { control } = document.querySelector('span.help.is-danger').dataset
        document.querySelector(`input[name="${control}"], textarea[name="${control}"]`).focus()
        document.querySelector(`input[name="${control}"], textarea[name="${control}"]`).scrollIntoView()
        return
      }

      try {
        this.errorMsg = null
        const entry = new contracts.GroupContract({
          authorizations: [Events.CanModifyAuths.dummyAuth()],
          groupName: this.form.groupName,
          sharedValues: this.form.sharedValues,
          changePercentage: this.form.changePercentage,
          memberApprovalPercentage: this.form.memberApprovalPercentage,
          memberRemovalPercentage: this.form.memberRemovalPercentage,
          incomeProvided: this.form.incomeProvided,
          contributionPrivacy: this.form.contributionPrivacy,
          founderUsername: this.$store.state.loggedIn.name,
          founderIdentityContractId: this.$store.state.loggedIn.identityContractId
        })
        const hash = entry.toHash()
        // TODO: convert this to SBL
        Vue.events.$once(hash, (contractId, entry) => {
          this.$store.commit('setCurrentGroupId', hash)
          // Take them to the dashboard.
          this.$router.push({path: '/dashboard'})
        })
        // TODO: convert this to SBL
        await backend.publishLogEntry(hash, entry)
        // add to vuex and monitor this contract for updates
        await this.$store.dispatch('syncContractWithServer', hash)
      } catch (error) {
        console.error(error)
        this.form.errorMsg = L('Failed to Create Group')
        return
      }

      try {
        this.errorMsg = null
        // TODO: as invitees are successfully invited display in a
        // seperate invitees grid and add them to some validation for duplicate invites
        for (let invitee of this.form.invitees) {
          // We need to have the latest mailbox attribute for the user
          const mailbox = await backend.latestHash(invitee.state.attributes.mailbox)
          const sentDate = new Date().toString()

          // We need to post the invite to the users' mailbox contract
          const invite = new Events.HashableMailboxPostMessage(
            {
              from: this.$store.getters.currentGroupState.groupName,
              headers: [this.$store.state.currentGroupId],
              messageType: Events.HashableMailboxPostMessage.TypeInvite,
              sentDate
            },
            mailbox
          )
          await backend.publishLogEntry(invitee.state.attributes.mailbox, invite)

          // We need to make a record of the invitation in the group's contract
          const latest = await backend.latestHash(this.$store.state.currentGroupId)
          const invited = new Events.HashableGroupRecordInvitation(
            {
              username: invitee.state.attributes.name,
              inviteHash: invite.toHash(),
              sentDate
            },
            latest
          )
          await backend.publishLogEntry(this.$store.state.currentGroupId, invited)
        }
        this.invited = true
      } catch (error) {
        console.error(error)
        // TODO: Create More descriptive errors
        this.errorMsg = L('Failed to Invite Users')
      }
    }
  },
  data () {
    return {
      form: {
        groupName: '',
        sharedValues: null,
        changePercentage: 80,
        memberApprovalPercentage: 80,
        memberRemovalPercentage: 80,
        incomeProvided: null,
        contributionPrivacy: 'Very Private',
        invitees: [],
        errorMsg: null
      },
      ephemeral: {
        // this determines whether or not to render proxy components for nightmare
        dev: process.env.NODE_ENV === 'development'
      }
    }
  },
  computed: {
    views: function () {
      return [
        connect(CreateGroupName, this.form, 'groupName'),
        connect(CreateGroupPurpose, this.form, 'sharedValues'),
        connect(CreateGroupMincome, this.form, 'incomeProvided'),
        connect(CreateGroupRules, this.form),
        connect(CreateGroupInvitees, this.form, 'invitees'),
        connect(CreateGroupSummary, this.form)
      ]
    }
  }
}
</script>
