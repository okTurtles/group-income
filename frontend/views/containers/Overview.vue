<template lang='pug'>
div
  i18n.has-text-1(tag='p') Group members and their pledges
  .c-chart
    ul.c-chart-legends
      graph-legend-item.c-wlegend-inline(
        :amount='withCurrency(this.totalNeeded)'
        color='warning-solid'
      ) {{ L('Total needed') }}

      graph-legend-item.c-wlegend-inline(
        :amount='withCurrency(this.totalPledge)'
        color='primary-solid'
      ) {{ L('Total Pledged') }}

      graph-legend-item.c-wlegend-inline(
        v-if='positiveBalance'
        :amount='withCurrency(Math.abs(totalPledge - totalNeeded))'
        color='success-solid'
      ) {{ L('Surplus') }}

      graph-legend-item.c-wlegend-inline(
        v-else
        :amount='withCurrency(Math.abs(totalPledge - totalNeeded))'
        color='danger-solid'
      ) {{ L('Needed') }}

    bars(:totals='totals' :members='members')
</template>

<script>
import { mapGetters } from 'vuex'
import currencies from '@view-utils/currencies.js'
import { GraphLegendItem, Bars } from '@components/Graphs/index.js'

export default {
  name: 'Overview',
  components: {
    GraphLegendItem,
    Bars
  },
  computed: {
    ...mapGetters([
      'groupProfiles',
      'groupSettings',
      'groupIncomeDistribution',
      'thisMonthsPayments'
    ]),
    mincome () {
      return this.groupSettings.mincomeAmount
    },
    distribution () {
      return this.thisMonthsPayments.frozenDistribution || this.groupIncomeDistribution
    },
    // Extract members incomes
    members () {
      // Create object that contain what people need / pledge and what people receive / give
      let list = {}
      this.groupIncomeDistribution.map(distribution => {
        list = this.addToList(list, distribution.from, distribution.amount)
        list = this.addToList(list, distribution.to, -distribution.amount)
      })
      // Sort object by need / pledge
      list = Object.values(list).sort((a, b) => a.total - b.total)
      return list
    },
    totals () {
      return this.members.map(a => a.total)
    },
    amounts () {
      return this.members.map(a => a.amount)
    },
    totalNeeded () {
      const needyPeople = this.totals.filter(total => total < 0)
      return needyPeople.length > 0
        ? Math.abs(needyPeople.reduce((total, amount) => total + amount))
        : 0
    },
    totalPledge () {
      const pledgePeople = this.amounts.filter(member => member > 0)
      return pledgePeople.length > 0
        ? pledgePeople.reduce((total, amount) => total + amount)
        : 0
    },
    positiveBalance () {
      return this.totalPledge - this.totalNeeded >= 0
    }
  },
  methods: {
    withCurrency (amount) {
      return currencies[this.groupSettings.mincomeCurrency].displayWithCurrency(amount)
    },
    addToList (list, id, amount) {
      const existingUser = list[id]
      // Test if user already in the list
      if (typeof existingUser !== 'undefined') {
        list[id].amount = existingUser.amount + amount
      } else {
        // Add new user to the list
        list[id] = {
          amount: amount,
          total: amount > 0
            ? this.groupProfiles[id].pledgeAmount
            : this.groupProfiles[id].incomeAmount - this.mincome
        }
      }
      return list
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-chart {
  @include phone {
    display: flex;
    flex-direction: column-reverse;
    padding-top: 1.5rem;
  }
}

.c-chart-legends {
  display: flex;

  @include phone {
    display: flex;
    flex-direction: column;
  }
}
</style>
