<template lang='pug'>
div(:class='isReady ? "" : "c-ready"')
  i18n.is-title-3(
    tag='h2'
  ) TODO history

  i18n(tag='p') Percentage of payments completed by those pledging.

  p(v-if='history.length === 0')
    i18n The first distribution period hasn't started yet.

  div(v-else)
    bar-graph(:bars='history')
    i18n.has-text-1(tag='p') * This month contains delayed payments for prior months.
</template>

<script>
import { mapGetters } from 'vuex'
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
      history: []
    }
  },
  mixins: [PaymentsMixin],
  components: {
    BarGraph
  },
  computed: {
    ...mapGetters([
      'currentPaymentPeriod',
      'groupCreatedDate',
      'thisPeriodPaymentInfo'
    ])
  },
  created () {
    this.updateHistory()
  },
  methods: {
    async updateHistory () {
      const getLen = obj => Object.keys(obj).length
      const allPeriods = await this.getAllSortedPeriodKeys()
      const periods = allPeriods.slice(-MAX_HISTORY_PERIODS)
      this.history = await Promise.all(periods.map(async (period) => {
        const paymentDetails = await this.getPaymentDetailsByPeriod(period)
        const { lastAdjustedDistribution } = await this.getPaymentPeriod(period)
        const doneCount = getLen(paymentDetails)
        const markedAsNotReceivedCount = Object.values(paymentDetails)
          .filter(({ data }) => data.status === PAYMENT_NOT_RECEIVED).length
        const missedCount = getLen(lastAdjustedDistribution || {})
        return {
          total: doneCount === 0 ? 0 : (doneCount - markedAsNotReceivedCount) / (doneCount + missedCount),
          title: this.getPeriodFromStartToDueDate(period, periods),
          tooltipContent: [
            L('Total: {total}', { total: doneCount + missedCount }),
            L('Completed: {completed}', { completed: doneCount - markedAsNotReceivedCount })
          ]
        }
      }))
    }
  },
  watch: {
    currentPaymentPeriod () {
      this.updateHistory()
    },
    thisPeriodPaymentInfo () {
      this.updateHistory()
    }
  }
}: Object)
</script>
