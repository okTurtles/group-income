<template lang='pug'>
table.table.c-payments.is-editing(
  :data-test='isLightning ? "payRecordLightning" : "payRecord"'
  :class='tableClasses'
)
  thead
    tr
      th.c-th-checkbox
        label.checkbox
          input.input(type='checkbox' v-model='tableChecked')
          span
            i18n.sr-only Mark sent to all
      i18n(tag='th') Sent to
      i18n.sr-only(tag='th') Due
      th.c-th-amount {{ isLightning ? L('Amount') : L('Amount sent') }}

  tbody
    component(
      :is='config.tableRowComponent'
      v-for='(payment, index) in paymentsList'
      :key='index'
      :payment='payment'
      @update='(data) => $emit("update", data)'
    )

    tr(v-if='isLightning')
      td(colspan='4')
        .c-total-amount-wrapper
          i18n.c-total-label(tag='label') Total
          .inputgroup.disabled
            input.input.c-total-amount(:value='totalAmount')
            .suffix.hide-phone {{ currencies.symbolWithCode }}
            .suffix.hide-tablet {{ currencies.symbol }}
</template>

<script>
import { mapGetters } from 'vuex'
import AvatarUser from '@components/AvatarUser.vue'
import Tooltip from '@components/Tooltip.vue'
import PaymentRowRecord from './PaymentRowRecord.vue'
import PaymentRowSendLightning from './PaymentRowSendLightning.vue'
import currencies from '@model/contracts/shared/currencies.js'

export default ({
  name: 'RecordPaymentsList',
  components: {
    AvatarUser,
    Tooltip,
    PaymentRowRecord,
    PaymentRowSendLightning
  },
  props: {
    paymentsList: {
      type: Array,
      required: true
    },
    paymentType: {
      type: String,
      default: 'manual',
      validator: v => ['manual', 'lightning'].includes(v)
    },
    addDonationFee: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      config: {
        tableRowComponent: this.paymentType === 'lightning'
          ? PaymentRowSendLightning
          : PaymentRowRecord
      },
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
    ]),
    isLightning () {
      return this.paymentType === 'lightning'
    },
    tableClasses () {
      return {
        'is-lightning': this.isLightning,
        'table-in-card': !this.isLightning
      }
    },
    currencies () {
      return currencies[this.groupSettings.mincomeCurrency]
    },
    totalAmount () {
      const total = this.paymentsList
        .filter(item => item.checked)
        .reduce((acc, p) => acc + p.amount, 0)

      return this.currencies.displayWithoutCurrency(total * (this.addDonationFee ? 1.01 : 1))
    }
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

  &.is-lightning {
    th.c-th-checkbox {
      padding-left: 0.5rem;

      @include tablet {
        padding-left: 2.5rem;
      }
    }
  }
}

.c-total-amount-wrapper {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
  margin-top: 1rem;
  margin-bottom: 2rem;

  .c-total-label {
    font: {
      size: $size_4;
      weight: 600;
    }
    margin-right: 1rem;
  }

  .inputgroup {
    width: 35%;
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
