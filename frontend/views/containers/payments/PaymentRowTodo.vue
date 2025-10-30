<template lang='pug'>
  // Note: .cpr- is from payment-row
  payment-row(:payment='payment' data-test='payRow')
    template(slot='cellPrefix')
      label.checkbox.c-check(data-test='todoCheck')
        input.input(type='checkbox' v-model='form.checked')
        span
          i18n.sr-only Select payment item

    template(slot='cellAmount')
      .c-amount-container
        .c-amount-value-container
          template(v-if='payment.partial')
            i18n.c-partial(
              :args='{ \
                partial_amount: `<strong class="has-text-0">${withGroupCurrency(payment.amount)}</strong>`, \
                partial_total: withGroupCurrency(payment.total) \
              }'
            ) {partial_amount} out of {partial_total}
          strong(v-else) {{withGroupCurrency(payment.amount)}}

          payment-not-received-tooltip.c-not-received-tooltip(v-if='wasNotReceived' :member='payment.displayName')

        .c-amount-pill-container
          i18n.pill.is-primary(v-if='payment.partial') Partial
          i18n.pill.is-neutral.hide-tablet Manual

    template(slot='cellMethod')
      .c-methods-container
        i18n.pill.is-neutral Manual

    template(slot='cellActions')
      .cpr-date(:class='payment.isLate ? "pill is-danger" : "has-text-1"') {{ humanDate(payment.date) }}
</template>

<script>
import { humanDate } from '@model/contracts/shared/time.js'
import { MenuItem } from '@components/menu/index.js'
import { PAYMENT_NOT_RECEIVED } from '@model/contracts/shared/payments/index.js'
import PaymentRow from './payment-row/PaymentRow.vue'
import PaymentNotReceivedTooltip from './payment-row/PaymentNotReceivedTooltip.vue'
import { withGroupCurrency } from '@view-utils/misc.js'

export default ({
  name: 'PaymentRowTodo',
  components: {
    MenuItem,
    PaymentNotReceivedTooltip,
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
      form: {
        checked: false
      }
    }
  },
  computed: {
    wasNotReceived () {
      const { data } = this.payment
      return data && data.status === PAYMENT_NOT_RECEIVED
    }
  },
  methods: {
    humanDate,
    withGroupCurrency,
    // TODO: make multiple payments
    select () {
      this.form.checked = true
    },
    deselect () {
      this.form.checked = false
    }
  },
  watch: {
    'form.checked' (checked) {
      this.$emit('change', {
        hash: this.payment?.hash,
        checked
      })
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-check {
  margin-right: 0.2rem;
}

.c-partial {
  color: $text_1;

  @include phone {
    display: block;
  }

  @include tablet {
    margin-right: 0.5rem;
  }
}

.c-amount-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  width: 100%;

  @include tablet {
    align-items: flex-start;
  }

  .c-amount-value-container {
    display: flex;
    flex-wrap: wrap;

    @include phone {
      gap: 0.25rem;
      justify-content: flex-end;
    }
  }

  .c-not-received-tooltip {
    @include phone {
      order: -1;
    }
  }

  .c-amount-pill-container {
    margin-top: 2px;
    display: flex;
    gap: 0.5rem;
  }
}

.c-methods-container {
  @include phone {
    display: none;
  }
}
</style>
