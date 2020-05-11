<template lang='pug'>
  // Note: .cpr- is from payment-row
  payment-row(:payment='payment')
    template(slot='cellPrefix')
      label.checkbox.c-check
        input.input(type='checkbox' v-model='payment.checked')
        span
          i18n.sr-only Mark as sent

    template(slot='cellActions')
      .cpr-date.pill.is-danger(v-if='payment.isLate') {{ humanDate(payment.date) }}
      i18n.is-unstyled.is-link-inherit.link.c-reset(
        tag='button'
        type='button'
        v-if='payment.amount !== config.initialAmount'
        @click='reset'
      ) Reset

    template(slot='cellSuffix')
      label.field
        .inputgroup
          input.input(inputmode='decimal' pattern='[0-9]*' v-model='payment.amount')
          .suffix.hide-phone {{symbolWithCode}}
          .suffix.hide-tablet {{symbol}}
</template>

<script>
import { mapGetters } from 'vuex'
import currencies from '@view-utils/currencies.js'
import { humanDate } from '@utils/time.js'
import PaymentRow from './payment-row/PaymentRow.vue'

export default {
  name: 'PaymentRowRecord',
  components: {
    PaymentRow
  },
  props: {
    payment: {
      type: Object,
      required: true
    }
  },
  data () {
    return {
      config: {
        initialAmount: this.payment.amount
      },
      form: {
        amount: this.payment.amount
      }
    }
  },
  computed: {
    ...mapGetters([
      'groupSettings'
    ]),
    symbolWithCode () {
      return currencies[this.groupSettings.mincomeCurrency].symbolWithCode
    },
    symbol () {
      return currencies[this.groupSettings.mincomeCurrency].symbol
    }
  },
  methods: {
    humanDate,
    reset () {
      this.payment.amount = this.config.initialAmount
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-check {
  margin-right: 0.5rem;
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
