<template>
  <main id="create-group-page">
    <!-- TODO: use Bulma's .field -->
    <div class="section columns is-centered">
      <div class="column is-two-thirds">
        <transition name="fade" mode="out-in">
          <router-view :group="form" :v="$v.form" @next="next" @focusref="focusRef" @input="payload => updateGroupData(payload)">
          </router-view>
        </transition>

        <div class="field is-grouped is-grouped-right gi-is-grouped-reverse form-actions">
          <p class="control" v-if="currentStep + 1 < config.steps.length">
            <button
              ref="next"
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
              ref="finish"
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

        <Message severity='danger' v-if="ephemeral.errorMsg">
          {{ ephemeral.errorMsg }}
        </Message>
      </div>
    </div>
  </main>
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
import Message from './components/Message'
import sbp from '../../../shared/sbp.js'
import contracts from '../model/contracts.js'
import L from './utils/translations.js'
import StepAssistant from './utils/StepAssistant.js'
import { validationMixin } from 'vuelidate'
import { required, between } from 'vuelidate/lib/validators'
import { decimals } from './utils/validators.js'


export default {
  name: 'CreateGroupView',
  mixins: [
    StepAssistant,
    validationMixin
  ],
  components: {
    Message
  },
  methods: {
    focusRef (ref) {
      this.$refs[ref].focus()
    },
    updateGroupData (payload) {
      this.ephemeral.errorMsg = null
      Object.assign(this.form, payload.data)
    },
    submit: async function () {
      if (this.$v.form.$invalid) {
        // TODO: more descriptive error message, highlight erroneous step
        this.ephemeral.errorMsg = L('We still need some info from you, please go back and fill missing fields')
        return
      }

      try {
        this.ephemeral.errorMsg = null
        const entry = sbp('gi/contract/create', 'GroupContract', {
          // authorizations: [contracts.CanModifyAuths.dummyAuth()], // TODO: this
          groupName: this.form.groupName,
          sharedValues: this.form.sharedValues,
          changeThreshold: this.form.changeThreshold,
          memberApprovalThreshold: this.form.memberApprovalThreshold,
          memberRemovalThreshold: this.form.memberRemovalThreshold,
          incomeProvided: +this.form.incomeProvided, // ensure this is a number
          incomeCurrency: this.form.incomeCurrency,
          founderUsername: this.$store.state.loggedIn.name,
          founderIdentityContractId: this.$store.state.loggedIn.identityContractId
        })
        const hash = entry.hash()
        // TODO: convert this to SBL
        sbp('okTurtles.events/once', hash, (contractID, entry) => {
          this.$store.commit('setCurrentGroupId', hash)
          // Take them to the dashboard.
          this.$router.push({path: '/dashboard'})
        })
        // TODO: convert this to SBL
        await sbp('backend/publishLogEntry', entry)
        // add to vuex and monitor this contract for updates
        await this.$store.dispatch('syncContractWithServer', hash)
      } catch (error) {
        console.error(error)
        this.ephemeral.errorMsg = L('Failed to Create Group')
        return
      }

      try {
        this.ephemeral.errorMsg = null
        // TODO: as invitees are successfully invited display in a
        // seperate invitees grid and add them to some validation for duplicate invites
        for (let invitee of this.form.invitees) {
          // We need to have the latest mailbox attribute for the user
          const sentDate = new Date().toISOString()
          // We need to post the invite to the users' mailbox contract
          const invite = await sbp('gi/contract/create-action', 'MailboxPostMessage',
            {
              from: this.$store.getters.currentGroupState.groupName,
              headers: [this.$store.state.currentGroupId],
              messageType: contracts.MailboxPostMessage.TypeInvite,
              sentDate
            },
            invitee.state.attributes.mailbox
          )
          await sbp('backend/publishLogEntry', invite)

          // We need to make a record of the invitation in the group's contract
          const invited = await sbp('gi/contract/create-action', 'GroupRecordInvitation',
            {
              username: invitee.state.attributes.name,
              inviteHash: invite.hash(),
              sentDate
            },
            this.$store.state.currentGroupId
          )
          await sbp('backend/publishLogEntry', invited)
        }
      } catch (error) {
        console.error(error)
        // TODO: Create More descriptive errors
        this.ephemeral.errorMsg = L('Failed to Invite Users')
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
        incomeCurrency: 'USD', // TODO: grab this as a constant from currencies.js
        invitees: []
      },
      ephemeral: {
        errorMsg: null,
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
