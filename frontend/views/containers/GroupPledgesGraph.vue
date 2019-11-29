<template lang='pug'>
.c-gwrapper
  pie-chart.c-chart(
    :slices='mainSlices'
    :inner-slices='innerSlices'
  )
    i18n.has-text-1.c-title(tag='h3' :args='LTags("span")') {span_}Group{_span} goal
    span.is-title-4 {{ withCurrency(graphData.groupGoal) }}

  ul.c-legendList(:aria-label='L("Group pledging summary")')
    graph-legend-item(
      :amount='withCurrency(graphData.pledgeTotal)'
      color='primary-solid'
    ) {{ L('Total Pledged') }}

    graph-legend-item(
      v-if='graphData.neededPledges'
      :amount='withCurrency(graphData.neededPledges)'
      color='blank'
    ) {{ L('Needed Pledges') }}

    graph-legend-item(
      v-if='graphData.surplus'
      :amount='withCurrency(graphData.surplus)'
      color='success-solid'
    ) {{ L('Surplus') }}
      template(slot='description')
        i18n This amount will not be used until someone needs it.

    graph-legend-item(
      v-if='graphData.ourIncomeToReceive > 0'
      :amount='withCurrency(graphData.ourIncomeToReceive)'
      color='warning-solid'
    ) {{ L('You will receive') }}
      tooltip(v-if='graphData.ourIncomeNeeded !== graphData.ourIncomeToReceive')
        i.icon-info-circle.is-suffix.has-text-primary
        template(slot='tooltip')
          i18n.has-text-weight-bold.c-tooltip-title(tag='strong') Income Incomplete
          i18n.has-text-weight-normal(
            :args='{ amount: withCurrency(graphData.ourIncomeNeeded) }'
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
      'ourContractId'
    ]),
    graphData () {
      const mincome = this.groupSettings.mincomeAmount
      const ourPledgeAmount = this.type === 'pledgeAmount' && this.amount >= 0 && this.amount
      const ourIncomeAmount = this.type === 'incomeAmount' && this.amount < mincome && this.amount
      const doWeNeedPledge = typeof ourIncomeAmount === 'number'
      let othersIncomeNeeded = 0
      let othersPledgesAmount = 0
      let othersPledgesCount = 0

      Object.keys(this.groupProfiles).forEach(username => {
        const { incomeDetailsType, contractID, ...profile } = this.groupProfiles[username]

        if (contractID === this.ourContractId) { return }

        const amount = profile[incomeDetailsType]

        if (incomeDetailsType === 'incomeAmount') {
          othersIncomeNeeded += mincome - amount
        } else if (incomeDetailsType === 'pledgeAmount') {
          othersPledgesAmount += amount
          othersPledgesCount += 1
        }
      })

      const ourIncomeNeeded = doWeNeedPledge ? mincome - ourIncomeAmount : null
      const pledgeTotal = othersPledgesAmount + ourPledgeAmount
      const groupGoal = othersIncomeNeeded + ourIncomeNeeded
      const neededPledges = groupGoal - pledgeTotal
      const surplus = pledgeTotal - othersIncomeNeeded - ourIncomeNeeded

      let ourIncomeToReceive
      if (neededPledges > 0) {
        // TODO - get real income to receive based on distribution algorithm
        const membersNeedingPledges = this.groupMembersCount - othersPledgesCount
        const avgNeededPledges = neededPledges / membersNeedingPledges
        const avgMembersNeedingPledges = groupGoal / membersNeedingPledges
        ourIncomeToReceive = +(ourIncomeNeeded - (ourIncomeNeeded * avgNeededPledges / avgMembersNeedingPledges)).toFixed(0)
      } else {
        ourIncomeToReceive = doWeNeedPledge ? ourIncomeNeeded : null
      }

      return {
        othersPledgesAmount,
        ourPledgeAmount,
        ourIncomeNeeded,
        ourIncomeToReceive,
        pledgeTotal,
        groupGoal,
        neededPledges: neededPledges > 0 ? neededPledges : 0,
        surplus: surplus > 0 ? surplus : 0
      }
    },
    mainSlices () {
      const { groupGoal, othersPledgesAmount, ourPledgeAmount, pledgeTotal, surplus } = this.graphData
      const slices = []

      if (groupGoal === 0) {
        return slices
      }

      // Note: surplus is added on the innerSlices, so we need to substract its part from the pledges.
      // To be fair, we remove the equivalent percentage of each pledge part (others and ours)

      if (othersPledgesAmount > 0) {
        const pledgePerc = (othersPledgesAmount / pledgeTotal).toFixed(2)
        const surplusToBeRemoved = surplus * pledgePerc

        slices.push({
          id: 'othersPledgesAmount',
          percent: this.decimalSlice(othersPledgesAmount - surplusToBeRemoved),
          color: 'pledge'
        })
      }

      if (ourPledgeAmount > 0) {
        const pledgePerc = (ourPledgeAmount / pledgeTotal).toFixed(2)
        const surplusToBeRemoved = surplus * pledgePerc

        slices.push({
          id: 'ourPledgeAmount',
          percent: this.decimalSlice(ourPledgeAmount - surplusToBeRemoved),
          color: 'pledge'
        })
      }

      return slices
    },
    innerSlices () {
      const { ourIncomeToReceive, surplus } = this.graphData
      const slices = []

      if (ourIncomeToReceive > 0) {
        slices.push({
          id: 'ourIncomeToReceive',
          percent: this.decimalSlice(ourIncomeToReceive),
          color: 'income'
        })
      }

      if (surplus > 0) {
        slices.push({
          id: 'surplus',
          percent: this.decimalSlice(surplus),
          color: 'surplus'
        })
      }

      return slices
    }
  },
  methods: {
    withCurrency (amount) {
      return currencies[this.groupSettings.mincomeCurrency].displayWithCurrency(amount)
    },
    decimalSlice (amount) {
      const perc = amount / this.graphData.groupGoal
      // avoid breaking the graph when perc is bigger than 1,
      if (perc > 1) return 1
      if (perc < 0) return 0
      return perc
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

  @include phone {
    text-transform: capitalize;

    ::v-deep span {
      display: none;
    }
  }
}

.c-legendList {
  flex-grow: 1;
  margin: 0 $spacer-sm 0 $spacer;
  max-width: 20rem;

  @include tablet {
    margin: $spacer*1.5 0 0 0;
    width: 100%;
  }
}

.c-tooltip-title {
  display: block;
}
</style>
