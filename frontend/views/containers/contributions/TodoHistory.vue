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
import { humanDate, compareISOTimestamps, dateFromPeriodStamp } from '@model/contracts/shared/time.js'
import { MAX_HISTORY_PERIODS } from '@model/contracts/shared/constants.js'
import PaymentsMixin from '@containers/payments/PaymentsMixin.js'
import BarGraph from '@components/graphs/bar-graph/BarGraph.vue'

export default ({
  name: 'GroupTodoHistory',
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
      'periodStampGivenDate',
      'periodBeforePeriod',
      'groupCreatedDate',
      'dueDateForPeriod'
    ]),
    firstDistributionPeriod () {
      // group's first distribution period
      return this.periodStampGivenDate(this.groupCreatedDate)
    }
  },
  created () {
    this.initHistory()
  },
  methods: {
    async initHistory () {
      let period = this.currentPaymentPeriod
      const getLen = obj => Object.keys(obj).length

      for (let i = 0; i < MAX_HISTORY_PERIODS; i++) {
        period = this.periodBeforePeriod(period)
        if (compareISOTimestamps(period, this.firstDistributionPeriod) < 0) break

        const paymentDetails = await this.getPaymentDetailsByPeriod(period)
        const { lastAdjustedDistribution } = await this.getPeriodPayment(period)
        const doneCount = getLen(paymentDetails)
        const missedCount = getLen(lastAdjustedDistribution || {})

        this.history.unshift({
          total: doneCount === 0 ? 0 : doneCount / (doneCount + missedCount),
          title: this.getPeriodFromStartToDueDate(period)
        })
      }
    }
  }
}: Object)
</script>
