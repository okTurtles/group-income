<template lang='pug'>
table.table.table-in-card.c-payments.is-editing(data-test='payRecord')
  thead
    tr
      th.c-th-checkbox
        label.checkbox
          input.input(type='checkbox' v-model='tableChecked')
          span
            i18n.sr-only Mark sent to all
      i18n(tag='th') Sent to
      i18n.sr-only(tag='th') Due
      i18n.c-th-amount(tag='th') Amount sent

  tbody
    payment-row-record(
      v-for='(payment, index) in paymentsList'
      :key='index'
      :payment='payment'
      @update='(data) => $emit("update", data)'
    )
</template>

<script>
import { mapGetters } from 'vuex'
import AvatarUser from '@components/AvatarUser.vue'
import Tooltip from '@components/Tooltip.vue'
import PaymentRowRecord from './PaymentRowRecord.vue'

export default ({
  name: 'RecordPaymentsList',
  components: {
    AvatarUser,
    Tooltip,
    PaymentRowRecord
  },
  props: {
    paymentsList: {
      type: Array,
      required: true
    }
  },
  data () {
    return {
      tableChecked: false
    }
  },
  computed: {
    ...mapGetters([
      'currentGroupState',
      'paymentTotalFromUserToUser',
      'groupIncomeAdjustedDistribution',
      'ourGroupProfile',
      'groupSettings',
      'ourUsername',
      'userDisplayName'
    ])
  },
  watch: {
    tableChecked (newVal) {
      for (const payment of this.paymentsList) {
        payment.checked = newVal
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-payments.is-editing {
  margin-top: 1rem;

  th,
  td {
    &:first-child {
      width: 10%;

      @include phone {
        width: 3rem;
      }
    }

    &:nth-child(2) { // Sent to
      max-width: 20vh;
    }

    &:last-child {
      width: 35%;
      min-width: 9.375rem;
      display: table-cell;
    }
  }
}

::v-deep .cpr-actions { // PaymentRow.vue
  margin-right: 1rem;
  justify-content: flex-end;
}

.c-th-checkbox {
  line-height: 1.5rem;

  .checkbox {
    margin-right: 0.5rem;
  }
}
</style>
