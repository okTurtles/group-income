<template lang='pug'>
modal-base-template(:fullscreen='true')
  .steps(v-if='currentStep + 1 < config.steps.length')
    button.step(
      v-for='(step, index) in config.steps'
      :key='index'
      :class='[currentStep === index ? "active" : "", currentStep < index ? "next" : ""]'
      @click='redirect(step)'
      v-if='step != "GroupWelcome"'
    ) {{ index + 1 }}

  .wrapper.mobile-steps.subtitle(v-if='currentStep + 1 < config.steps.length')
    i18n(:args='{ current: currentStep + 1, max: config.steps.length - 1}') Step {current} of {max}

  transition(name='fade' mode='out-in')
    component(
      :is='content'
      :group='form'
      :$v='$v'
      @next='next'
      @focusref='focusRef'
      @input='payload => updateGroupData(payload)'
    )

      banner-scoped(ref='formMsg')

      .buttons(v-if='currentStep + 1 < config.steps.length')
        button.is-outlined(
          @click='prev'
          data-test='prevBtn'
        ) {{ currentStep === 0 ? L('Cancel') : L('Back') }}

        button.is-primary(
          v-if='currentStep + 2 < config.steps.length'
          ref='next'
          @click='next'
          :disabled='$v.steps[content] && $v.steps[content].$invalid'
          data-test='nextBtn'
        )
          | {{ L('Next') }}
          i.icon-arrow-right.is-suffix

        button.is-success(
          v-else=''
          ref='finish'
          @click='submit'
          :disabled='$v.form.$invalid'
          data-test='finishBtn'
        ) {{ L('Create Group') }}
</template>

<script>
import ModalBaseTemplate from '@components/Modal/ModalBaseTemplate.vue'
import { RULE_THRESHOLD } from '@model/contracts/voting/rules.js'
import proposals, { PROPOSAL_INVITE_MEMBER, PROPOSAL_REMOVE_MEMBER, PROPOSAL_GROUP_SETTING_CHANGE } from '@model/contracts/voting/proposals.js'
import L from '@view-utils/translations.js'
import { decimals } from '@view-utils/validators.js'
import StepAssistant from '@view-utils/stepAssistant.js'
import BannerScoped from '@components/BannerScoped.vue'
import { validationMixin } from 'vuelidate'
import GroupWelcome from '@components/GroupWelcome.vue'
import {
  GroupName,
  GroupPurpose,
  GroupMincome,
  GroupRules,
  GroupPrivacy
} from '@components/CreateGroupSteps/index.js'

// we use require instead of import with this file to make rollup happy
// or not... using require only makes rollup happy during compilation
// but then the browser complains about "require is not defined"
import { required, between } from 'vuelidate/lib/validators'
import groupCreation from '../../../actions/groupCreation.js'

export default {
  name: 'CreateGroupModal',
  mixins: [
    StepAssistant,
    validationMixin
  ],
  components: {
    ModalBaseTemplate,
    BannerScoped,
    GroupName,
    GroupPurpose,
    GroupMincome,
    GroupRules,
    GroupPrivacy,
    GroupWelcome
  },
  methods: {
    focusRef (ref) {
      this.$refs[ref].focus()
    },
    updateGroupData (payload) {
      this.$refs.formMsg && this.$refs.formMsg.clean() // It doesn't exist when changing to Welcome step.
      Object.assign(this.form, payload.data)
    },
    async submit () {
      if (this.$v.form.$invalid) {
        // TODO: more descriptive error message, highlight erroneous step
        this.$refs.formMsg.danger(L('Some information is invalid, please review it and try again.'))
        return
      }

      try {
        this.$refs.formMsg.clean()
        groupCreation({
          name: this.form.groupName,
          picture: this.ephemeral.groupPictureFile,
          sharedValues: this.form.sharedValues,
          mincomeAmount: this.form.mincomeAmount,
          mincomeCurrency: this.form.mincomeCurrency,
          thresholdChange: this.form.changeThreshold,
          thresholdMemberApproval: this.form.memberApprovalThreshold,
          thresholdMemberRemoval: this.form.memberRemovalThreshold
        }, () => {
          this.next()
        })
      } catch (e) {
        console.error('CreateGroup.vue submit() error:', e)
        this.$refs.formMsg.danger(e.message)
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
        mincomeAmount: null,
        mincomeCurrency: 'USD' // TODO: grab this as a constant from currencies.js
      },
      ephemeral: {
        // this determines whether or not to render proxy components for tests
        dev: process.env.NODE_ENV === 'development'
      },
      config: {
        steps: [
          'GroupName',
          'GroupPurpose',
          'GroupMincome',
          'GroupRules',
          'GroupWelcome'
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
      mincomeAmount: {
        required,
        minValue: (val) => val > 0,
        decimals: decimals(2)
      },
      mincomeCurrency: {
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
        'form.mincomeAmount',
        'form.mincomeCurrency'
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

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.steps {
  width: calc(100% - 2rem);
  max-width: 34rem;
  margin-top: 3.5rem;
  flex-shrink: 0;
}

.wrapper {
  width: calc(100% - 2rem);
  max-width: 33rem;
}
</style>
