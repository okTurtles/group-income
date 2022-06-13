<template lang='pug'>
  // Note: .cpr- is from payment-row
  payment-row(:payment='payment' data-test='payRow')
    template(slot='cellAmount')
      template(v-if='payment.partial')
        i18n.c-partial(
          :args='{ \
            partial_amount: `<strong class="has-text-0">${withGroupCurrency(payment.amount)}</strong>`, \
            partial_total: withGroupCurrency(payment.total) \
          }'
        ) {partial_amount} out of {partial_total}
        i18n.pill.is-primary Partial
      strong(v-else) {{withGroupCurrency(payment.amount)}}
      payment-not-received-tooltip(v-if='wasNotReceived' :member='payment.displayName')

    template(slot='cellActions')
      .cpr-date(:class='payment.isLate ? "pill is-danger" : "has-text-1"') {{ humanDate(payment.date) }}
      payment-actions-menu
        menu-item(
          tag='button'
          item-id='message'
          icon='times'
          @click='cancelPayment'
        )
          i18n Dismiss this payment
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { humanDate } from '@model/contracts/shared/time.js'
import { MenuItem } from '@components/menu/index.js'
import { PAYMENT_CANCELLED, PAYMENT_NOT_RECEIVED } from '@model/contracts/shared/payments/index.js'
import {
  L
} from '@common/common.js'
import PaymentRow from './payment-row/PaymentRow.vue'
import PaymentActionsMenu from './payment-row/PaymentActionsMenu.vue'
import PaymentNotReceivedTooltip from './payment-row/PaymentNotReceivedTooltip.vue'

export default ({
  name: 'PaymentRowTodo',
  components: {
    MenuItem,
    PaymentActionsMenu,
    PaymentNotReceivedTooltip,
    PaymentRow
  },
  props: {
    payment: {
      type: Object,
      required: true
    }
  },
  computed: {
    ...mapGetters([
      'withGroupCurrency'
    ]),
    wasNotReceived () {
      const { data } = this.payment
      return data && data.status === PAYMENT_NOT_RECEIVED
    }
  },
  methods: {
    humanDate,
    // TODO: make multiple payments
    async cancelPayment () {
      try {
        if (this.payment.hash) {
          await sbp('gi.actions/group/paymentUpdate', {
            contractID: this.$store.state.currentGroupId,
            data: {
              paymentHash: this.payment.hash,
              updatedProperties: {
                status: PAYMENT_CANCELLED
              }
            }
          })
        } else {
          alert(L("Cannot dismiss a payment that hasn't been sent yet."))
        }
      } catch (e) {
        console.error(e)
        alert(e.message)
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-partial {
  color: $text_1;

  @include phone {
    display: block;
  }

  @include tablet {
    margin-right: 0.5rem;
  }
}
</style>
