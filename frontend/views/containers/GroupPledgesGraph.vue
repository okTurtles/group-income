<template lang='pug'>
.is-flex.c-graph
  pie-chart.c-chart(
    :slices='groupPledgingSlices'
    :innerslices='groupPledgingInnerSlices'
    :size='chartSize'
  )
    i18n.is-uppercase.is-size-7(tag='p') Group Pledge Goal
    span.has-text-weight-bold {{fakeStore.currency}}{{graphData.goal}}

  graph-legend-group.columns.c-legend(
    :aria-label='L("Group\'s Pledge Summary")'
  )
    graph-legend-item(
      :label='L("Members Pledging")'
      :class='legendItemClass'
    )
      | {{graphData.members}}
      i18n of
      | {{fakeStore.groupMembersTotal}}

    graph-legend-item(
      :label='L("Average Pledged")'
      :class='legendItemClass'
    ) {{fakeStore.currency}}{{graphData.avg}}

    graph-legend-item(
      :label='L("Total Pledged")'
      :class='legendItemClass'
      color='primary-light'
    ) {{fakeStore.currency}}{{graphData.totalAmount}}

    graph-legend-item(
      v-if='graphData.neededPledges'
      :label='L("Needed Pledges")'
      :class='legendItemClass'
      color='light'
    ) {{fakeStore.currency}}{{graphData.neededPledges}}

    graph-legend-item(
      :label='L("Surplus (not needed)")'
      :class='legendItemClass' color='secondary' v-if='graphData.surplus'
    ) {{fakeStore.currency}}{{graphData.surplus}}

    graph-legend-item(
      v-if='graphData.userIncomeToReceive'
      :label='L("Income to receive")'
      :class='legendItemClass'
      color='tertiary'
    )
      tooltip(
        v-if='graphData.userIncomeNeeded !== graphData.userIncomeToReceive'
        direction='right'
      )
        | {{fakeStore.currency}}{{graphData.userIncomeToReceive}}
        i.icon-info-circle.is-size-6.has-text-tertiary.c-legendItem-icon

        template(slot='tooltip')
          i18n.has-text-weight-bold(tag='strong') Income Incomplete
          i18n.has-text-weight-normal(
            tag='p'
            :args='{ amount: `${fakeStore.currency}${graphData.userIncomeNeeded}` }'
          )
            | The group at the moment is not pledging enough to cover everyone&apos;s mincome.
            | So you&apos;ll receive only a part instead of the {amount} you need.

      template(v-else='')
        | {{fakeStore.currency}}{{graphData.userIncomeToReceive}}
</template>

<script>
import { PieChart, GraphLegendGroup, GraphLegendItem } from '@components/Graphs/index.js'
import Tooltip from '@components/Tooltip.vue'
import currencies from '@view-utils/currencies.js'
import { debounce } from '@utils/giLodash.js'

