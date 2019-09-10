<template lang='pug'>
//- TODO: move this into modal
main.main#create-group-page
  .steps
    router-link.step(
      v-for='(step, index) in config.steps'
      :key='index'
      :to='{name: step}'
      :class='[currentStep === index ? "active" : "", currentStep < index ? "next" : ""]'
    ) {{ index + 1 }}

  transition(name='fade' mode='out-in')
    router-view(
      :group='form'
      :v='$v.form'
      @next='next'
      @focusref='focusRef'
      @input='payload => updateGroupData(payload)'
    )

  .buttons
    button.is-outlined(
      @click='prev'
      data-test='prevBtn'
    )
      i18n {{ currentStep === 0 ? 'Cancel' : 'Back' }}

    button.is-success(
      v-if='currentStep + 1 < config.steps.length'
      ref='next'
      @click='next'
      :disabled='$v.steps[$route.name] && $v.steps[$route.name].$invalid'
      data-test='nextBtn'
    )
      i18n Next
      i.icon-arrow-right

    button.is-success(
      v-else=''
      ref='finish'
      @click='submit'
      :disabled='$v.form.$invalid'
      data-test='finishBtn'
    )
      i18n Create Group

  message(
    v-if='ephemeral.errorMsg'
    severity='danger'
  ) {{ ephemeral.errorMsg }}
</template>

<script>
import sbp from '~/shared/sbp.js'
import { RULE_THRESHOLD } from '@model/contracts/voting/rules.js'
import proposals, { PROPOSAL_INVITE_MEMBER, PROPOSAL_REMOVE_MEMBER, PROPOSAL_GROUP_SETTING_CHANGE, PROPOSAL_PROPOSAL_SETTING_CHANGE, PROPOSAL_GENERIC } from '@model/contracts/voting/proposals.js'
import imageUpload from '@utils/imageUpload.js'
import L from '@view-utils/translations.js'
import { decimals } from '@view-utils/validators.js'
import StepAssistant from '@view-utils/stepAssistant.js'
import Message from '@components/Message.vue'
import { merge } from '@utils/giLodash.js'
import { validationMixin } from 'vuelidate'

// we use require instead of import with this file to make rollup happy
// or not... using require only makes rollup happy during compilation
// but then the browser complains about "require is not defined"
import { required, between } from 'vuelidate/lib/validators'

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
      console.log(this.$refs[ref], this.$refs, ref)
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

      if (this.ephemeral.groupPictureFile) {
        try {
          this.form.groupPicture = await imageUpload(this.ephemeral.groupPictureFile)
        } catch (error) {
          console.error(error)
          this.ephemeral.errorMsg = L('Failed to upload Group Picture')
          return false
        }
      }

      // create the GroupContract
      try {
        this.ephemeral.errorMsg = null
        const entry = sbp('gi.contracts/group/create', {
          // authorizations: [contracts.CanModifyAuths.dummyAuth()], // TODO: this
          groupName: this.form.groupName,
          groupPicture: this.form.groupPicture,
          sharedValues: this.form.sharedValues,
          incomeProvided: +this.form.incomeProvided, // ensure this is a number
          incomeCurrency: this.form.incomeCurrency,
          proposals: {
            // TODO: make the UI support changing the rule type, so that we have
            //       a component for RULE_DISAGREEMENT as well
            [PROPOSAL_GROUP_SETTING_CHANGE]: merge({},
              proposals[PROPOSAL_GROUP_SETTING_CHANGE].defaults,
              { ruleSettings: { [RULE_THRESHOLD]: { threshold: this.form.changeThreshold } } }
            ),
            [PROPOSAL_INVITE_MEMBER]: merge({},
              proposals[PROPOSAL_INVITE_MEMBER].defaults,
              { ruleSettings: { [RULE_THRESHOLD]: { threshold: this.form.memberApprovalThreshold } } }
            ),
            [PROPOSAL_REMOVE_MEMBER]: merge({},
              proposals[PROPOSAL_REMOVE_MEMBER].defaults,
              { ruleSettings: { [RULE_THRESHOLD]: { threshold: this.form.memberRemovalThreshold } } }
            ),
            [PROPOSAL_PROPOSAL_SETTING_CHANGE]: proposals[PROPOSAL_PROPOSAL_SETTING_CHANGE].defaults,
            [PROPOSAL_GENERIC]: proposals[PROPOSAL_GENERIC].defaults
          }
        })
        const hash = entry.hash()
        sbp('okTurtles.events/once', hash, (contractID, entry) => {
          this.$store.commit('setCurrentGroupId', hash)
          this.$router.push({ path: '/welcome' })
        })
        await sbp('backend/publishLogEntry', entry)
        // add to vuex and monitor this contract for updates
        await sbp('state/vuex/dispatch', 'syncContractWithServer', hash)
      } catch (error) {
        console.error(error)
        this.ephemeral.errorMsg = L('Failed to Create Group')
      }
    }
  },
  data () {
    return {
      form: {
        groupName: '',
        groupPicture: '',
        sharedValues: null,
        changeThreshold: proposals[PROPOSAL_GROUP_SETTING_CHANGE].defaults.ruleSettings[RULE_THRESHOLD].threshold,
        memberApprovalThreshold: proposals[PROPOSAL_INVITE_MEMBER].defaults.ruleSettings[RULE_THRESHOLD].threshold,
        memberRemovalThreshold: proposals[PROPOSAL_REMOVE_MEMBER].defaults.ruleSettings[RULE_THRESHOLD].threshold,
        incomeProvided: null,
        incomeCurrency: 'USD' // TODO: grab this as a constant from currencies.js
      },
      ephemeral: {
        errorMsg: null,
        // this determines whether or not to render proxy components for tests
        dev: process.env.NODE_ENV === 'development'
      },
      config: {
        steps: [
          'GroupName',
          'GroupPurpose',
          'GroupMincome',
          'GroupRules'
        ]
      }
    }
  },
  validations: {
    form: {
      groupName: { required },
      groupPicture: { },
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
      GroupName: [
        'form.groupName',
        'form.groupPicture'
      ],
      GroupPurpose: ['form.sharedValues'],
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

<style scoped>
.main {
  /* TODO: Remove this later */
  max-width: 600px;
  padding: 2.5rem;
}
</style>
