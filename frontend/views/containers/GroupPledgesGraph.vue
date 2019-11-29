<template lang='pug'>
.c-gwrapper
  pie-chart.c-chart(
    :slices='mainSlices'
    :inner-slices='innerSlices'
  )
    i18n.has-text-1.c-title(tag='h3' :args='LTags("span")') {span_}Group{_span} Goal
    span.is-title-4 {{ withCurrency(graphData.groupGoal) }}

  ul.c-legend(:aria-label='L("Group pledging summary")')
    graph-legend-item(
      :label='L("Total Pledged")'
      color='primary-solid'
    ) {{ withCurrency(graphData.pledgeTotal) }}

    graph-legend-item(
      v-if='graphData.neededPledges'
      :label='L("Needed Pledges")'
      color='blank'
    ) {{ withCurrency(graphData.neededPledges) }}

    graph-legend-item(
      v-if='graphData.surplus'
      :label='L("Surplus")'
      color='success-solid'
    ) {{ withCurrency(graphData.surplus) }}
      template(slot='description')
        i18n This amount will not be used until someone needs it.

    graph-legend-item(
      v-if='graphData.userIncomeToReceive'
      :label='L("You will receive")'
      color='warning-solid'
    )
      template(v-if='graphData.userIncomeNeeded === graphData.userIncomeToReceive')
        | {{ withCurrency(graphData.userIncomeToReceive) }}
      tooltip(v-else)
        | {{ withCurrency(graphData.userIncomeToReceive) }}
        i.icon-info-circle.is-suffix

        template(slot='tooltip')
          i18n.has-text-weight-bold.c-tooltip-title(tag='strong') Income Incomplete
          i18n.has-text-weight-normal(
            tag='p'
            :args='{ amount: withCurrency(graphData.userIncomeNeeded) }'
          ) The group at the moment is not pledging enough to cover everyone's mincome. So you'll receive only a part instead of the {amount} you need.
</template>

<script>
import { mapGetters } from 'vuex'
import { PieChart, GraphLegendItem } from '@components/Graphs/index.js'
import Tooltip from '@components/Tooltip.vue'
import currencies from '@view-utils/currencies.js'

export default {
  name: 'GroupPledgesGraph',
  components: {
    PieChart,
    GraphLegendItem,
    Tooltip
  },
  props: {
    type: {
      type: String, // incomeAmount || pledgeAmount TODO validator
      default: null
    },
    amount: {
      type: Number,
      default: null
    }
  },
  computed: {
    ...mapGetters([
      'groupSettings',
      'groupProfiles',
      'groupMembersCount',
      'ourUserIdentityContract'
    ]),
    graphData () {
      const mincome = this.groupSettings.mincomeAmount
      const userPledgeAmount = this.type === 'pledgeAmount' && this.amount >= 0 && this.amount
      const userIncomeAmount = this.type === 'incomeAmount' && this.amount < mincome && this.amount
      let othersIncomeTotal = 0
      let othersPledgesTotal = 0
      const othersPledgesParts = []

      Object.keys(this.groupProfiles).forEach(username => {
        const { incomeDetailsType, contractID, ...profile } = this.groupProfiles[username]
        // OPTIMIZE - contractId or identityContract? different names, same thing.
        const isCurrentUser = contractID === this.ourUserIdentityContract
        const amount = profile[incomeDetailsType]

        if (isCurrentUser) { return false }

        if (incomeDetailsType === 'incomeAmount') {
          othersIncomeTotal += mincome - amount
        } else if (incomeDetailsType === 'pledgeAmount') {
          othersPledgesTotal += amount
          othersPledgesParts.push(amount)
        }
      })

      const userIncomeNeeded = userIncomeAmount ? mincome - userIncomeAmount : null
      const pledgeTotal = othersPledgesTotal + userPledgeAmount
      const groupGoal = othersIncomeTotal + userIncomeNeeded
      const neededPledges = groupGoal - pledgeTotal
      const surplus = pledgeTotal - othersIncomeTotal
      const membersNeedingPledges = this.groupMembersCount - othersPledgesParts.length

      // TODO - get real income to receive based on distribution algorithm
      const avgMembersNeedingPledges = groupGoal / membersNeedingPledges
      const avgNeededPledges = neededPledges / membersNeedingPledges
      const userIncomeToReceive = userIncomeNeeded ? +(userIncomeNeeded - (userIncomeNeeded * avgNeededPledges / avgMembersNeedingPledges)).toFixed(0) : 0

      return {
        othersPledgesTotal,
        userPledgeAmount,
        userIncomeNeeded,
        userIncomeToReceive,
        pledgeTotal,
        groupGoal,
        neededPledges: neededPledges > 0 ? neededPledges : false,
        surplus: surplus > 0 ? surplus : false
      }
    },
    mainSlices () {
      const { othersPledgesTotal, userPledgeAmount, neededPledges, surplus } = this.graphData
      const withCurrency = this.withCurrency

      const slices = [
        {
          id: 'othersPledgesTotal',
          percent: this.decimalSlice(othersPledgesTotal),
          color: 'pledge',
          label: this.L('{amount} pledged by other members', { amount: withCurrency(othersPledgesTotal) })
        }
      ]

      if (userPledgeAmount) {
        slices.push({
          id: 'userPledgeAmount',
          percent: this.decimalSlice(userPledgeAmount),
          color: 'pledge',
          label: this.L('{amount} pledged by you', { amount: withCurrency(userPledgeAmount) })
        })
      }

      if (neededPledges) {
        slices.push({
          id: 'neededPledges',
          percent: this.decimalSlice(neededPledges),
          color: 'needed',
          label: this.L('{amount} needed pledge', { amount: withCurrency(neededPledges) })
        })
      } else if (surplus) {
        slices.push({
          id: 'surplus',
          percent: this.decimalSlice(surplus),
          color: 'surplus',
          label: this.L('{amount} extra pledge', { amount: withCurrency(surplus) })
        })
      }

      return slices
    },
    innerSlices () {
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
    withCurrency (amount) {
      return currencies[this.groupSettings.mincomeCurrency].displayWithCurrency(amount)
    },
    decimalSlice (amount) {
      // NOTE: When bigger than (group) goal, take in account the surplus slice
      const { groupGoal, pledgeTotal, surplus } = this.graphData
      const circleCompleteAmount = Math.max(pledgeTotal + surplus, groupGoal)
      return amount / circleCompleteAmount
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-gwrapper {
  position: relative;
  display: flex;
  align-items: center;
  align-content: flex-start;

  @include tablet {
    flex-direction: column;
  }
}

.c-chart {
  ::v-deep .c-piechart {
    width: 7.5rem;

    @include tablet {
      width: 10rem;
    }

    @include desktop {
      width: 12rem;
    }
  }
}

.c-title {
  margin-bottom: $spacer-xs;

  span {
    @include phone {
      display: none;
    }
  }
}

.c-legend {
  flex-grow: 1;
  margin: 0 $spacer-sm 0 $spacer;
  max-width: 15rem;

  @include tablet {
    margin: $spacer-sm 0 0 0;
    width: 100%;
  }
}
</style>
