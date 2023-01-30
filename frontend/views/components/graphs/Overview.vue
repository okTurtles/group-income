<template lang='pug'>
div
  i18n.is-title-3(
    tag='h2'
  ) This month's overview

  i18n.has-text-1(tag='p') Group members and their pledges
  .c-chart
    ul.c-chart-legends
      graph-legend-item(
        :amount='withCurrency(totalCovered)'
        color='warning-solid'
        variant='inline'
      ) {{ L('Total covered') }}

      graph-legend-item(
        :amount='withCurrency(totalCovered)'
        color='primary-solid'
        variant='inline'
      ) {{ L('Total given') }}

      graph-legend-item(
        v-if='surplus > 0'
        :amount='withCurrency(surplus)'
        color='success-solid'
        variant='inline'
      ) {{ L('Surplus') }}

      graph-legend-item(
        v-else
        :amount='withCurrency(Math.abs(surplus))'
        color='danger-solid'
        variant='inline'
      ) {{ L('Total needed') }}

    bars(:totals='totals' :members='members')
</template>

<script>
import { mapGetters } from 'vuex'
import currencies from '@model/contracts/shared/currencies.js'
import { GraphLegendItem, Bars } from '@components/graphs/index.js'

export default ({
  name: 'Overview',
  components: {
    GraphLegendItem,
    Bars
  },
  computed: {
    ...mapGetters([
      'groupProfiles',
      'groupSettings',
      'groupIncomeDistribution'
    ]),
    mincome () {
      return this.groupSettings.mincomeAmount
    },
    distribution () {
      return this.groupIncomeDistribution
    },
    // Extract members incomes
    members () {
      // Create object that contain what people need / pledge and what people receive / give
      let list = {}
      // TODO: cleanup/improve this code
      if (this.distribution.length === 0) {
        Object.keys(this.groupProfiles).forEach(username => {
          const profile = this.groupProfiles[username]
          if (profile.incomeDetailsType) {
            list[username] = {
              amount: 0,
              total: profile.incomeDetailsType === 'incomeAmount' ? profile.incomeAmount - this.mincome : profile.pledgeAmount
            }
          }
        })
      } else {
        this.distribution.forEach(distribution => {
          list = this.addToList(list, distribution.from, distribution.amount)
          list = this.addToList(list, distribution.to, -distribution.amount)
        })
      }
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
    totalCovered () {
      const pledgePeople = this.amounts.filter(member => member > 0)
      return pledgePeople.length > 0
        ? pledgePeople.reduce((total, amount) => total + amount)
        : 0
    },
    surplus () {
      const needyPeople = this.totals.filter(member => member < 0)
      const totalNeeded = needyPeople.length > 0
        ? Math.abs(needyPeople.reduce((total, amount) => total + amount))
        : 0
      const pledgePeople = this.totals.filter(member => member > 0)
      const totalPledge = pledgePeople.length > 0
        ? Math.abs(pledgePeople.reduce((total, amount) => total + amount))
        : 0

      return totalPledge - totalNeeded
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
}: Object)
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
