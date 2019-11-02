<template lang='pug'>
page(
  pageTestName='payGroupPage'
  pageTestHeaderName='payGroupTitle'
)
  template(#title='') {{ L('Pay Group') }}

  template(#sidebar='' v-if='hasPayments')
    .c-summary-item(
      v-for='(item, index) in paymentSummary'
      :key='index'
    )
      h4.title.is-4 {{ item.title }}
      progress-bar.c-progress(
        :max='item.max'
        :value='item.value'
        :hasMarks='item.hasMarks'
      )
      p(:class='{"has-text-success": item.max === item.value}')
        i.icon-check(v-if='item.max === item.value')
        .has-text-1 {{ item.label }}

  .c-container-empty(v-if='!hasPayments')
    svg-contributions.c-svg

    i18n.title.is-4(tag='h2') There are no pending payments yet!
    i18n.has-text-1(tag='p') Once other group members add their income details, Group Income will re-distribute wealth amongst everyone.

  section.card(v-else)
    i18n.title.is-3(
      tag='h3'
      :args='{ month: paymentStatus.month }'
    ) {month} contributions
    i18n.has-text-1(
      tag='p'
      :args='{ amount: paymentTotal }'
    ) {amount} in total

    ul.c-payments
      li.c-payments-item(
        v-for='(payment, index) in paymentsDistribution'
        :key='index'
      )
        .c-info
          user-image.c-avatar(:username='payment.to')
          div(role='alert')
            i18n(
              tag='p'
              :args='{ \
                total: `<b>${payment.amountFormatted}</b>`, \
                user: `<b>${payment.to}</b>` \
              }'
            ) {total} to {user}
            span(
              v-if='payment.hash'
              :class='payment.paymentClass'
            ) {{ payment.paymentStatusText }}

        .buttons.is-start.c-ctas
          router-link.button.is-small.is-outlined(
            v-if='payment.data.status === statusType.PAYMENT_NOT_RECEIVED'
            to='messages/liliabt'
          ) {{ L('Send Message...') }}
          i18n.button.is-small.c-ctas-send(
            tag='button'
            key='send'
            v-if='showMarkAsPaid(payment)'
            @click='markAsPayed(payment.to, payment)'
          ) Mark as sent
          i18n.button.is-small.is-outlined(
            tag='button'
            key='cancel'
            v-if='payment.data.status === statusType.PAYMENT_PENDING'
            @click='cancelPayment(payment.to, payment.hash)'
          ) Cancel

  .c-footer
    i18n.button.is-small.is-outlined(
      tag='button'
      @click='seeHistory'
    ) See past contributions
</template>

<script>
import sbp from '~/shared/sbp.js'
import { mapGetters } from 'vuex'
import Page from '@pages/Page.vue'
import Avatar from '@components/Avatar.vue'
import UserImage from '@containers/UserImage.vue'
import ProgressBar from '@components/Graphs/Progress.vue'
import currencies from '@view-utils/currencies.js'
import Tooltip from '@components/Tooltip.vue'
import { OPEN_MODAL } from '@utils/events.js'
import SvgContributions from '@svgs/contributions.svg'
import { PAYMENT_TYPE_MANUAL, PAYMENT_PENDING, PAYMENT_CANCELLED, PAYMENT_ERROR, PAYMENT_COMPLETED, PAYMENT_NOT_RECEIVED } from '@model/contracts/payments/index.js'
import L from '@view-utils/translations.js'

export default {
  name: 'PayGroup',
  components: {
    Page,
    Avatar,
    UserImage,
    ProgressBar,
    Tooltip,
    SvgContributions
  },
  data () {
    return {
      fakeStore: {
        usersToPay: [
          {
            name: 'Lilia Bouvet',
            avatar: '/assets/images/default-avatar.png',
            status: 'todo',
            amount: 10
          },
          {
            name: 'Charlotte Doherty',
            avatar: '/assets/images/default-avatar.png',
            status: 'todo',
            amount: 20
          },
          {
            name: 'Kim Kr',
            avatar: '/assets/images/default-avatar.png',
            status: 'rejected',
            amount: 25
          },
          {
            name: 'Zoe Kim',
            avatar: '/assets/images/default-avatar.png',
            status: 'pending',
            amount: 30
          },
          {
            name: 'Hugo Lil',
            avatar: '/assets/images/default-avatar.png',
            status: 'completed',
            amount: 50
          }
        ],
        currency: currencies.USD.symbol
      }
    }
  },
  computed: {
    ...mapGetters([
      'currentGroupState',
      'groupIncomeDistribution',
      'groupProfiles',
      'groupSettings',
      'ourUsername',
      'thisMonthsPayments'
    ]),
    currency () {
      return currencies[this.groupSettings.mincomeCurrency]
    },
    paymentsDistribution () {
      // TODO: make sure we create a new month if month roll's over
      //       perhaps send a message to do that, however make sure
      //       that there are no conflicts with timezones, to do that
      //       we need to go by the server's time, and not our time.
      //       https://github.com/okTurtles/group-income-simple/issues/531
      // TODO: Have multiple frozen distributions based on new income details
      // or new members, using any remainder leftover needed income from the
      // previous distribution
      const distribution = this.thisMonthsPayments.frozenDistribution || this.groupIncomeDistribution
      return distribution.filter(p => p.from === this.ourUsername).map(transfer => {
        const { to, amount } = transfer
        const { hash, data } = this.paymentFor(to)
        return {
          to,
          hash,
          data,
          amount: +this.currency.displayWithoutCurrency(amount),
          amountFormatted: this.currency.displayWithCurrency(amount),
          paymentClass: this.paymentClass(data),
          paymentStatusText: this.paymentStatusText(data, to)
        }
      })
    },
    paymentTotal () {
      return this.currency.displayWithCurrency(
        this.paymentsDistribution.reduce((acc, p) => acc + p.amount, 0)
      )
    },
    statusType () {
      return { PAYMENT_PENDING, PAYMENT_CANCELLED, PAYMENT_ERROR, PAYMENT_COMPLETED, PAYMENT_NOT_RECEIVED }
    },
    // old stuff (to be deleted) follows
    hasPayments () {
      return this.paymentsDistribution.length > 0
    },
    paymentStatus () {
      const { usersToPay } = this.fakeStore

      return {
        month: 'July',
        paymentsTotal: usersToPay.length,
        sent: usersToPay.reduce((acc, user) => this.statusIsSent(user) ? acc + 1 : acc, 0),
        confirmed: usersToPay.reduce((acc, user) => this.statusIsCompleted(user) ? acc + 1 : acc, 0),
        amoutSent: usersToPay.reduce((acc, user) => this.statusIsSent(user) ? acc + user.amount : acc, 0),
        amountTotal: usersToPay.reduce((acc, user) => acc + user.amount, 0)
      }
    },
    paymentSummary () {
      const { currency } = this.fakeStore
      const { sent, confirmed, amoutSent, amountTotal, paymentsTotal } = this.paymentStatus

      return [
        {
          title: this.L('Payments sent'),
          value: sent,
          max: paymentsTotal,
          hasMarks: true,
          label: this.L('{value} out of {max}', {
            value: sent,
            max: paymentsTotal
          })
        },
        {
          title: this.L('Amout sent'),
          value: amoutSent,
          max: amountTotal,
          hasMarks: false,
          label: this.L('{value} of {max}', {
            value: `${currency}${amoutSent}`,
            max: `${currency}${amountTotal}`
          })
        },
        {
          title: this.L('Payments confirmed'),
          value: confirmed,
          max: paymentsTotal,
          hasMarks: true,
          label: this.L('{value} of {max}', {
            value: confirmed,
            max: paymentsTotal
          })
        }
      ]
    }
  },
  methods: {
    paymentFor (toUser) {
      const payments = this.thisMonthsPayments.payments
      const ourPayments = payments && payments[this.ourUsername]
      const paymentHash = ourPayments && ourPayments[toUser]
      const data = paymentHash && this.currentGroupState.payments[paymentHash].data
      return data ? { hash: paymentHash, data } : { data: {} }
    },
    paymentClass (paymentData) {
      return paymentData.status ? {
        [PAYMENT_PENDING]: 'has-text-1',
        [PAYMENT_CANCELLED]: '',
        [PAYMENT_ERROR]: 'has-text-weight-normal has-text-warning',
        [PAYMENT_NOT_RECEIVED]: 'has-text-weight-normal has-text-warning',
        [PAYMENT_COMPLETED]: 'has-text-success'
      }[paymentData.status] : ''
    },
    paymentStatusText (paymentData, username) {
      return paymentData.status ? {
        [PAYMENT_PENDING]: L('Waiting for {username} confirmation...', { username }),
        [PAYMENT_CANCELLED]: '',
        [PAYMENT_ERROR]: L('There was an error processing this payment'),
        [PAYMENT_NOT_RECEIVED]: L('The payment was not received by {username}.', { username }),
        [PAYMENT_COMPLETED]: L('Payment confirmed!')
      }[paymentData.status] : ''
    },
    showMarkAsPaid (payment) {
      return !payment.hash ||
        payment.data.status === PAYMENT_NOT_RECEIVED ||
        payment.data.status === PAYMENT_CANCELLED
    },
    statusIsSent (user) {
      return ['completed', 'pending'].includes(user.status)
    },
    statusIsCompleted (user) {
      return user.status === 'completed'
    },
    async markAsPayed (toUser, payment) {
      try {
        const paymentMessage = await sbp('gi.contracts/group/payment/create', {
          toUser,
          amount: payment.amount,
          currency: this.currency.symbol,
          txid: String(Math.random()),
          status: PAYMENT_PENDING,
          paymentType: PAYMENT_TYPE_MANUAL
        }, this.$store.state.currentGroupId)
        await sbp('backend/publishLogEntry', paymentMessage)
      } catch (e) {
        console.error(e)
        alert(e.message)
      }
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
    },
    seeHistory () {
      sbp('okTurtles.events/emit', OPEN_MODAL, 'PayGroupHistory')
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-container-empty {
  max-width: 25rem;
  margin: 0 auto;
  padding: $spacer-xl $spacer $spacer;
  text-align: center;

  .title {
    margin: $spacer;
  }

  .c-svg {
    display: inline-block;
    height: 9rem;
    margin-bottom: $spacer-lg;
  }
}

.c-summary-item {
  margin-bottom: $spacer*3;

  .icon-check {
    margin-right: $spacer-sm;
  }
}

.c-progress {
  margin: $spacer-sm 0;
}

.c-payments {
  margin-top: $spacer;
  &-item {
    padding: $spacer $spacer-sm;

    &:not(:last-child) {
      border-bottom: 1px solid $general_1;
    }

    @include tablet {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }

  .c-avatar {
    // REVIEW: without nesting it doesnt work
    min-width: 1.5rem;
    width: 1.5rem;
    margin-right: $spacer;
    margin-bottom: $spacer-sm;

    @include tablet {
      min-width: 2.5rem;
      width: 2.5rem;
    }
  }
}

.c-info {
  @include tablet {
    display: flex;
    align-items: center;
    margin-right: $spacer-sm;
  }

}

.c-ctas {
  margin-bottom: $spacer-sm;

  @include tablet {
    margin: 0;
    padding: 0;
  }
}

.c-footer {
  margin-top: $spacer-lg;
  text-align: center;
}

.c-sprite {
  display: none;
}

</style>
