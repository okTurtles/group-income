<template lang='pug'>
table.table.table-in-card.c-payments(:class='{"is-editing": paymentsType === "edit"}')
  thead
    tr
      th(v-if='paymentsType === "edit"')
        label.checkbox
          input.input(
            @change='checkAllpayment'
            type='checkbox'
          )
          .c-header-checkbox
      th {{ titles.one }}
      th.c-payments-amount {{ titles.two }}
      th.c-payments-date {{ titles.three }}

  tbody
    tr(
      v-for='(payment, index) in payments'
      :key='index'
    )
      td(v-if='paymentsType === "edit"')
        label.checkbox
          input.input(type='checkbox' v-model='payment.checked')
          span
      td
        .c-user
          avatar-user.c-avatar(:username='payment.username' size='xs')
          strong.c-name {{payment.displayName}}

        // TODO: replace condition to indicate whether or not the payment date is < or > than the current date using payment.paymentStatusText
        i18n.c-user-month(
          :class='index === 0 ? "has-text-1" : "pill--danger is-small"'
          :args='{date: moment(payment.date).format("MMMM DD")}'
        ) Due {date}
      td.c-payments-amount(v-if='paymentsType !== "edit"')

        // TODO: replace condition to indicate whether a payment as been paid partialy using payment.paymentStatusText
        template(
          v-if='index === 0 && (!needsIncome && paymentsType === "todo")'
        )
          i18n.c-payments-amount-text.has-text-1(
            tag='span'
            role='alert'
            :args='{partial_amount: `<strong class="has-text-0">${currency(20)}</strong>`, partial_total: currency(payment.amount)}'
          ) {partial_amount} out of {partial_total}

          i18n.pill--primary.is-small Partial

        strong(v-else) {{currency(payment.amount)}}

        // TODO: replace condition to indicate whether a payment as been received using payment.paymentStatusText
        .c-payments-amount-info(
          v-if='index === 0 && (needsIncome || paymentsType === "received")'
        )
          // TODO: Display this tooltip only if the payment is marked has not received
          tooltip.c-tooltip-warning(
            v-if=''
            direction='top'
            :isTextCenter='true'
            :text='L("{personName} marked this payment as not received.", { personName: payment.displayName })'
          )
            .button.is-icon-smaller.c-tip
              i.icon-info

          i18n.pill--warning.is-small Not received

      td
        .c-actions
          .c-actions-month(:class='!(index !== 0 && paymentsType === "todo") ? "has-text-1" : "pill--danger is-small"') {{ moment(payment.date).format('MMMM D') }}
          payments-list-menu(
            v-if='paymentsType !== "edit"'
            :payment='payment'
            :paymentsType='paymentsType'
            :needsIncome='needsIncome'
          )
          i18n.is-unstyled.is-link-inherit.link.c-reset(
            v-else
            tag='button'
            type='button'
            @click='reset'
          ) Reset

      td(v-if='paymentsType === "edit"')
        label.field
          .input-combo
            input.input(:value='payment.amount')
            .suffix.hide-phone {{symbolWithCode}}
            .suffix.hide-tablet {{symbol}}
</template>

<script>
import { mapGetters } from 'vuex'
import AvatarUser from '@components/AvatarUser.vue'
import Tooltip from '@components/Tooltip.vue'
import PaymentsListMenu from '@containers/payments/PaymentsListMenu.vue'
import currencies from '@view-utils/currencies.js'
import moment from 'moment'

export default {
  name: 'PaymentsList',
  components: {
    AvatarUser,
    Tooltip,
    PaymentsListMenu
  },
  props: {
    titles: {
      type: Object,
      required: true
    },
    payments: {
      type: Array,
      required: true
    },
    paymentsType: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      moment,
      // Temp
      tableChecked: false
    }
  },
  computed: {
    ...mapGetters([
      'currentGroupState',
      'groupIncomeDistribution',
      'groupProfiles',
      'ourGroupProfile',
      'groupSettings',
      'ourUsername',
      'thisMonthsPayments'
    ]),
    needsIncome () {
      return this.ourGroupProfile.incomeDetailsType === 'incomeAmount'
    },
    currency () {
      return currencies[this.groupSettings.mincomeCurrency].displayWithCurrency
    },
    symbolWithCode () {
      return currencies[this.groupSettings.mincomeCurrency].symbolWithCode
    },
    symbol () {
      return currencies[this.groupSettings.mincomeCurrency].symbol
    }
  },
  methods: {
    // TEMP
    async reset () {
      console.log('Todo: Implement reset payment')
    },
    checkAllpayment () {
      this.tableChecked = !this.tableChecked
      this.payments.map(payment => {
        payment.checked = this.tableChecked
      })
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-payments {
  margin-top: $spacer;

  th, td {
    &:first-child {
      width: 41%;
    }

    &:last-child {
      width: 10%;
      padding-left: $spacer;

      @include tablet {
        width: 22%;
      }
    }
  }

  .c-header-checkbox {
    vertical-align: sub;
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
      min-width: 9,375rem;
      display: table-cell;
    }
  }

  .c-actions {
    justify-content: flex-end;
  }

  .c-reset {
    margin-left: $spacer;
  }

  .c-payments-date {
    @include phone {
      display: block;
    }
  }
}

.checkbox {
  margin-right: $spacer-sm;
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
  margin-right: $spacer-sm;
}

.c-avatar,
.c-actions-month {
  @include phone {
    display: none;
  }
}

.c-actions-month {
  margin-left: 0;
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
    margin-right: $spacer-sm;
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

.input-combo .input {
  @include phone {
    padding-right: $spacer-lg;
  }
}

// Tooltip
.c-tip {
  width: 0.875rem;
  height: 0.875rem;
  border-radius: 50%;
  margin-left: $spacer-sm;
  margin-right: $spacer-xs;
  font-size: 0.5rem;

  &,
  &:hover {
    color: #fff;
  }
}
</style>
