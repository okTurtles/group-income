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
      v-for='(payment, index) in paymentsList'
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
          :class='index === 0 ? "has-text-1" : "pill is-danger"'
          :args='{date: dueDate(payment.date) }'
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

          i18n.pill.is-primary Partial

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

          i18n.pill.is-warning Not received

      td
        .c-actions
          .c-actions-month(:class='!(index !== 0 && paymentsType === "todo") ? "has-text-1" : "pill is-danger"') {{ dueDate(payment.date) }}
          payments-list-menu.c-actions-menu(
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
          .inputgroup
            input.input(inputmode='decimal' pattern='[0-9]*' :value='payment.amount')
            .suffix.hide-phone {{symbolWithCode}}
            .suffix.hide-tablet {{symbol}}
</template>

<script>
import { mapGetters } from 'vuex'
import AvatarUser from '@components/AvatarUser.vue'
import Tooltip from '@components/Tooltip.vue'
import PaymentsListMenu from '@containers/payments/PaymentsListMenu.vue'
import currencies from '@view-utils/currencies.js'
import { humanDate } from '@view-utils/humanDate.js'
import { currentMonthstamp, prevMonthstamp } from '~/frontend/utils/time.js'

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
    paymentsDistribution: {
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
    currency () {
      return currencies[this.groupSettings.mincomeCurrency].displayWithCurrency
    },
    symbolWithCode () {
      return currencies[this.groupSettings.mincomeCurrency].symbolWithCode
    },
    symbol () {
      return currencies[this.groupSettings.mincomeCurrency].symbol
    },
    paymentsReceived () {
      return 'TODO'
    },
    paymentsTodo () {
      const monthlyPayments = this.groupMonthlyPayments
      const cMonthstamp = currentMonthstamp()
      const pMonthstamp = prevMonthstamp(cMonthstamp)
      const paymentsTodo = []
      const pastMonth = monthlyPayments[pMonthstamp]
      // const currentDistribution = this.groupIncomeAdjustedDistribution
      const currentDistribution = this.paymentsDistribution
      const pledgeAmount = this.ourGroupProfile['pledgeAmount']
      // first we need to check if there are any late payments that need to be added to the
      // paymentsTodo list.
      if (pastMonth) {
        const previousDistribution = pastMonth.lastAdjustedDistribution
        // this creates a date at the end of the previous month
        // (see comment in time.js:dateFromMonthstamp())
        // const date = new Date(monthstamp) // TODO: return this in a computed property called prevMonthDueDate and reference that in the pug instead of repeatedly adding it to this data
        for (const payment of previousDistribution) {
          if (payment.from === this.ourUsername && payment.amount > 0) {
            // Let A = the amount we owe from the previous distribution.
            // Let B = the total we've sent to payment.to from the current
            //         month's paymentsFrom.
            // Let C = the total amount we "owe" to payment.to from the
            //         current month's distribution.
            // Let D = the amount we're pledging this month
            // Let E = the amount still unpaid for the previous month's distribution,
            //         calculated as: C > 0 ? A : A + D - B
            //
            // If E > 0, then display a row for the late payment.
            const A = payment.amount
            const B = this.paymentTotalFromUserToUser(this.ourUsername, payment.to, cMonthstamp)
            // var C = currentDistribution
            //   .filter(a => a.from === this.ourUsername && a.to === payment.to)
            var C = currentDistribution.filter(a => a.username === payment.to)
            C = C.length > 0 ? C[0].amount : 0
            const D = pledgeAmount
            const E = C > 0 ? A : A + D - B
            if (E > 0) {
              // for each uncompleted payment in the previous month, we need
              // to check if there exists a payment in completedLatePayments
              // that completes (in part or in whole).
              paymentsTodo.push({
                username: payment.to,
                displayName: this.userDisplayName(payment.to),
                amount: payment.amount, // TODO: include currency (what if it was changed?)
                late: true
              })
            }
          }
        }
      }
      return paymentsTodo.concat(this.paymentsDistribution)
    },
    paymentsSent () {
      return 'TODO'
    },
    paymentsList () {
      console.debug('paymentsType:', this.paymentsType)
      return {
        todo: () => this.paymentsTodo,
        edit: () => this.paymentsDistribution,
        sent: () => this.paymentsDistribution,
        received: () => this.paymentsDistribution,
        // TODO: fix this nonsense
        '': () => this.paymentsDistribution
      }[this.paymentsType]()
    }
  },
  methods: {
    // TEMP
    async reset () {
      console.log('Todo: Implement reset payment')
    },
    checkAllpayment () {
      this.tableChecked = !this.tableChecked
      this.paymentsDistribution.map(payment => {
        payment.checked = this.tableChecked
      })
    },
    dueDate (datems) {
      return humanDate(datems, { month: 'short', day: 'numeric' })
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
      min-width: 9,375rem;
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
