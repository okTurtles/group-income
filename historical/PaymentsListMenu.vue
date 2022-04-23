<template lang='pug'>
menu-parent
  menu-trigger.is-icon-small(:aria-label='L("Show payment menu")')
    i.icon-ellipsis-v

  menu-content.c-actions-content
    ul
      menu-item(
        v-if='paymentsType !== "todo" || needsIncome'
        tag='button'
        item-id='message'
        icon='info'
        @click='openModal("PaymentDetail", { id: payment.hash })'
      )
        i18n Payment details

      menu-item(
        v-if='paymentsType === "todo"'
        tag='button'
        item-id='message'
        icon='times'
        @click='cancelPayment(payment.to, payment.hash)'
      )
        i18n Dismiss this payment

      menu-item(
        v-if='paymentsType === "sent"'
        tag='button'
        item-id='message'
        icon='times'
        @click='cancelPayment(payment.to, payment.hash)'
      )
        i18n Cancel this payment

      menu-item(
        v-if='paymentsType === "received" || needsIncome'
        tag='button'
        item-id='message'
        icon='times'
        @click='cancelPayment(payment.to, payment.hash)'
      )
        i18n I did not receive this
</template>

<script>
import sbp from '@sbp/sbp'
import { OPEN_MODAL } from '@utils/events.js'
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '@components/menu/index.js'
import { PAYMENT_CANCELLED } from '@model/contracts/payments/index.js'
export default {
  name: 'PaymentsListMenu',
  props: {
    payment: {
      type: Object,
      required: true
    },
    paymentsType: {
      type: String,
      required: true
    },
    needsIncome: {
      type: Boolean,
      required: true
    }
  },
  components: {
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuItem
  },
  methods: {
    openModal (name, props) {
      sbp('okTurtles.events/emit', OPEN_MODAL, name, props)
    },
    // TODO: make multiple payments
    async cancelPayment (username, paymentHash) {
      try {
        const paymentMessage = await sbp('gi.contracts/group/paymentUpdate/create', {
          paymentHash,
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

.c-content {
  width: 13.375rem;
  left: -12rem;
  top: 2rem;
}
</style>
