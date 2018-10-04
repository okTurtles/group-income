<template>
  <modal ref="modal" :isActive="true" @close="cancelForm">
    <form class="modal-card-content c-form" @submit.prevent="verifyForm" novalidate="true">
      <i18n tag="h2" class="title is-3">Income Details</i18n>
      <div class="columns is-desktop is-multiline c-grid">
        <div class="column">
          <fieldset class="fieldset">
            <i18n tag="legend" class="sr-only">Income details</i18n>

            <div class="field is-narrow gi-fieldGroup">
              <i18n tag="p" class="label">Do you make at least {{income}} per month?</i18n>
              <i18n tag="strong" class="help has-text-danger has-text-weight-normal gi-help" v-if="formVerified && $v.form.option.$invalid">{{infoRequired}}</i18n>
              <div class="control">
                <label class="gi-tick">
                  <input class="gi-tick-input" type="radio" value="no" v-model="form.option" @change="resetFormVerify">
                  <span class="gi-tick-custom"></span>
                  <i18n>No, I don't</i18n>
                </label>
                <label class="gi-tick">
                  <input class="gi-tick-input" type="radio" value="yes" v-model="form.option" @change="resetFormVerify">
                  <span class="gi-tick-custom"></span>
                  <i18n>Yes, I do</i18n>
                </label>
              </div>
            </div>

            <field-input v-if="hasLessIncome"
              label="What's your monthly income?"
              :error="formVerified && $v.form.income.$invalid ? infoRequired : null"
            >
              <!-- REVIEW: How do I pass a v-model to a input inside a children component?
              That is preventing me of using :is component here -->
              <input class="input"
                :class="{'is-danger': formVerified && $v.form.income.$invalid }"
                type="number"
                v-model="form.income"
                :placeholder="L('amout')"
              >
              <template slot="help">
                <text-who :who="['Rick', 'Carl', 'Kim']"></text-who>
                <i18n>will ensure you meet the mincome</i18n>
              </template>
            </field-input>

            <field-input v-if="hasMinIncome"
              label="Pledge amount"
              :error="formVerified && $v.form.pledge.$invalid ? infoRequired : null"
            >
              <input class="input"
                :class="{'is-danger': formVerified && $v.form.pledge.$invalid }"
                type="number"
                v-model="form.pledge"
                :placeholder="L('amout')"
                value="100"
              >
              <template slot="help">
                <i18n>Define up to how much you pledge to contribute to the group each month. You can pledge any amount (even $1 million!) Only the minimum needed amount will be given.</i18n>
              </template>
            </field-input>
          </fieldset>

          <fieldset class="fieldset" v-if="!!$v.form.option.$model">
            <i18n tag="legend" class="label">Payment method</i18n>
            <payment-methods></payment-methods>
          </fieldset>
        </div>

        <div class="column">
          <div class="c-graph">
            [group income chart soon]
          </div>
        </div>

      </div>

      <div class="field is-grouped">
        <p class="control">
          <i18n tag="button" class="button is-primary" type="submit">{{saveButtonText}}</i18n>
        </p>
        <p class="control">
          <i18n tag="button" class="button" type="button" @click="cancelForm">Cancel</i18n>
        </p>
      </div>
      </form>
  </modal>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-form {
  width: 50rem;
  height: 100%;
  overflow: auto;
}

.c-graph {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 10rem;
  height: 10rem;
  background: $grey-lighter;
  border-radius: 50%;
  margin: auto;
  margin-bottom: $gi-spacer-lg;
  text-align: center;
  padding: $gi-spacer;
}

</style>
<script>
import Modal from '../../components/Modal/ModalBasic.vue'
import FieldInput from './FieldInput.vue'
import PaymentMethods from './PaymentMethods.vue'
import TextWho from '../../components/TextWho.vue'
import { validationMixin } from 'vuelidate'
import { requiredIf, required, minValue } from 'vuelidate/lib/validators'

export default {
  name: 'IncomeForm',
  mixins: [ validationMixin ],
  components: {
    Modal,
    FieldInput,
    PaymentMethods,
    TextWho
  },
  props: {
    isEditing: Boolean,
    transEnter: Function,
    transAfterEnter: Function,
    transLeave: Function
  },
  data () {
    return {
      form: {
        option: null,
        income: null,
        pledge: null
      },
      formVerified: false,
      // -- Hardcoded Data just for layout purpose:
      income: '$500'
    }
  },
  computed: {
    infoRequired () {
      return this.L('This information is required.')
    },
    hasLessIncome () {
      return this.$v.form.option.$model === 'no'
    },
    hasMinIncome () {
      return this.$v.form.option.$model === 'yes'
    },
    groupCurrency () {
      return '$ USD'
    },
    saveButtonText () {
      const verb = this.isFirstTime ? 'Add' : 'Save'

      if (!this.$v.form.option.$model) { return this.L('{verb} details', { verb }) }
      if (this.hasMinIncome) { return this.L('{verb} pledged details', { verb }) }
      if (this.hasLessIncome) { return this.L('{verb} income details', { verb }) }
    }
  },
  methods: {
    verifyForm () {
      this.formVerified = true

      if (!this.$v.form.$invalid) {
        const makeIncome = this.$v.form.option.$model === 'yes'

        this.$emit('save', {
          makeIncome,
          amount: makeIncome ? this.$v.form.pledge.$model : this.$v.form.income.$model
        })
      }
    },
    cancelForm () {
      this.$emit('cancel')
    },
    resetFormVerify () {
      this.formVerified = false
    }
  },
  validations: {
    form: {
      option: {
        required
      },
      income: {
        requiredIf: requiredIf(model => model.option === 'no'),
        minValue: minValue(0)
      },
      pledge: {
        requiredIf: requiredIf(model => model.option === 'yes'),
        minValue: minValue(0)
      }
    }
  }
}
</script>
