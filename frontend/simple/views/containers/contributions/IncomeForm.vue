<template>
  <div class="box"
    :class="{ 'is-unfilled': !(isFilling || isEditing), 'c-form': isFilling || isEditing }"
    v-if="isFirstTime || isEditing"
    v-on="isFilling ? null : { click: handleAddClick }"
  >

    <div class="is-flex c-header">
      <i class="fa fa-plus is-flex c-header-icon" v-if="isFirstTime"></i>
      <i18n tag="h2" class="title is-5">Add Income Details</i18n>
    </div>
    <p class="c-info">{{info}}</p>

    <div class="has-text-danger is-flex c-attention" v-if="!(isFilling || isEditing)">
      <i class="fa fa-exclamation-triangle"></i>
      <strong>{{infoRequired}}</strong>
    </div>

    <form @submit.prevent="verifyForm"
      novalidate="true"
      v-else
    >
      <hr class="c-hr">

      <div class="columns is-desktop is-multiline c-grid">
        <div class="column">
          <fieldset class="c-form-fieldset">
            <i18n tag="legend" class="sr-only">Income details</i18n>

            <div class="field is-narrow c-form-field">
              <i18n tag="p" class="label">Do you make at least {{income}} per month?</i18n>
              <i18n tag="strong" class="help has-text-danger has-text-weight-normal" v-if="formVerified && $v.form.option.$invalid">{{infoRequired}}</i18n>
              <div class="control">
                <label class="c-form-tick">
                  <input class="gi-tick-input" type="radio" value="no" v-model="form.option" @change="resetFormVerify">
                  <span class="gi-tick-custom"></span>
                  <i18n>No, I don't</i18n>
                </label>
                <label class="c-form-tick">
                  <input class="gi-tick-input" type="radio" value="yes" v-model="form.option" @change="resetFormVerify">
                  <span class="gi-tick-custom"></span>
                  <i18n>Yes, I do</i18n>
                </label>
              </div>
            </div>

            <label class="field c-form-field" v-if="hasLessIncome">
              <i18n class="label">What's your monthly income?</i18n>
              <i18n tag="strong" class="help has-text-danger has-text-weight-normal" v-if="formVerified && $v.form.income.$invalid">{{infoRequired}}</i18n>
              <div class="field has-addons">
                <span class="control">
                  <span class="button is-static c-currency">
                    {{groupCurrency}}
                  </span>
                </span>
                <span class="control">
                  <input class="input"
                    :class="{'is-danger': formVerified && $v.form.income.$invalid}"
                    type="number"
                    v-model="form.income"
                    :placeholder="L('amout')"
                  >
                </span>
              </div>
              <span class="c-textHelp">
                <TextWho :who="['Rick', 'Carl', 'Kim']"></TextWho>
                <i18n>will ensure you meet the mincome</i18n>
              </span>
            </label>

            <label class="field c-form-field" v-if="hasMinIncome">
              <i18n class="label">Pledge amount</i18n>
              <i18n tag="strong" class="help has-text-danger has-text-weight-normal" v-if="formVerified && $v.form.pledge.$invalid">{{infoRequired}}</i18n>
              <div class="field has-addons">
                <span class="control">
                  <span class="button is-static c-currency">
                    {{groupCurrency}}
                  </span>
                </span>
                <span class="control">
                  <input class="input"
                    :class="{'is-danger': formVerified && $v.form.pledge.$invalid}"
                    type="number"
                    v-model="form.pledge"
                    :placeholder="L('amout')"
                  >
                </span>
              </div>
              <i18n lass="c-textHelp">Define up to how much you pledge to contribute to the group each month. You can pledge any amount (even $1 million!) Only the minimum needed amount will be given.</i18n>
            </label>
          </fieldset>

          <fieldset class="c-form-fieldset" v-if="!!$v.form.option.$model">
            <i18n tag="legend" class="label">Payment method</i18n>
            <payment-methods></payment-methods>
          </fieldset>
        </div>

        <div class="column">
          <div class="c-graph" v-if="hasLessIncome">
            [receiving pie chart - next PR]
          </div>

          <div class="c-graph" v-if="hasMinIncome">
            [pledging pie chart - next PR]
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
  </div>
</div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

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

.c-attention {
  align-items: center;

  .fa {
    margin-right: $gi-spacer-sm;
  }
}

.c-info,
.c-hr {
  margin: $gi-spacer 0;
}

.c-form {
  border-color: $primary;

  // TODO - analyse if this can be global to every form/field
  &-fieldset {
    border: none;
    margin-bottom: $gi-spacer-lg;
  }

  &-field {
    margin-bottom: $gi-spacer*1.5;

    .help {
      margin: -$gi-spacer-sm 0 $gi-spacer-sm;
    }
  }

  &-fieldset:last-child,
  &-field:last-child {
    margin-bottom: 0;
  }

  &-tick {
    margin-right: $gi-spacer;
  }

  .input {
    width: 6rem;
  }
}

.c-currency {
  // TODO - make this global to every static input addon
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
  text-align: center;
  padding: $gi-spacer;
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
      isFilling: true,
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
    handleAddClick () {
      this.isFilling = true
    },
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
  },
  directives: {
    formOption: {
      bind (el, binding, vnode) {
        console.log('entrou')
        const input = vnode.children[0].elm

        input.addEventListener('change', () => {
          console.log('changed!')
        })

        input.addEventListener('focus', () => {
          console.log('focused!')
        })

        input.addEventListener('blur', () => {
          console.log('blured!')
        })
      },
      unbind (el) {
        // const input = vnode.children[0].elm
        //
        // input.removeEventListener()
      }
    }
  }
}
</script>
