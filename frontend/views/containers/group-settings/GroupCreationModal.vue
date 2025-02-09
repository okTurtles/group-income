<template lang='pug'>
modal-base-template(data-test='groupCreationModal' :fullscreen='true' :a11yTitle='L("Create Group")')
  .steps(v-if='currentStep < config.steps.length')
    button.step(
      v-for='(step, index) in config.steps'
      :key='index'
      :class='[currentStep === index ? "active" : "", currentStep < index ? "next" : ""]'
      @click='redirect(step)'
    ) {{ index + 1 }}

  .wrapper.mobile-steps.subtitle(v-if='currentStep < config.steps.length')
    i18n.is-subtitle(:args='{ current: currentStep + 1, max: config.steps.length }') Step {current} of {max}

  transition(name='fade' mode='out-in')
    component(
      :is='content'
      :group='form'
      :$v='$v'
      @next='next'
      @focusref='focusRef'
      @input='payload => updateGroupData(payload)'
    )

      banner-scoped(ref='formMsg' :allowA='true')

      .buttons(v-if='currentStep < config.steps.length')
        button.is-outlined(
          @click='prev'
          data-test='prevBtn'
        ) {{ currentStep === 0 ? L('Cancel') : L('Back') }}

        button.is-primary(
          v-if='currentStep + 1 < config.steps.length'
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
import sbp from '@sbp/sbp'
import { validationMixin } from 'vuelidate'
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import { RULE_PERCENTAGE } from '@model/contracts/shared/voting/rules.js'
import proposals from '@model/contracts/shared/voting/proposals.js'
import {
  PROPOSAL_GENERIC,
  GROUP_NAME_MAX_CHAR,
  GROUP_DESCRIPTION_MAX_CHAR,
  GROUP_MINCOME_MAX
} from '@model/contracts/shared/constants.js'
import currencies, { mincomePositive, normalizeCurrency } from '@model/contracts/shared/currencies.js'
import { L } from '@common/common.js'
import { dateToPeriodStamp, addTimeToDate, DAYS_MILLIS } from '@model/contracts/shared/time.js'
import StepAssistant from '@view-utils/stepAssistant.js'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
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
import { required, between, maxLength, maxValue } from 'vuelidate/lib/validators'

export default ({
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
    GroupPrivacy
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

        await sbp('gi.app/group/createAndSwitch', {
          data: {
            name: this.form.groupName,
            picture: this.ephemeral.groupPictureFile,
            sharedValues: this.form.sharedValues,
            mincomeAmount: normalizeCurrency(this.form.mincomeAmount),
            mincomeCurrency: this.form.mincomeCurrency,
            ruleName: this.form.ruleName,
            ruleThreshold: this.form.ruleThreshold,
            distributionDate: this.form.distributionDate
          }
        })

        this.$router.push({
          path: '/pending-approval',
          // NOTE: during a series of consecutive async steps of group-creation, error can occur that leads to displaying 'Prompt.vue' pop-up.
          //       in that case, leave that pop-up open. (reference: https://github.com/okTurtles/group-income/pull/2091)
          query: this.$route.query?.modal === 'Prompt'
            ? this.$route.query
            : undefined
        })
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
        mincomeAmount: '',
        mincomeCurrency: 'USD',
        distributionDate: dateToPeriodStamp(addTimeToDate(new Date().setUTCHours(0, 0, 0, 0), 3 * DAYS_MILLIS)),
        ruleName: RULE_PERCENTAGE,
        ruleThreshold: proposalsSettings[RULE_PERCENTAGE].threshold
      },
      ephemeral: {
        groupPictureFile: '', // passed by GroupName.vue
        groupPictureType: null // 'canvas' || 'image'
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
  mounted () {
    if (this.currentStep !== 0 && !this.form.groupName) {
      // when the modal has been opened with the queried step not being the first one,
      // check if groupName has been set and redirect to the the first step if not.
      this.redirect('GroupName')
    }
  },
  validations: {
    form: {
      groupName: {
        [L('Group name is required')]: required,
        [L('Group name cannot exceed {maxchar} characters', { maxchar: GROUP_NAME_MAX_CHAR })]: maxLength(GROUP_NAME_MAX_CHAR)
      },
      groupPicture: { },
      sharedValues: {
        [L('Group purpose cannot exceed {maxchar} characters', { maxchar: GROUP_DESCRIPTION_MAX_CHAR })]: maxLength(GROUP_DESCRIPTION_MAX_CHAR)
      },
      mincomeAmount: {
        [L('This field is required')]: required,
        [L('The amount must be a number. (E.g. 100.75)')]: function (value) {
          return currencies[this.form.mincomeCurrency].validate(value)
        },
        [L('Mincome must be greater than 0')]: mincomePositive,
        [L('Mincome cannot exceed {max}', { max: GROUP_MINCOME_MAX })]: maxValue(GROUP_MINCOME_MAX)
      },
      mincomeCurrency: {
        required
      },
      distributionDate: {
        required
      },
      ruleThreshold: {
        required,
        between: between(0, 100)
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
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.steps {
  width: 100%;
  max-width: 34rem;
  margin-top: 3.5rem;
  flex-shrink: 0;
}

.wrapper {
  width: 100%;
  max-width: 33rem;
}
</style>
