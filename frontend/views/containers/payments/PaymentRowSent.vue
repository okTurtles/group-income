<template lang='pug'>
  // Note: .cpr- is from payment-row
  payment-row(:payment='payment')
    template(slot='cellAmount')
      .c-amount-container
        strong {{ withGroupCurrency(payment.amount) }}
        payment-not-received-tooltip.c-not-received-badge(
          v-if='notReceived'
          :member='payment.displayName'
          :hideText='true'
        )

      .c-amount-pill-container
        i18n.pill.is-neutral.hide-tablet Manual

    template(slot='cellMethod')
      .c-methods-container.hide-phone
        i18n.pill.is-neutral Manual

    template(slot='cellDate')
      .cpr-date.has-text-1 {{ humanDate(payment.date) }}

    template(slot='cellRelativeTo')
      .c-relative-to.has-text-1 {{ humanDate(payment.period) }}

    template(slot='cellActions')
      payment-actions-menu
        menu-item(
          tag='button'
          item-id='message'
          icon='info'
          @click='openModal("PaymentDetail", { id: payment.hash, period: payment.period })'
        )
          i18n Payment details

        menu-item(
          v-if='!isOldPayment'
          tag='button'
          item-id='message'
          icon='times'
          @click='cancelPayment'
        )
          i18n Cancel this payment
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import AvatarUser from '@components/AvatarUser.vue'
import { OPEN_MODAL } from '@utils/events.js'
import { MenuItem } from '@components/menu/index.js'
import { PAYMENT_CANCELLED, PAYMENT_NOT_RECEIVED } from '@model/contracts/shared/payments/index.js'
import { humanDate, comparePeriodStamps } from '@model/contracts/shared/time.js'
import PaymentRow from './payment-row/PaymentRow.vue'
import PaymentActionsMenu from './payment-row/PaymentActionsMenu.vue'
import PaymentNotReceivedTooltip from './payment-row/PaymentNotReceivedTooltip.vue'
import PaymentsMixin from '@containers/payments/PaymentsMixin.js'

export default ({
  name: 'PaymentRowSent',
  components: {
    AvatarUser,
    MenuItem,
    PaymentActionsMenu,
    PaymentNotReceivedTooltip,
    PaymentRow
  },
  mixins: [PaymentsMixin],
  props: {
    payment: {
      type: Object,
      required: true
    }
  },
  computed: {
    ...mapGetters([
      'ourGroupProfile',
      'withGroupCurrency'
    ]),
    notReceived () {
      return this.payment.data.status === PAYMENT_NOT_RECEIVED
    },
    isOldPayment () {
      // Check if the payment is relative to an older period.
      return comparePeriodStamps(this.payment.period, this.currentPaymentPeriod) < 0
    }
  },
  methods: {
    humanDate,
    openModal (name, props) {
      sbp('okTurtles.events/emit', OPEN_MODAL, name, props)
    },
    // TODO: make multiple payments
    async cancelPayment () {
      try {
        await sbp('gi.actions/group/paymentUpdate', {
          contractID: this.$store.state.currentGroupId,
          data: {
            paymentHash: this.payment.hash,
            updatedProperties: {
              status: PAYMENT_CANCELLED
            }
          }
        })
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

.c-relative-to {
  display: none;

  @include payment-table-desktop {
    display: block;
  }
}

.c-amount-container {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;

  @include phone {
    justify-content: flex-end;
  }

  .c-not-received-badge {
    @include phone {
      order: -1;
    }
  }
}

.c-amount-pill-container {
  display: flex;
  gap: 0.5rem;
  margin-top: 2px;

  @include phone {
    justify-content: flex-end;
  }
}
</style>
