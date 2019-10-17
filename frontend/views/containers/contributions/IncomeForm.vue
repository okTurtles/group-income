<template lang='pug'>
modal-template(
  ref='modal'
  :isactive='true'
  @close='cancelForm'
)
  form(
    @submit.prevent='verifyForm'
    novalidate='true'
  )
    i18n(tag='h2') Income Details

    .field
      //- TODO: replace all of this with the code from page-section(title='Debug Income Details') in Contributions.vue
      //- there are several things here that were improved:
      //- o no need for resetFormVerify
      //- o the use of label instead of span for the radio label
      //- o better i18n string handling
      //- o simpler vuelidate error handling (no need for p.error, instead uses :class and alert())
      //- o implementation of setting income values in the contract
      i18n.label(tag='label') Do you make at least {{fakeStore.mincomeFormatted}} per month?

      .radio-wrapper
        input.radio(
          name='v-model'
          type='radio'
          v-model='form.option'
          @change='resetFormVerify'
        )
        i18n No, I don&apos;t

      .radio-wrapper
        input.radio(
          name='v-model'
          type='radio'
          v-model='form.option'
          @change='resetFormVerify'
        )
        i18n  Yes, I do

      p.error(v-if='$v.form.option.$error')
        i18n {{infoRequired}}

    .field(v-if='needsIncome')
      i18n.label(tag='label')  What's your monthly income?

      .input-combo
        input.input(
          type='number'
          placeholder='New amount'
          :class='{"error": inputIncomeError }'
          @input='verifyInputIncome'
          :value='form.income'
          :placeholder='L("amout")'
        )
        label USD

      p.error(v-if='inputIncomeError') inputIncomeError

      p.help(v-else)
        text-who(:who='["Rick", "Carl", "Kim"]')
        i18n will ensure you meet the mincome

    .field(v-else-if='canPledge')
      i18n.label(tag='label') How much do you want to pledge?

      .input-combo
        input.input(
          type='number'
          placeholder='New amount'
          :class='{"error": $v.form.pledge.$error }'
          @input='verifyInputPledge'
          :value='form.pledge'
          :placeholder='L("amout")'
        )
        label USD

      p.error(v-if='v.form.pledge.$error') {{ this.infoRequired }}

      p.help(v-else)
        | Define up to how much you pledge to contribute to the group each month.
        small You can pledge any amount (even $1 million!) Only the minimum needed amount will be given.

    fieldset.fieldset(v-if='!!form.option')
      payment-methods(:userisgiver='canPledge')

  group-pledges-graph(
    :userpledgeamount='canPledge && !!form.pledge ? Number(form.pledge) : null'
    :userincomeamount='needsIncome && !!form.income ? Number(form.income) : null'
  )

  .buttons
    input.button(
      type='submit'
      :value='saveButtonText'
    )

    i18n.button(
      tag='button'
      @click='cancelForm'
    ) Cancel
</template>

<script>
import { validationMixin } from 'vuelidate'
import { requiredIf, required } from 'vuelidate/lib/validators'
import InputAmount from './InputAmount.vue'
import PaymentMethods from './PaymentMethods.vue'
import ModalTemplate from '@components/Modal/ModalTemplate.vue'
import TextWho from '@components/TextWho.vue'
import GroupPledgesGraph from '../GroupPledgesGraph.vue'

const fakeStoreMincome = 500
const hasLowIncome = (value) => value < fakeStoreMincome - 1

export default {
  name: 'IncomeForm',
  mixins: [validationMixin],
  components: {
    ModalTemplate,
    InputAmount,
    TextWho,
    PaymentMethods,
    GroupPledgesGraph
  },
  props: {
    isEditing: Boolean
  },
  data () {
    return {
      ephemeral: {
        /* formVerified: false */
      },
      form: {
        option: null,
        income: null,
        pledge: null
      },
      // -- Hardcoded Data just for layout purposes:
      fakeStore: {
        mincome: fakeStoreMincome,
        mincomeFormatted: '$500'
      }
    }
  },
  computed: {
    infoRequired () {
      return this.L('This information is required.')
    },
    needsIncome () {
      return this.form.option === 'no'
    },
    canPledge () {
      return this.form.option === 'yes'
    },
    inputIncomeError () {
      let error = ''
      if (!this.$v.form.income.hasLowIncome) {
        error = this.L('If your income is the same or higher than the group\'s mincome change your answer to "Yes, I do"')
      } else if (this.$v.form.income.$error) {
        error = this.infoRequired
      }
      return error
    },
    saveButtonText () {
      const verb = this.isFirstTime ? 'Add' : 'Save'
      const kind = this.form.option ? {
        yes: ' pledged',
        no: ' income'
      }[this.form.option] : ''

      return this.L(`${verb}${kind} details`)
    }
  },
  methods: {
    verifyInputIncome (e) {
      this.form.income = e.target.value
      this.$v.form.income.$touch()
    },
    verifyInputPledge (e) {
      this.form.pledge = e.target.value
      this.$v.form.pledge.$touch()
    },
    verifyForm () {
      this.$v.form.$touch()

      if (!this.$v.form.$invalid) {
        const canPledge = this.canPledge

        this.$emit('save', {
          canPledge,
          amount: canPledge ? this.form.pledge : this.form.income
        })
      }
    },
    cancelForm () {
      this.$emit('cancel')
    },
    resetFormVerify () {
      this.$v.form.$reset()
    }
  },
  validations: {
    form: {
      option: {
        required
      },
      income: {
        required: requiredIf(function (model) {
          return this.needsIncome
        }),
        hasLowIncome
      },
      pledge: {
        required: requiredIf(function (model) {
          return this.canPledge
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";
</style>
