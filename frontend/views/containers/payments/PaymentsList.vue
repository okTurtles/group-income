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
          i18n.c-partial-info.has-text-1(
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
          menu-parent
            menu-trigger.is-icon-small(:aria-label='L("Show payment menu")')
              i.icon-ellipsis-v

            menu-content.c-actions-content
              ul
                menu-item(
                  v-if='paymentsType === "sent" || needsIncome'
                  tag='button'
                  item-id='message'
                  icon='info'
                  @click='openModal("PaymentDetail")'
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
                  v-if='needsIncome'
                  tag='button'
                  item-id='message'
                  icon='times'
                  @click='cancelPayment(payment.to, payment.hash)'
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
import { PAYMENT_CANCELLED } from '@model/contracts/payments/index.js'
// import L from '@view-utils/translations.js'

export default {
  name: 'PaymentTable',
  components: {
    AvatarUser,
    Tooltip,
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuItem
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
    },
    openModal (name) {
      sbp('okTurtles.events/emit', OPEN_MODAL, name)
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

.c-actions {
  justify-content: space-between;
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
}

.c-payments-amount-info {
  display: inline-flex;
  align-items: center;
}

.c-status-primary {
  &.c-status,
  .c-status{
    background: $primary_2;
    color: $primary_0;
  }

  .c-tip {
    background: $primary_0;
  }
}

.c-status-danger {
  &.c-status,
  .c-status{
    background: $danger_2;
    color: $danger_0;
  }

  .c-tip {
    background: $danger_0;
  }
}

.c-status-warning {
  &.c-status,
  .c-status {
    background: $warning_2;
    color: $warning_0;
  }
  .c-tip {
    background: $warning_0;
  }
}

.c-content {
  width: 13.375rem;
  left: -12rem;
  top: 2rem;
}

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

.c-partial-info {
  @include phone {
    display: block;
  }
}

.has-text-1 + .c-status {
  margin-left: $spacer-sm;
}
</style>
