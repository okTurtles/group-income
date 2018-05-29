<template>
  <section id="create-group-page" class="section">
    <!-- TODO: use Bulma's .field -->
    <div class="columns is-centered">
      <div class="column is-half">
        <transition name="fade" mode="out-in">
          <router-view :group="form" :v="$v.form" @input="(payload) => updateGroupData(payload)">
          </router-view>
        </transition>

        <div class="field is-grouped is-grouped-right gi-is-grouped-reverse form-actions">
          <p class="control" v-if="currentStep + 1 < config.steps.length">
            <button
              class="button is-success is-large"
              @click="next"
              :disabled="$v.steps[$route.name] && $v.steps[$route.name].$invalid"
              data-test="nextBtn"
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
              :disabled="$v.form.$invalid"
              data-test="finishBtn"
            >
              <i18n>Finish</i18n>
              <span class="icon">
                <i class="fa fa-check-circle"></i>
              </span>
            </button>
          </p>
          <p class="control" v-if="currentStep !== 0">
            <button
              class="button is-light is-large"
              @click="prev"
              data-test="prevBtn"
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
  /*
  TODO: Steps layouts should have a template defined
  so we don't need to repeat markup (titles in this case)
  */
  #create-group-page .title.is-1,
  #create-group-page .title.is-2 {
    margin-bottom: 2rem;
  }

  /*
  TODO: avoid these global rules
   */
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.2s;
  }

  .fade-enter,
  .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
    opacity: 0;
  }
</style>
<style scoped>
  .form-actions {
    margin-top: 3rem;
  }
</style>
<script>
/* @flow */
import Vue from 'vue'
import backend from '../../controller/backend'
import * as Events from '../../../../shared/events'
import * as contracts from '../../model/contracts/events'
import L from '../utils/translations'
import StepAssistant from '../utils/StepAssistant'
import { validationMixin } from 'vuelidate'
import { required, between } from 'vuelidate/lib/validators'
import { decimals } from '../utils/validators'

export default {
  name: 'CreateGroupView',
  mixins: [
    StepAssistant,
    validationMixin
  ],
  methods: {
    updateGroupData (payload) {
      this.errorMsg = null
      Object.assign(this.form, payload.data)
    },
    submit: async function () {
      if (this.$v.form.$invalid) {
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
          changeThreshold: this.form.changeThreshold,
          memberApprovalThreshold: this.form.memberApprovalThreshold,
          memberRemovalThreshold: this.form.memberRemovalThreshold,
          incomeProvided: this.form.incomeProvided,
          incomeCurrency: this.form.incomeCurrency,
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
        changeThreshold: 0.8,
        memberApprovalThreshold: 0.8,
        memberRemovalThreshold: 0.8,
        incomeProvided: null,
        incomeCurrency: 'USD',
        invitees: []
      },
      // todo: move these under appropriate key for #297
      errorMsg: null,
      ephemeral: {
        // this determines whether or not to render proxy components for nightmare
        dev: process.env.NODE_ENV === 'development'
      },
      config: {
        steps: [
          'GroupName',
          'GroupPurpose',
          'GroupMincome',
          'GroupRules',
          'GroupPrivacy',
          'GroupInvitees',
          'GroupSummary'
        ]
      }
    }
  },
  validations: {
    form: {
      groupName: { required },
      sharedValues: { required },
      changeThreshold: {
        required,
        between: between(0.01, 1)
      },
      memberApprovalThreshold: {
        required,
        between: between(0.01, 1)
      },
      memberRemovalThreshold: {
        required,
        between: between(0.01, 1)
      },
      incomeProvided: {
        required,
        decimals: decimals(2)
      },
      incomeCurrency: {
        required
      }
    },
    // validation groups by route name for steps
    steps: {
      GroupName: [ 'form.groupName' ],
      GroupPurpose: [ 'form.sharedValues' ],
      GroupMincome: [
        'form.incomeProvided',
        'form.incomeCurrency'
      ],
      GroupRules: [
        'form.changeThreshold',
        'form.memberApprovalThreshold',
        'form.memberRemovalThreshold'
      ]
    }
  }
}
</script>
