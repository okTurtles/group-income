<template lang='pug'>
.c-summary
  i18n.c-summary-title.is-title-4(
    tag='h4'
    data-test='thisMonth'
    :args='{ month: humanDate(Date.now(), { month: "long" }) }'
  ) {month} overview

  ul
    li.c-summary-item(
      v-for='(item, index) in paymentSummary'
      :key='index'
    )
      .label {{ item.title }}

      progress-bar.c-progress(
        :max='item.max'
        :value='item.value'
        :hasMarks='item.hasMarks'
      )
      p(:class='{"has-text-success": item.max === item.value}')
        i.icon-check(v-if='item.max === item.value')
        .has-text-1 {{ item.label }}

    li.c-summary-item(v-if='notReceivedPayments')
      i18n.label.is-title-4 Payment not received
      i18n.c-desc.has-text-1(:args='{nr: 1 }') There was a problem with {nr} of your payments.

  // TODO: Overdue payments (only visible for who's giving)
</template>

<script>
import currencies from '@view-utils/currencies.js'
import { mapGetters } from 'vuex'
import { PAYMENT_COMPLETED, PAYMENT_NOT_RECEIVED } from '@model/contracts/payments/index.js'
import ProgressBar from '@components/graphs/Progress.vue'
import L from '@view-utils/translations.js'
import { humanDate } from '@utils/time.js'
import { uniq } from '@utils/giLodash.js'

export default {
  name: 'MonthOverview',
  components: {
    ProgressBar
  },
  props: {
    paymentsData: {
      type: Object,
      required: true
    }
  },
  methods: {
    humanDate,
    statusIsSent (user) {
      return ['completed', 'pending'].includes(user.status)
    },
    statusIsCompleted (user) {
      return user.status === 'completed'
    }
  },
  computed: {
    ...mapGetters([
      'ourGroupProfile',
      'groupSettings'
    ]),
    currency () {
      return currencies[this.groupSettings.mincomeCurrency].displayWithCurrency
    },
    paymentSummary () {
      // TODO support partial payments
      const { paymentsTotal, paymentsDone, amountTotal, amountDone } = this.paymentStatus

      const pS = [
        {
          title: L('Payments completed'),
          value: paymentsDone,
          max: paymentsTotal,
          hasMarks: true,
          label: L('{value} out of {max}', {
            value: paymentsDone,
            max: paymentsTotal
          })
        }
      ]
      if (this.needsIncome) {
        pS.push({
          title: L('Amount received'),
          value: amountDone,
          max: amountTotal,
          hasMarks: false,
          label: L('{value} of {max}', {
            value: this.currency(amountDone),
            max: this.currency(amountTotal)
          })
        })
      } else {
        pS.push({
          title: L('Amout sent'),
          value: amountDone,
          max: amountTotal,
          hasMarks: false,
          label: L('{value} out of {max}', {
            value: this.currency(amountDone),
            max: this.currency(amountTotal)
          })
        })
      }
      return pS
    },
    paymentStatus () {
      // TODO/BUG support partial payments. paymentsTotal will be wrong.
      const { todo, sent, toBeReceived, received } = this.paymentsData
      const isCompleted = (p) => p.data.status === PAYMENT_COMPLETED
      const getUniquePayments = (payments) => {
        // We need to filter the partial payments already done (sent/received).
        // E.G. I need to send 4 payments. I have done 2 partial and 3 uniques.
        // A quick way is to list all usernames I sent to and find the unique ones.
        const users = payments.map(p => p.username)
        return uniq(users).length
      }

      if (this.needsIncome) {
        const receivedCompleted = received.filter(isCompleted)
        return {
          paymentsDone: receivedCompleted.length,
          paymentsTotal: getUniquePayments([...toBeReceived, ...received]),
          amountDone: receivedCompleted.reduce((total, p) => total + p.data.amount, 0),
          amountTotal: toBeReceived.reduce((total, p) => total + p.amount, 0) + received.reduce((total, p) => total + p.amount, 0)
        }
      }

      const sentCompleted = sent.filter(isCompleted)
      return {
        paymentsDone: sentCompleted.length,
        paymentsTotal: getUniquePayments([...todo, ...sent]),
        amountDone: sentCompleted.reduce((total, p) => total + p.data.amount, 0),
        amountTotal: todo.reduce((total, p) => total + p.amount, 0) + sent.reduce((total, p) => total + p.amount, 0)
      }
    },
    notReceivedPayments () {
      const { todo, received } = this.paymentsData
      const payments = this.needsIncome ? received : todo

      return payments.filter(p => p.data.status === PAYMENT_NOT_RECEIVED).length
    },
    needsIncome () {
      return this.ourGroupProfile.incomeDetailsType === 'incomeAmount'
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-summary {
  &-title {
    margin-bottom: 1.75rem;
    margin-top: -0.25rem;
  }
  &-item {
    margin-bottom: 3rem;

    .label {
      margin-bottom: 0.25rem;
    }

    .icon-check {
      margin-right: 0.5rem;
    }
  }
}

.c-progress {
  margin: 0.25rem 0;
}
</style>
