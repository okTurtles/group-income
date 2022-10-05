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
import { mapGetters } from 'vuex'
import { humanDate } from '@model/contracts/shared/time.js'
import BarGraph from '@components/graphs/BarGraph.vue'

export default ({
  name: 'GroupSupportHistory',
  data () {
    return {
      isReady: false
    }
  },
  components: {
    BarGraph
  },
  computed: {
    ...mapGetters([
      'groupSettings',
      'currentPaymentPeriod',
      'periodBeforePeriod',
      'paymentsForPeriod'
    ]),
    mincome () {
      return this.groupSettings.mincomeAmount
    },
    periods () {
      const periods = []
      let lastPeriod = this.currentPaymentPeriod
      for (let i = 0; i < 5; i++) {
        periods.unshift(lastPeriod)
        lastPeriod = this.periodBeforePeriod(lastPeriod)
      }
      periods.unshift(lastPeriod)
      return periods
    },
    history () {
      return this.periods.map((period, i) => {
        const payments = this.paymentsForPeriod(period)
        const { totalDistributionAmount, numberOfNeedyPeople } = this.parsePayments(payments)
        return {
          total: numberOfNeedyPeople === 0 ? 1 : totalDistributionAmount * this.mincome / numberOfNeedyPeople,
          delayedPayment: payments.some(payment => payment.isLate),
          title: humanDate(period, { month: 'long' })
        }
      })
    }
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
        numberOfNeedyPeople: Object.values(list).filter(amount => amount < 0).length,
        totalDistributionAmount: Object.values(list).filter(amount => amount > 0).reduce((total, curValue) => total + curValue, 0)
      }
    }
  }
}: Object)
</script>
