<template lang='pug'>
table.table.table-in-card.c-payments
  thead
    tr
      th {{ titles.one }}
      th.c-payments-amount {{ titles.two }}
      th.c-payments-date {{ titles.three }}

  tbody
    tr(
      v-for='(payment, index) in payments'
      :key='index'
    )
      td
        .c-user
          avatar-user.c-avatar(:username='payment.to' size='xs')
          strong.c-name {{payment.to}}
        .c-user-month(:class='index === 0 ? "has-text-1" : "c-status-danger c-status"') {{ randomMonth() }}
      td.c-payments-amount
        .c-payments-amount-info(v-if='index === 0 && (!needsIncome && paymentsType === "todo")')
          i18n.c-payments-amount-text.has-text-1(
            tag='span'
            :args='{partial_amount: `<strong class="has-text-0">$20</strong>`, partial_total: payment.amountFormatted}'
          ) {partial_amount} out of {partial_total}

          span.c-status.c-status-primary Partial
          //- i18n.c-status.c-status-primary(
          //-   tag='span'
          //-   role='alert'
          //-   v-if='payment.hash'
          //-   :class='payment.paymentClass'
          //- ) {{ payment.paymentStatusText }}

        strong(v-else) {{payment.amountFormatted}}
        .c-payments-amount-info(
          v-if='index === 0 && (needsIncome || paymentsType === "received")'
          :class='"c-status-warning"'
        )
          tooltip.c-name-tooltip(
            v-if=''
            direction='top'
            :isTextCenter='true'
            :text='payment.to + L(" marked this payment as not received.")'
          )
            .button.is-icon-smaller.c-tip
              i.icon-info

          span.c-status Not received

      td
        .c-actions
          .c-actions-month(:class='!(index !== 0 && paymentsType === "todo") ? "has-text-1" : "c-status-danger c-status"') {{ randomMonth() }}
          payments-list-menu(
            :paymentsType='paymentsType'
            :needsIncome='needsIncome'
          )
</template>

<script>
import { mapGetters } from 'vuex'
import AvatarUser from '@components/AvatarUser.vue'
import Tooltip from '@components/Tooltip.vue'
import PaymentsListMenu from '@containers/payments/PaymentsListMenu.vue'

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
      // Temp
      monthsNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
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
    }
  },
  methods: {
    // TEMP
    randomMonth () {
      return this.monthsNames[new Date(+(new Date()) - Math.floor(Math.random() * 10000000000)).getMonth()]
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
</style>
