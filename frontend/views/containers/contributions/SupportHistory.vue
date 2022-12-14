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
    i18n.has-text-bold.c-total-distribution-txt(
      tag='p'
      :args='{ amount: withGroupCurrency(groupTotalPledgeAmount) }'
    ) Total distributed since start: {amount}
</template>

<script>
import { mapGetters } from 'vuex'
import { compareISOTimestamps } from '@model/contracts/shared/time.js'
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
      'periodStampGivenDate',
      'periodBeforePeriod',
      'withGroupCurrency',
      'groupTotalPledgeAmount',
      'groupCreatedDate'
    ]),
    firstDistributionPeriod () {
      // group's first distribution period
      return this.periodStampGivenDate(this.groupCreatedDate)
    },
    periods () {
      const periods = [this.currentPaymentPeriod]
      for (let i = 0; i < MAX_HISTORY_PERIODS - 1; i++) {
        const period = this.periodBeforePeriod(periods[0])
        if (compareISOTimestamps(period, this.firstDistributionPeriod) < 0) break
        else periods.unshift(period)
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
          title: this.getPeriodFromStartToDueDate(period),
          tooltipContent: [
            this.L('Needed: {todo}', { todo: this.withGroupCurrency(totalTodo) }),
            this.L('Distributed: {done}', { done: this.withGroupCurrency(totalDone) })
          ]
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

<style lang="scss" scoped>
.c-total-distribution-txt {
  margin-top: 0.5rem;
}
</style>