export default {
  name: 'GroupPledgesGraph',
  components: {
    PieChart,
    GraphLegendGroup,
    GraphLegendItem,
    Tooltip
  },
  props: {
    // Needed to have a dynamic graph (ex: used on Contributions page)
    userPledgeAmount: {
      type: Number,
      default: null
    },
    userIncomeAmount: {
      type: Number,
      default: null
    }
  },
  data () {
    return {
      // REVIEW - make this a watcher
      isMobile: this.verifyIsMobile(),
      // -- Hardcoded Data just for layout purpose:
      fakeStore: {
        currency: currencies.USD.symbol,
        groupMembersTotal: 7,
        groupPledgeGoal: 800,
        mincome: 500,
        othersPledges: [180, 130, 200]
      }
    }
  },
  mounted: function () {
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy: function () {
    window.removeEventListener('resize', this.handleResize)
  },
  computed: {
    chartSize () {
      return this.isMobile ? '8rem' : undefined
    },
    legendItemClass () {
      return 'column c-legend-item'
    },
    graphData () {
      const { userPledgeAmount, userIncomeAmount } = this
      const { groupMembersTotal, groupPledgeGoal, mincome, othersPledges } = this.fakeStore
      const othersAmount = othersPledges.reduce((acc, cur) => acc + cur, 0)
      const userIncomeNeeded = userIncomeAmount !== null && userIncomeAmount < mincome ? mincome - userIncomeAmount : null
      const totalAmount = othersAmount + userPledgeAmount
      const goal = groupPledgeGoal + userIncomeNeeded
      const members = othersPledges.length + (userPledgeAmount ? 1 : 0)
      const neededPledges = goal - totalAmount
      const surplus = totalAmount - groupPledgeGoal
      const membersNeedingPledges = groupMembersTotal - othersPledges.length

      // Dumb Rule of 3 algorithm to know how much the user will receive (userIncomeToReceive) - just for layout purposes.
      const avgMembersNeedingPledges = goal / membersNeedingPledges
      const avgNeededPledges = neededPledges / membersNeedingPledges
      const userIncomeToReceive = userIncomeNeeded ? (userIncomeNeeded - (userIncomeNeeded * avgNeededPledges / avgMembersNeedingPledges)).toFixed(2) : 0

      return {
        members,
        othersAmount,
        userPledgeAmount,
        userIncomeNeeded,
        userIncomeToReceive,
        totalAmount,
        goal: groupPledgeGoal + userIncomeNeeded,
        avg: totalAmount / members,
        neededPledges: neededPledges > 0 ? neededPledges : false,
        surplus: surplus > 0 ? surplus : false
      }
    },
    groupPledgingSlices () {
      const { othersAmount, userPledgeAmount, neededPledges, surplus } = this.graphData
      const currency = this.fakeStore.currency

      const slices = [
        {
          id: 'othersAmount',
          percent: this.decimalSlice(othersAmount),
          color: 'primary-light',
          label: this.L('{amount} pledged by other members', { amount: currency + othersAmount })
        }
      ]

      if (userPledgeAmount) {
        slices.push({
          id: 'userPledgeAmount',
          percent: this.decimalSlice(userPledgeAmount),
          color: 'primary-light',
          label: this.L('{amount} pledged by you', { amount: currency + userPledgeAmount })
        })
      }

      if (neededPledges) {
        slices.push({
          id: 'neededPledges',
          percent: this.decimalSlice(neededPledges),
          color: 'light', // TODO later - review this color, too light
          label: this.L('{amount} needed pledge', { amount: currency + neededPledges })
        })
      } else if (surplus) {
        slices.push({
          id: 'surplus',
          percent: this.decimalSlice(surplus),
          color: 'secondary',
          label: this.L('{amount} extra pledge', { amount: currency + surplus })
        })
      }

      return slices
    },
    groupPledgingInnerSlices () {
      return [
        {
          id: 'userIncomeToReceive',
          percent: this.decimalSlice(this.graphData.userIncomeToReceive),
          color: 'tertiary'
        }
      ]
    }
  },
  methods: {
    decimalSlice (amount) {
      // NOTE: When bigger than (group) goal, take in account the surplus slice
      const { goal, totalAmount, surplus } = this.graphData
      const circleCompleteAmount = Math.max(totalAmount + surplus, goal)
      return amount / circleCompleteAmount
    },
    handleResize: debounce(function () {
      this.isMobile = this.verifyIsMobile()
    }, 100),
    verifyIsMobile () {
      return window.innerWidth < 769
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";

.c-graph {
  position: relative;
  flex-wrap: wrap;
  align-items: center;
  align-content: flex-start;
}

.c-legend {
  flex-basis: 50%;
  flex-grow: 1;
  padding: $spacer 0 $spacer $spacer-lg;

  &-item {
    padding: $spacer-sm;
    flex-basis: 33.3%;

    @include phone {
      padding: $spacer-sm $spacer-xs;
      flex-basis: 50%;
    }

    @include tablet {
      flex-basis: 50%;
    }
  }

  &-icon {
    display: inline-block;
    margin-left: $spacer-xs;
  }
}
</style>
