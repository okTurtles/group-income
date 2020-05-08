<template lang='pug'>
tr
  td
    .c-user
      avatar-user.c-avatar(:username='payment.username' size='xs')
      strong.c-name {{payment.displayName}}

    // TODO: replace condition to indicate whether or not the payment date is < or > than the current date using payment.paymentStatusText
    i18n.c-user-month(
      :class='Math.round(Math.random()) ? "has-text-1" : "pill is-danger"'
      :args='{date: dueDate(payment.date) }'
    ) Due {date}
  td.c-payments-amount
    strong {{ currency(payment.amount) }}

    // TODO: replace condition to indicate whether a payment as been received using payment.paymentStatusText
    .c-payments-amount-info(
      v-if='notReceived'
    )
      tooltip.c-tooltip-warning(
        direction='top'
        :isTextCenter='true'
        :text='L("{personName} marked this payment as not received.", { personName: payment.displayName })'
      )
        .button.is-icon-smaller.c-tip
          i.icon-info

      i18n.pill.is-warning Not received

  td
    .c-actions
      .c-actions-month.has-text-1 {{ dueDate(payment.date) }}
      menu-parent.c-actions-menu
        menu-trigger.is-icon-small(:aria-label='L("Show payment menu")')
          i.icon-ellipsis-v

        menu-content.c-actions-content
          ul
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
              @click='markNotReceived'
            )
              i18n I did not receive this
</template>

<script>
import sbp from '~/shared/sbp.js'
import { mapGetters } from 'vuex'
import AvatarUser from '@components/AvatarUser.vue'
import Tooltip from '@components/Tooltip.vue'
import { OPEN_MODAL } from '@utils/events.js'
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '@components/menu/index.js'
import { PAYMENT_NOT_RECEIVED } from '@model/contracts/payments/index.js'
import { humanDate } from '@view-utils/humanDate.js'
import currencies from '@view-utils/currencies.js'
import L from '@view-utils/translations.js'

// TODO: handle showing PAYMENT_CANCELLED ?

export default {
  name: 'PaymentRowReceived',
  components: {
    AvatarUser,
    Tooltip,
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuItem
  },
  props: {
    payment: {
      type: Object,
      required: true
    }
  },
  computed: {
    ...mapGetters([
      'groupSettings',
      'ourGroupProfile'
    ]),
    needsIncome () {
      return this.ourGroupProfile.incomeDetailsType === 'incomeAmount'
    },
    notReceived () {
      return this.payment.data.status === PAYMENT_NOT_RECEIVED
    },
    currency () {
      return currencies[this.groupSettings.mincomeCurrency].displayWithCurrency
    }
  },
  methods: {
    // TEMP
    dueDate (datems) {
      return humanDate(datems, { month: 'short', day: 'numeric' })
    },
    openModal (name, props) {
      sbp('okTurtles.events/emit', OPEN_MODAL, name, props)
    },
    // TODO: make multiple payments
    async markNotReceived () {
      try {
        if (this.payment.data.status === PAYMENT_NOT_RECEIVED) {
          alert(L('Already marked as not received!'))
          return
        }
        await sbp('gi.actions/group/paymentUpdate', {
          paymentHash: this.payment.hash,
          updatedProperties: {
            status: PAYMENT_NOT_RECEIVED
          }
        }, this.$store.state.currentGroupId)
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

// for menu-content
.c-content {
  width: 13.375rem;
  left: -12rem;
  top: 2rem;
}

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
