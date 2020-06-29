<template lang='pug'>
modal-base-template(:fullscreen='true' :a11yTitle='L("Create Group")')
  .steps(v-if='currentStep + 1 < config.steps.length')
    button.step(
      v-for='(step, index) in config.steps'
      :key='index'
      :class='[currentStep === index ? "active" : "", currentStep < index ? "next" : ""]'
      @click='redirect(step)'
      v-if='step != "GroupWelcome"'
    ) {{ index + 1 }}

  .wrapper.mobile-steps.subtitle(v-if='currentStep + 1 < config.steps.length')
    i18n.is-subtitle(:args='{ current: currentStep + 1, max: config.steps.length - 1}') Step {current} of {max}

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

        button-submit.is-success(
          v-else=''
          ref='finish'
          @click='submit'
          data-test='finishBtn'
        ) {{ L('Create Group') }}
</template>

<script>
import sbp from '~/shared/sbp.js'
import { validationMixin } from 'vuelidate'
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import { RULE_PERCENTAGE, RULE_DISAGREEMENT } from '@model/contracts/voting/rules.js'
import proposals from '@model/contracts/voting/proposals.js'
import { PROPOSAL_GENERIC } from '@model/contracts/voting/constants.js'
import currencies, { mincomePositive, saferFloat } from '@view-utils/currencies.js'
import L from '@view-utils/translations.js'
import StepAssistant from '@view-utils/stepAssistant.js'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import GroupWelcome from '@components/GroupWelcome.vue'
import {
  GroupName,
  GroupPurpose,
  GroupMincome,
  GroupRules,
  GroupPrivacy
} from '@components/group-creation-steps/index.js'

// we use require instead of import with this file to make rollup happy
// or not... using require only makes rollup happy during compilation
// but then the browser complains about "require is not defined"
import { required, requiredIf, between } from 'vuelidate/lib/validators'

export default {
  name: 'GroupCreationModal',
  mixins: [
    StepAssistant,
    validationMixin
  ],
  components: {
    ModalBaseTemplate,
    BannerScoped,
    ButtonSubmit,
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
        // TODO: more descriptive error message. Perhaps highlight error step
        this.$refs.formMsg.danger(L('Some information is invalid, please review it and try again.'))
        return
      }

      try {
        this.$refs.formMsg.clean()

        await sbp('gi.actions/group/createAndSwitch', {
          name: this.form.groupName,
          picture: this.ephemeral.groupPictureFile,
          sharedValues: this.form.sharedValues,
          mincomeAmount: saferFloat(this.form.mincomeAmount),
          mincomeCurrency: this.form.mincomeCurrency,
          ruleName: this.form.ruleName,
          ruleThreshold: this.form.ruleThreshold[this.form.ruleName]
        })
        this.next()
      } catch (e) {
        console.error('CreateGroup.vue submit() error:', e)
        this.$refs.formMsg.danger(e.message)
      }
    }
  },
  data () {
    // It's okay to use "PROPOSAL_GENERIC" as an example because all the settings are the same.
    const proposalsSettings = proposals[PROPOSAL_GENERIC].defaults.ruleSettings
    return {
      form: {
        groupName: '',
        groupPicture: '',
        sharedValues: '',
        // randomize to reduce choice bias
        ruleOrder: Math.round(Math.random()) === 1 ? [RULE_PERCENTAGE, RULE_DISAGREEMENT] : [RULE_DISAGREEMENT, RULE_PERCENTAGE],
        mincomeAmount: null,
        mincomeCurrency: 'USD',
        ruleName: null,
        ruleThreshold: {
          [RULE_DISAGREEMENT]: proposalsSettings[RULE_DISAGREEMENT].threshold,
          [RULE_PERCENTAGE]: proposalsSettings[RULE_PERCENTAGE].threshold
        },
        // randomize to reduce choice bias
        rulesOrder: Math.round(Math.random()) ? [RULE_PERCENTAGE, RULE_DISAGREEMENT] : [RULE_DISAGREEMENT, RULE_PERCENTAGE]
      },
      ephemeral: {
        groupPictureFile: '' // passed by GroupName.vue
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
      sharedValues: { },
      mincomeAmount: {
        required,
        positive: mincomePositive,
        decimals: function (val) {
          return currencies[this.form.mincomeCurrency].validate(val)
        }
      },
      mincomeCurrency: {
        required
      },
      ruleName: {
        required,
        oneOf: (value) => [RULE_DISAGREEMENT, RULE_PERCENTAGE].includes(value)
      },
      ruleThreshold: {
        [RULE_DISAGREEMENT]: {
          required: requiredIf(function () {
            return this.form.ruleName === RULE_DISAGREEMENT
          }),
          between: between(1, 60)
        },
        [RULE_PERCENTAGE]: {
          required: requiredIf(function (nestedModel) {
            return this.form.ruleName === RULE_PERCENTAGE
          }),
          between: between(0, 100)
        }
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
