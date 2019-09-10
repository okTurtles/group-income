<template lang='pug'>
  proposal-template(
    :title='L("Change minimum income")'
    :rule='{ value: 8, total: 10 }'
    :disabled='$v.form.$invalid || ($v.steps[config.steps[ephemeral.currentStep]] && $v.steps[config.steps[ephemeral.currentStep]].$invalid)'
    :maxSteps='config.steps.length'
    :currentStep.sync='ephemeral.currentStep'
    @submit='submit'
  )

    label.field(v-if='ephemeral.currentStep === 0' key='0')
      i18n.label New minimum income
      .input-combo
        input.input(
          type='number'
          name='incomeProvided'
          min='0'
          required=''
          :class='{ error: $v.form.incomeProvided.$error }'
          v-model='form.incomeProvided'
        )
        .suffix {{fakeStore.groupCurrency}}
      i18n.helper(:args='{value: "$1000"}') Currently {value} monthly.
</template>

<script>
import ProposalTemplate from './ProposalTemplate.vue'
import { validationMixin } from 'vuelidate'
import { decimals } from '@view-utils/validators.js'
import { required } from 'vuelidate/lib/validators'

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
      form: {
        incomeProvided: null
      },
      ephemeral: {
        errorMsg: null,
        currentStep: 0
      },
      config: {
        steps: [
          'GroupMincome'
        ]
      },
      fakeStore: {
        groupCurrency: '$ USD'
      }
    }
  },
  validations: {
    form: {
      incomeProvided: {
        required,
        decimals: decimals(2)
      }
    },
    // validation groups by route name for steps
    steps: {
      GroupMincome: [
        'form.incomeProvided'
      ]
    }
  },
  methods: {
    submit (form) {
      console.log(
        'TODO: Logic to Propose Mincome.',
        'mincome:', this.form.incomeProvided,
        'reason:', form.reason
      )
    }
  }
}
</script>
<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";
.c-info {
  margin-top: $spacer-sm;
}
</style>
