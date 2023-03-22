<template lang='pug'>
page-template
  template(#title='') {{ L('Users') }}

  section.c-user-stats-section
    i18n.section-title Activity stats

    .c-stat-cards
      stat-card(v-for='(item, index) in ephemeral.userStats'
        :key='item.id'
        :description='item.name'
        :stat='item.value'
        :icon='item.icon'
        :color='index % 2 === 0 ? "blue" : "purple"'
      )

  section.c-user-table
    i18n.section-title User usage summary

    .summary-list.c-user-usages
      .c-table-wrapper
        table.table.c-table
          thead
            tr
              i18n.c-th-user(tag='th') User
              i18n.c-th-groups(tag='th') Groups
              i18n.c-th-owned-contracts(tag='th') Contracts owned
              i18n.c-th-contracts-size(tag='th') Contract size (MB)
              i18n.c-th-space-used(tag='th') Space used (%)
              i18n.c-th-credits(tag='th') Credits
              i18n.c-th-action(tag='th') Action

          tbody
            tr(v-for='item in ephemeral.userTableData' :key='item.id')
              td.c-cell-name.has-text-bold {{ item.name }}
              td.c-cell-group-count {{ item.groupCount }}
              td.c-cell-contracts-owned {{ item.ownedContractsCount }}
              td.c-cell-contract-size {{ (item.contractSize).toFixed(2) }}
              td.c-cell-space {{ (item.spaceUsed).toFixed(2) }}
              td.c-cell-credits(:class='{ "has-text-danger": isCreditShort(item.credits) }') {{ `${item.credits.used}/${item.credits.limit}` }}
              td.c-cell-action
                i18n.is-extra-small.has-blue-background(tag='button' @click='viewUserSummary(item)') view
</template>

<script>
import PageTemplate from './PageTemplate.vue'
import StatCard from '@components/StatCard.vue'
import { fakeUserStats, fakeUserTableData } from '@view-utils/dummy-data.js'

export default {
  name: 'Users',
  components: {
    PageTemplate,
    StatCard
  },
  data () {
    return {
      ephemeral: {
        userStats: fakeUserStats,
        userTableData: fakeUserTableData
      }
    }
  },
  methods: {
    viewUserSummary () {
      alert('TODO: Implement!')
    },
    isCreditShort ({ used, limit }) {
      return used >= limit
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-stat-cards {
  position: relative;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.25rem;
}

.c-user-usages {
  max-width: max-content;
}

.c-user-table {
  margin-top: 3rem;
}

.c-table-wrapper {
  position: relative;
  overflow-x: auto;
  max-width: 100%;
}

.c-table {
  position: relative;
  height: max-content;
}

.c-th-user,
.c-cell-name {
  position: sticky;
  left: 0;
  padding: 0 0.8rem 0 0.2rem;
  background-color: var(--summary-list-bg-color);
  min-width: 8rem;
}

.c-cell-name {
  line-height: 1.4;
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}

.c-th-groups,
.c-cell-group-count,
.c-th-credits,
.c-cell-credits {
  min-width: 6.25rem;
  text-align: center;
}

.c-th-owned-contracts,
.c-cell-contracts-owned,
.c-th-space-used,
.c-cell-space {
  min-width: 8.75rem;
  text-align: center;
}

.c-th-contracts-size,
.c-cell-contract-size {
  min-width: 9.25rem;
  text-align: center;
}

.c-th-action,
.c-cell-action {
  min-width: 4.5rem;
  text-align: center;
}
</style>
