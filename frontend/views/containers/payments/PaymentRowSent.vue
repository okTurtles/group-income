<template lang='pug'>
  // Note: .cpr- is from payment-row
  payment-row(:payment='payment')
    template(slot='cellAmount')
      strong {{ withGroupCurrency(payment.amount) }}
      payment-not-received-tooltip(v-if='notReceived' :member='payment.displayName')

    template(slot='cellActions')
      .cpr-date.has-text-1 {{ humanDate(payment.date) }}
      payment-actions-menu
        menu-item(
          tag='button'
          item-id='message'
          icon='info'
          @click='openModal("PaymentDetail", { payment, needsIncome })'
        )
          i18n Payment details

        menu-item(
          tag='button'
          item-id='message'
          icon='times'
          @click='cancelPayment'
        )
          i18n Cancel this payment
</template>

<script>
import sbp from '~/shared/sbp.js'
import { mapGetters } from 'vuex'
import AvatarUser from '@components/AvatarUser.vue'
import { OPEN_MODAL } from '@utils/events.js'
import { MenuItem } from '@components/menu/index.js'
import { PAYMENT_CANCELLED, PAYMENT_NOT_RECEIVED } from '@model/contracts/payments/index.js'
import { humanDate } from '@utils/time.js'
import PaymentRow from './payment-row/PaymentRow.vue'
import PaymentActionsMenu from './payment-row/PaymentActionsMenu.vue'
import PaymentNotReceivedTooltip from './payment-row/PaymentNotReceivedTooltip.vue'

export default {
  name: 'PaymentRowSent',
  components: {
    AvatarUser,
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
      'ourGroupProfile',
      'withGroupCurrency'
    ]),
    needsIncome () {
      return this.ourGroupProfile.incomeDetailsType === 'incomeAmount'
    },
    notReceived () {
      return this.payment.data.status === PAYMENT_NOT_RECEIVED
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
        const paymentMessage = await sbp('gi.contracts/group/paymentUpdate/create', {
          paymentHash: this.payment.hash,
          updatedProperties: {
            status: PAYMENT_CANCELLED
          }
        }, this.$store.state.currentGroupId)
        await sbp('backend/publishLogEntry', paymentMessage)
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

</style>
