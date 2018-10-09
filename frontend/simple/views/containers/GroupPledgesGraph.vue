<template>
  <div class="is-flex is-mobile c-graph">
    <pie-chart class="c-chart"
      :slices="groupPledgingSlices"
      :innerSlices="groupPledgingInnerSlices"
      :size="chartSize"
    >
      <i18n tag="p" class="is-uppercase has-text-grey is-size-7">Group Pledge Goal</i18n>
      <span class="has-text-weight-bold">{{fakeStore.currency}}{{graphData.goal}}</span>
    </pie-chart>
    <graph-legend-group class="columns c-legend" :aria-label="L('Group\'s Pledge Summary')">
      <graph-legend-item :label="L('Members Pledging')" :class="legendItemClass">
        {{graphData.members}}<i18n>of</i18n> {{fakeStore.groupMembersTotal}}
      </graph-legend-item>

      <graph-legend-item :label="L('Average Pledged')" :class="legendItemClass">
        {{fakeStore.currency}}{{graphData.avg}}
      </graph-legend-item>

      <graph-legend-item :label="L('Total Pledged')" :class="legendItemClass" color="primary-light">
        {{fakeStore.currency}}{{graphData.totalAmount}}
      </graph-legend-item>

      <graph-legend-item :label="L('Needed Pledges')" :class="legendItemClass" color="light"
        v-if="graphData.neededPledges"
      >
        {{fakeStore.currency}}{{graphData.neededPledges}}
      </graph-legend-item>

      <graph-legend-item :label="L('Surplus (not needed)')" :class="legendItemClass" color="secondary"
        v-if="graphData.surplus"
      >
        {{fakeStore.currency}}{{graphData.surplus}}
      </graph-legend-item>

      <graph-legend-item :label="L('Income to receive')" :class="legendItemClass" color="tertiary"
        v-if="graphData.userIncomeToReceive"
      >
        <tooltip direction="right" v-if="graphData.userIncomeNeeded !== graphData.userIncomeToReceive">
          {{fakeStore.currency}}{{graphData.userIncomeToReceive}}
          <i class="fa fa-info-circle is-size-6 has-text-tertiary c-legendItem-icon"></i>

          <template slot="tooltip">
            <strong class="has-text-weight-bold">Income Incomplete</strong>
            <i18n tag="p" class="has-text-weight-normal" :args="{ amount: `${fakeStore.currency}${graphData.userIncomeNeeded}` }">
              The group at the moment is not pledging enough to cover everyone's mincome.
              So you'll receive only a part instead of the {amount} you need.
            </i18n>
          </template>
        </tooltip>
        <template v-else>
          {{fakeStore.currency}}{{graphData.userIncomeToReceive}}
        </template>
      </graph-legend-item>
    </graph-legend-group>
  </div>
</template>
<style lang="scss" scoped>
@import "../../assets/sass/theme/index";

.c-graph {
  position: relative;
  flex-wrap: wrap;
  align-items: center;
  align-content: flex-start;
}

.c-legend {
  flex-basis: 50%;
  flex-grow: 1;
  padding: $gi-spacer 0 $gi-spacer $gi-spacer-lg;

  &-item {
    padding: $gi-spacer-sm;
    flex-basis: 33.3%;

    @include phone {
      padding: $gi-spacer-sm $gi-spacer-xs;
      flex-basis: 50%;
    }

    @include tablet {
      flex-basis: 50%;
    }
  }

  &-icon {
    display: inline-block;
    margin-left: $gi-spacer-xs;
  }
}
</style>
<script>
import { PieChart, GraphLegendGroup, GraphLegendItem } from '../components/Graphs/index.js'
import Tooltip from '../components/Tooltip.vue'
import currencies from '../utils/currencies.js'
import { debounce } from '../../utils/giLodash.js'

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
      isMobile: this.verifyIsMobile(),
      // -- Hardcoded Data just for layout purpose:
      fakeStore: {
        currency: currencies['USD'],
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
      const { groupMembersTotal, groupPledgeGoal, mincome, othersPledges } = this.fakeStore
      const othersAmount = othersPledges.reduce((acc, cur) => acc + cur, 0)
      const userAmount = this.userPledgeAmount // TODO - delete this consts
      const userIncome = this.userIncomeAmount // TODO - delete this consts
      const userIncomeNeeded = userIncome !== null && userIncome < mincome ? mincome - userIncome : null
      const totalAmount = othersAmount + userAmount
      const goal = groupPledgeGoal + userIncomeNeeded
      const members = othersPledges.length + (userAmount ? 1 : 0)
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
        userAmount,
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
      const { othersAmount, userAmount, neededPledges, surplus } = this.graphData

      const slices = [
        {
          id: 'othersAmount',
          percent: this.decimalSlice(othersAmount),
          color: 'primary-light'
        }
      ]

      if (userAmount) {
        slices.push({
          name: 'userAmount',
          percent: this.decimalSlice(userAmount),
          color: 'primary-light'
        })
      }

      if (neededPledges) {
        slices.push({
          id: 'neededPledges',
          percent: this.decimalSlice(neededPledges),
          color: 'light'
        })
      } else if (surplus) {
        slices.push({
          id: 'surplus',
          percent: this.decimalSlice(surplus),
          color: 'secondary'
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
