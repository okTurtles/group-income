<template lang='pug'>
div(:class='isReady ? "" : "c-ready"')
  i18n.is-title-3(
    tag='h2'
  ) Support history

  i18n(tag='p') Percentage of the group income goal reached by the group.

  p(v-if='history.length === 0')
    i18n Your group is still in its first month.

  div(v-else)
    bar-graph(:bars='history')
    i18n.has-text-1(tag='p') * This month contains delayed payments for prior months.
</template>

<script>
import sbp from '@sbp/sbp'
import { mapState, mapGetters } from 'vuex'
import { humanDate } from '@model/contracts/shared/time.js'
import { MAX_HISTORY_PERIODS } from '@model/contracts/shared/constants.js'
import { PAYMENT_COMPLETED } from '@model/contracts/shared/payments/index.js'
import BarGraph from '@components/graphs/BarGraph.vue'

export default ({
  name: 'GroupSupportHistory',
  data () {
    return {
      isReady: false,
      history: []
    }
  },
  components: {
    BarGraph
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'ourUsername',
      'groupSettings',
      'currentPaymentPeriod',
      'periodBeforePeriod',
      'paymentsForPeriod'
    ]),
    mincome () {
      return this.groupSettings.mincomeAmount
    },
    periods () {
      const periods = [this.currentPaymentPeriod]
      for (let i = 0; i < MAX_HISTORY_PERIODS - 1; i++) {
        periods.unshift(this.periodBeforePeriod(periods[0]))
      }
      return periods
    }
  },
  mounted () {
    this.updateHistory()
  },
  methods: {
    parsePayments (payments) {
      const list = {}
      payments.forEach(payment => {
        const { from, to, amount } = payment
        list[from] = (list[from] || 0) + amount
        list[to] = (list[to] || 0) - amount
      })
      return {
        numReceivers: Object.values(list).filter(amount => amount < 0).length,
        totalDistributionAmount: Object.values(list).filter(amount => amount > 0).reduce((total, curValue) => total + curValue, 0)
      }
    },
    async getPaymentsForPeriod (period) {
      const payments = this.paymentsForPeriod(period)
      if (payments.length) {
        return payments
      }

      // the rule to make key is there inside `archivePayments` function of group.js contract
      const periodKey = `paymentPeriods/${this.ourUsername}/${this.currentGroupId}`
      const periods = await sbp('gi.db/archive/load', periodKey) || []
      if (periods.includes(period)) {
        const paymentsKey = `paymentsByPeriod/${this.ourUsername}/${this.currentGroupId}/${period}`
        const paymentsByHash = await sbp('gi.db/archive/load', paymentsKey) || {}
        for (const hash of Object.keys(paymentsByHash)) {
          const payment = paymentsByHash[hash]
          if (payment.data.status === PAYMENT_COMPLETED) {
            payments.push({
              from: payment.meta.username,
              to: payment.data.toUser,
              hash,
              amount: payment.data.amount,
              isLate: !!payment.data.isLate,
              when: payment.data.completedDate
            })
          }
        }
      }
      return payments
    },
    async updateHistory () {
      this.history = await Promise.all(this.periods.map(async (period, i) => {
        const payments = await this.getPaymentsForPeriod(period)
        const { totalDistributionAmount, numReceivers } = this.parsePayments(payments)
        return {
          total: numReceivers === 0 ? 1 : totalDistributionAmount / (this.mincome * numReceivers),
          delayedPayment: payments.some(payment => payment.isLate),
          title: humanDate(period, { month: 'long' })
        }
      }))
    }
  },
  watch: {
    periods (newPeriods, prevPeriods) {
      this.updateHistory()
    }
  }
}: Object)
</script>
