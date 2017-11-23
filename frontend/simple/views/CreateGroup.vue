<template>
  <section id="create-group-page" class="section">
    <!-- TODO: use Bulma's .field -->
    <!-- TODO: center using .centered like SignUp.vue -->
    <div class="columns">
      <div class="column is-half is-offset-one-quarter" >
        <transition name="fade" mode="out-in">
          <router-view :group="form" :validity="validity" @input="(payload) => updateGroupData(payload)">
          </router-view>
        </transition>

        <div class="field step-controls">
          <p class="control" v-if="currentStep + 1 < config.steps.length">
            <button
              class="button is-success is-large"
              @click="next"
              id="nextBtn"
            >
              <i18n>Next</i18n>
              <span class="icon">
                <i class="fa fa-arrow-right"></i>
              </span>
            </button>
          </p>
          <p class="control" v-else>
            <button
              class="button is-success is-large"
              @click="submit"
              :disabled="Object.values(validity).some(field => !field)"
              id="finishBtn"
            >
              <i18n>Finish</i18n>
              <span class="icon">
                <i class="fa fa-check-circle"></i>
              </span>
            </button>
          </p>
          <p class="control">
            <button
              class="button is-light is-medium"
              @click="prev"
              :disabled="!this.currentStep"
              id="prevBtn"
            >
              <i18n>Back</i18n>
            </button>
          </p>
        </div>
        <article class="message is-danger" v-if="errorMsg">
          <div class="message-body">
            {{ errorMsg }}
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
<style>
  .fade-enter-active, .fade-leave-active {
    transition: opacity .2s;
  }
  .fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
    opacity: 0;
  }
  .step-controls {
    display: flex;
    flex-direction: row-reverse;
    align-items: flex-end;
    justify-content: flex-start;
    margin-top: 3rem;
  }
  .step-controls .control {
    margin-left: 0.25rem;
  }
  #create-group-page .title.is-1,
  #create-group-page .title.is-2 {
    margin-bottom: 3rem;
  }
</style>
<script>
/* @flow */
import Vue from 'vue'
import backend from '../js/backend'
import * as Events from '../../../shared/events'
import * as contracts from '../js/events'
import L from '../js/translations'
import StepAssistant from '../components/StepAssistant'

export default {
  name: 'CreateGroupView',
  mixins: [
    StepAssistant
  ],
  methods: {
    updateGroupData (payload) {
      this.errorMsg = null
      Object.assign(this.form, payload.data)
      Object.assign(this.validity, payload.validity)
    },
    submit: async function () {
      if (Object.values(this.validity).some(field => !field)) {
        // TODO: more descriptive error message, highlight erroneous step
        this.errorMsg = L('We still need some info from you, please go back and fill missing fields')
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
        this.errorMsg = L('Failed to Create Group')
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
        invitees: []
      },
      // todo: move these under appropriate key for #297
      errorMsg: null,
      validity: {
        groupName: false,
        sharedValues: false,
        incomeProvided: false
      },
      ephemeral: {
        // this determines whether or not to render proxy components for nightmare
        dev: process.env.NODE_ENV === 'development'
      },
      config: {
        steps: [
          'CreateGroupName',
          'CreateGroupPurpose',
          'CreateGroupMincome',
          'CreateGroupRules',
          'CreateGroupPrivacy',
          'CreateGroupInvitees',
          'CreateGroupSummary'
        ]
      }
    }
  }
}
</script>
