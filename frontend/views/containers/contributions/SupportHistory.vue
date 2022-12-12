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
import { MAX_HISTORY_PERIODS } from '@model/contracts/shared/constants.js'
import PaymentsMixin from '@containers/payments/PaymentsMixin.js'
import BarGraph from '@components/graphs/bar-graph/BarGraph.vue'

export default ({
  name: 'GroupSupportHistory',
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
      'periodBeforePeriod'
    ]),
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
    async updateHistory () {
      this.history = await Promise.all(this.periods.map(async (period, i) => {
        const totalTodo = await this.getTotalTodoAmountForPeriod(period)
        const totalDone = await this.getTotalPledgesDoneForPeriod(period)

        return {
          total: totalDone === 0 ? 0 : totalDone / totalTodo,
          title: this.getPeriodFromStartToDueDate(period)
        }
      }))
    }
  },
  watch: {
    periods () {
      this.updateHistory()
    }
  }
}: Object)
</script>
