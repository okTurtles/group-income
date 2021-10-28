<template lang='pug'>
.c-wrapper
  i18n.sr-only(tag='h3') Group Pledging Status
  pie-chart.c-chart(
    :slices='mainSlices'
    :inner-slices='innerSlices'
  )
    i18n.has-text-1.c-title(tag='p' :args='LTags("span")') {span_}Group{_span} goal
    span.is-title-4 {{ withCurrency(graphData.groupGoal) }}

  ul.c-legendList(:aria-label='L("Group pledging summary")' data-test='groupPledgeSummary')
    graph-legend-item(
      :amount='withCurrency(graphData.pledgeTotal)'
      color='primary-solid'
      variant='side'
    ) {{ L('Total Pledged') }}

    graph-legend-item(
      :amount='withCurrency(graphData.neededPledges)'
      color='blank'
      variant='side'
    ) {{ L('Needed Pledges') }}

    graph-legend-item(
      v-if='graphData.surplus'
      :amount='withCurrency(graphData.surplus)'
      color='success-solid'
      variant='side'
    ) {{ L('Surplus') }}
      template(slot='description')
        i18n This amount will not be used until someone needs it.

    graph-legend-item(
      v-if='graphData.ourIncomeToReceive > 0'
      :amount='withCurrency(graphData.ourIncomeToReceive)'
      color='warning-solid'
      variant='side'
    ) {{ L("You'll receive") }}
      tooltip(
        v-if='graphData.ourIncomeNeeded !== graphData.ourIncomeToReceive'
        :isTextCenter='true'
        :text='L("Based on other members pledges, the group is not able to provide a full mincome yet.")'
      )
        i.icon-info-circle.is-suffix.has-text-primary
</template>

<script>
import { mapGetters } from 'vuex'
import { PieChart, GraphLegendItem } from '@components/graphs/index.js'
import Tooltip from '@components/Tooltip.vue'
import currencies from '@view-utils/currencies.js'
import distributeIncome from '@utils/distribution/mincome-proportional.js'

export default ({
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
      'ourIdentityContractId',
      'ourUsername'
    ]),
    graphData () {
      const doWePledge = this.type === 'pledgeAmount'
      const doWeNeedIncome = this.type === 'incomeAmount'
      const mincome = this.groupSettings.mincomeAmount
      // NOTE: validate this.amount to avoid negative values in the graph
      const ourPledgeAmount = doWePledge && this.amount >= 0 && this.amount
      const ourIncomeAmount = doWeNeedIncome && this.amount < mincome && this.amount
      const incomeDistribution = []
      let othersIncomeNeeded = 0
      let othersPledgesAmount = 0

      for (const username in this.groupProfiles) {
        const { incomeDetailsType, contractID, ...profile } = this.groupProfiles[username]
        if (contractID === this.ourIdentityContractId) { continue }

        const amount = profile[incomeDetailsType]
        const doesNeedPledge = incomeDetailsType === 'incomeAmount'
        const adjustment = doesNeedPledge ? 0 : mincome
        const adjustedAmount = adjustment + profile[incomeDetailsType]

        incomeDistribution.push({ name: username, amount: adjustedAmount })

        if (doesNeedPledge) {
          othersIncomeNeeded += mincome - amount
        } else if (incomeDetailsType === 'pledgeAmount') {
          othersPledgesAmount += amount
        }
      }

      const ourIncomeNeeded = doWeNeedIncome && ourIncomeAmount !== null ? mincome - ourIncomeAmount : null
      const pledgeTotal = othersPledgesAmount + ourPledgeAmount
      const groupGoal = othersIncomeNeeded + ourIncomeNeeded
      const neededPledges = Math.max(0, groupGoal - pledgeTotal)
      const surplus = Math.max(0, pledgeTotal - othersIncomeNeeded - ourIncomeNeeded)
      let ourIncomeToReceive = ourIncomeNeeded

      if (!doWePledge && neededPledges > 0) {
        incomeDistribution.push({ name: this.ourUsername, amount: ourIncomeAmount })

        ourIncomeToReceive = distributeIncome(incomeDistribution, mincome)
          .filter(i => i.to === this.ourUsername)
          .reduce((acc, cur) => cur.amount + acc, 0)
      }

      return {
        othersPledgesAmount,
        ourPledgeAmount,
        ourIncomeNeeded,
        ourIncomeToReceive,
        pledgeTotal,
        groupGoal,
        neededPledges,
        surplus
      }
    },
    mainSlices () {
      const { groupGoal, othersPledgesAmount, ourPledgeAmount, pledgeTotal, surplus } = this.graphData

      if (groupGoal === 0) {
        return pledgeTotal > 0
          ? [{ id: 'goal_zero', percent: 1, color: 'primary' }]
          : []
      }

      // Note: surplus is added on the innerSlices, so we need to substract its part from the pledges.
      // To be fair, we remove the equivalent percentage of each pledge part (others and ours)

      const slices = []

      if (othersPledgesAmount > 0) {
        const pledgePerc = (othersPledgesAmount / pledgeTotal).toFixed(2)
        const surplusToBeRemoved = surplus * pledgePerc

        slices.push({
          id: 'othersPledgesAmount',
          percent: this.decimalSlice(othersPledgesAmount - surplusToBeRemoved),
          color: 'primary'
        })
      }

      if (ourPledgeAmount > 0) {
        const pledgePerc = (ourPledgeAmount / pledgeTotal).toFixed(2)
        const surplusToBeRemoved = surplus * pledgePerc

        slices.push({
          id: 'ourPledgeAmount',
          percent: this.decimalSlice(ourPledgeAmount - surplusToBeRemoved),
          color: 'primary'
        })
      }

      return slices
    },
    innerSlices () {
      const { ourIncomeToReceive, surplus } = this.graphData

      if (ourIncomeToReceive > 0) {
        return [{
          id: 'ourIncomeToReceive',
          percent: this.decimalSlice(ourIncomeToReceive),
          color: 'warning'
        }]
      }

      if (surplus > 0) {
        return [{
          id: 'surplus',
          percent: this.decimalSlice(surplus),
          color: 'success'
        }]
      }

      return []
    }
  },
  methods: {
    withCurrency (amount) {
      return currencies[this.groupSettings.mincomeCurrency].displayWithCurrency(amount)
    },
    decimalSlice (amount) {
      const perc = amount / this.graphData.groupGoal
      // avoid breaking the graph when perc is bigger than 1 or smaller than 0
      return Math.min(Math.max(0, perc), 1)
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-wrapper {
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
  margin-bottom: 0.25rem;

  @include phone {
    text-transform: capitalize;

    ::v-deep span {
      display: none;
    }
  }
}

.c-legendList {
  flex-grow: 1;
  margin: 0 0.5rem 0 1rem;
  max-width: 20rem;

  @include tablet {
    margin: 1.5rem 0 0 0;
    width: 100%;
  }
}
</style>
