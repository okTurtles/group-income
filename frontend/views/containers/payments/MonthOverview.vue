<template lang='pug'>
.c-summary(data-test='monthOverview')
  i18n.c-summary-title.is-title-4(
    tag='h4'
    data-test='monthOverviewTitle'
    :args='{ start: humanStartDate, end: humanDueDate }'
  ) Period: {start} - {end}

  ul
    li.c-summary-item(
      v-for='(item, index) in summaryCopy'
      :key='index'
    )
      .label {{ item.title }}

      progress-bar.c-progress(
        :max='item.max'
        :value='item.value'
        :secValue='item.hasPartials ? item.value + 0.5 : 0'
        :hasMarks='item.hasMarks'
      )
      p(:class='{ "has-text-success": item.max && (item.max === item.value) }')
        i.icon-check.is-prefix(v-if='item.max && (item.max === item.value)')
        span.has-text-1 {{ item.label }}

    li.c-summary-item(v-if='notReceivedPayments')
      i18n.label.is-title-4 Payment not received
      i18n.c-desc.has-text-1(:args='{nr: 1 }') There was a problem with {nr} of your payments.

  // TODO: Overdue payments (only visible for who's giving)
</template>

<script>
import currencies from '@model/contracts/shared/currencies.js'
import { mapGetters } from 'vuex'
import { PAYMENT_NOT_RECEIVED } from '@model/contracts/shared/payments/index.js'
import ProgressBar from '@components/graphs/Progress.vue'
import { L } from '@common/common.js'
import { humanDate } from '@model/contracts/shared/time.js'

export default ({
  name: 'MonthOverview',
  components: {
    ProgressBar
  },
  methods: {
    statusIsSent (user) {
      return ['completed', 'pending'].includes(user.status)
    },
    statusIsCompleted (user) {
      return user.status === 'completed'
    }
  },
  computed: {
    ...mapGetters([
      'currentPaymentPeriod',
      'dueDateForPeriod',
      'ourGroupProfile',
      'groupSettings',
      'ourPaymentsSummary',
      'ourPayments',
      'periodStampGivenDate'
    ]),
    currency () {
      return currencies[this.groupSettings.mincomeCurrency].displayWithCurrency
    },
    humanDueDate () {
      return humanDate(this.dueDateForPeriod(this.currentPaymentPeriod))
    },
    humanStartDate () {
      return humanDate(this.periodStampGivenDate(this.currentPaymentPeriod))
    },
    summaryCopy () {
      const { paymentsTotal, paymentsDone, hasPartials, amountTotal, amountDone } = this.ourPaymentsSummary

      const pS = [
        {
          title: this.needsIncome ? L('Payments received') : L('Payments sent'),
          value: paymentsDone,
          max: paymentsTotal,
          hasMarks: true,
          hasPartials,
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
          label: L('{value} out of {max}', {
            value: this.currency(amountDone),
            max: this.currency(amountTotal)
          })
        })
      } else {
        pS.push({
          title: L('Amount sent'),
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
    notReceivedPayments () {
      const { received, sent } = this.ourPayments
      const payments = this.needsIncome ? received : sent
      return payments.filter(p => p.data.status === PAYMENT_NOT_RECEIVED).length
    },
    needsIncome () {
      return this.ourGroupProfile.incomeDetailsType === 'incomeAmount'
    }
  }
}: Object)
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
