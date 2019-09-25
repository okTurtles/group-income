<template lang='pug'>
  proposal-template(
    ref='proposal'
    :title='L("Change minimum income")'
    :rule='{ value: 8, total: 10 }'
    :disabled='$v.form.$invalid'
    :maxSteps='config.steps.length'
    :currentStep.sync='ephemeral.currentStep'
    @submit='submit'
  )

    label.field(
      v-if='ephemeral.currentStep === 0'
      key='0'
      data-test="mincome"
    )
      i18n.label New minimum income
      // REVIEW: why $error is never true, even if we type 0?
      .input-combo(:class='{ error: $v.form.incomeProvided.$error }')
        input.input(
          type='number'
          name='incomeProvided'
          min='1'
          required
          v-model='form.incomeProvided'
        )
        .suffix {{inputSuffix}}
      i18n.helper(:args='{value: friendlyIncome}') Currently {value} monthly.
    p.error(v-if='form.response' data-test='loginError') {{ form.response }}
</template>

<script>
import sbp from '~/shared/sbp.js'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import { mapGetters, mapState } from 'vuex'
import currencies from '@view-utils/currencies.js'
import { decimals } from '@view-utils/validators.js'
import ProposalTemplate from './ProposalTemplate.vue'

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
        incomeProvided: null,
        error: false,
        response: ''
      },
      ephemeral: {
        errorMsg: null,
        currentStep: 0
      },
      config: {
        steps: [
          'GroupMincome'
        ]
      }
    }
  },
  validations: {
    form: {
      incomeProvided: {
        required,
        minValue (value) { return value > 0 },
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
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'groupShouldPropose',
      'groupSettings'
    ]),
    inputSuffix () {
      return `${currencies[this.groupSettings.incomeCurrency]} ${this.groupSettings.incomeCurrency}`
    },
    friendlyIncome () {
      return `${currencies[this.groupSettings.incomeCurrency]}${this.groupSettings.incomeProvided}`
    }
  },
  methods: {
    async submit (form) {
      this.form.response = ''
      this.form.error = false

      if (this.groupShouldPropose) {
        return console.log(
          'TODO: Logic to Propose Mincome.',
          'mincome:', this.form.incomeProvided,
          'reason:', form.reason
        )
      }

      try {
        const updatedSettings = await sbp(
          'gi.contracts/group/updateSettings/create',
          // to avoid numbers with leading zeros (ex: 01)
          { incomeProvided: parseInt(this.form.incomeProvided, 10) },
          this.currentGroupId
        )
        await sbp('backend/publishLogEntry', updatedSettings)
        this.$refs.proposal.close()
      } catch (error) {
        this.form.response = error.toString()
        this.form.error = true
      }
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
