<template>
  <div class="box is-unfilled c-reminder"
    role="button"
    v-if="isFirstTime && !isFilling"
    @click="isFilling = true"
  >
    <div class="is-flex c-reminder-header">
      <i class="fa fa-plus is-flex c-reminder-header-icon"></i>
      <i18n tag="h2" class="title is-5">Add Income Details</i18n>
    </div>
    <p class="c-info">{{info}}</p>
    <div class="has-text-danger is-flex c-reminder-attention">
      <i class="fa fa-exclamation-triangle"></i>
      <strong>{{infoRequired}}</strong>
    </div>
  </div>

  <form class="box c-form"
    @submit.prevent="verifyForm"
    novalidate="true"
    v-else-if="isFilling || isEditing"
  >
    <i18n tag="h2" class="title is-5 is-marginless">Income Details</i18n>
    <p class="c-info">{{info}}</p>

    <hr class="c-form-hr">

    <div class="columns is-desktop is-multiline c-grid">
      <div class="column">
        <fieldset class="c-form-fieldset">
          <i18n tag="legend" class="sr-only">Income details</i18n>

          <div class="field is-narrow c-form-field">
            <i18n tag="p" class="label">Do you make at least {{income}} per month?</i18n>
            <div class="control">
              <!-- TODO - pretty custom radio buttons -->
              <label class="radio">
                <input type="radio" value="no" v-model="form.option" @change="resetFormVerify">
                No, I don't
              </label>
              <label class="radio">
                <input type="radio" value="yes" v-model="form.option" @change="resetFormVerify">
                Yes, I do
              </label>
            </div>
            <i18n tag="strong" class="help has-text-danger has-text-weight-normal" v-if="formVerified && $v.form.option.$invalid">{{infoRequired}}</i18n>
          </div>

          <div class="field c-form-field" v-if="hasLessIncome">
            <i18n tag="p" class="label">What's your monthly income?</i18n>
            <div class="field has-addons">
              <p class="control">
                <span class="button is-static c-currency">
                  {{groupCurrency}}
                </span>
              </p>
              <p class="control">
                <input class="input"
                  :class="{'is-danger': formVerified && $v.form.income.$invalid}"
                  type="number"
                  v-model="form.income"
                  :placeholder="L('amout')"
                >
              </p>
            </div>
            <p class="c-textHelp">
              <TextWho :who="['Rick', 'Carl', 'Kim']"></TextWho>
              <i18n>will ensure you meet the mincome</i18n>
            </p>
            <i18n tag="strong" class="help has-text-danger has-text-weight-normal" v-if="formVerified && $v.form.income.$invalid">{{infoRequired}}</i18n>
          </div>

          <div class="field c-form-field" v-if="hasMinIncome">
            <i18n tag="p" class="label">Pledge amount</i18n>
            <div class="field has-addons">
              <p class="control">
                <span class="button is-static c-currency">
                  {{groupCurrency}}
                </span>
              </p>
              <p class="control">
                <input class="input"
                  :class="{'is-danger': formVerified && $v.form.pledge.$invalid}"
                  type="number"
                  v-model="form.pledge"
                  :placeholder="L('amout')"
                >
              </p>
            </div>
            <i18n tag="p" class="c-textHelp">Define up to how much you pledge to contribute to the group each month. You can pledge any amount (even $1 million!) Only the minimum needed amount will be given.</i18n>
            <i18n tag="strong" class="help has-text-danger has-text-weight-normal" v-if="formVerified && $v.form.pledge.$invalid">{{infoRequired}}</i18n>
          </div>
        </fieldset>

        <fieldset class="c-form-fieldset" v-if="!!$v.form.option.$model">
          <i18n tag="legend" class="label">Payment method</i18n>
          <payment-methods></payment-methods>
        </fieldset>
      </div>

      <div class="column">
        <div class="c-graph">
          [Pie chart on next PR]
        </div>
      </div>

    </div>

    <div class="field is-grouped is-grouped-right">
      <p class="control">
        <i18n tag="button" class="button is-primary" type="submit">{{saveButtonText}}</i18n>
      </p>
      <p class="control">
        <i18n tag="button" class="button" type="button" @click="isFilling = false">Cancel</i18n>
      </p>
    </div>
</form>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-reminder {
  &-header {
    align-items: center;

    &-icon {
      background: $primary-bg-a;
      width: 2rem;
      height: 2rem;
      margin-right: $gi-spacer-sm;
      justify-content: center;
      align-items: center;
      border-radius: 50%;
      color: $primary;
    }
  }

  &-attention {
    align-items: center;

    .fa {
      margin-right: $gi-spacer-sm;
    }
  }
}

.c-info {
  margin: $gi-spacer 0;
}

.c-form {
  border-color: $primary;

  .c-info {
    margin-top: $gi-spacer-sm;
  }

  &-hr {
    margin: $gi-spacer 0;
  }

  &-fieldset {
    border: none;
    margin-bottom: $gi-spacer-lg;
  }

  &-field {
    margin-bottom: $gi-spacer*1.5;
  }

  &-fieldset:last-child,
  &-field:last-child {
    margin-bottom: 0;
  }

  .input {
    width: 6rem;
  }
}

.c-currency {
  padding-left: $gi-spacer;
  padding-right: $gi-spacer;
  color: $text;
  border-color: $grey-light;
}

.c-textHelp {
  margin-top: -$gi-spacer-sm;
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
}

</style>
<script>
import PaymentMethods from './PaymentMethods.vue'
import TextWho from '../../components/TextWho.vue'
import { validationMixin } from 'vuelidate'
import { requiredIf, required, minValue } from 'vuelidate/lib/validators'

export default {
  name: 'IncomeForm',
  mixins: [ validationMixin ],
  components: {
    PaymentMethods,
    TextWho
  },
  props: {
    isFirstTime: Boolean,
    isEditing: Boolean
  },
  data () {
    return {
      optionLess: 'no',
      optionAtLeast: 'yes',
      income: '$500',
      isFilling: false,
      form: {
        option: null,
        income: null,
        pledge: null
      },
      formVerified: false
    }
  },
  computed: {
    info () {
      return this.L('A clear text explaining why this information is needed, so the user understands and feels comfortable about providing this information.')
    },
    infoRequired () {
      return this.L('This information is required for you to be able to be part of the group.')
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

        this.isFilling = false
      }
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
