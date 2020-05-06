<template lang='pug'>
table.table.table-in-card.c-payments
  thead
    tr
      th {{ titles.one }}
      th.c-payments-amount {{ titles.two }}
      th.c-payments-date {{ titles.three }}

  tbody
    component(
      v-for='(payment, index) in paymentsList'
      :key='index'
      :payment='payment'
      :is='paymentsType'
    )
</template>

<script>
import { mapGetters } from 'vuex'
import AvatarUser from '@components/AvatarUser.vue'
import Tooltip from '@components/Tooltip.vue'
import PaymentRowTodo from '@containers/payments/PaymentRowTodo.vue'
import PaymentRowSent from '@containers/payments/PaymentRowSent.vue'
import PaymentRowReceived from '@containers/payments/PaymentRowReceived.vue'
import currencies from '@view-utils/currencies.js'

export default {
  name: 'PaymentsList',
  components: {
    AvatarUser,
    Tooltip,
    PaymentRowTodo,
    PaymentRowSent,
    PaymentRowReceived
  },
  props: {
    titles: {
      type: Object,
      required: true
    },
    paymentsList: {
      type: Array,
      required: true
    },
    paymentsType: {
      type: String,
      validator: (value) => ['PaymentRowTodo', 'PaymentRowSent', 'PaymentRowReceived'].includes(value),
      required: true
    }
  },
  data () {
    return {
      // Temp
      tableChecked: false
    }
  },
  computed: {
    ...mapGetters([
      'currentGroupState',
      'paymentTotalFromUserToUser',
      'groupMonthlyPayments',
      'groupIncomeAdjustedDistribution',
      'ourGroupProfile',
      'groupSettings',
      'ourUsername',
      'userDisplayName'
    ]),
    needsIncome () {
      return this.ourGroupProfile.incomeDetailsType === 'incomeAmount'
    },
    symbolWithCode () {
      return currencies[this.groupSettings.mincomeCurrency].symbolWithCode
    },
    symbol () {
      return currencies[this.groupSettings.mincomeCurrency].symbol
    }

  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-payments {
  margin-top: 1rem;

  th, td {
    &:first-child {
      width: 41%;
    }

    &:last-child {
      width: 10%;
      padding-left: 1rem;

      @include tablet {
        width: 22%;
      }
    }
  }

  .c-header-checkbox {
    line-height: 23px;
  }

  &-date {
    @include phone {
      display: none;
    }
  }

  &-amount {
    @include phone {
      text-align: right;
    }
  }
}

.is-editing {
  th, td {
    &:first-child {
      width: 10%;
      @include phone {
        width: 3rem;
      }
    }

    &:last-child {
      width: 40%;
      min-width: 9.375rem;
      display: table-cell;
    }
  }

  .c-actions {
    justify-content: flex-end;
  }

  .c-reset {
    margin-left: 1rem;
  }

  .c-payments-date {
    @include phone {
      display: block;
    }
  }
}

.checkbox {
  margin-right: 0.5rem;
}

.c-actions {
  justify-content: space-between;
}

.c-actions,
.c-user {
  display: flex;
  align-items: center;
}

.c-avatar {
  margin-right: 0.5rem;
}

.c-avatar,
.c-actions-month {
  @include phone {
    display: none;
  }
}

.c-actions-month {
  margin-left: 0;
  white-space: nowrap;
}

.c-actions-menu {
  margin-left: 1rem;
}

.c-name {
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.c-user-month {
  display: none;
  @include phone {
    display: inline-block;
    margin-left: 0;
  }
}

.c-tooltip-warning {
  outline: none;

  .c-tip{
    background: $warning_0;
  }

  &:focus .c-tip {
    box-shadow: 0px 0px 4px $primary_0;
  }
}

// TODO: check if we need generic rule for this (keep until we know)
// .c-tooltip {
//   @each $name in $colors {
//     &-#{$name} .c-tip{
//       background: var(--#{$name}_0);
//     }
//   }
// }

.c-payments-amount-text {
  @include tablet {
    margin-right: 0.5rem;
  }
}

.c-payments-amount {
  &-info {
    display: inline-flex;
    align-items: center;

    @include phone {
      display: flex;
      flex-direction: row;
      justify-content: flex-end;
    }
  }

  &-text {
    @include phone {
      display: block;
    }
  }

  .is-small {
    margin: 0;
  }
}

.inputgroup .input {
  @include phone {
    padding-right: 2rem;
  }
}

// Tooltip
.c-tip {
  width: 0.875rem;
  height: 0.875rem;
  border-radius: 50%;
  margin-left: 0.5rem;
  margin-right: 0.25rem;
  font-size: 0.5rem;

  &,
  &:hover {
    color: #fff;
  }
}
</style>
