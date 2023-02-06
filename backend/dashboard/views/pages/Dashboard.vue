<template lang='pug'>
page-template
  template(#title='') {{ L('Dashboard') }}

  section.c-stats-section
    i18n.section-title Stats

    .c-stat-cards
      stat-card.c-stat-card(v-for='(item, index) in ephemeral.stats'
        :key='item.id'
        :description='item.name'
        :stat='item.value'
        :icon='item.icon'
        :color='index % 2 === 0 ? "blue" : "purple"'
      )

  section.c-recent-and-summary
    i18n.section-title Users / Space

    .c-flex-container
      .c-joined-users
        i18n.c-user-list-label.is-title-4 Recent users

        ul.c-user-list
          li.c-user-list-ths
            i18n(tag='label') Name
            i18n(tag='label') Joined on
          li.c-list-item(v-for='user in ephemeral.recentUsers' :key='user.name')
            .c-username {{ user.name }}
            .c-joined-date {{ humanDate(user.joined) }}

      .c-space-usage-summary
        i18n.c-space-usage-label.is-title-4 Sapce usage

        ul.c-space-usage-list
          li.c-list-item(v-for='(item, key) in ephemeral.spaceUsage' :key='key')
            label {{ item.name }}
            span.c-usage-value {{ item.value }} {{ item.unit }}
</template>

<script>
import PageTemplate from './PageTemplate.vue'
import StatCard from '@components/StatCard.vue'
import L from '@common/translations.js'
import { addTimeToDate, MONTHS_MILLIS, humanDate } from '@common/cdTimeUtils.js'

const PAST_THREE_MONTHS = -3 * MONTHS_MILLIS
const randomPastDate = () => addTimeToDate(new Date(), Math.floor(Math.random() * PAST_THREE_MONTHS))

export default {
  name: 'Dashboard',
  components: {
    PageTemplate,
    StatCard
  },
  data () {
    return {
      ephemeral: {
        // ------ temporary dummy placeholder data ------ //
        stats: [
          { id: 'users', name: L('Total users'), value: 2150, icon: 'trend-up' },
          { id: 'groups', name: L('Total groups'), value: 23, icon: 'chart-bar' },
          { id: 'storage', name: L('Total storage'), value: '2GB', icon: 'battery-charging' }
        ],
        recentUsers: [
          { name: 'TaoEffect', joined: randomPastDate() },
          { name: 'Leilha P', joined: randomPastDate() },
          { name: 'Alex Jin', joined: randomPastDate() },
          { name: 'Sebin Song', joined: randomPastDate() },
          { name: 'Pierre', joined: randomPastDate() }
        ].sort((a, b) => b.joined.getTime() - a.joined.getTime()),
        spaceUsage: {
          database: { name: L('Database'), value: 1.8, unit: 'Gb' },
          media: { name: L('Media/Images'), value: 500, unit: 'Mb' }
        }
      }
    }
  },
  methods: {
    humanDate
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-stats-section {
  margin-bottom: 3.2rem;
}

.c-stat-cards {
  position: relative;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.25rem;
}

.c-flex-container {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 1.75rem;
}

.c-joined-users,
.c-space-usage-summary {
  position: relative;
  padding: 1.5rem;
  border-radius: 1rem;
  width: 100%;

  @include from($phone_narrow) {
    max-width: 22.25rem;
  }
}

.c-joined-users {
  background-color: $background_1;
}

.c-space-usage-summary {
  background-color: $background_0;
  border: 1px solid $text_0;
}

.c-user-list-label,
.c-space-usage-label {
  display: block;
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid $border;
  text-transform: uppercase;
}

.c-user-list-ths,
.c-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;

  > * { display: inline-block; }
}

.c-user-list-ths {
  font-weight: 600;
  font-size: 0.9em;
  margin-bottom: 0.25rem;
}

.c-list-item {
  line-height: 1.8;
}

.c-usage-value {
  font-weight: 600;
  font-size: 1.25em;
}
</style>
