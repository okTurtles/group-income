<template lang='pug'>
  // Note: .cpr- is from payment-row
  payment-row(:payment='payment')
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
      payment-not-received-tooltip(v-if='notReceived' :member='payment.displayName')

    template(slot='cellActions')
      .cpr-date(:class='Math.round(Math.random()) ? "has-text-1" : "pill is-danger"') {{ humanDate(payment.date) }}
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
import sbp from '~/shared/sbp.js'
import { mapGetters } from 'vuex'
import { humanDate } from '@utils/time.js'
import { MenuItem } from '@components/menu/index.js'
import { PAYMENT_CANCELLED, PAYMENT_NOT_RECEIVED } from '@model/contracts/payments/index.js'
import L from '@view-utils/translations.js'
import PaymentActionsMenu from './PaymentActionsMenu.vue'
import PaymentNotReceivedTooltip from './PaymentNotReceivedTooltip.vue'
import PaymentRow from './PaymentRow.vue'

export default {
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
    notReceived () {
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
          // TODO: move this into controller/actions/group.js
          const paymentMessage = await sbp('gi.contracts/group/paymentUpdate/create', {
            paymentHash: this.payment.hash,
            updatedProperties: {
              status: PAYMENT_CANCELLED
            }
          }, this.$store.state.currentGroupId)
          await sbp('backend/publishLogEntry', paymentMessage)
        } else {
          alert(L("Cannot dismiss a payment that hasn't been sent yet."))
        }
      } catch (e) {
        console.error(e)
        alert(e.message)
      }
    }
  }
}
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
