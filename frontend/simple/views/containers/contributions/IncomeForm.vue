<template>
  <div class="box is-unfilled c-reminder"
    role="button"
    v-if="!isFilling"
    @click="isFilling = true"
  >
    <div class="is-flex c-header">
      <i class="fa fa-plus is-flex c-header-icon"></i>
      <i18n tag="h2" class="title is-5">Add Income Details</i18n>
    </div>
    <i18n tag="p" class="c-info">{{info}}</i18n>
    <div class="has-text-danger">
      <i class="fa fa-exclamation-triangle"></i>
      <i18n tag="strong">{{infoRequired}}</i18n>
    </div>
  </div>

  <form class="box c-form"
    @submit.prevent="verifyForm"
    novalidate="true"
    v-else
  >
    <i18n tag="h2" class="title is-5 is-marginless">Income Details</i18n>
    <i18n tag="p" class="c-info">{{info}}</i18n>

    <hr>

    <div class="columns is-desktop is-multiline c-grid">
      <div class="column">
        <fieldset class="c-form-fieldset">
          <i18n tag="legend" class="sr-only">Income details</i18n>

          <!-- TODO - pretty custom radio buttons -->
          <div class="field is-narrow c-form-field">
            <i18n tag="p" class="label">Do you make at least {{income}} per month?</i18n>
            <i18n tag="strong" v-if="$v.form.option.required">{{infoRequired}}</i18n>
            <div class="control">
              <label class="radio">
                <input type="radio" value="no" v-model="form.option">
                No, I don't
              </label>
              <label class="radio">
                <input type="radio" value="yes" v-model="form.option">
                Yes, I do
              </label>
            </div>
          </div>

          <div class="field c-form-field" v-if="$v.form.option.$model === 'no'">
            <i18n tag="p" class="label">What's your monthly income?</i18n>
            <i18n tag="strong" v-if="$v.form.income.$error">{{infoRequired}}</i18n>
            <div class="field has-addons">
              <p class="control">
                <span class="button is-static c-currency">
                  {{groupCurrency}}
                </span>
              </p>
              <p class="control">
                <input class="input"
                  :class="{'is-danger': $v.form.income.$error}"
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
          </div>

          <div class="field c-form-field" v-if="$v.form.option.$model === 'yes'">
            <i18n tag="p" class="label">Pledge amount</i18n>
            <i18n tag="strong" v-if="$v.form.pledge.$error">{{infoRequired}}</i18n>
            <div class="field has-addons">
              <p class="control">
                <span class="button is-static c-currency">
                  {{groupCurrency}}
                </span>
              </p>
              <p class="control">
                <input class="input"
                  :class="{'is-danger': $v.form.pledge.$error}"
                  type="number"
                  v-model="form.pledge"
                  :placeholder="L('amout')"
                >
              </p>
            </div>
            <i18n tag="p" class="c-textHelp">Define up to how much you pledge to contribute to the group each month. You can pledge any amount (even $1 million!) Only the minimum needed amount will be given.</i18n>
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
  cursor: pointer;
  transition: background 100ms;

  // TODO: make this global to all unfilled boxes
  &:hover {
    border: 1px solid $primary;
    background: $primary-bg-a;
    box-shadow: 0 1px 1px $grey-lighter;
  }

  .c-info {
    margin: $gi-spacer 0;
  }
}

.c-header {
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

.c-form {
  .c-info {
    margin: $gi-spacer-sm 0 $gi-spacer;
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
  height: 20rem;
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
  },
  data () {
    return {
      isFilling: true,
      income: '$500',
      form: {
        option: null,
        income: null,
        pledge: null
      }
    }
  },
  computed: {
    info () {
      return this.L('A clear text explaining why this information is needed, so the user understands and feels comfortable about providing this information.')
    },
    infoRequired () {
      return this.L('This information is required for you to be able to be part of the group.')
    },
    groupCurrency () {
      return '$ USD'
    },
    saveButtonText () {
      console.log('or')
      if (!this.$v.form.option.$model) { return this.L('Save details') }
      if (this.$v.form.option.$model === 'yes') { return this.L('Save pledged details') }
      if (this.$v.form.option.$model === 'no') { return this.L('Save income details') }
    }
  },
  methods: {
    verifyForm () {
      if (this.$v.form.$invalid) {
        console.log('invalid!')
      } else {
        console.log('TODO SUBMIT')
      }
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
