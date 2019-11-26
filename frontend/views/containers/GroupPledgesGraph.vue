<template lang='pug'>
.is-flex.c-graph
  pie-chart.c-chart(
    :slices='groupPledgingSlices'
    :inner-slices='groupPledgingInnerSlices'
    :size='chartSize'
  )
    i18n.help.c-title(tag='h3') Group Goal
    span.is-title-4 {{fakeStore.currency}}{{graphData.goal}}

  ul.c-legend(:aria-label='L("Group\'s Pledging Summary")')
    graph-legend-item(
      :label='L("Total Pledged")'
      color='primary-solid'
    ) {{fakeStore.currency}}{{graphData.totalAmount}}

    graph-legend-item(
      v-if='graphData.neededPledges'
      :label='L("Needed Pledges")'
      color='blank'
    ) {{fakeStore.currency}}{{graphData.neededPledges}}

    graph-legend-item(
      v-if='graphData.surplus'
      :label='L("Surplus")'
      color='success-solid'
    ) {{fakeStore.currency}}{{graphData.surplus}}
      template(slot='description')
        i18n This amount will not be used until someone needs it.

    graph-legend-item(
      v-if='graphData.userIncomeToReceive'
      :label='L("You\'ll receive")'
      :class='legendItemClass'
      color='warning-solid'
    )
      tooltip(
        v-if='graphData.userIncomeNeeded !== graphData.userIncomeToReceive'
      )
        | {{fakeStore.currency}}{{graphData.userIncomeToReceive}}
        i.icon-info-circle.is-suffix

        template(slot='tooltip')
          i18n.has-text-weight-bold(tag='strong') Income Incomplete
          i18n.has-text-weight-normal(
            :args='{ amount: `${fakeStore.currency}${graphData.userIncomeNeeded}` }'
          ) The group at the moment is not pledging enough to cover everyone's mincome. So you'll receive only a part instead of the {amount} you need.

      template(v-else='')
        | {{fakeStore.currency}}{{graphData.userIncomeToReceive}}
</template>

<script>
import { PieChart, GraphLegendItem } from '@components/Graphs/index.js'
import Tooltip from '@components/Tooltip.vue'
import currencies from '@view-utils/currencies.js'
import { debounce } from '@utils/giLodash.js'
import { TABLET } from '@view-utils/breakpoints.js'

export default {
  name: 'GroupPledgesGraph',
  components: {
    PieChart,
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
          color: 'pledge',
          label: this.L('{amount} pledged by other members', { amount: currency + othersAmount })
        }
      ]

      if (userPledgeAmount) {
        slices.push({
          id: 'userPledgeAmount',
          percent: this.decimalSlice(userPledgeAmount),
          color: 'pledge',
          label: this.L('{amount} pledged by you', { amount: currency + userPledgeAmount })
        })
      }

      if (neededPledges) {
        slices.push({
          id: 'neededPledges',
          percent: this.decimalSlice(neededPledges),
          color: 'needed',
          label: this.L('{amount} needed pledge', { amount: currency + neededPledges })
        })
      } else if (surplus) {
        slices.push({
          id: 'surplus',
          percent: this.decimalSlice(surplus),
          color: 'surplus',
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
          color: 'income'
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
      return window.innerWidth < TABLET
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-graph {
  position: relative;
  flex-wrap: wrap;
  align-items: center;
  align-content: flex-start;
}

.c-title {
  margin-bottom: $spacer-xs;
}

.c-legend {}
</style>
