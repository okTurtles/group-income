<template lang='pug'>
page-template
  template(#title='') {{ L('Billing') }}

  section.c-section
    form.c-form(@submit.prevent='')
      .field
        i18n.label.mb-0(tag='label') Accepted payment methods
        i18n.helper.c-helper What payment methods you will accept from your users.

        payment-methods.c-payment-methods(
          :methods.sync='form.paymentMethods'
          :class='{ "is-error": $v.form.paymentMethods.$error }'
          v-error:paymentMethods=''
          @update:methods='onPayMethodChange'
        )

      label.field
        i18n.label How much will you charge for credits?

        .inputgroup.c-charge-per-credit(
          v-error:chargePerCredit=''
          :class='{ "is-error": $v.form.chargePerCredit.$error }'
        )
          input.input.no-label(type='text' v-model='form.chargePerCredit')
          i18n.c-input-suffix $ USD per Credit

      label.field
        i18n.label How many credits will you charge for Gigabite per month?

        .inputgroup.c-credit-per-gb(
          v-error:creditPerGiga=''
          :class='{ "is-error": $v.form.creditPerGiga.$error }'
        )
          input.input.no-label(type='text' v-model='form.creditPerGiga')
          i18n.c-input-suffix Credits per Gb

      label.field
        i18n.label How many days until data is deleted after credits run out?

        .inputgroup.c-days-for-deletion(
          v-error:days=''
          :class='{ "is-error": $v.form.days.$error }'
        )
          input.input.no-label(type='text' v-model='form.days')
          i18n.c-input-suffix Days

      .c-btn-container
        i18n.is-outlined(tag='button' @click='onCancelClick') cancel
        i18n(tag='button' @click='onSaveClick') Save
</template>

<script>
import L from '@common/translations.js'
import PageTemplate from './PageTemplate.vue'
import PaymentMethods from '@components/PaymentMethods.vue'
import validationMixin from '@view-utils/validationMixin.js'
import { required } from '@validators'

const validatePaymentMethods = val => Array.isArray(val) && val.length > 1 && Boolean(val.method && val.detail)

export default {
  name: 'Billing',
  mixins: [validationMixin],
  components: {
    PageTemplate,
    PaymentMethods
  },
  data () {
    return {
      form: {
        paymentMethods: [],
        chargePerCredit: '',
        creditPerGiga: '',
        days: ''
      }
    }
  },
  methods: {
    onCancelClick () {
      this.$router.push({ path: '/main' })
    },
    onSaveClick () {
      this.$v.$touch()

      if (!this.$v.$error) {
        alert('TODO: implement submission.')
      }
    },
    onPayMethodChange () {
      this.$v.form.paymentMethods.$reset()
    }
  },
  validations: {
    form: {
      paymentMethods: { [L('At least one payment method has to be specified')]: validatePaymentMethods },
      chargePerCredit: { [L('This field is required')]: required },
      creditPerGiga: { [L('This field is required')]: required },
      days: { [L('This field is required')]: required }
    }
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-page-header {
  margin-top: 2rem;
  margin-bottom: 4.5rem;
}

.c-helper {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 0.825rem;
}

.c-input-suffix {
  position: absolute;
  display: inline-flex;
  align-items: center;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  color: $text_1;
  font-size: $size_5;
  font-weight: 600;
  height: 100%;
  width: max-content;
  padding: 0 0.75rem;
  border-left: 1px solid var(--styled-input-border-color);
  transition: border-color 150ms, color 150ms;
  user-select: none;

  .input:focus + & {
    border-left-color: $text_0;
    color: $text_0;
  }
}

.c-charge-per-credit .input {
  padding-right: 9.5rem;
}

.c-credit-per-gb .input {
  padding-right: 8.25rem;
}

.c-days-for-deletion .input {
  padding-right: 4.25rem;
}

.c-btn-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2.5rem;
  padding: 0 0.5rem;
}
</style>
