<template lang='pug'>
table.table.table-in-card.c-payments(:class='{"c-payments-edit": paymentsType === "edit"}')
  thead
    tr
      th(v-if='paymentsType === "edit"')
        input.input.c-checkbox(
          @change='checkAllpayment'
          type='checkbox'
        )
      th {{ titles.one }}
      th.c-payments-amount {{ titles.two }}
      th.c-payments-date {{ titles.three }}

  tbody
    tr(
      v-for='(payment, index) in payments'
      :key='index'
    )
      td(v-if='paymentsType === "edit"')
        input.input.c-checkbox(type='checkbox' v-model='payment.checked')
      td
        .c-user
          avatar-user.c-avatar(:username='payment.to' size='xs')
          strong.c-name {{payment.to}}
        .c-user-month(:class='index === 0 ? "has-text-1" : "c-status-danger c-status"') {{ moment(payment.date).format('MMMM') }}
      td.c-payments-amount(v-if='paymentsType !== "edit"')
        .c-payments-amount-info(v-if='index === 0 && (!needsIncome && paymentsType === "todo")')
          i18n.c-payments-amount-text.has-text-1(
            tag='span'
            :args='{partial_amount: `<strong class="has-text-0">$20</strong>`, partial_total: currency(payment.amount)}'
          ) {partial_amount} out of {partial_total}

          i18n.c-status.c-status-primary Partial
          //- i18n.c-status.c-status-primary(
          //-   tag='span'
          //-   role='alert'
          //-   v-if='payment.hash'
          //-   :class='payment.paymentClass'
          //- ) {{ payment.paymentStatusText }}

        strong(v-else) {{currency(payment.amount)}}
        .c-payments-amount-info(
          v-if='index === 0 && (needsIncome || paymentsType === "received")'
          :class='"c-status-warning"'
        )
          // TODO: Display this tooltip only if the payment is marked has not received
          tooltip.c-name-tooltip(
            v-if=''
            direction='top'
            :isTextCenter='true'
            :text='L("{personName} marked this payment as not received.", { personName: payment.to })'
          )
            .button.is-icon-smaller.c-tip
              i.icon-info

          i18n.c-status Not received

      td
        .c-actions
          .c-actions-month(:class='!(index !== 0 && paymentsType === "todo") ? "has-text-1" : "c-status-danger c-status"') {{ moment(payment.date).format('MMMM') }}
          payments-list-menu(
            v-if='paymentsType !== "edit"'
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
            .suffix {{symbolWithCode}}
</template>

<script>
import { mapGetters } from 'vuex'
import AvatarUser from '@components/AvatarUser.vue'
import Tooltip from '@components/Tooltip.vue'
import PaymentsListMenu from '@containers/payments/PaymentsListMenu.vue'
import currencies from '@view-utils/currencies.js'
import moment from 'moment'

export default {
  name: 'PaymentTable',
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

  &-edit {
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

.c-name {
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.c-user-month {
  display: none;
  @include phone {
    display: inline-block;
  }
}

.c-status {
  border-radius: 3px;
  padding: 0 $spacer-xs;
  text-transform: uppercase;
  font-size: $size_5;

  @each $name in $colors {
    &-#{$name} {
      &.c-status,
      .c-status{
        background: var(--#{$name}_2);
        color: var(--#{$name}_0);
      }

      .c-tip {
        background: var(--#{$name}_0);
      }
    }
  }
}

.has-text-1 + .c-status {
  margin-left: $spacer-sm;
}

.c-payments-amount {
  &-info {
    display: inline-flex;
    align-items: center;
  }

  &-text {
    @include phone {
      display: block;
    }
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

// Edit mode
.c-checkbox {
  width: $spacer;
  margin-right: $spacer;
}
</style>
