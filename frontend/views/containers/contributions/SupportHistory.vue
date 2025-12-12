<template lang='pug'>
div(:class='isReady ? "" : "c-ready"')
  i18n.is-title-3(
    tag='h2'
  ) Support history

  i18n(tag='p') Percentage of the group income goal reached by the group.

  p(v-if='history.length === 0')
    i18n The first distribution period hasn't started yet.

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
import { L } from '@common/common.js'
import PaymentsMixin from '@containers/payments/PaymentsMixin.js'
import BarGraph from '@components/graphs/bar-graph/BarGraph.vue'
import { MAX_HISTORY_PERIODS } from '@model/contracts/shared/constants.js'
import { withGroupCurrency } from '@view-utils/misc.js'

export default ({
  name: 'SupportHistory',
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
      'groupTotalPledgeAmount',
      'groupCreatedDate',
      'thisPeriodPaymentInfo'
    ])
  },
  mounted () {
    this.updateHistory()
  },
  methods: {
    withGroupCurrency,
    async updateHistory () {
      const allPeriods = await this.getAllSortedPeriodKeys()
      const periods = allPeriods.slice(-MAX_HISTORY_PERIODS)
      this.history = await Promise.all(periods.map(async (period) => {
        const totalTodo = await this.getTotalTodoAmountForPeriod(period)
        const totalDone = await this.getTotalPledgesDoneForPeriod(period)

        return {
          total: totalDone === 0 || totalTodo === 0 ? 0 : totalDone / totalTodo,
          title: this.getPeriodFromStartToDueDate(period, periods),
          tooltipContent: [
            L('Needed: {todo}', { todo: this.withGroupCurrency(totalTodo) }),
            L('Distributed: {done}', { done: this.withGroupCurrency(totalDone) })
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

<style lang="scss" scoped>
.c-total-distribution-txt {
  margin-top: 0.5rem;
}
</style>
