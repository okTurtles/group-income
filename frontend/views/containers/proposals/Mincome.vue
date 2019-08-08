
<template lang='pug'>
  proposal-template(
    title='L("Change minimum income")'
    footer='L("According to your voting rules, 8 out of 10 members will have to agree with this.")'
    :disabled='$v.form.$invalid || ($v.steps[config.steps[currentStep]] && $v.steps[config.steps[currentStep]].$invalid)'
    :maxSteps='config.steps.length'
    :currentStep.sync='currentStep'
    @submit='L("submit")'
  )

    .field(v-if='currentStep === 0' key='0')
      i18n.label(tag='label') New minimum income
      .select-wrapper
        input.input(
          ref='mincome'
          type='number'
          placeholder='Amount'
          name='incomeProvided'
          step='1'
          min='0'
          required=''
          :class="{ 'error': $v.form.incomeProvided.$error }"
          v-model='form.incomeProvided'
          @keyup.enter='next'
        )

        select(
          name='incomeCurrency'
          required=''
          v-model='form.incomeCurrency'
        )
          option(
            v-for='(symbol, code) in currencies'
            :value='code'
            :key='code'
          ) {{ symbol }}

      i18n(p) Currently $1000 monthly.

    .field(v-if='currentStep === 1' key='1')
      i18n.label(tag='label') Why are you proposing this change?

      textarea.textarea(
        name='changeReason'
        ref='purpose'
        :placeholder='L("The reason why I\'m proposing this change is...")'
        maxlength='500'
        :class="{ 'error': $v.form.changeReason.$error }"
        v-model='form.changeReason'
      )
</template>

<script>
import ProposalTemplate from './ProposalTemplate.vue'
import { validationMixin } from 'vuelidate'
import { decimals } from '@view-utils/validators.js'
import { required } from 'vuelidate/lib/validators'
import currencies from '@view-utils/currencies'

export default {
  name: 'MincomeProposal',
  components: {
    ProposalTemplate
  },
  mixins: [
    validationMixin
  ],
  data () {
    return {
      currencies,
      currentStep: 0,
      v: { type: Object },
      form: {
        incomeProvided: null,
        incomeCurrency: 'USD', // TODO: grab this as a constant from currencies.js,
        changeReason: null
      },
      ephemeral: {
        errorMsg: null,
        // this determines whether or not to render proxy components for nightmare
        dev: process.env.NODE_ENV === 'development'
      },
      config: {
        steps: [
          'GroupMincome',
          'ChangeReason'
        ]
      }
    }
  },
  methods: {
    submit: async function () {
      // TODO record action
    }
  },
  validations: {
    form: {
      incomeProvided: {
        required,
        decimals: decimals(2)
      },
      incomeCurrency: {
        required
      },
      changeReason: {}
    },
    // validation groups by route name for steps
    steps: {
      GroupMincome: [
        'form.incomeProvided',
        'form.incomeCurrency'
      ],
      Reason: [
        'form.changeReason'
      ]
    }
  }
}
</script>
