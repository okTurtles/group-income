<template>
  <modal ref="modal" :isActive="true" @close="cancelForm">
    <form class="modal-card-content c-wrapper" @submit.prevent="verifyForm" novalidate="true">
      <i18n tag="h2" class="title is-3">Income Details</i18n>
      <div class="columns is-mobile c-wrapper-columns">
        <div class="column c-form">
          <fieldset class="fieldset">
            <i18n tag="legend" class="sr-only">Income details</i18n>

            <div class="field is-narrow gi-fieldGroup">
              <i18n tag="p" class="label">Do you make at least {{fakeStore.mincomeFormatted}} per month?</i18n>
              <i18n tag="strong" class="help has-text-danger has-text-weight-normal gi-help" v-if="ephemeral.formVerified && $v.form.option.$invalid">{{infoRequired}}</i18n>
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

            <input-amount v-if="hasLessIncome" key="income"
              label="What's your monthly income?"
              :error="hasLessIncomeError"
              @input="verifyInputIncome"
              :value="this.form.income"
              :placeholder="L('amout')"
            >
              <template slot="help">
                <text-who :who="['Rick', 'Carl', 'Kim']"></text-who>
                <i18n>will ensure you meet the mincome</i18n>
              </template>
            </input-amount>

            <input-amount v-else-if="hasMinIncome" key="pledge"
              label="How much do you want to pledge?"
              :error="hasMinIncomeError"
              @input="verifyInputPledge"
              :value="this.form.pledge"
              :placeholder="L('amout')"
            >
              <template slot="help">
                <i18n tag="p">Define up to how much you pledge to contribute to the group each month.</i18n>
                <i18n tag="p" class="c-help-extra">You can pledge any amount (even $1 million!) Only the minimum needed amount will be given.</i18n>
              </template>
            </input-amount>
          </fieldset>
          <fieldset class="fieldset" v-if="!!$v.form.option.$model">
            <payment-methods />
          </fieldset>
        </div>

        <group-pledges-graph class="column c-pledgesGraph"
          :userPledgeAmount="userPledgeAmount"
          :userIncomeAmount="userIncomeAmount"
        />
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

.c-wrapper {
  width: 50rem;
  max-width: 100%;
  height: 100%;
  overflow: auto;

  @include mobile {
    height: 100vh;
  }

  &-columns {
    @include mobile {
      flex-direction: column;
    }
  }
}

.c-help-extra {
  margin-top: $gi-spacer-sm;
}

.c-form,
.c-pledgesGraph {
  flex-basis: 50%;
}

.c-pledgesGraph {
  align-items: flex-start;
  flex-grow: 1;

  @include mobile {
    order: -1; // display on the top for better understanding on small screens
    padding: $gi-spacer $gi-spacer-sm;
  }

  @include tablet {
    justify-content: center;
    margin-top: -$gi-spacer-lg;
  }
}

</style>
<script>
import { validationMixin } from 'vuelidate'
import { requiredIf, required, maxValue } from 'vuelidate/lib/validators'
import InputAmount from './InputAmount.vue'
import PaymentMethods from './PaymentMethods.vue'
import Modal from '../../components/Modal/ModalBasic.vue'
import TextWho from '../../components/TextWho.vue'
import GroupPledgesGraph from '../GroupPledgesGraph.vue'

export default {
  name: 'IncomeForm',
  mixins: [ validationMixin ],
  components: {
    Modal,
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
        formVerified: false
      },
      form: {
        option: null,
        income: null,
        pledge: null
      },
      // -- Hardcoded Data just for layout purposes:
      fakeStore: {
        mincome: 500,
        mincomeFormatted: '$500'
      }
    }
  },
  computed: {
    userPledgeAmount () {
      return this.hasMinIncome & !!this.form.pledge ? Number(this.form.pledge) : null
    },
    userIncomeAmount () {
      return this.hasLessIncome & !!this.form.income ? Number(this.form.income) : null
    },
    maxIncome () {
      return this.fakeStore.mincome - 1
    },
    infoRequired () {
      return this.L('This information is required.')
    },
    hasLessIncome () {
      return this.$v.form.option.$model === 'no'
    },
    hasMinIncome () {
      return this.$v.form.option.$model === 'yes'
    },
    hasLessIncomeError () {
      if (!this.ephemeral.formVerified && this.$v.form.income.maxValue) {
        return null
      }

      if (!this.$v.form.income.requiredIf) {
        return this.infoRequired
      } else if (!this.$v.form.income.maxValue) {
        return this.L('If your income is the same or higher than the group\'s mincome change your answer to "Yes, I do"')
      }
    },
    hasMinIncomeError () {
      return this.ephemeral.formVerified && this.$v.form.pledge.$invalid ? this.infoRequired : null
    },
    saveButtonText () {
      const verb = this.isFirstTime ? 'Add' : 'Save'

      if (!this.$v.form.option.$model) { return this.L('{verb} details', { verb }) }
      if (this.hasMinIncome) { return this.L('{verb} pledged details', { verb }) }
      if (this.hasLessIncome) { return this.L('{verb} income details', { verb }) }
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
      this.ephemeral.formVerified = true

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
      this.ephemeral.formVerified = false
    }
  },
  validations: {
    form: {
      option: {
        required
      },
      income: {
        requiredIf: requiredIf(model => model.option === 'no'),
        // REVIEW - how to do this value dynamic?! this.mincome doesn't work
        maxValue: maxValue(499)
      },
      pledge: {
        requiredIf: requiredIf(model => model.option === 'yes')
      }
    }
  }
}
</script>
