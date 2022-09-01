<template lang="pug">
  // Note: .cpr- is for payment-row
  payment-row(:payment='payment')
    template(slot='cellPrefix')
      label.checkbox.c-check(data-set='check')
        input.input(type='checkbox' v-model='form.checked')
        span
          i18n.sr-only Mark as an item to pay

    template(slot='cellActions')
      .pill.is-neutral Lightning
      i18n.is-unstyled.link.is-link-inherit.c-reset(
        tag='button'
        type='button'
        v-if='payment.amount !== config.initialAmount'
        @click='reset'
      ) Reset

    template(slot='cellSuffix')
      label.field
        .inputgroup
          input.input(data-test='amount' inputmode='decimal' pattern='[0-9]*' v-model='form.amount')
          .suffix.hide-phone {{ currencies.symbolWithCode }}
          .suffix.hide-tablet {{ currencies.symbol }}
</template>

<script>
import { mapGetters } from 'vuex'
import currencies from '@model/contracts/shared/currencies.js'
import PaymentRow from './payment-row/PaymentRow.vue'

export default ({
  name: 'PaymentRowSendLightning',
  components: {
    PaymentRow
  },
  props: {
    payment: {
      type: Object, // { index, checked, ...paymentsData }
      required: true
    }
  },
  data () {
    const gCurrency = currencies[this.$store.getters.groupSettings.mincomeCurrency]
    return {
      config: {
        initialAmount: this.payment.amount
      },
      form: {
        checked: this.payment.checked,
        amount: gCurrency.displayWithoutCurrency(this.payment.amount)
      }
    }
  },
  watch: {
    'form.amount' (amount) {
      this.$emit('update', {
        index: this.payment.index,
        checked: true,
        amount
      })
    },
    'form.checked' (checked) {
      this.$emit('update', {
        index: this.payment.index,
        checked
      })
    },
    'payment.checked' (checked) {
      this.form.checked = checked
    }
  },
  computed: {
    ...mapGetters([
      'groupSettings'
    ]),
    currencies () {
      return currencies[this.groupSettings.mincomeCurrency]
    }
  },
  methods: {
    reset () {
      this.form.amount = this.config.initialAmount
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-check {
  margin-right: 0.5rem;
  margin-left: 0.5rem;

  @include desktop {
    margin-left: 2.5rem;
  }
}

.c-reset {
  margin-left: 1rem;
}

.inputgroup .input {
  @include phone {
    padding-right: 2rem;
  }
}
</style>
