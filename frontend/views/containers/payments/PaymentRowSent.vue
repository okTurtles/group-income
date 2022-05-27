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
          @click='openModal("PaymentDetail", { id: payment.hash })'
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
import {
  sbp,
  OPEN_MODAL,
  PAYMENT_CANCELLED, PAYMENT_NOT_RECEIVED,
  humanDate
} from '/assets/js/common.js' // eslint-disable-line import/no-absolute-path
import { mapGetters } from 'vuex'
import AvatarUser from '@components/AvatarUser.vue'
import { MenuItem } from '@components/menu/index.js'
import PaymentRow from './payment-row/PaymentRow.vue'
import PaymentActionsMenu from './payment-row/PaymentActionsMenu.vue'
import PaymentNotReceivedTooltip from './payment-row/PaymentNotReceivedTooltip.vue'

export default ({
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

</style>
