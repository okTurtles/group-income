<template lang='pug'>
div(:class='isReady ? "" : "c-ready"')
  i18n.is-title-3(
    tag='h2'
  ) TODO history

  i18n(tag='p') Percentage of payments completed by those pledging.

  p(v-if='history.length === 0')
    i18n Your group is still in its first month.

  div(v-else)
    bar-graph(:bars='history')
    i18n.has-text-1(tag='p') * This month contains delayed payments for prior months.
</template>

<script>
import { mapGetters } from 'vuex'
import { comparePeriodStamps } from '@model/contracts/shared/time.js'
import { MAX_HISTORY_PERIODS } from '@model/contracts/shared/constants.js'
import { PAYMENT_NOT_RECEIVED } from '@model/contracts/shared/payments/index.js'
import PaymentsMixin from '@containers/payments/PaymentsMixin.js'
import BarGraph from '@components/graphs/bar-graph/BarGraph.vue'
import { L } from '@common/common.js'

export default ({
  name: 'TodoHistory',
  data () {
    return {
      isReady: false,
      history: null
    }
  },
  mixins: [PaymentsMixin],
  components: {
    BarGraph
  },
  computed: {
    ...mapGetters([
      'currentPaymentPeriod',
      'groupCreatedDate'
    ])
  },
  created () {
    this.updateHistory()
  },
  methods: {
    async updateHistory () {
      this.history = []

      let period = null
      const firstDistributionPeriod = await this.historicalPeriodStampGivenDate(this.groupCreatedDate)
      const getLen = obj => Object.keys(obj).length

      for (let i = 0; i < MAX_HISTORY_PERIODS; i++) {
        period = period === null ? this.currentPaymentPeriod : await this.historicalPeriodBeforePeriod(period)
        if (!period || comparePeriodStamps(period, firstDistributionPeriod) < 0) break

        const paymentDetails = await this.getPaymentDetailsByPeriod(period)
        const { lastAdjustedDistribution } = await this.getPaymentPeriod(period)

        const doneCount = getLen(paymentDetails)
        const markedAsNotReceivedCount = Object.values(paymentDetails)
          .filter(({ data }) => data.status === PAYMENT_NOT_RECEIVED).length
        const missedCount = getLen(lastAdjustedDistribution || {})
        this.history.unshift({
          total: doneCount === 0 ? 0 : (doneCount - markedAsNotReceivedCount) / (doneCount + missedCount),
          title: this.getPeriodFromStartToDueDate(period),
          tooltipContent: [
            L('Total: {total}', { total: doneCount + missedCount }),
            L('Completed: {completed}', { completed: doneCount - markedAsNotReceivedCount })
          ]
        })
      }
    }
  },
  watch: {
    currentPaymentPeriod () {
      this.updateHistory()
    }
  }
}: Object)
</script>
